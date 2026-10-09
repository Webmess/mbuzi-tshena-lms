"""
AI chatbot (SRS feature #6). A small machine-learning model works out WHAT the customer is asking
(the "intent"), then the answer is built from that customer's own data in the database.

Model: TF-IDF (turns text into numbers, using parts of words so small typos still match)
       + Logistic Regression (learns which intent each example question belongs to).
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sqlalchemy.orm import Session

from app.models import User, LoanApplication, Investment
from app.utils.loan_balance import loan_totals
from app.utils.investment_interest import RATES, investment_figures, value_after

# Example questions for every intent. Add more examples to make the bot smarter.
TRAINING = {
    "greeting": [
        "hi", "hello", "hey", "good morning", "good afternoon", "good evening", "hi there", "howzit",
        "sawubona", "dumela", "hello can you help me", "are you there",
    ],
    "loan_status": [
        "what is the status of my loan", "loan application status", "has my loan been approved",
        "is my loan approved", "did i get the loan", "was my application successful", "my application status",
        "check my loan", "where is my loan application", "why was my loan rejected", "is my loan still pending",
        "when will my loan be approved", "status of my application",
    ],
    "repayment": [
        "how much do i still owe", "what is my balance", "repayment information", "remaining balance on my loan",
        "how much is my monthly instalment", "when is my next payment", "how much have i paid",
        "outstanding amount", "how much must i pay each month", "my repayments", "what do i owe",
        "loan balance", "how many payments are left", "monthly installment amount",
    ],
    "investment_advice": [
        "investment advice", "should i invest", "how do investments work", "what are the investment rates",
        "how much interest do i earn on an investment", "which risk level should i choose", "how much will my investment grow",
        "what is my investment worth", "show my investments", "is investing safe", "how do i start investing",
        "what return will i get", "conservative moderate aggressive", "my investment value",
    ],
    "upload_proof": [
        "how do i upload proof of payment", "where do i upload my proof", "how do i pay my loan",
        "how do i make a payment", "proof of payment", "where do i pay", "how to pay my instalment",
        "upload payment confirmation", "my proof was rejected", "how do i pay my investment deposit",
        "bank details to pay", "what reference must i use",
    ],
    "apply_loan": [
        "how do i apply for a loan", "i want a loan", "can i get a loan", "apply for a loan",
        "how much can i borrow", "loan requirements", "what documents do i need", "which documents must i upload",
        "can i apply if i am unemployed", "how many loans can i have", "maximum loan amount",
        "requirements to qualify",
    ],"loan_interest": [
        "what is the interest rate on loans", "how much interest do i pay", "loan interest rate",
        "why is my balance higher than my loan", "why do i owe more than i borrowed", "how is interest calculated",
        "total amount to repay", "interest on my loan",
    ],
    "thanks": [
        "thank you", "thanks", "thanks a lot", "ok thanks", "great thank you", "that helps", "cool thanks",
        "bye", "goodbye", "ngiyabonga", "ke a leboga",
    ],
     "human": [
        "i want to speak to a person", "talk to a human", "contact support", "speak to an agent",
        "call me", "i need help from a consultant", "complaint", "phone number", "email address of support",
        "i want to complain",
    ],
}
# More ways people ask the same things (found by testing; add new ones here when the bot gets one wrong)
TRAINING["loan_interest"] += [
    "why is the loan more than i applied for", "why is it more than i applied for", "why is my loan amount higher than i asked",
    "why must i pay back more than i borrowed", "why is the amount bigger than my loan", "why do i have to pay more",
    "the total is more than i asked for", "why is my loan so expensive", "what are the extra charges on my loan",
    "what is the cost of borrowing",
]
TRAINING["loan_status"] += [
    "how much did i borrow", "what amount did i apply for", "how much was my loan", "any news on my application",
    "has anyone looked at my loan",
]
TRAINING["repayment"] += ["whats left on my account", "how much should i pay this month"]
TRAINING["investment_advice"] += [
    "is it a good idea to invest", "how much will 5000 become after a year", "what will my money grow to",
]
TRAINING["upload_proof"] += [
    "which account do i pay into", "i paid but it still shows pending", "i already paid", "where must i send the money",
]
TRAINING["apply_loan"] += ["what papers must i bring", "can i take a second loan", "what do i need to qualify", "do i need a payslip"]
TRAINING["thanks"] += ["cheers", "appreciate it", "thank you so much"]
TRAINING["human"] += ["i would like a manager", "let me speak to a manager", "i want a real person"]
# Questions the bot must NOT try to answer: teaching it what "off-topic" looks like
TRAINING["other"] = [
    "what is the weather today", "will it rain tomorrow", "who won the soccer match", "tell me a joke", "what is the news",
    "give me a recipe", "what time is it", "who is the president", "play some music", "what is the capital of france",
    "how old are you", "do you like pizza", "write me a poem", "what movies are showing", "translate this sentence",
    "asdf", "qwerty", "lol", "random text here", "how do i fix my car", "what is your favourite colour",
    "how far is the moon", "recommend a good restaurant",
]
QUICK_REPLIES = ["Loan Application Status", "Repayment Information", "Investment Advice"]
MIN_CONFIDENCE = 0.30   # below this the bot says it does not understand (SRS REQ-30)

_model = None


def get_model():
    """Train the model once (takes a fraction of a second) and keep it in memory."""
    global _model
    if _model is None:
        texts = [q for questions in TRAINING.values() for q in questions]
        labels = [intent for intent, questions in TRAINING.items() for _ in questions]
        _model = make_pipeline(
            TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), lowercase=True),
            LogisticRegression(max_iter=2000, C=10),
        )
        _model.fit(texts, labels)
    return _model

def classify(message: str):
    """Returns (intent, confidence). The quick-reply buttons always map to their own intent."""
    shortcuts = {"loan application status": "loan_status", "repayment information": "repayment",
                 "investment advice": "investment_advice"}
    if message.strip().lower() in shortcuts:
        return shortcuts[message.strip().lower()], 1.0
    model = get_model()
    probabilities = model.predict_proba([message])[0]
    best = probabilities.argmax()
    return model.classes_[best], float(probabilities[best])


def money(value: float) -> str:
    return f"R{value:,.2f}"

def build_answer(intent: str, user: User, db: Session) -> str:
    """The reply for this intent, using the logged-in customer's own loans and investments."""
    first_name = (user.full_name or "there").split()[0]
    apps = (db.query(LoanApplication).filter(LoanApplication.user_id == user.id)
            .order_by(LoanApplication.created_at.desc()).all())

    if intent == "greeting":
        return (f"Hi {first_name}! I'm the Mbudzi Tshena assistant. I can tell you the status of your loans, "
                "your repayments and balance, and give investment advice. How can I help you today?")
    if intent == "loan_status":
        if not apps:
            return "You don't have any loan applications yet. You can apply from your dashboard with the Apply button."
        lines = [f"{a.reference_number} ({money(float(a.loan_amount))}): {a.status.value}" for a in apps[:5]]
        return "Here are your loan applications:\n" + "\n".join(lines)
    if intent == "repayment":
        loans = [a for a in apps if a.loan]
        if not loans:
            return "You don't have an approved loan yet, so there is nothing to repay."
        parts = []
        for a in loans:
            t = loan_totals(a.loan)
            if a.loan.status == "Paid Off":
                parts.append(f"{a.reference_number}: paid off. Well done!")
            else:
                parts.append(f"{a.reference_number}: balance {money(t['balance'])}, monthly instalment "
                             f"{money(float(a.loan.monthly_instalment))}, paid so far {money(t['amount_paid'])}.")
        return ("\n".join(parts) + "\nTo pay, make an EFT with your loan reference as the payment reference, "
                "then upload your proof of payment on your dashboard.")
    if intent == "investment_advice":
        example = value_after(10000, RATES["Moderate"], 12)
        rates = ", ".join(f"{level} {rate}%" for level, rate in RATES.items())
        text = (f"Our investments earn a fixed yearly rate by risk level: {rates}. Interest is added every day. "
                f"For example, R10,000 at Moderate for 12 months grows to about {money(example)}. "
                "Conservative suits money you can't afford to risk; Aggressive earns more but carries more risk.")
        mine = db.query(Investment).filter(Investment.user_id == user.id).all()
        active = [i for i in mine if investment_figures(i)["value_today"] is not None]
        if active:
            worth = sum(investment_figures(i)["value_today"] for i in active)
            text += f"\nYour active investments are worth {money(worth)} today."
        elif mine:
            text += "\nYou have investment requests that are not active yet: they start growing once your deposit is verified."
        return text

    if intent == "upload_proof":
        return ("To pay your loan: make an EFT to Mbudzi Tshena Financial Solutions and use your loan reference "
                "(for example LN...) as the payment reference. Then open your dashboard, find the loan and click "
                "Upload Proof. For an investment, use the INV-... reference and click Upload Proof of Deposit. "
                "We check every proof and update your balance once it is verified.")

    if intent == "apply_loan":
        return ("Click Apply on your dashboard and fill in the 6 steps. You'll need your SA ID, your latest payslip "
                "(or a grant / pension letter), 3 months of bank statements and, if your statement doesn't show your "
                "address, a proof of residence. You can have at most 2 open loans at a time.")

    if intent == "loan_interest":
        return ("Loans have a fixed interest rate (18% a year unless agreed otherwise), paid back in equal monthly "
                "instalments. Your balance includes the interest, which is why it is higher than the amount you "
                "borrowed. For example, R17,000 over 36 months costs R614.59 a month, R22,125.27 in total.")

    if intent == "thanks":
        return f"You're welcome, {first_name}! Anything else I can help with?"

    if intent == "human":
        return ("I've passed your message to our team and someone will contact you. "
                "You can also email us at loans@mbudzitshena.co.za.")

    return ("Sorry, I didn't understand that question. I can help with your Loan Application Status, "
            "Repayment Information or Investment Advice. I've also passed your question to our team.")

def reply(message: str, user: User, db: Session) -> dict:
    """ReceiveQuery + GenerateResponse from the SRS: returns the answer, its category and whether it was escalated."""
    intent, confidence = classify(message)
    if confidence < MIN_CONFIDENCE or intent == "other":
        intent = "unsupported"
    escalate = intent in ("unsupported", "human")
    return {
        "reply": build_answer(intent, user, db),
        "category": intent,
        "status": "unsupported" if intent == "unsupported" else "answered",
        "escalated": escalate,
        "confidence": round(confidence, 2),
    }