import secrets
from datetime import date

from app.database import SessionLocal
from app.models import InvestmentDeposit, FraudAlert
from app.utils.doc_check import extract_text, words_found, find_amount_after, latest_date
from app.utils.proof_check import reference_found, file_hash, COMPANY_NAME, MAX_AGE_DAYS

def check_deposit(dep: InvestmentDeposit, db):
    """Returns (status, problems, amount_found, paid_on, hash). Same checks as a loan proof of payment."""
    fingerprint = file_hash(dep.file_path)
    text = extract_text(dep.file_path, dep.content_type)
    if len(text.strip()) < 20:
        return "unreadable", ["No text could be read from this file"], None, None, fingerprint

    problems = []
    inv = dep.investment
    # "INV-DDC5C4" -> "INVDDC5C4", because reference_found ignores dashes and spaces in the text
    if not reference_found(inv.investment_id.replace("-", ""), text):
        problems.append(f"Payment reference does not match {inv.investment_id}")
    if not words_found(COMPANY_NAME, text):
        problems.append(f"Payment was not made to {COMPANY_NAME}")
    amount = find_amount_after("amount", text)
    if amount is None:
        problems.append("Could not find the amount paid")
    elif abs(amount - float(inv.amount)) > 0.01:
        problems.append(f"Amount paid R{amount:,.2f} is not the investment amount R{float(inv.amount):,.2f}")
    paid_on = latest_date(text)
    if paid_on is None:
        problems.append("Could not find the payment date")
    elif paid_on > date.today():
        problems.append(f"Payment date {paid_on:%d %b %Y} is in the future")
    elif (date.today() - paid_on).days > MAX_AGE_DAYS:
        problems.append(f"Payment is dated {paid_on:%d %b %Y}, more than {MAX_AGE_DAYS} days ago")
    # The exact same file uploaded before (for any investment)
    same_file = (
        db.query(InvestmentDeposit)
        .filter(InvestmentDeposit.id != dep.id, InvestmentDeposit.file_hash == fingerprint,
                InvestmentDeposit.status != "rejected")
        .first()
    )
    if same_file:
        problems.append(f"This exact file was already uploaded ({same_file.deposit_id})")

    return ("mismatch" if problems else "passed"), problems, amount, paid_on, fingerprint

def run_deposit_check(deposit_id: int):
    """Runs in the background after a deposit proof is uploaded, so it opens its own database session."""
    db = SessionLocal()
    try:
        dep = db.query(InvestmentDeposit).filter(InvestmentDeposit.id == deposit_id).first()
        if not dep:
            return
        try:
            status, problems, amount, paid_on, fingerprint = check_deposit(dep, db)
        except Exception as e:
            status, problems, amount, paid_on, fingerprint = "unreadable", [f"Could not read file: {e}"], None, None, None
        dep.check_status = status
        dep.check_details = "\n".join(problems) or None
        dep.amount_found = amount
        dep.paid_on = paid_on
        dep.file_hash = fingerprint
        if status == "mismatch":
            db.add(FraudAlert(
                alert_id=f"FA-{secrets.token_hex(4).upper()}",
                application_id=None,
                reason=f"Document mismatch (Investment deposit {dep.deposit_id} for {dep.investment.investment_id}): "
                       + "; ".join(problems),
                risk_score=70.0,
            ))
        db.commit()
    finally:
        db.close()


