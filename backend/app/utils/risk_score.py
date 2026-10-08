"""
Simple rule-based risk scoring for loan applications.
Score 0-100 where LOWER is better (less risk).
This is a placeholder for a real ML model.
"""
from datetime import date
from typing import Optional


def calculate_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def compute_risk_score(
    monthly_income: float,
    loan_amount: float,
    repayment_term: int,
    employment_status: str,
    years_employed: Optional[float],
    dependents: Optional[int],
    monthly_expenses: Optional[float],
    date_of_birth: date,
    existing_loans: Optional[str] = None,
) -> tuple[float, str]:
    """
    Returns (score 0-100, ai_action)
    """
    score = 30.0  # base

    # Affordability: debt-to-income
    if monthly_income > 0:
        instalment_estimate = loan_amount / max(repayment_term, 1) * 1.15  # rough with interest
        dti = instalment_estimate / monthly_income
        if dti > 0.5:
            score += 35
        elif dti > 0.35:
            score += 20
        elif dti > 0.25:
            score += 10
        else:
            score -= 5

    # Income level
    if monthly_income < 5000:
        score += 20
    elif monthly_income < 10000:
        score += 10
    elif monthly_income > 30000:
        score -= 10

    # Employment stability
    emp = (employment_status or "").lower()
    if emp in ("unemployed", "student"):
        score += 25
    elif emp == "self-employed":
        score += 8
    elif years_employed is not None:
        if years_employed < 1:
            score += 15
        elif years_employed < 2:
            score += 8
        elif years_employed >= 5:
            score -= 8

    # Age
    age = calculate_age(date_of_birth)
    if age < 21 or age > 65:
        score += 12
    elif 25 <= age <= 55:
        score -= 5

    # Dependents
    if dependents and dependents > 3:
        score += 8

    # Expenses
    if monthly_expenses and monthly_income > 0:
        expense_ratio = monthly_expenses / monthly_income
        if expense_ratio > 0.7:
            score += 15
        elif expense_ratio > 0.5:
            score += 7

    # Existing loans mention
    if existing_loans and existing_loans.strip().lower() not in ("none", "n/a", "no", ""):
        score += 10

    # Clamp
    score = max(0.0, min(100.0, score))

    # Determine AI action
    if score < 25:
        action = "Auto-Approve"
    elif score < 45:
        action = "Manual Review"
    elif score < 70:
        action = "Flagged"
    else:
        action = "Decline"

    return round(score, 1), action


def format_currency(amount: float) -> str:
    return f"R {amount:,.0f}"


def relative_date(dt) -> str:
    from datetime import datetime, timezone, timedelta
    sast = timezone(timedelta(hours=2))  # South Africa time (no daylight saving)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(sast)
    today = datetime.now(sast).date()
    days_ago = (today - dt.date()).days
    if days_ago == 0:
        return f"Today, {dt.strftime('%H:%M')}"
    if days_ago == 1:
        return f"Yesterday, {dt.strftime('%H:%M')}"
    if days_ago < 7:
        return dt.strftime("%a, %H:%M")
    return dt.strftime("%d %b %Y")