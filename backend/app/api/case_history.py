
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.services.similarity import find_similar_complaints
from backend.app.database import get_db
from backend.app.models import AdminDecision, Complaint
from backend.app.services.recurrence import analyze_recurrence
from backend.app.services.resolution_engine import assess_resolution

router = APIRouter(
    prefix="/complaints",
    tags=["Complaint Case History"],
)


@router.get("/{complaint_id}/case-history")
def get_case_history(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    interventions = sorted(
        complaint.interventions,
        key=lambda item: (item.created_at, item.id),
    )

    feedback_records = sorted(
        complaint.feedback,
        key=lambda item: (item.created_at, item.id),
    )

    outcomes = [item.outcome for item in feedback_records]

    assessment = assess_resolution(
        complaint_id=complaint.id,
        intervention_count=len(interventions),
        citizen_outcomes=outcomes,
    )

    recurrence = analyze_recurrence(db, complaint)

    admin_decisions = (
        db.query(AdminDecision)
        .filter(AdminDecision.complaint_id == complaint.id)
        .order_by(
            AdminDecision.created_at.desc(),
            AdminDecision.id.desc(),
        )
        .all()
    )

    return {
        "complaint": {
            "id": complaint.id,
            "title": complaint.title,
            "description": complaint.description,
            "category": complaint.category,
            "status": complaint.status,
            "asset": (
                {
                    "id": complaint.asset.id,
                    "name": complaint.asset.name,
                    "asset_type": complaint.asset.asset_type,
                    "location": complaint.asset.location,
                }
                if complaint.asset
                else None
            ),
            "created_at": complaint.created_at.isoformat(),
        },
        "interventions": [
            {
                "id": intervention.id,
                "action_taken": intervention.action_taken,
                "performed_by": intervention.performed_by,
                "notes": intervention.notes,
                "created_at": intervention.created_at.isoformat(),
                "evidence": [
                    {
                        "id": evidence.id,
                        "file_url": evidence.file_url,
                        "description": evidence.description,
                        "created_at": evidence.created_at.isoformat(),
                    }
                    for evidence in sorted(
                        intervention.evidence,
                        key=lambda item: (item.created_at, item.id),
                    )
                ],
            }
            for intervention in interventions
        ],
        "citizen_feedback": [
            {
                "id": feedback.id,
                "outcome": feedback.outcome,
                "comments": feedback.comments,
                "created_at": feedback.created_at.isoformat(),
            }
            for feedback in feedback_records
        ],

        "admin_decisions": [
            {
                "id": decision.id,
                "decision": decision.decision,
                "administrator": decision.administrator,
                "notes": decision.notes,
                "created_at": decision.created_at.isoformat(),
            }
            for decision in admin_decisions
        ],
        "resolution": {
            "outcome": assessment.outcome,
            "recommendation": assessment.recommendation,
            "requires_follow_up": assessment.requires_follow_up,
        },
        "recurrence": recurrence,
    }
@router.get("/{complaint_id}/similar-cases")
def get_similar_cases(
    complaint_id: int,
    limit: int = 5,
    db: Session = Depends(get_db),
):
    try:
        return find_similar_complaints(
            db=db,
            complaint_id=complaint_id,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc