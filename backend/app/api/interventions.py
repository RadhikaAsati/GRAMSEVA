
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Complaint, Intervention

router = APIRouter(
    prefix="/interventions",
    tags=["Interventions"],
)


class InterventionCreate(BaseModel):
    complaint_id: int
    action_taken: str = Field(min_length=1)
    performed_by: str = Field(min_length=1, max_length=150)
    notes: str | None = None


class InterventionResponse(BaseModel):
    id: int
    complaint_id: int
    action_taken: str
    performed_by: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/", response_model=InterventionResponse, status_code=201)
def create_intervention(
    payload: InterventionCreate,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, payload.complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )


    intervention = Intervention(**payload.model_dump())
    complaint.status = "awaiting_feedback"

    try:
        db.add(intervention)
        db.add(complaint)
        db.commit()
        db.refresh(intervention)
    except Exception:
        db.rollback()
        raise

    return intervention



@router.get("/", response_model=list[InterventionResponse])
def list_interventions(db: Session = Depends(get_db)):
    return db.query(Intervention).order_by(Intervention.id).all()


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
):
    intervention = db.get(Intervention, intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=404,
            detail="Intervention not found",
        )

    return intervention
