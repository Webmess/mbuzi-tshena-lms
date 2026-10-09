"""
Make a FICTIONAL proof-of-payment (EFT confirmation) for testing the Mbudzi Tshena LMS.
Every file is clearly marked SPECIMEN. Only use it with test data.

Run it from the backend folder:

    .\\venv\\Scripts\\python.exe scripts\\make_test_proof.py LNGX4O4W5SH 614.59
    .\\venv\\Scripts\\python.exe scripts\\make_test_proof.py INV-34E7B6 10000 --name "Thandiwe Grace Nkosi"
    .\\venv\\Scripts\\python.exe scripts\\make_test_proof.py LNGX4O4W5SH 614.59 --days-ago 90     (too old)
    .\\venv\\Scripts\\python.exe scripts\\make_test_proof.py LNGX4O4W5SH 614.59 --to "Other Company"  (wrong beneficiary)

It saves a PNG and a PDF in Downloads\\mbuzi-test-proofs
"""
import argparse
import os
import random
from datetime import date, timedelta

from PIL import Image, ImageDraw, ImageFont

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
OUT_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "mbuzi-test-proofs")


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", name), size)
    except OSError:
        return ImageFont.load_default()


def main():
    p = argparse.ArgumentParser(description="Make a SPECIMEN proof of payment for testing")
    p.add_argument("reference", help="loan reference (e.g. LNGX4O4W5SH) or investment ID (e.g. INV-34E7B6)")
    p.add_argument("amount", type=float, help="amount paid, e.g. 614.59")
    p.add_argument("--name", default="Test Customer", help="who paid")
    p.add_argument("--to", default="Mbudzi Tshena Financial Solutions", help="who was paid (beneficiary)")
    p.add_argument("--days-ago", type=int, default=0, help="payment date, in days before today")
    a = p.parse_args()

    paid_on = date.today() - timedelta(days=a.days_ago)
    trx = f"CPT-{paid_on.year}-{random.randint(100000, 999999)}"
    amount = f"R {a.amount:,.2f}".replace(",", " ")
    rows = [
        ("Date paid", f"{paid_on.day:02d} {MONTHS[paid_on.month - 1]} {paid_on.year}"),
        ("Transaction ID", trx),
        ("From", a.name),
        ("Beneficiary", a.to),
        ("Beneficiary bank", "FNB 62004410"),
        ("Beneficiary reference", a.reference),
        ("Payment type", "Immediate EFT"),
    ]

    img = Image.new("RGB", (1240, 1000), "white")
    d = ImageDraw.Draw(img)
    d.text((80, 70), "Capitec - Payment Confirmation (SPECIMEN)", font=font(44, True), fill="black")
    d.text((80, 135), "This confirms that the following payment was made.", font=font(28), fill="black")
    y = 220
    for label, value in rows:
        d.text((80, y), f"{label}:", font=font(30), fill="black")
        d.text((470, y), value, font=font(32, True), fill="black")
        y += 70
    d.line((80, y + 10, 1160, y + 10), fill="black", width=3)
    d.text((80, y + 40), "Amount", font=font(40, True), fill="black")
    d.text((1160, y + 40), amount, font=font(40, True), fill="black", anchor="ra")
    d.text((80, 930), "SPECIMEN - FICTIONAL TEST DATA - NOT A REAL DOCUMENT", font=font(26, True), fill=(200, 30, 30))

    os.makedirs(OUT_DIR, exist_ok=True)
    base = os.path.join(OUT_DIR, f"proof_{a.reference}_R{a.amount:.2f}_{paid_on.isoformat()}")
    img.save(base + ".png")
    img.save(base + ".pdf", "PDF", resolution=150)
    print("Made:")
    print("  " + base + ".png")
    print("  " + base + ".pdf")


if __name__ == "__main__":
    main()
