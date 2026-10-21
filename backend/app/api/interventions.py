
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_roles
from backend.app.database import get_db
from backend.app.api.complaints import get_accessible_complaint
from backend.app.models import Complaint, Intervention, User

router = APIRouter(
    prefix="/interventions",
    tags=["Interventions"],
    dependencies=[Depends(require_roles("admin", "worker"))],
)


class InterventionCreate(BaseModel):
    complaint_id: int = Field(gt=0)
    action_taken: str = Field(min_length=1, max_length=5000)
    notes: str | None = Field(default=None, max_length=5000)


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
    current_user: User = Depends(require_roles("admin", "worker")),
):
    complaint = get_accessible_complaint(
        payload.complaint_id,
        db,
        current_user,
    )

    intervention = Intervention(
        complaint_id=complaint.id,
        action_taken=payload.action_taken,
        performed_by=current_user.full_name,
        notes=payload.notes,
    )
    complaint.status = "awaiting_feedback"

    try:
        db.add(intervention)
        db.add(complaint)
        db.commit()
        db.refresh(intervention)
        return intervention
    except Exception:
        db.rollback()
        raise

@router.get("/", response_model=list[InterventionResponse])
def list_interventions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return db.query(Intervention).order_by(Intervention.id).all()


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "worker")),
):
    intervention = db.get(Intervention, intervention_id)

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

    return intervention
