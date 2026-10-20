
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Evidence, Intervention

router = APIRouter(prefix="/evidence", tags=["Evidence"])


class EvidenceCreate(BaseModel):
    intervention_id: int
    file_url: str = Field(min_length=1, max_length=500)
    description: str | None = None


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
):
    intervention = db.get(Intervention, payload.intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=404,
            detail="Intervention not found",
        )

    evidence = Evidence(**payload.model_dump())
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


@router.get("/", response_model=list[EvidenceResponse])
def list_evidence(db: Session = Depends(get_db)):
    return db.query(Evidence).order_by(Evidence.id).all()


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = db.get(Evidence, evidence_id)

    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    return evidence
