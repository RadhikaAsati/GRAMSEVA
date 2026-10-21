
from datetime import datetime
from pathlib import PurePosixPath
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.app.api.auth import get_current_user
from backend.app.api.dependencies import require_roles
from backend.app.database import get_db
from backend.app.api.complaints import get_accessible_complaint
from backend.app.models import Evidence, Intervention


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"],
    dependencies=[Depends(get_current_user)],
)


def validate_evidence_reference(value: str) -> str:
    """Accept relative evidence references, not external URLs or traversal."""
    value = value.strip()

    if not value or len(value) > 500:
        raise ValueError("Evidence reference must contain 1–500 characters.")

    if "\\" in value or any(ord(char) < 32 for char in value):
        raise ValueError("Evidence reference contains invalid characters.")

    parsed = urlsplit(value)

    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Evidence reference must be a relative path.")

    path = PurePosixPath(value)

    if path.is_absolute() or any(part in {".", ".."} for part in value.split("/")):
        raise ValueError("Evidence reference must not contain traversal segments.")

    if not path.parts or any(not part for part in value.split("/")):
        raise ValueError("Evidence reference must be a valid relative path.")

    return value


class EvidenceCreate(BaseModel):
    intervention_id: int = Field(gt=0)
    file_url: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("file_url")
    @classmethod
    def validate_file_url(cls, value: str) -> str:
        return validate_evidence_reference(value)


class EvidenceResponse(BaseModel):
    id: int
    intervention_id: int
    file_url: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}



@router.post("/", response_model=EvidenceResponse, status_code=201)
def create_evidence(
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "worker")),
):
    intervention = db.get(Intervention, payload.intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=404,
            detail="Intervention not found",
        )

    get_accessible_complaint(
        intervention.complaint_id,
        db,
        current_user,
    )

    evidence = Evidence(**payload.model_dump())
    db.add(evidence)

    try:
        db.commit()
        db.refresh(evidence)
    except Exception:
        db.rollback()
        raise

    return evidence



@router.get("/", response_model=list[EvidenceResponse])
def list_evidence(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    return db.query(Evidence).order_by(Evidence.id).all()

@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin")),
):
    evidence = db.get(Evidence, evidence_id)

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    return evidence
