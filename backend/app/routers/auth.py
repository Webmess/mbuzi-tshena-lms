from datetime import datetime, timedelta
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from fastapi import Response
from app.database import get_db
from app.models import User, UserRole
from app.schemas import (
    Token, UserLogin, AdminLogin, UserRegister, UserOut, Message
)
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_user_by_email,
    get_user_by_id_number,
    get_current_user,
)
from app.config import settings
from app.utils.email import send_login_alert , send_reset_email, send_confirmation_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class ResetPasswordRequest(BaseModel):
    email: str
    password: str
    reset_token: str


class RegistrationOTPRequest(BaseModel):
    email: str
    otp: str


pending_registrations = {}


@router.post("/register", status_code=status.HTTP_200_OK)
async def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_id_number(db, user_in.id_number):
        raise HTTPException(status_code=400, detail="ID number already registered")

    email = user_in.email.lower()
    otp = generate_reset_token()
    print(f"Registration OTP for {email}: {otp}")  # For debugging purposes
    pending_registrations[email] = {
        "data": user_in.model_dump(),
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
    }
    await send_confirmation_email(email, user_in.full_name, otp)
    return {"message": "Verification code sent to your email", "email": email}


@router.post("/verify-registration", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def verify_registration(data: RegistrationOTPRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    registration = pending_registrations.get(email)
    if not registration or registration["expires_at"] < datetime.utcnow():
        pending_registrations.pop(email, None)
        raise HTTPException(status_code=400, detail="Registration OTP expired or not found")
    if registration["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP code")
    if get_user_by_email(db, email) or get_user_by_id_number(db, registration["data"]["id_number"]):
        pending_registrations.pop(email, None)
        raise HTTPException(status_code=400, detail="User is already registered")

    user_data = registration["data"]
    user = User(
        email=email,
        hashed_password=get_password_hash(user_data["password"]),
        full_name=user_data["full_name"],
        id_number=user_data["id_number"],
        phone_number=user_data["phone_number"],
        role=UserRole.BORROWER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    pending_registrations.pop(email, None)
    return user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get client IP address
    client_ip = request.client.host if request.client else "Unknown"


    forwarded_for = request.headers.get("X-Forwarded-For")
    real_ip = request.headers.get("X-Real-IP")
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")

    if cf_connecting_ip:
        client_ip = cf_connecting_ip
    elif real_ip:
        client_ip = real_ip
    elif forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    # Get User-Agent
    user_agent = request.headers.get("User-Agent", "Unknown")

    # Basic device detection
    user_agent_lower = user_agent.lower()

    if "mobile" in user_agent_lower or "android" in user_agent_lower or "iphone" in user_agent_lower:
        device_name = "Mobile device"
    elif "ipad" in user_agent_lower or "tablet" in user_agent_lower:
        device_name = "Tablet"
    else:
        device_name = "Desktop"

    # Basic browser detection
    if "edg/" in user_agent_lower:
        browser_name = "Microsoft Edge"
    elif "chrome/" in user_agent_lower:
        browser_name = "Google Chrome"
    elif "firefox/" in user_agent_lower:
        browser_name = "Mozilla Firefox"
    elif "safari/" in user_agent_lower and "chrome/" not in user_agent_lower:
        browser_name = "Safari"
    elif "opera" in user_agent_lower or "opr/" in user_agent_lower:
        browser_name = "Opera"
    else:
        browser_name = "Unknown browser"

    # Login timestamp
    login_time = datetime.now().strftime("%d %B %Y at %H:%M:%S")

  
    login_location = "Unknown location"

    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role.value,
        },
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    # Send security notification after successful authentication
    await send_login_alert(
        to_email=user.email,
        customer_name=user.first_name or user.email,
        login_time=login_time,
        ip_address=client_ip,
        location=login_location,
        device=device_name,
        browser=browser_name,
        security_url=f"{settings.FRONTEND_URL}/security",
    )

    return Token(
        access_token=access_token,
        user=UserOut.model_validate(user),
    )



@router.post("/login/json", response_model=Token)
async def login_json(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db,
        credentials.identifier,
        credentials.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/ID or password",
        )

    if user.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email/ID or Password.",
        )

 

    # Default client IP
    client_ip = request.client.host if request.client else "Unknown"

    # Cloudflare's real client IP
    cf_ip = request.headers.get("CF-Connecting-IP")

    # Reverse proxy IP headers
    real_ip = request.headers.get("X-Real-IP")
    forwarded_for = request.headers.get("X-Forwarded-For")

    if cf_ip:
        client_ip = cf_ip
    elif real_ip:
        client_ip = real_ip
    elif forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    # User-Agent contains browser + operating system + device information
    user_agent = request.headers.get(
        "User-Agent",
        "Unknown",
    )

    user_agent_lower = user_agent.lower()



    if any(
        device in user_agent_lower
        for device in [
            "iphone",
            "android",
            "mobile",
        ]
    ):
        device_name = "Mobile"

    elif any(
        device in user_agent_lower
        for device in [
            "ipad",
            "tablet",
        ]
    ):
        device_name = "Tablet"

    else:
        device_name = "Desktop"



    if "edg/" in user_agent_lower:
        browser_name = "Microsoft Edge"

    elif "opr/" in user_agent_lower or "opera" in user_agent_lower:
        browser_name = "Opera"

    elif "firefox/" in user_agent_lower:
        browser_name = "Mozilla Firefox"

    elif "chrome/" in user_agent_lower:
        browser_name = "Google Chrome"

    elif "safari/" in user_agent_lower:
        browser_name = "Safari"

    else:
        browser_name = "Unknown Browser"


    if "windows" in user_agent_lower:
        operating_system = "Windows"

    elif "iphone" in user_agent_lower or "ipad" in user_agent_lower:
        operating_system = "iOS"

    elif "android" in user_agent_lower:
        operating_system = "Android"

    elif "mac os" in user_agent_lower or "macintosh" in user_agent_lower:
        operating_system = "macOS"

    elif "linux" in user_agent_lower:
        operating_system = "Linux"

    else:
        operating_system = "Unknown OS"

 
    login_time = datetime.now().strftime(
        "%d %B %Y at %H:%M:%S"
    )

    login_location = "Unknown location"


    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role.value,
        },
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )



    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )



    try:
        print(f"Sending login alert email to {user.email}...")
        await send_login_alert(
            to_email=user.email,
            customer_name=user.full_name or user.email,
            login_time=login_time,
            ip_address=client_ip,
            location=login_location,
            device=f"{device_name} ({operating_system})",
            browser=browser_name,
            security_url=f"{settings.FRONTEND_URL}/security",
        )
    except Exception as e:
        print(f"Failed to send login alert email. This may be due to email server issues: {e}")
        # Do not prevent a successful login if the email server
        # is temporarily unavailable.
        pass


    return Token(
        access_token=access_token,
        user=UserOut.model_validate(user),
    )


@router.post("/admin/login", response_model=Token)
def admin_login(credentials: AdminLogin, response: Response, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or Password.",
        )
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,          # False only during local HTTP development
        samesite="none",      # "lax" if frontend/backend share the same site
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return Token(access_token=access_token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


def generate_reset_token():
    return f"{secrets.randbelow(1_000_000):06d}"

reset_tokens = {}
verified_reset_tokens = {}

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(email: str, db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reset_token = generate_reset_token()
    reset_tokens[email] = reset_token

    await send_reset_email(user.email, user.full_name or user.email, reset_token)

    print(f"Password reset code for {email}: {reset_token}")  # For debugging purposes
    return {"message": "Password reset code sent to your email"}



@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK)
def verify_reset_otp(
    email: str,
    reset_code: str,
    response: Response,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")


    print(f"Verifying reset code for {email}: {reset_code}")
    print(f"Stored reset code for {email}: {reset_tokens.get(email)}")
    if reset_tokens.get(email) != reset_code:
        raise HTTPException(status_code=400, detail="Incorrect OTP code")

    reset_tokens.pop(email, None)
    reset_token = secrets.token_urlsafe(32)
    verified_reset_tokens[reset_token] = {
        "email": email.lower(),
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
    }
    
    return {"message": "Reset code verified successfully" , "reset_token": reset_token}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    data: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    reset_token = data.reset_token
    verification = verified_reset_tokens.get(reset_token)

    if not verification or verification["expires_at"] < datetime.utcnow():
        if reset_token:
            verified_reset_tokens.pop(reset_token, None)
        raise HTTPException(status_code=401, detail="Password reset verification expired")

    if verification["email"] != data.email.lower():
        raise HTTPException(status_code=403, detail="Invalid password reset token")

    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(data.password)
    db.commit()
    verified_reset_tokens.pop(reset_token, None)
    response.delete_cookie(key="reset_token", path="/")
    return {"message": "Password reset successfully"}

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=True,      # False for local HTTP development
        samesite="none",  # "lax" if not cross-site
    )

    return {
        "message": "Logged out successfully"
    }