from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Mbudzi Tshena LMS API"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production-please-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "sqlite:///./mbuzi_tshena.db"
    FRONTEND_URL: str = "http://localhost:5173"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = "mbudzi.tshena.lms@gmail.com"
    SMTP_PASSWORD: Optional[str] = "zkgoufewzyenkbhl"
    SMTP_FROM: str = "loans@mbudzitshena.co.za"
    EMAIL_ENABLED: bool = True

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_OPEN_LOANS: int = 2

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()