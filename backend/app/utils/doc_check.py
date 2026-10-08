import re
import secrets
from datetime import date

import numpy as np
import pdfplumber
from rapidocr_onnxruntime import RapidOCR
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

_ocr = None

def ocr_image(image) -> str:
    """Read text from a photo or scan. The OCR model loads on first use (a few seconds)."""
    global _ocr
    if _ocr is None:
        _ocr = RapidOCR()
    result, _ = _ocr(image)
    return "\n".join(line[1] for line in result or [])

def extract_text(file_path: str, content_type: str) -> str:
    if content_type == "application/pdf":
        with pdfplumber.open(file_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if len(text.strip()) >= 20:
                return text
            # No text inside: it's a scanned PDF, so OCR each page as an image
            return "\n".join(
                ocr_image(np.array(page.to_image(resolution=200).original))
                for page in pdf.pages
            )
    if content_type in ("image/jpeg", "image/jpg", "image/png"):
        return ocr_image(file_path)
    return ""

# ---------- 2. Small helpers to find and compare details ----------

def words_found(expected: str, text: str) -> bool:
    """True if most words of `expected` appear in the text (allows small typos)."""
    ignore = {"pty", "ltd", "the", "and"}
    words = [w for w in re.findall(r"[a-z0-9]+", expected.lower()) if w not in ignore]
    if not words:
        return True
    text_words = re.findall(r"[a-z0-9]+", text.lower())
    squashed = "".join(text_words)  # OCR sometimes joins words: "THANDIWEGRACE"
    found = sum(
        1 for w in words
        if w in squashed
        or process.extractOne(w, text_words, scorer=fuzz.ratio, score_cutoff=85)
    )
    return found / len(words) >= 0.66

def find_amount_after(label: str, text: str):
    amount = r"(?P<amount>\d[\d ,]*\.\d{2})"
    gap = r"(?P<gap>\D{0,15}?)"
    # The amount usually follows its label, but OCR may put it before: "R 18 500.00 Net Pay"
    for pattern in (label + gap + amount, amount + gap + label):
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Skip it if a real word sits in between, e.g. "Gross Pay DEDUCTIONS R3744.00"
            if not re.search(r"[A-Za-z]{3,}", match.group("gap")):
                return float(match.group("amount").replace(" ", "").replace(",", ""))
    return None

def latest_date(text: str):
    found = []
    short_months = [m[:3] for m in MONTHS]
    # matches "15 September 2026", "15 Sep 2026" and OCR's "15Sep2026"
    for day, month, year in re.findall(r"(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{4})", text):
        if month[:3].lower() in short_months:
            try:
                found.append(date(int(year), short_months.index(month[:3].lower()) + 1, int(day)))
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
    income = float(app.monthly_income)
    pay = {
        "net pay": find_amount_after("net pay", text),
        "gross pay": find_amount_after("gross pay", text),
    }
    pay = {label: amount for label, amount in pay.items() if amount is not None}
    if not pay:
        problems.append("Could not find the net or gross pay on the payslip")
    elif all(abs(amount - income) > income * 0.10 for amount in pay.values()):
        found = ", ".join(f"{label} R{amount:,.2f}" for label, amount in pay.items())
        problems.append(f"Stated income R{income:,.2f} does not match the payslip ({found}) within 10%")
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

