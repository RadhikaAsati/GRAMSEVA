
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from backend.app.config import settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash a password before storing it."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a password against its stored hash."""
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT access token."""
    if not settings.JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Validate a JWT and return its claims."""
    if not settings.JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "iat"]},
    )
