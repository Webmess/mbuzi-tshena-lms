"""
AI risk assessment in one place: the hybrid score used when a customer applies, the explanation the
admin sees in Loan Requests, and the one-time recalculation (backend/scripts/recalculate_risk.py).

Hybrid score = half machine-learning model (trained on past loans) + half affordability rules.
Works for a new application (the form data) and for a saved LoanApplication: both have the same field names.
"""
from app.model.run import LoanPredictionModel
from app.models import AIAction, ApplicationStatus
from app.utils.risk_score import compute_risk_score, calculate_age

_model = None

def get_model() -> LoanPredictionModel:
    global _model
    if _model is None:
        _model = LoanPredictionModel()
    return _model

def assess_application(a) -> dict:
    """Returns the model's risk, the rules' risk, the hybrid score (0-100, lower is better) and the AI action."""
    result = get_model().predict_one(
        # Not asked on our form: neutral values
        Gender=0,
        Education=0,
        Credit_History=1,  # 1 = meets credit guidelines; we have no credit bureau check
        CoapplicantIncome=0,
        # From the application
        Married=1 if (a.marital_status or "").lower() == "married" else 0,
        Dependents=a.dependents or 0,
        Self_Employed=1 if (a.employment_status or "").lower() == "self-employed" else 0,
        ApplicantIncome=float(a.monthly_income),
        LoanAmount=float(a.loan_amount) / 1000,  # the training data stores loan amounts in thousands
        Loan_Amount_Term=a.repayment_term,
        Rural=0,
        Semiurban=0,
        Urban=0,
    )

    ml_risk = result["rejection_probability"]
    rule_risk, _ = compute_risk_score(
        monthly_income=float(a.monthly_income),
        loan_amount=float(a.loan_amount),
        repayment_term=a.repayment_term,
        employment_status=a.employment_status,
        years_employed=a.years_employed,
        dependents=a.dependents,
        monthly_expenses=float(a.monthly_expenses) if a.monthly_expenses is not None else None,
        date_of_birth=a.date_of_birth,
        existing_loans=a.existing_loans,
    )

    score = round((ml_risk + rule_risk) / 2, 1)

    if score < 25:
        action = AIAction.AUTO_APPROVE
    elif score < 45:
        action = AIAction.MANUAL_REVIEW
    elif score < 70:
        action = AIAction.FLAGGED
    else:
        action = AIAction.DECLINE
    return {"ml_risk": ml_risk, "rule_risk": rule_risk, "risk_score": score, "ai_action": action}

def risk_reasons(a) -> list:
    """The factors behind the rule part, in plain words (same rules as compute_risk_score)."""
    reasons = []
    income = float(a.monthly_income)
    instalment = float(a.loan_amount) / max(a.repayment_term, 1) * 1.15
    share = instalment / income * 100 if income > 0 else 100
    if share > 50:
        reasons.append(f"the estimated instalment (R{instalment:,.0f}) would take {share:.0f}% of the monthly income, which is not affordable")
    elif share > 35:
        reasons.append(f"the estimated instalment (R{instalment:,.0f}) would take {share:.0f}% of the monthly income, which is high")
    elif share > 25:
        reasons.append(f"the estimated instalment (R{instalment:,.0f}) would take {share:.0f}% of the monthly income")
    else:
        reasons.append(f"the estimated instalment (R{instalment:,.0f}) is only {share:.0f}% of the monthly income, which is affordable")

    if income < 5000:
        reasons.append(f"a low monthly income (R{income:,.0f})")
    elif income > 30000:
        reasons.append(f"a high monthly income (R{income:,.0f})")

    status = (a.employment_status or "").lower()
    if status in ("unemployed", "student"):
        reasons.append("no employment income")
    elif status == "self-employed":
        reasons.append("self-employed (less predictable income)")
    elif a.years_employed is not None and a.years_employed < 1:
        reasons.append("less than a year in the current job")
    elif a.years_employed is not None and a.years_employed >= 5:
        reasons.append(f"{a.years_employed:g} years in the same job")

    age = calculate_age(a.date_of_birth)
    if age < 21 or age > 65:
        reasons.append(f"age {age}")
    if a.dependents and a.dependents > 3:
        reasons.append(f"{a.dependents} dependents")
    if a.monthly_expenses and income > 0 and float(a.monthly_expenses) / income > 0.5:
        reasons.append(f"monthly expenses are {float(a.monthly_expenses) / income * 100:.0f}% of income")
    if a.existing_loans and a.existing_loans.strip().lower() not in ("none", "n/a", "no", ""):
        reasons.append("other existing loans or debts")
    return reasons

def explain_application(app) -> dict:
    """Extra fields for the admin's detail view in Loan Requests."""
    r = assess_application(app)
    explanation = (
        f"The risk score combines a machine-learning model trained on past loans "
        f"({r['ml_risk']:.0f}% predicted chance of rejection, based on income, loan amount, term, marital status "
        f"and dependents) with affordability rules ({r['rule_risk']:.0f}/100). "
        f"Main factors: {'; '.join(risk_reasons(app))}. Recommended action: {r['ai_action'].value}."
    )

    decided = app.status not in (ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW)
    reviewer = app.reviewer.full_name if app.reviewer else "an administrator"
    if not decided:
        decision = "Pending review"
    else:
        decision = app.admin_notes or f"{app.status.value} by {reviewer}."

    # An override is when the admin decided against the AI's recommendation
    overridden = decided and (
        (app.status == ApplicationStatus.APPROVED and app.ai_action in (AIAction.DECLINE, AIAction.FLAGGED))
        or (app.status == ApplicationStatus.REJECTED and app.ai_action == AIAction.AUTO_APPROVE)
    )

    return {
        "repaymentProbability": round(100 - (app.ai_risk_score or 0), 1),
        "aiExplanation": explanation,
        "decisionReason": decision,
        "overrideHistory": {
            "status": app.status.value,
            "comment": app.admin_notes or "No reason given",
            "by": reviewer,
            "at": app.reviewed_at.strftime("%Y-%m-%d %H:%M") if app.reviewed_at else "",
        } if overridden else None,
        "purpose": app.loan_purpose,
        "submitted_date": app.created_at.strftime("%d %b %Y, %H:%M"),
    }

