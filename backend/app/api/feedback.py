from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import Complaint, Feedback, User

router = APIRouter(
    prefix="/feedback",
    tags=["Citizen Feedback"],
    dependencies=[Depends(get_current_user)],
)


class FeedbackCreate(BaseModel):
    complaint_id: int = Field(gt=0)
    outcome: Literal["resolved", "partially_solved", "not_solved"]
    comments: str | None = Field(default=None, max_length=5000)


class FeedbackResponse(BaseModel):
    id: int
    complaint_id: int
    outcome: str
    comments: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


def ensure_feedback_access(
    complaint: Complaint,
    current_user: User,
) -> None:
    role = (current_user.role or "").strip().lower()

    if role == "admin":
        return

    if role == "worker":
        if complaint.assigned_worker_id == current_user.id:
            return
        raise HTTPException(status_code=404, detail="Feedback not found")

    if role == "citizen" and complaint.citizen_id == current_user.id:
        return

    raise HTTPException(status_code=404, detail="Feedback not found")



@router.post("/", response_model=FeedbackResponse, status_code=201)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (current_user.role or "").strip().lower() != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Only citizens can submit feedback.",
        )

    complaint = db.get(Complaint, payload.complaint_id)

    if complaint is None or complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    feedback = Feedback(
        complaint_id=complaint.id,
        outcome=payload.outcome,
        comments=payload.comments,
    )

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
        return feedback
    except Exception:
        db.rollback()
        raise


@router.get("/", response_model=list[FeedbackResponse])
def list_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = (current_user.role or "").strip().lower()

    query = db.query(Feedback).join(
        Complaint, Feedback.complaint_id == Complaint.id
    )

    if role == "citizen":
        query = query.filter(Complaint.citizen_id == current_user.id)

    elif role == "worker":
        query = query.filter(
            Complaint.assigned_worker_id == current_user.id
        )

    elif role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view feedback.",
        )

    return query.order_by(Feedback.id).all()


@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedback = db.get(Feedback, feedback_id)

    if feedback is None:
        raise HTTPException(status_code=404, detail="Feedback not found")

    complaint = db.get(Complaint, feedback.complaint_id)

    if complaint is None:
        raise HTTPException(status_code=404, detail="Feedback not found")

    ensure_feedback_access(complaint, current_user)
    return feedback
