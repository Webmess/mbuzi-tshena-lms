from datetime import datetime, date
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from enum import Enum
import re
from app.utils.sa_id import sa_id_checksum_ok


# ========== Enums (mirroring models) ==========
class UserRole(str, Enum):
    BORROWER = "borrower"
    ADMIN = "admin"


class ApplicationStatus(str, Enum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    DISBURSED = "Disbursed"
    CLOSED = "Closed"


class AIAction(str, Enum):
    AUTO_APPROVE = "Auto-Approve"
    FLAGGED = "Flagged"
    MANUAL_REVIEW = "Manual Review"
    DECLINE = "Decline"


class PaymentType(str, Enum):
    REPAYMENT = "Repayment"
    DISBURSEMENT = "Disbursement"
    FEE = "Fee"
    PENALTY = "Penalty"


class PaymentStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    FAILED = "Failed"
    CANCELLED = "Cancelled"


# ========== Auth ==========
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class UserLogin(BaseModel):
    identifier: str = Field(..., description="Email or ID number")
    password: str


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    id_number: str = Field(..., min_length=13, max_length=13)
    phone_number: str = Field(..., min_length=10, max_length=15)

    @field_validator("id_number")
    @classmethod
    def validate_sa_id(cls, v: str) -> str:
        if not re.match(r"^\d{13}$", v):
            raise ValueError("ID number must be exactly 13 digits")
        if not sa_id_checksum_ok(v):
            raise ValueError("This is not a valid South African ID number. Please check it.")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("27"):
            cleaned = "0" + cleaned[2:]
        if not re.match(r"^0\d{9}$", cleaned):
            raise ValueError("Phone must be a valid SA number (10 digits starting with 0)")
        return cleaned


# ========== User ==========
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    id_number: Optional[str] = None
    phone_number: Optional[str] = None


class UserOut(UserBase):
    id: int
    role: UserRole
    is_active: bool
    risk_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


# ========== Loan Application ==========
class LoanApplicationCreate(BaseModel):
    # Personal
    full_name: str
    id_number: str = Field(..., min_length=13, max_length=13)
    date_of_birth: date
    phone_number: str
    email: EmailStr
    marital_status: Optional[str] = None
    dependents: Optional[int] = 0

    # Address
    residential_address: str
    city: str
    province: str
    postal_code: str
    years_at_address: Optional[float] = None
    residential_status: Optional[str] = None

    # Employment
    employment_status: str
    employer_name: Optional[str] = None
    employer_address: Optional[str] = None
    occupation: Optional[str] = None
    monthly_income: float = Field(..., gt=0)
    years_employed: Optional[float] = None

    # Loan
    loan_amount: float = Field(..., gt=0)
    loan_purpose: str
    loan_type: str
    repayment_term: int = Field(..., ge=1, le=120)

    # Banking
    bank_name: str
    account_number: str
    account_type: str

    # References
    reference1_name: Optional[str] = None
    reference1_phone: Optional[str] = None
    reference1_relationship: Optional[str] = None
    reference2_name: Optional[str] = None
    reference2_phone: Optional[str] = None
    reference2_relationship: Optional[str] = None

    # Additional
    monthly_expenses: Optional[float] = None
    existing_loans: Optional[str] = None
    additional_info: Optional[str] = None

    @field_validator("id_number")
    @classmethod
    def validate_sa_id(cls, v: str) -> str:
        if not re.match(r"^\d{13}$", v):
            raise ValueError("ID number must be exactly 13 digits")
        if not sa_id_checksum_ok(v):
            raise ValueError("This is not a valid South African ID number. Please check it.")
        return v


class LoanApplicationUpdateStatus(BaseModel):
    status: ApplicationStatus
    admin_notes: Optional[str] = None
    interest_rate: Optional[float] = Field(None, ge=0, le=100)  # for approval


class LoanApplicationOut(BaseModel):
    id: int
    reference_number: str
    user_id: int
    full_name: str
    id_number: str
    date_of_birth: date
    phone_number: str
    email: str
    marital_status: Optional[str]
    dependents: Optional[int]
    residential_address: str
    city: str
    province: str
    postal_code: str
    years_at_address: Optional[float]
    residential_status: Optional[str]
    employment_status: str
    employer_name: Optional[str]
    occupation: Optional[str]
    monthly_income: float
    years_employed: Optional[float]
    loan_amount: float
    loan_purpose: str
    loan_type: str
    repayment_term: int
    bank_name: str
    account_number: str
    account_type: str
    status: ApplicationStatus
    ai_risk_score: Optional[float]
    ai_action: Optional[AIAction]
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    documents: List["DocumentOut"] = []

    model_config = ConfigDict(from_attributes=True)


class LoanApplicationListItem(BaseModel):
    """Matches frontend LoanRequests table shape"""
    id: str  # reference_number or REQ-xxx
    name: str
    amount: str  # formatted "R 50,000"
    score: float
    aiAction: Optional[str]
    status: str
    date: str  # formatted relative date
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ========== Loan ==========
class LoanOut(BaseModel):
    id: int
    loan_number: str
    application_id: int
    user_id: int
    principal_amount: float
    interest_rate: float
    term_months: int
    monthly_instalment: float
    outstanding_balance: float
    total_repayable: float
    status: str
    disbursed_at: Optional[datetime]
    next_payment_date: Optional[date]
    maturity_date: Optional[date]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ========== Payment ==========
class PaymentCreate(BaseModel):
    loan_id: Optional[int] = None
    user_id: int
    amount: float = Field(..., gt=0)
    payment_type: PaymentType
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    transaction_id: str
    loan_id: Optional[int]
    user_id: int
    amount: float
    payment_type: PaymentType
    status: PaymentStatus
    payment_method: Optional[str]
    reference: Optional[str]
    notes: Optional[str]
    processed_at: Optional[datetime]
    created_at: datetime
    # for frontend display
    borrower_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentListItem(BaseModel):
    """Matches frontend PaymentsTracker shape"""
    id: str
    borrower: str
    amount: str
    type: str
    date: str
    status: str
    email: Optional[str] = None


# ========== Document ==========
class DocumentCheckOut(BaseModel):
    status: str
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
class DocumentOut(BaseModel):
    id: int
    application_id: int
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    document_type: Optional[str]
    uploaded_at: datetime
    check: Optional[DocumentCheckOut] = None

    model_config = ConfigDict(from_attributes=True)


# ========== Admin Dashboard ==========
class DashboardStats(BaseModel):
    total_active_loans_amount: float
    total_active_loans_count: int
    reliable_borrowers_count: int
    avg_ai_risk_score: float
    fraud_alerts_count: int
    processed_today: int
    accuracy_pct: float
    trends: dict  # e.g. {"active_loans": "+12.5%", ...}


class ChartDataPoint(BaseModel):
    day: str
    approvals: int
    rejections: int


class FraudAlertOut(BaseModel):
    id: str
    reason: str
    time: str
    risk: float

    model_config = ConfigDict(from_attributes=True)


class AdminDashboard(BaseModel):
    stats: DashboardStats
    chart_data: List[ChartDataPoint]
    recent_alerts: List[FraudAlertOut]


# ========== Generic ==========
class Message(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int


# Rebuild forward refs
Token.model_rebuild()
LoanApplicationOut.model_rebuild()


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    type: str
    message: str