import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.database import init_db, SessionLocal
from app.models import User, UserRole, FraudAlert, LoanApplication
from app.auth import get_password_hash
from app.routers import auth, applications, payments, admin, documents
from app.routers import notifications, proofs, investments


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_admin():
    """Create default admin if none exists."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            admin = User(
                email="admin@mbuzi.tshena.lms",
                hashed_password=get_password_hash("Admin@12345"),
                full_name="Mbuzi Tshena",
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin created → admin@mbuzi.tshena.lms / Admin@12345")
        else:
            logger.info("Admin user already exists")
    finally:
        db.close()

def fix_old_alert_text():
    """One-time repair: alerts created before PR #12 show '<enum 'AIAction'>' instead of the action."""
    db = SessionLocal()
    try:
        broken = db.query(FraudAlert).filter(FraudAlert.reason.like("%enum%")).all()
        for alert in broken:
            app_row = db.query(LoanApplication).filter(LoanApplication.id == alert.application_id).first()
            action = app_row.ai_action.value if app_row and app_row.ai_action else "Unknown"
            alert.reason = f"High AI risk score ({alert.risk_score}) – {action}"
        if broken:
            db.commit()
            logger.info(f"Repaired {len(broken)} old fraud alert(s)")
    finally:
        db.close()
    """
def seed_client():
   
    db = SessionLocal()
    try:
        borrower  = db.query(User).filter(User.role == UserRole.BORROWER).first()
        if not borrower :
            borrower  = User(
                email="borrower@mbuzi.tshena.lms",
                hashed_password=get_password_hash("BORROWER@12345"),
                full_name="Mbuzi Tshena",
                id_number="8308110424081",
                phone_number="0781045677",
                role=UserRole.BORROWER,
                risk_score=23.0,
                is_active=True,
            )
            db.add(borrower )
            db.commit()
            logger.info("Default borrower  created → borrower@mbuzi.tshena.lms / BORROWER@12345")
        else:
            logger.info("borrower  user already exists")
    finally:
        db.close()
    """


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    init_db()
    seed_admin()
    fix_old_alert_text()
    #seed_client()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    logger.info("Mbudzi Tshena LMS API ready")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Mbudzi Tshena Financial Solutions – Microfinance Loan Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://organic-space-journey-q79jp6w7xgg3xwxp-5173.app.github.dev"
    
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(documents.router)
app.include_router(notifications.router)
app.include_router(proofs.router)
app.include_router(investments.router)

# Serve uploaded files in debug
if settings.DEBUG:
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}