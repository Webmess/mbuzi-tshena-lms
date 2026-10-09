import os
import secrets
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import User, LoanApplication, Document, DocumentCheck, UserRole
from app.utils.doc_check import run_document_check
from app.schemas import DocumentOut, Message
from app.auth import get_current_user, get_current_admin
from app.config import settings
from app.utils.file_store import store_file, restore_file, delete_stored_file

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/upload/{application_id}", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    application_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role != UserRole.ADMIN and app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: PDF, JPG, PNG, DOC, DOCX",
        )

    # Size check
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    # Save file
    ext = Path(file.filename or "file").suffix
    safe_name = f"{secrets.token_hex(8)}{ext}"
    file_path = UPLOAD_DIR / safe_name
    with open(file_path, "wb") as f:
        f.write(content)
    store_file(db, str(file_path), content)

    doc = Document(
        application_id=application_id,
        filename=safe_name,
        original_filename=file.filename or safe_name,
        file_path=str(file_path),
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        document_type=document_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    background_tasks.add_task(run_document_check, doc.id)
    return doc


@router.get("/application/{application_id}", response_model=List[DocumentOut])
def list_documents(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(LoanApplication).filter(LoanApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if current_user.role != UserRole.ADMIN and app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


@router.delete("/{document_id}", response_model=Message)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app = db.query(LoanApplication).filter(LoanApplication.id == doc.application_id).first()
    if current_user.role != UserRole.ADMIN and (not app or app.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Remove file
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

    db.query(DocumentCheck).filter(DocumentCheck.document_id == doc.id).delete()
    delete_stored_file(db, doc.file_path)
    db.delete(doc)
    db.commit()
    return Message(message="Document deleted")

@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app = db.query(LoanApplication).filter(LoanApplication.id == doc.application_id).first()
    if current_user.role != UserRole.ADMIN and (not app or app.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if not restore_file(db, doc.file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(doc.file_path, media_type=doc.content_type)