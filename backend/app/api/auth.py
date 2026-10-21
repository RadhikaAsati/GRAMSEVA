
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import jwt

from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import (
    CitizenRegister,
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.services.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from backend.app.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(credentials.credentials)
        user_id = int(claims["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def build_token_response(user: User) -> TokenResponse:
    token = create_access_token(user.id, user.role)

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_ACCESS_TOKEN_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_citizen(
    data: CitizenRegister,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    existing_email = db.query(User.id).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with these details already exists",
        )

    if data.phone:
        existing_phone = (
            db.query(User.id).filter(User.phone == data.phone).first()
        )
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with these details already exists",
            )

    user = User(
        full_name=data.full_name,
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role="citizen",
        phone_verified=False,
        identity_status="unverified",
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with these details already exists",
        )

    return build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive",
        )

    return build_token_response(user)


@router.get("/me", response_model=UserResponse)
def get_my_account(
    current_user: User = Depends(get_current_user),
):
    return current_user
