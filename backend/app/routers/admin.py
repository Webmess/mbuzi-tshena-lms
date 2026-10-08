from datetime import datetime, timedelta, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database import get_db
from app.models import (
    User, LoanApplication, Loan, Payment, FraudAlert,
    ApplicationStatus, UserRole, PaymentType, PaymentStatus
)
from app.schemas import (
    AdminDashboard, DashboardStats, ChartDataPoint, FraudAlertOut,
    UserOut, PaginatedResponse
)
from app.auth import get_current_admin
from app.utils.risk_score import relative_date, format_currency
from fastapi import Query

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard", response_model=AdminDashboard)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    # Active loans
    active_loans = db.query(Loan).filter(Loan.status == "Active").all()
    total_active_amount = sum(float(l.outstanding_balance) for l in active_loans)
    total_active_count = len(active_loans)

    # Reliable borrowers (users with risk_score < 40 or approved apps)
    reliable_count = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.BORROWER, User.is_active == True)
        .scalar()
        or 0
    )

    # Avg risk score
    avg_score = (
        db.query(func.avg(LoanApplication.ai_risk_score))
        .filter(LoanApplication.ai_risk_score.isnot(None))
        .scalar()
    )
    avg_score = float(avg_score) if avg_score else 24.0

    # Fraud alerts (unresolved)
    fraud_count = (
        db.query(func.count(FraudAlert.id))
        .filter(FraudAlert.is_resolved == False)
        .scalar()
        or 0
    )

    # Processed today
    today_start = datetime.combine(date.today(), datetime.min.time())
    processed_today = (
        db.query(func.count(LoanApplication.id))
        .filter(LoanApplication.created_at >= today_start)
        .scalar()
        or 0
    )

    stats = DashboardStats(
        total_active_loans_amount=total_active_amount,
        total_active_loans_count=total_active_count,
        reliable_borrowers_count=reliable_count,
        avg_ai_risk_score=round(avg_score, 1),
        fraud_alerts_count=fraud_count,
        processed_today=processed_today,
        accuracy_pct=99.8,  # placeholder
        trends={
            "active_loans": "+12.5%",
            "borrowers": "+5.2%",
            "risk_score": "-2.1%",
            "fraud": f"+{fraud_count}",
        },
    )

    # Chart data – last 7 days
    chart_data: List[ChartDataPoint] = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(6, -1, -1):
        day_date = date.today() - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())

        approvals = (
            db.query(func.count(LoanApplication.id))
            .filter(
                LoanApplication.status == ApplicationStatus.APPROVED,
                LoanApplication.reviewed_at >= day_start,
                LoanApplication.reviewed_at <= day_end,
            )
            .scalar()
            or 0
        )
        rejections = (
            db.query(func.count(LoanApplication.id))
            .filter(
                LoanApplication.status == ApplicationStatus.REJECTED,
                LoanApplication.reviewed_at >= day_start,
                LoanApplication.reviewed_at <= day_end,
            )
            .scalar()
            or 0
        )
        # fallback to created if no reviews yet
        if approvals == 0 and rejections == 0:
            approvals = (
                db.query(func.count(LoanApplication.id))
                .filter(
                    LoanApplication.ai_action == "Auto-Approve",
                    LoanApplication.created_at >= day_start,
                    LoanApplication.created_at <= day_end,
                )
                .scalar()
                or 0
            )

        chart_data.append(
            ChartDataPoint(
                day=days[day_date.weekday()],
                approvals=approvals,
                rejections=rejections,
            )
        )

    # Recent fraud alerts
    alerts = (
        db.query(FraudAlert)
        .filter(FraudAlert.is_resolved == False)
        .order_by(FraudAlert.created_at.desc())
        .limit(10)
        .all()
    )
    recent_alerts = [
        FraudAlertOut(
            id=a.alert_id,
            reason=a.reason,
            time=relative_date(a.created_at),
            risk=a.risk_score,
        )
        for a in alerts
    ]

    return AdminDashboard(
        stats=stats,
        chart_data=chart_data,
        recent_alerts=recent_alerts,
    )


@router.get("/borrowers", response_model=PaginatedResponse)
def list_borrowers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    q = db.query(User).filter(User.role == UserRole.BORROWER)

    if search:
        term = f"%{search}%"
        q = q.filter(
            (User.full_name.ilike(term))
            | (User.email.ilike(term))
            | (User.id_number.ilike(term))
        )

    total = q.count()
    users = (
        q.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "id_number": u.id_number,
            "phone": u.phone_number,
            "joined": relative_date(u.created_at),
            "loans": [
                {
                    "reference": a.reference_number,
                    "amount": format_currency(float(a.loan_amount)),
                    "loan_type": a.loan_type,
                    "status": a.status.value,
                    "score": a.ai_risk_score or 0,
                }
                for a in u.applications
            ],
        }
        for u in users
    ]
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )

@router.get("/alerts")
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
     rows = (
        db.query(FraudAlert, LoanApplication)
        .outerjoin(LoanApplication, FraudAlert.application_id == LoanApplication.id)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )
     return [
        {
            "id": a.alert_id,
            "type": "Fraud Suspicion" if a.risk_score >= 80 else "High Risk",
            "relatedId": app.reference_number if app else "—",
            "relatedUser": app.full_name if app else "Unknown applicant",
            "dateTime": a.created_at.strftime("%Y-%m-%d %H:%M"),
            "description": a.reason,
            "status": "resolved" if a.is_resolved else "unresolved",
            "read": a.is_resolved,
        }
        for a, app in rows
    ]

@router.patch("/alerts/{alert_id}")
def toggle_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    alert = db.query(FraudAlert).filter(FraudAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = not alert.is_resolved
    db.commit()
    return {"status": "resolved" if alert.is_resolved else "unresolved"}