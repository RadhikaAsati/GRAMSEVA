from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_roles
from backend.app.database import get_db
from backend.app.models import User
from backend.app.services.auth import hash_password

router = APIRouter(
    prefix="/admin-users",
    tags=["Administrator Users"],
    dependencies=[Depends(require_roles("admin"))],
)

Department = Literal[
    "Water Supply",
    "Roads",
    "Electricity",
    "Street Light",
    "Sanitation",
    "Garbage",
    "Public Assets",
    "Drainage",
    "General Maintenance",
]


class WorkerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    department: Department
    password: str = Field(min_length=12, max_length=128)


class WorkerResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    department: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


@router.get("/workers", response_model=list[WorkerResponse])
def list_active_workers(db: Session = Depends(get_db)):
    return (
        db.query(User)
        .filter(User.role == "worker", User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )


@router.post("/workers", response_model=WorkerResponse, status_code=201)
def create_worker(data: WorkerCreate, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    phone = data.phone.strip() if data.phone else None
    if phone:
        if db.query(User).filter(User.phone == phone).first():
            raise HTTPException(
                status_code=409,
                detail="An account with this phone number already exists.",
            )

    worker = User(
        full_name=data.full_name.strip(),
        email=email,
        phone=phone or None,
        password_hash=hash_password(data.password),
        role="worker",
        department=data.department,
        is_active=True,
        phone_verified=False,
        identity_status="unverified",
    )

    try:
        db.add(worker)
        db.commit()
        db.refresh(worker)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with these details already exists.",
        )

    return worker
