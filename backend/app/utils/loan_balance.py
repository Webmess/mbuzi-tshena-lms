from app.models import Loan, PaymentType, PaymentStatus


def loan_totals(loan: Loan) -> dict:
    """What the customer owes in total (with interest), has paid so far, and still owes."""
    paid = sum(
        float(p.amount) for p in loan.payments
        if p.payment_type == PaymentType.REPAYMENT and p.status == PaymentStatus.COMPLETED
    )
    total = float(loan.total_repayable)
    return {
        "total_repayable": round(total, 2),
        "amount_paid": round(paid, 2),
        "balance": round(max(total - paid, 0), 2),
    }

def update_loan_balance(loan: Loan) -> dict:
    """Store the new balance on the loan and mark it Paid Off when nothing is left."""
    totals = loan_totals(loan)
    loan.outstanding_balance = totals["balance"]
    loan.status = "Paid Off" if totals["balance"] <= 0 else "Active"
    return totals

