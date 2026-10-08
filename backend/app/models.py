from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey,
    Enum as SAEnum, Numeric
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    BORROWER = "borrower"
    ADMIN = "admin"


class ApplicationStatus(str, enum.Enum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    DISBURSED = "Disbursed"
    CLOSED = "Closed"


class AIAction(str, enum.Enum):
    AUTO_APPROVE = "Auto-Approve"
    FLAGGED = "Flagged"
    MANUAL_REVIEW = "Manual Review"
    DECLINE = "Decline"


class LoanType(str, enum.Enum):
    PERSONAL = "Personal"
    BUSINESS = "Business"
    EDUCATION = "Education"
    EMERGENCY = "Emergency"
    OTHER = "Other"


class PaymentType(str, enum.Enum):
    REPAYMENT = "Repayment"
    DISBURSEMENT = "Disbursement"
    FEE = "Fee"
    PENALTY = "Penalty"


class PaymentStatus(str, enum.Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    FAILED = "Failed"
    CANCELLED = "Cancelled"


class ResidentialStatus(str, enum.Enum):
    OWNED = "Owned"
    RENTED = "Rented"
    LIVING_WITH_FAMILY = "Living with family"
    OTHER = "Other"


class EmploymentStatus(str, enum.Enum):
    EMPLOYED = "Employed"
    SELF_EMPLOYED = "Self-employed"
    UNEMPLOYED = "Unemployed"
    STUDENT = "Student"
    RETIRED = "Retired"
    OTHER = "Other"


class AccountType(str, enum.Enum):
    CHEQUE = "Cheque"
    SAVINGS = "Savings"
    TRANSMISSION = "Transmission"
    OTHER = "Other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    id_number: Mapped[Optional[str]] = mapped_column(String(13), unique=True, index=True, nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.BORROWER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0-100, lower is better risk
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications: Mapped[list["LoanApplication"]] = relationship(
    "LoanApplication",
    back_populates="user",
    foreign_keys="LoanApplication.user_id",
    )

    reviewed_applications: Mapped[list["LoanApplication"]] = relationship(
        "LoanApplication",
        back_populates="reviewer",
        foreign_keys="LoanApplication.reviewed_by",
    )
    loans: Mapped[List["Loan"]] = relationship("Loan", back_populates="user")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="user")


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Personal
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    id_number: Mapped[str] = mapped_column(String(13), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    phone_number: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    marital_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dependents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Address
    residential_address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    province: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(10), nullable=False)
    years_at_address: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    residential_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Employment
    employment_status: Mapped[str] = mapped_column(String(50), nullable=False)
    employer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    employer_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    monthly_income: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    years_employed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Loan details
    loan_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    loan_purpose: Mapped[str] = mapped_column(Text, nullable=False)
    loan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    repayment_term: Mapped[int] = mapped_column(Integer, nullable=False)  # months

    # Banking
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # References
    reference1_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference1_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    reference1_relationship: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference2_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference2_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    reference2_relationship: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Additional
    monthly_expenses: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    existing_loans: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    additional_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # System fields
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus), default=ApplicationStatus.PENDING, nullable=False
    )
    ai_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0-100 lower better
    ai_action: Mapped[Optional[AIAction]] = mapped_column(SAEnum(AIAction), nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(
    "User",
    back_populates="applications",
    foreign_keys=[user_id],
    )

    reviewer: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="reviewed_applications",
        foreign_keys=[reviewed_by],
    )
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="application")
    loan: Mapped[Optional["Loan"]] = relationship("Loan", back_populates="application", uselist=False)


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    loan_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("loan_applications.id"), unique=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    principal_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)  # annual %
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    monthly_instalment: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    outstanding_balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_repayable: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    status: Mapped[str] = mapped_column(String(50), default="Active")  # Active, Paid Off, Defaulted, Written Off
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    maturity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application: Mapped["LoanApplication"] = relationship("LoanApplication", back_populates="loan")
    user: Mapped["User"] = relationship("User", back_populates="loans")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="loan")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_id: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    loan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("loans.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_type: Mapped[PaymentType] = mapped_column(SAEnum(PaymentType), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # EFT, Cash, Debit Order
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    loan: Mapped[Optional["Loan"]] = relationship("Loan", back_populates="payments")
    user: Mapped["User"] = relationship("User", back_populates="payments")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("loan_applications.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    document_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # ID, Payslip, Bank Statement, etc.
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application: Mapped["LoanApplication"] = relationship("LoanApplication", back_populates="documents")


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alert_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    application_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("loan_applications.id"), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class NotificationType(str, enum.Enum):
    PROOF_ACCEPTED = "proof_accepted"
    PROOF_REJECTED = "proof_rejected"
    LOAN_APPROVED = "loan_approved"
    LOAN_REJECTED = "loan_rejected"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="notifications")


class ProofStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ProofOfPayment(Base):
    __tablename__ = "proofs_of_payment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    proof_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("loan_applications.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[ProofStatus] = mapped_column(SAEnum(ProofStatus), default=ProofStatus.PENDING)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User")
    application: Mapped["LoanApplication"] = relationship("LoanApplication")