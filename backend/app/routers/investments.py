import os
import secrets
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, UserRole, Investment, InvestmentStatus, InvestmentTerm, InvestmentDeposit,
    Notification, NotificationType,
)
from app.auth import get_current_user, get_current_admin
from app.config import settings
from app.utils.risk_score import relative_date
from app.utils.investment_interest import RATES, investment_figures
from app.utils.deposit_check import run_deposit_check

router = APIRouter(prefix="/api/investments", tags=["Investments"])

RISK_LEVELS = set(RATES)

# Where customers pay their investment money in
PAY_TO = {
    "account_name": "Mbudzi Tshena Financial Solutions",
    "bank": "FNB",
    "account_number": "62004410",
    "branch_code": "250655",
}

UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "deposits"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}



class InvestmentCreate(BaseModel):
    amount: float = Field(ge=1000)            # same minimum as the customer form
    duration_months: int = Field(gt=0, le=60)
    risk_level: str

class InvestmentReview(BaseModel):
    status: InvestmentStatus
    admin_notes: Optional[str] = None

class DepositReview(BaseModel):
    status: str                               # "verified" or "rejected"
    admin_notes: Optional[str] = None


def stage(i: Investment) -> str:
    """Where the investment is: pending -> awaiting_deposit -> active (or rejected)."""
    if i.status == InvestmentStatus.APPROVED:
        return "active" if i.term else "awaiting_deposit"
    return i.status.value

def deposit_to_dict(d: InvestmentDeposit) -> dict:
    return {
        "id": d.deposit_id,
        "file_name": d.original_filename,
        "status": d.status,
        "admin_notes": d.admin_notes,
        "uploaded_at": relative_date(d.uploaded_at),
        "check": {
            "status": d.check_status,
            "details": d.check_details,
            "amount_found": float(d.amount_found) if d.amount_found is not None else None,
        } if d.check_status else None,
    }

def investment_to_dict(i: Investment) -> dict:
    return {
        "id": i.investment_id,
        "user_name": i.user.full_name if i.user else "Unknown",
        "user_email": i.user.email if i.user else "",
        "amount": float(i.amount),
        "duration": i.duration_months,
        "risk_level": i.risk_level,
        "status": i.status.value,
        "stage": stage(i),
        "admin_notes": i.admin_notes,
        "submitted_at": relative_date(i.created_at),
        "created_at": i.created_at.isoformat(),
        "pay_to": PAY_TO if stage(i) == "awaiting_deposit" else None,
        "deposits": [deposit_to_dict(d) for d in i.deposits],
        **investment_figures(i),
    }

# Customer submits a request
@router.post("", status_code=201)
def create_investment(
    data: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.risk_level not in RISK_LEVELS:
        raise HTTPException(status_code=400, detail="Invalid risk level")
    inv = Investment(
        investment_id="INV-" + secrets.token_hex(3).upper(),
        user_id=current_user.id,
        amount=data.amount,
        duration_months=data.duration_months,
        risk_level=data.risk_level,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return investment_to_dict(inv)

# Customer sees their own reques
@router.get("/me")
def my_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Investment)
        .filter(Investment.user_id == current_user.id)
        .order_by(Investment.created_at.desc())
        .all()
    )
    return [investment_to_dict(i) for i in rows]

# Admin sees everyone's requests
@router.get("")
def list_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    rows = db.query(Investment).order_by(Investment.created_at.desc()).all()
    return [investment_to_dict(i) for i in rows]


# Admin approves or rejects, customer gets a notification
@router.patch("/{investment_id}")
def review_investment(
    investment_id: str,
    review: InvestmentReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    inv = db.query(Investment).filter(Investment.investment_id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment request not found")

    inv.status = review.status
    inv.admin_notes = review.admin_notes

    if review.status == InvestmentStatus.APPROVED:
        db.add(Notification(
            user_id=inv.user_id,
            type=NotificationType.INVESTMENT_APPROVED,
            message=(
                f"Your investment request {inv.investment_id} has been approved. Please pay "
                f"R{float(inv.amount):,.2f} into {PAY_TO['account_name']} ({PAY_TO['bank']} {PAY_TO['account_number']}) "
                f"with reference {inv.investment_id}, then upload your proof of payment."
            ),
        ))
    elif review.status == InvestmentStatus.REJECTED:
        db.add(Notification(
            user_id=inv.user_id,
            type=NotificationType.INVESTMENT_REJECTED,
            message=f"Your investment request {inv.investment_id} was rejected. Reason: {review.admin_notes or 'not given'}",
        ))

    db.commit()
    db.refresh(inv)
    return investment_to_dict(inv)

# Customer uploads proof that they paid the money in
@router.post("/{investment_id}/deposit", status_code=201)
async def upload_deposit(
    investment_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Investment).filter(Investment.investment_id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    if inv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if stage(inv) != "awaiting_deposit":
        raise HTTPException(status_code=400, detail="This investment is not waiting for a deposit")
    if any(d.status == "pending" for d in inv.deposits):
        raise HTTPException(status_code=400, detail="Your last proof of deposit is still being reviewed")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, JPG or PNG allowed")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

    file_path = UPLOAD_DIR / f"{secrets.token_hex(8)}{Path(file.filename or 'file').suffix}"
    with open(file_path, "wb") as f:
        f.write(content)

    dep = InvestmentDeposit(
        deposit_id="DEP-" + secrets.token_hex(3).upper(),
        investment_id=inv.id,
        original_filename=file.filename or "deposit",
        file_path=str(file_path),
        content_type=file.content_type,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    background_tasks.add_task(run_deposit_check, dep.id)
    return deposit_to_dict(dep)

# Customer or admin opens the uploaded file
@router.get("/deposits/{deposit_id}/file")
def get_deposit_file(
    deposit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.query(InvestmentDeposit).filter(InvestmentDeposit.deposit_id == deposit_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role != UserRole.ADMIN and dep.investment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not os.path.exists(dep.file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(dep.file_path, media_type=dep.content_type)

@router.patch("/deposits/{deposit_id}")
def review_deposit(
    deposit_id: str,
    review: DepositReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    dep = db.query(InvestmentDeposit).filter(InvestmentDeposit.deposit_id == deposit_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if review.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be verified or rejected")
    inv = dep.investment
    if review.status == "verified" and inv.term:
        raise HTTPException(status_code=400, detail="This investment is already active")

    dep.status = review.status
    dep.admin_notes = review.admin_notes

    if review.status == "verified":
        db.add(InvestmentTerm(investment_id=inv.id, annual_rate=RATES[inv.risk_level], start_date=date.today()))
        db.add(Notification(
            user_id=inv.user_id,
            type=NotificationType.INVESTMENT_APPROVED,
            message=(
                f"Your deposit for {inv.investment_id} has been received. Your investment is now active "
                f"and earns {RATES[inv.risk_level]}% a year."
            ),
        ))
    else:
        db.add(Notification(
            user_id=inv.user_id,
            type=NotificationType.INVESTMENT_REJECTED,
            message=(
                f"Your proof of deposit for {inv.investment_id} was rejected. "
                f"Reason: {review.admin_notes or 'not given'}. Please upload a new one."
            ),
        ))

    db.commit()
    db.refresh(inv)
    return investment_to_dict(inv)