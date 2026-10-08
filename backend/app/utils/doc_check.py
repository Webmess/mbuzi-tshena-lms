import re
import secrets
from datetime import date

import pdfplumber
from rapidfuzz import fuzz, process

from app.database import SessionLocal
from app.models import Document, DocumentCheck, FraudAlert

MONTHS = ["january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december"]

DOC_LABELS = {
    "id_document": "ID",
    "payslip": "Payslip",
    "bank_statement": "Bank statement",
    "proof_of_residence": "Proof of residence",
}

# ---------- 1. Get the text out of the file ----------

def extract_text(file_path: str, content_type: str) -> str:
    if content_type == "application/pdf":
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    return ""  # images are read with OCR in Phase 3

# ---------- 2. Small helpers to find and compare details ----------

def words_found(expected: str, text: str) -> bool:
    """True if most words of `expected` appear in the text (allows small typos)."""
    ignore = {"pty", "ltd", "the", "and"}
    words = [w for w in re.findall(r"[a-z0-9]+", expected.lower()) if w not in ignore]
    if not words:
        return True
    text_words = re.findall(r"[a-z0-9]+", text.lower())
    found = sum(
        1 for w in words
        if process.extractOne(w, text_words, scorer=fuzz.ratio, score_cutoff=85)
    )
    return found / len(words) >= 0.66

def find_amount_after(label: str, text: str):
    match = re.search(label + r"\D{0,15}(\d[\d ,]*\.\d{2})", text, re.IGNORECASE)
    if not match:
        return None
    return float(match.group(1).replace(" ", "").replace(",", ""))

def latest_date(text: str):
    found = []
    for day, month, year in re.findall(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text):
        if month.lower() in MONTHS:
            try:
                found.append(date(int(year), MONTHS.index(month.lower()) + 1, int(day)))
            except ValueError:
                pass
    return max(found) if found else None

# ---------- 3. One check per document type ----------

def check_id_document(text, app):
    problems = []
    if app.id_number not in re.findall(r"\d{13}", text):
        problems.append("ID number on the document does not match the application")
    if not words_found(app.full_name, text):
        problems.append("Name on the ID does not match the application")
    return problems

def check_payslip(text, app):
    problems = []
    if not words_found(app.full_name, text):
        problems.append("Name on the payslip does not match the application")
    if app.employer_name and not words_found(app.employer_name, text):
        problems.append("Employer on the payslip does not match the application")
    net_pay = find_amount_after("net pay", text)
    income = float(app.monthly_income)
    if net_pay is None:
        problems.append("Could not find the net pay on the payslip")
    elif abs(net_pay - income) > income * 0.10:
        problems.append(f"Net pay R{net_pay:,.2f} differs from stated income R{income:,.2f} by more than 10%")
    return problems

def check_bank_statement(text, app):
    problems = []
    if not words_found(app.full_name, text):
        problems.append("Account holder does not match the application")
    if app.account_number.replace(" ", "") not in text.replace(" ", ""):
        problems.append("Account number on the statement does not match the application")
    bank = app.bank_name.replace("-", " ")
    if bank != "other" and bank not in text.lower():
        problems.append("Bank on the statement does not match the application")
    return problems

def check_proof_of_residence(text, app):
    problems = []
    if not words_found(app.full_name, text):
        problems.append("Name on the proof of residence does not match the application")
    if not words_found(app.residential_address, text):
        problems.append("Address does not match the application")
    newest = latest_date(text)
    if newest is None:
        problems.append("Could not find a date on the document")
    elif (date.today() - newest).days > 92:
        problems.append(f"Document is dated {newest:%d %b %Y}, older than 3 months")
    return problems

CHECKS = {
    "id_document": check_id_document,
    "payslip": check_payslip,
    "bank_statement": check_bank_statement,
    "proof_of_residence": check_proof_of_residence,
}

# ---------- 4. Run the check and save the result ----------

def check_document(doc, app):
    """Returns (status, problems). Status is passed / mismatch / unreadable / skipped."""
    checker = CHECKS.get(doc.document_type)
    if not checker:
        return "skipped", []
    text = extract_text(doc.file_path, doc.content_type)
    if len(text.strip()) < 20:
        return "unreadable", ["No text could be read from this file"]
    problems = checker(text, app)
    return ("mismatch" if problems else "passed"), problems

def run_document_check(document_id: int):
    """Runs in the background after an upload, so it opens its own database session."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return
        app = doc.application
        try:
            status, problems = check_document(doc, app)
        except Exception as e:
            status, problems = "unreadable", [f"Could not read file: {e}"]

        db.add(DocumentCheck(
            document_id=doc.id,
            status=status,
            details="\n".join(problems) or None,
        ))
        if status == "mismatch":
            label = DOC_LABELS.get(doc.document_type, "Document")
            db.add(FraudAlert(
                alert_id=f"FA-{secrets.token_hex(4).upper()}",
                application_id=app.id,
                reason=f"Document mismatch ({label}): " + "; ".join(problems),
                risk_score=70.0,
            ))
        db.commit()
    finally:
        db.close()

