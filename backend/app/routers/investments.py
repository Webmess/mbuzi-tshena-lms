import os
import secrets
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, UserRole, Investment, InvestmentStatus, InvestmentTerm, InvestmentDeposit, InvestmentPayout,
    Notification, NotificationType,
)
from app.auth import get_current_user, get_current_admin
from app.config import settings
from app.utils.risk_score import relative_date
from app.utils.investment_interest import RATES, investment_figures
from app.utils.deposit_check import run_deposit_check
from app.utils.email import send_investment_email

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

def money(value: float) -> str:
    return f"R{value:,.2f}"

def long_date(iso: str) -> str:
    return date.fromisoformat(iso).strftime("%d %B %Y")  # "2026-10-09" -> "09 October 2026"

def email_customer(background_tasks: BackgroundTasks, inv: Investment, subject: str, heading: str,
                   intro: str, details: dict, note: str = ""):
    """Send an investment email to the customer after the response, like the loan application email."""
    background_tasks.add_task(
        send_investment_email,
        to_email=inv.user.email,
        subject=subject,
        customer_name=inv.user.full_name,
        heading=heading,
        intro=intro,
        details=details,
        note=note,
    )
def stage(i: Investment) -> str:
    """Where the investment is: pending -> awaiting_deposit -> active -> matured -> paid_out (or rejected)."""
    if i.status == InvestmentStatus.APPROVED:
        if not i.term:
            return "awaiting_deposit"
        if i.payout:
            return "paid_out"
        maturity = i.term.start_date + relativedelta(months=i.duration_months)
        return "matured" if date.today() >= maturity else "active"
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
        "payout": {"amount": float(i.payout.amount), "paid_on": i.payout.paid_on.isoformat()} if i.payout else None,
        **investment_figures(i),
    }

# Customer submits a request
@router.post("", status_code=201)
def create_investment(
    data: InvestmentCreate,
    background_tasks: BackgroundTasks,
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
    figures = investment_figures(inv)
    email_customer(
        background_tasks, inv,
        subject=f"Investment request received – {inv.investment_id}",
        heading="We received your investment request",
        intro="thank you for choosing to invest with us. Here is a summary of your request.",
        details={
            "Reference": inv.investment_id,
            "Amount": money(float(inv.amount)),
            "Duration": f"{inv.duration_months} months",
            "Risk level": f"{inv.risk_level} ({figures['annual_rate']}% a year)",
            "Expected value at maturity": money(figures["expected_at_maturity"]),
        },
        note="We will let you know as soon as your request has been reviewed.",
    )
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
    background_tasks: BackgroundTasks,
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
        email_customer(
            background_tasks, inv,
            subject=f"Investment approved: please pay your deposit – {inv.investment_id}",
            heading="Your investment has been approved",
            intro="please pay your investment amount into the account below to activate it.",
            details={
                "Amount to pay": money(float(inv.amount)),
                "Account name": PAY_TO["account_name"],
                "Bank": PAY_TO["bank"],
                "Account number": PAY_TO["account_number"],
                "Branch code": PAY_TO["branch_code"],
                "Payment reference": inv.investment_id,
            },
            note="Use the payment reference exactly as shown, then upload your proof of payment on your dashboard. "
                 "Your investment starts earning interest once we have verified your deposit.",
        )
    elif review.status == InvestmentStatus.REJECTED:
        db.add(Notification(
            user_id=inv.user_id,
            type=NotificationType.INVESTMENT_REJECTED,
            message=f"Your investment request {inv.investment_id} was rejected. Reason: {review.admin_notes or 'not given'}",
        ))
        email_customer(
            background_tasks, inv,
            subject=f"Investment request update – {inv.investment_id}",
            heading="Your investment request was not approved",
            intro="unfortunately we could not approve your investment request.",
            details={
                "Reference": inv.investment_id,
                "Amount": money(float(inv.amount)),
                "Reason": review.admin_notes or "Not given",
            },
            note="You are welcome to submit a new request from your dashboard.",
        )

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
    background_tasks: BackgroundTasks,
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
    if review.status == "verified":
        figures = investment_figures(inv)
        email_customer(
            background_tasks, inv,
            subject=f"Your investment is now active – {inv.investment_id}",
            heading="Your investment is now active",
            intro="we have received your deposit and your investment has started earning interest.",
            details={
                "Reference": inv.investment_id,
                "Amount invested": money(float(inv.amount)),
                "Interest rate": f"{figures['annual_rate']}% a year",
                "Start date": long_date(figures["start_date"]),
                "Maturity date": long_date(figures["maturity_date"]),
                "Value at maturity": money(figures["expected_at_maturity"]),
            },
            note="You can follow how your investment grows every day on your dashboard.",
        )
    else:
        email_customer(
            background_tasks, inv,
            subject=f"Proof of deposit not accepted – {inv.investment_id}",
            heading="We could not accept your proof of deposit",
            intro="we could not verify the proof of deposit you uploaded.",
            details={
                "Reference": inv.investment_id,
                "Amount to pay": money(float(inv.amount)),
                "Reason": review.admin_notes or "Not given",
            },
            note="Please upload a new proof of payment on your dashboard.",
        )
    return investment_to_dict(inv)
# Admin pays the investor out once the investment has matured
@router.patch("/{investment_id}/payout")
def pay_out_investment(
    investment_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    inv = db.query(Investment).filter(Investment.investment_id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    if stage(inv) != "matured":
        raise HTTPException(status_code=400, detail="Only a matured investment can be paid out")
    amount = investment_figures(inv)["expected_at_maturity"]
    db.add(InvestmentPayout(investment_id=inv.id, amount=amount, paid_on=date.today()))
    db.add(Notification(
        user_id=inv.user_id,
        type=NotificationType.INVESTMENT_APPROVED,
        message=f"Your investment {inv.investment_id} has matured and R{amount:,.2f} has been paid out to you.",
    ))
    db.commit()
    db.refresh(inv)

    email_customer(
        background_tasks, inv,
        subject=f"Your investment has been paid out – {inv.investment_id}",
        heading="Your investment has been paid out",
        intro="your investment has reached its maturity date and we have paid out your money.",
        details={
            "Reference": inv.investment_id,
            "Amount invested": money(float(inv.amount)),
            "Interest earned": money(amount - float(inv.amount)),
            "Amount paid out": money(amount),
            "Paid on": long_date(date.today().isoformat()),
        },
        note="Thank you for investing with Mbudzi Tshena. You are welcome to start a new investment from your dashboard.",
    )
    return investment_to_dict(inv)
