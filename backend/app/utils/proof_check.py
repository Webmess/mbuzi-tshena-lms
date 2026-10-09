import hashlib
import re
import secrets
from datetime import date

from app.database import SessionLocal
from app.models import ProofOfPayment, ProofCheck, ProofStatus, FraudAlert
from app.utils.doc_check import extract_text, words_found, find_amount_after, latest_date

COMPANY_NAME = "Mbudzi Tshena"
MAX_AGE_DAYS = 30

# OCR mixes up letters and digits that look alike, e.g. O/0 and I/1
LOOKALIKES = str.maketrans("OQILSBZ", "0011582")

def reference_found(reference: str, text: str) -> bool:
    """True if the loan reference appears in the text, ignoring spaces and look-alike characters."""
    want = reference.upper().translate(LOOKALIKES)
    squashed = re.sub(r"[^A-Z0-9]", "", text.upper()).translate(LOOKALIKES)
    return want in squashed

def file_hash(file_path: str) -> str:
    with open(file_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def check_proof(proof: ProofOfPayment, db):
    """Returns (status, problems, amount_found, paid_on, hash)."""
    fingerprint = file_hash(proof.file_path)
    text = extract_text(proof.file_path, proof.content_type)
    if len(text.strip()) < 20:
        return "unreadable", ["No text could be read from this file"], None, None, fingerprint
    problems = []
    reference = proof.application.reference_number
    if not reference_found(reference, text):
        problems.append(f"Payment reference does not match the loan reference {reference}")
    if not words_found(COMPANY_NAME, text):
        problems.append(f"Payment was not made to {COMPANY_NAME}")

    amount = find_amount_after("amount", text)
    if amount is None:
        problems.append("Could not find the amount paid")
    paid_on = latest_date(text)
    if paid_on is None:
        problems.append("Could not find the payment date")
    elif paid_on > date.today():
        problems.append(f"Payment date {paid_on:%d %b %Y} is in the future")
    elif (date.today() - paid_on).days > MAX_AGE_DAYS:
        problems.append(f"Payment is dated {paid_on:%d %b %Y}, more than {MAX_AGE_DAYS} days ago")
     # The same payment uploaded twice: the exact same file, or the same amount and date on this loan
    earlier = (
        db.query(ProofCheck, ProofOfPayment)
        .join(ProofOfPayment, ProofCheck.proof_id == ProofOfPayment.id)
        .filter(ProofOfPayment.id != proof.id, ProofOfPayment.status != ProofStatus.REJECTED)
        .all()
    )
    for other_check, other in earlier:
        if other_check.file_hash == fingerprint:
            problems.append(f"This exact file was already uploaded ({other.proof_id})")
            break
        if (
            other.application_id == proof.application_id
            and amount is not None and other_check.amount_found is not None
            and abs(float(other_check.amount_found) - amount) < 0.01
            and other_check.paid_on == paid_on
        ):
            problems.append(f"Same amount and date as {other.proof_id}: possibly the same payment twice")
            break
    return ("mismatch" if problems else "passed"), problems, amount, paid_on, fingerprint
def run_proof_check(proof_id: int):
    """Runs in the background after a proof is uploaded, so it opens its own database session."""
    db = SessionLocal()
    try:
        proof = db.query(ProofOfPayment).filter(ProofOfPayment.id == proof_id).first()
        if not proof:
            return
        try:
            status, problems, amount, paid_on, fingerprint = check_proof(proof, db)
        except Exception as e:
            status, problems, amount, paid_on, fingerprint = "unreadable", [f"Could not read file: {e}"], None, None, None
        db.add(ProofCheck(
            proof_id=proof.id,
            status=status,
            details="\n".join(problems) or None,
            amount_found=amount,
            paid_on=paid_on,
            file_hash=fingerprint,
        ))
        if status == "mismatch":
            db.add(FraudAlert(
                alert_id=f"FA-{secrets.token_hex(4).upper()}",
                application_id=proof.application_id,
                reason=f"Document mismatch (Proof of payment {proof.proof_id}): " + "; ".join(problems),
                risk_score=70.0,
            ))
        db.commit()
    finally:
        db.close()
            

