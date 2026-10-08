import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Investment, InvestmentStatus, Notification, NotificationType
from app.auth import get_current_user, get_current_admin
from app.utils.risk_score import relative_date

router = APIRouter(prefix="/api/investments", tags=["Investments"])

RISK_LEVELS = {"Conservative", "Moderate", "Aggressive"}


class InvestmentCreate(BaseModel):
    amount: float = Field(ge=1000)            # same minimum as the customer form
    duration_months: int = Field(gt=0, le=60)
    risk_level: str

class InvestmentReview(BaseModel):
    status: InvestmentStatus
    admin_notes: Optional[str] = None

def investment_to_dict(i: Investment) -> dict:
    return {
        "id": i.investment_id,
        "user_name": i.user.full_name if i.user else "Unknown",
        "user_email": i.user.email if i.user else "",
        "amount": float(i.amount),
        "duration": i.duration_months,
        "risk_level": i.risk_level,
        "status": i.status.value,
        "admin_notes": i.admin_notes,
        "submitted_at": relative_date(i.created_at),
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

# Customer sees their own requests
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
            message=f"Your investment request {inv.investment_id} has been approved.",
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