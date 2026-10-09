from datetime import date

from dateutil.relativedelta import relativedelta

from app.models import Investment, InvestmentStatus

# Yearly interest rate (%) per risk level. Keep in sync with INVESTMENT_RATES in UserDashboard.tsx
RATES = {"Conservative": 7.5, "Moderate": 9.5, "Aggressive": 11.5}

def value_after(amount: float, annual_rate: float, months: float) -> float:
    """Compound interest, added every month: amount x (1 + rate / 12) ^ months."""
    return round(amount * (1 + annual_rate / 100 / 12) ** months, 2)

def investment_figures(inv: Investment) -> dict:
    """Rate, expected value at the end, and (once active) how much it is worth today."""
    amount = float(inv.amount)
    rate = inv.term.annual_rate if inv.term else RATES[inv.risk_level]
    figures = {
        "annual_rate": rate,
        "expected_at_maturity": value_after(amount, rate, inv.duration_months),
        "start_date": None,
        "maturity_date": None,
        "months_done": 0,
        "value_today": None,
        "interest_earned": None,
    }
    if inv.status != InvestmentStatus.APPROVED:
        return figures
    # Approved before investment_terms existed: count from the request date
    start = inv.term.start_date if inv.term else inv.created_at.date()
    maturity = start + relativedelta(months=inv.duration_months)
    today = min(max(date.today(), start), maturity)

    # Whole months passed, plus how far we are into the current month (grows a little every day)
    passed = relativedelta(today, start)
    months_done = passed.years * 12 + passed.months
    month_start = start + relativedelta(months=months_done)
    month_end = start + relativedelta(months=months_done + 1)
    part_of_month = (today - month_start).days / (month_end - month_start).days
    value_today = value_after(amount, rate, months_done + part_of_month)
    figures.update({
        "start_date": start.isoformat(),
        "maturity_date": maturity.isoformat(),
        "months_done": months_done,
        "value_today": value_today,
        "interest_earned": round(value_today - amount, 2),
    })
    return figures

