import os
import secrets
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, UserRole, LoanApplication, ApplicationStatus,
    ProofOfPayment, ProofStatus, Notification, NotificationType,
    Payment, PaymentType, PaymentStatus,
)
from app.auth import get_current_user, get_current_admin
from app.config import settings
from app.utils.risk_score import format_currency
from app.utils.loan_balance import loan_totals, update_loan_balance
from app.routers.payments import generate_trx_id
from app.utils.proof_check import run_proof_check

router = APIRouter(prefix="/api/proofs", tags=["Proof of Payment"])

UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "proofs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}

def proof_payment(p: ProofOfPayment):
    """The repayment that was recorded when this proof was verified (if any)."""
    loan = p.application.loan if p.application else None
    if not loan:
        return None
    return next((pay for pay in loan.payments if pay.reference == p.proof_id), None)


def proof_to_dict(p: ProofOfPayment) -> dict:
    loan = p.application.loan if p.application else None
    payment = proof_payment(p)
    return {
        "id": p.proof_id,
        "user_name": p.user.full_name if p.user else "Unknown",
        "user_email": p.user.email if p.user else "",
        "loan_reference": p.application.reference_number if p.application else "",
        "loan_amount": format_currency(float(p.application.loan_amount)) if p.application else "",
        "file_name": p.original_filename,
        "file_type": "pdf" if p.content_type == "application/pdf" else "image",
        "uploaded_at": p.uploaded_at,
        "status": p.status.value,
        "admin_notes": p.admin_notes,
        "amount_paid": float(payment.amount) if payment and payment.status == PaymentStatus.COMPLETED else None,
        "loan_totals": loan_totals(loan) if loan else None,
        "check": {
            "status": p.check.status,
            "details": p.check.details,
            "amount_found": float(p.check.amount_found) if p.check.amount_found is not None else None,
        } if p.check else None,
    }

@router.post("/upload/{reference_number}", status_code=201)
async def upload_proof(
    reference_number: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    #  Find the loan and make sure it belongs to this borrower
    app = db.query(LoanApplication).filter(LoanApplication.reference_number == reference_number).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if app.status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="You can only upload proof for an approved loan")
    if app.loan and app.loan.status == "Paid Off":
        raise HTTPException(status_code=400, detail="This loan is already paid off")
    if db.query(ProofOfPayment).filter(
        ProofOfPayment.application_id == app.id,
        ProofOfPayment.status == ProofStatus.PENDING,
    ).first():
        raise HTTPException(status_code=400, detail="Your last proof of payment is still being reviewed")
      #  Check file type and size 
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, JPG or PNG allowed")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")
    ext = Path(file.filename or "file").suffix
    file_path = UPLOAD_DIR / f"{secrets.token_hex(8)}{ext}"
    with open(file_path, "wb") as f:
        f.write(content)
     # Save a row in the database
    proof = ProofOfPayment(
        proof_id="POP-" + secrets.token_hex(3).upper(),
        user_id=current_user.id,
        application_id=app.id,
        original_filename=file.filename or "proof",
        file_path=str(file_path),
        content_type=file.content_type,
    )
    db.add(proof)
    db.commit()
    db.refresh(proof)
    background_tasks.add_task(run_proof_check, proof.id)
    return proof_to_dict(proof)

@router.get("/me")
def my_proofs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proofs = (
        db.query(ProofOfPayment)
        .filter(ProofOfPayment.user_id == current_user.id)
        .order_by(ProofOfPayment.uploaded_at.desc())
        .all()
    )
    return [proof_to_dict(p) for p in proofs]

@router.get("")
def list_proofs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    proofs = db.query(ProofOfPayment).order_by(ProofOfPayment.uploaded_at.desc()).all()
    return [proof_to_dict(p) for p in proofs]

@router.get("/{proof_id}/file")
def get_proof_file(
    proof_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proof = db.query(ProofOfPayment).filter(ProofOfPayment.proof_id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
    if current_user.role != UserRole.ADMIN and proof.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not os.path.exists(proof.file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(proof.file_path, media_type=proof.content_type)

class ProofReview(BaseModel):
    status: ProofStatus
    admin_notes: Optional[str] = None
    amount: Optional[float] = None  # how much the proof shows was paid

@router.patch("/{proof_id}")
def review_proof(
    proof_id: str,
    review: ProofReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    proof = db.query(ProofOfPayment).filter(ProofOfPayment.proof_id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")

    loan = proof.application.loan
    payment = proof_payment(proof)
    was_verified = proof.status == ProofStatus.VERIFIED  # True when the admin is only correcting the amount

    if review.status == ProofStatus.VERIFIED:
        if not loan:
            raise HTTPException(status_code=400, detail="This application has no loan yet")
        if not review.amount or review.amount <= 0:
            raise HTTPException(status_code=400, detail="Enter the amount that was paid")
        if payment:  # verified before, then rejected: switch the same payment back on
            payment.amount = review.amount
            payment.status = PaymentStatus.COMPLETED
        else:
            db.add(Payment(
                transaction_id=generate_trx_id(),
                loan=loan,
                user_id=proof.user_id,
                amount=review.amount,
                payment_type=PaymentType.REPAYMENT,
                status=PaymentStatus.COMPLETED,
                payment_method="EFT",
                reference=proof.proof_id,
                notes="Recorded from proof of payment",
                processed_at=datetime.utcnow(),
            ))
    elif payment:  # a verified proof is rejected after all: cancel its payment
        payment.status = PaymentStatus.CANCELLED

    proof.status = review.status
    proof.admin_notes = review.admin_notes
    totals = update_loan_balance(loan) if loan else None

    ref = proof.application.reference_number
    if review.status == ProofStatus.VERIFIED:
        db.add(Notification(
            user_id=proof.user_id,
            type=NotificationType.PROOF_ACCEPTED,
            message=(
                f"The amount recorded for your payment on loan {ref} was corrected to R{review.amount:,.2f}. "
                if was_verified else
                f"Your payment of R{review.amount:,.2f} for loan {ref} has been verified. "
            ) + f"Remaining balance: R{totals['balance']:,.2f}.",
        ))        
    elif review.status == ProofStatus.REJECTED:
        db.add(Notification(
            user_id=proof.user_id,
            type=NotificationType.PROOF_REJECTED,
            message=f"Your proof of payment for loan {ref} was rejected. Reason: {review.admin_notes or 'not given'}",
        ))

    db.commit()
    db.refresh(proof)
    return proof_to_dict(proof)