
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import AdminDecision, Complaint

router = APIRouter(
    prefix="/admin-decisions",
    tags=["Administrator Decisions"],
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
    administrator: str = Field(min_length=1, max_length=150)
    notes: str = Field(min_length=1, max_length=5000)


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
):
    complaint = db.get(Complaint, payload.complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    status_mapping = {
        "assign_intervention": "awaiting_intervention",
        "request_feedback": "awaiting_feedback",
        "escalate": "escalated",
        "mark_for_review": "under_review",
    }

    try:
        decision = AdminDecision(**payload.model_dump())
        complaint.status = status_mapping[payload.decision]

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
):
    if db.get(Complaint, complaint_id) is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    return (
        db.query(AdminDecision)
        .filter(AdminDecision.complaint_id == complaint_id)
        .order_by(AdminDecision.created_at.desc(), AdminDecision.id.desc())
        .all()
    )
