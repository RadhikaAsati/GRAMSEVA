from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_roles
from backend.app.database import get_db
from backend.app.models import AdminDecision, Complaint, User

router = APIRouter(
    prefix="/admin-decisions",
    tags=["Administrator Decisions"],
    dependencies=[Depends(require_roles("admin"))],
)

DecisionType = Literal[
    "assign_intervention",
    "request_feedback",
    "escalate",
    "mark_for_review",
]


class AdminDecisionCreate(BaseModel):
    complaint_id: int = Field(gt=0)
    decision: DecisionType
    notes: str = Field(min_length=1, max_length=5000)
    worker_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_assignment(self):
        if self.decision == "assign_intervention" and self.worker_id is None:
            raise ValueError(
                "worker_id is required for assign_intervention."
            )
        if self.decision != "assign_intervention" and self.worker_id is not None:
            raise ValueError(
                "worker_id is only allowed for assign_intervention."
            )
        return self


class AdminDecisionResponse(BaseModel):
    id: int
    complaint_id: int
    decision: str
    administrator: str
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/", response_model=AdminDecisionResponse, status_code=201)
def create_admin_decision(
    payload: AdminDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    complaint = db.get(Complaint, payload.complaint_id)

    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if payload.decision == "assign_intervention":
        worker = db.get(User, payload.worker_id)

        if (
            worker is None
            or (worker.role or "").strip().lower() != "worker"
            or not worker.is_active
        ):
            raise HTTPException(
                status_code=400,
                detail="Select an active user with the worker role.",
            )

        complaint.assigned_worker_id = worker.id

    status_mapping = {
        "assign_intervention": "awaiting_intervention",
        "request_feedback": "awaiting_feedback",
        "escalate": "escalated",
        "mark_for_review": "under_review",
    }

    decision = AdminDecision(
        complaint_id=payload.complaint_id,
        decision=payload.decision,
        administrator=current_user.full_name,
        notes=payload.notes,
    )
    complaint.status = status_mapping[payload.decision]

    try:
        db.add(decision)
        db.add(complaint)
        db.commit()
        db.refresh(decision)
        return decision
    except Exception:
        db.rollback()
        raise

@router.get("/", response_model=list[AdminDecisionResponse])
def list_admin_decisions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return (
        db.query(AdminDecision)
        .order_by(AdminDecision.created_at.desc(), AdminDecision.id.desc())
        .all()
    )


@router.get(
    "/complaint/{complaint_id}",
    response_model=list[AdminDecisionResponse],
)
def get_complaint_decisions(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    if db.get(Complaint, complaint_id) is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return (
        db.query(AdminDecision)
        .filter(AdminDecision.complaint_id == complaint_id)
        .order_by(AdminDecision.created_at.desc(), AdminDecision.id.desc())
        .all()
    )
