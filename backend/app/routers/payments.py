import secrets
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.database import get_db
from app.models import User, Payment, PaymentType, PaymentStatus, Loan
from app.schemas import (
    PaymentCreate, PaymentOut, PaymentListItem, Message, PaginatedResponse
)
from app.auth import get_current_user, get_current_admin
from app.utils.risk_score import format_currency, relative_date

router = APIRouter(prefix="/api/payments", tags=["Payments"])


def generate_trx_id() -> str:
    return f"TRX-{secrets.randbelow(9000) + 1000}"


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    trx = generate_trx_id()
    while db.query(Payment).filter(Payment.transaction_id == trx).first():
        trx = generate_trx_id()

    payment = Payment(
        transaction_id=trx,
        loan_id=data.loan_id,
        user_id=data.user_id,
        amount=data.amount,
        payment_type=data.payment_type,
        status=PaymentStatus.COMPLETED,
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes,
        processed_at=datetime.utcnow(),
    )
    db.add(payment)

    # Update loan balance if repayment
    if data.loan_id and data.payment_type == PaymentType.REPAYMENT:
        loan = db.query(Loan).filter(Loan.id == data.loan_id).first()
        if loan:
            loan.outstanding_balance = max(0, float(loan.outstanding_balance) - float(data.amount))
            if loan.outstanding_balance <= 0:
                loan.status = "Paid Off"

    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=PaginatedResponse)
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    q = db.query(Payment).options(joinedload(Payment.user))

    if status:
        q = q.filter(Payment.status == status)

    if search:
        term = f"%{search}%"
        q = q.join(User).filter(
            or_(
                Payment.transaction_id.ilike(term),
                User.full_name.ilike(term),
            )
        )

    total = q.count()
    payments = (
        q.order_by(Payment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for p in payments:
        sign = "+" if p.payment_type == PaymentType.REPAYMENT else "-"
        items.append(
            PaymentListItem(
                id=p.transaction_id,
                borrower=p.user.full_name if p.user else "Unknown",
                email=p.user.email if p.user else "",
                amount=f"{sign}{format_currency(float(p.amount))}",
                type=p.payment_type.value,
                date=relative_date(p.created_at),
                status=p.status.value,
            )
        )

    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/summary")
def payments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from datetime import date
    today = date.today()

    total_collected = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.payment_type == PaymentType.REPAYMENT,
            Payment.status == PaymentStatus.COMPLETED,
        )
        .scalar()
    )
    total_disbursed = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.payment_type == PaymentType.DISBURSEMENT,
            Payment.status == PaymentStatus.COMPLETED,
        )
        .scalar()
    )
    failed_count = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == PaymentStatus.FAILED)
        .scalar()
    )

    return {
        "total_collected": float(total_collected),
        "total_disbursed": float(total_disbursed),
        "failed_count": failed_count,
    }

@router.get("/{rtx_id}", response_model=dict)
def get_payment(
    rtx_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    payment = (
        db.query(Payment)
        .filter(Payment.transaction_id == rtx_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    borrower = db.query(User).filter(User.id == payment.user_id).first()
    payment_data = {
        column.name: getattr(payment, column.name)
        for column in Payment.__table__.columns
    }
    payment_data["borrower_name"] = borrower.full_name if borrower else None
    payment_data["phone"] = borrower.phone_number if borrower else None
    payment_data["date"] = (
        payment.created_at.strftime("%Y-%m-%d %H:%M:%S")
        if payment.created_at
        else None
    )
    return payment_data

@router.get("/me", response_model=List[PaymentOut])
def my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return payments