
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Complaint, Feedback

router = APIRouter(prefix="/feedback", tags=["Citizen Feedback"])


class FeedbackCreate(BaseModel):
    complaint_id: int
    outcome: Literal["resolved", "partially_solved", "not_solved"]
    comments: str | None = None


class FeedbackResponse(BaseModel):
    id: int
    complaint_id: int
    outcome: str
    comments: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/", response_model=FeedbackResponse, status_code=201)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, payload.complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    feedback = Feedback(**payload.model_dump())


    protected_statuses = {"escalated", "under_review"}

    if complaint.status not in protected_statuses:
        status_mapping = {
            "resolved": "resolved",
            "partially_solved": "awaiting_intervention",
            "not_solved": "awaiting_intervention",
        }

        complaint.status = status_mapping[payload.outcome]


    try:
        db.add(feedback)
        db.add(complaint)
        db.commit()
        db.refresh(feedback)
    except Exception:
        db.rollback()
        raise

    return feedback


@router.get("/", response_model=list[FeedbackResponse])
def list_feedback(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.id).all()


@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
):
    feedback = db.get(Feedback, feedback_id)

    if feedback is None:
        raise HTTPException(
            status_code=404,
            detail="Feedback not found",
        )

    return feedback
