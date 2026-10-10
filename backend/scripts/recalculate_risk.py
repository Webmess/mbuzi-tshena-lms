"""
One-time: recalculate the AI risk score of every loan application with the current formula
(app/utils/risk_assessment.py), and close old "High AI risk score" alerts that are no longer risky.

Run from the backend folder:
    .\\venv\\Scripts\\python.exe scripts\\recalculate_risk.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # so "app" can be imported

from app.database import SessionLocal  # noqa: E402
from app.models import LoanApplication, FraudAlert  # noqa: E402
from app.utils.risk_assessment import assess_application  # noqa: E402

db = SessionLocal()
try:
    for app in db.query(LoanApplication).order_by(LoanApplication.id).all():
        old = app.ai_risk_score
        result = assess_application(app)
        app.ai_risk_score = result["risk_score"]
        app.ai_action = result["ai_action"]
        print(f"{app.reference_number}: {old} -> {result['risk_score']} ({result['ai_action'].value})")

        if result["risk_score"] < 60:  # below the alert threshold now
            for alert in db.query(FraudAlert).filter(
                FraudAlert.application_id == app.id,
                FraudAlert.reason.like("High AI risk score%"),
                FraudAlert.is_resolved == False,  # noqa: E712
            ):
                alert.is_resolved = True
                print(f"    closed alert {alert.alert_id}")
    db.commit()
    print("Done.")
finally:
    db.close()

    