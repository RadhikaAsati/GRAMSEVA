
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Complaint
from backend.app.services.resolution_engine import assess_resolution
from backend.app.services.recurrence import analyze_recurrence

router = APIRouter(prefix="/resolution", tags=["Resolution Engine"])


@router.get("/{complaint_id}")
def assess_complaint_resolution(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    outcomes = [
        feedback.outcome
        for feedback in sorted(
            complaint.feedback,
            key=lambda item: (item.created_at, item.id),
        )
    ]

    assessment = assess_resolution(
        complaint_id=complaint.id,
        intervention_count=len(complaint.interventions),
        citizen_outcomes=outcomes,
    )

    recurrence = analyze_recurrence(db, complaint)

    recommendation = assessment.recommendation
    recommendation_reasons = [assessment.recommendation]

    if recurrence["resolved_then_failed_again"]:
        recommendation = (
            "A previous complaint for this asset and category was "
            "reported as resolved before this new complaint. Review "
            "the previous repair action and worker notes, investigate "
            "why the issue may have returned, and request citizen "
            "feedback for the current complaint."
        )
        recommendation_reasons.append(
            "A previous complaint was reported as resolved before "
            "the current complaint was submitted."
        )

        if recurrence["previous_unsolved_count"] > 0:
            recommendation_reasons.append(
                "An older complaint for this asset was also reported "
                "as not solved. Review that history as well."
            )

    elif recurrence["previous_unsolved_count"] > 0:
        recommendation = (
            "Review previous unsuccessful complaint records and their "
            "interventions. Investigate the underlying cause before "
            "repeating a repair, and request citizen feedback for this "
            "new complaint."
        )
        recommendation_reasons.append(
            "A previous complaint for this asset was reported as not solved."
        )

    elif recurrence["unresolved_previous_count"] > 0:
        recommendation = (
            "Review earlier complaints and interventions for this asset. "
            "Confirm whether the earlier issue was resolved, investigate "
            "any remaining problem, and request feedback for the new issue."
        )
        recommendation_reasons.append(
            "Earlier complaints for this asset lack confirmed resolution "
            "or were only partially solved."
        )

    elif recurrence["is_recurring"]:
        recommendation = (
            "Review the asset's previous complaint and repair history "
            "before deciding on the next intervention. Request citizen "
            "feedback for the current complaint."
        )
        recommendation_reasons.append(
            "This asset has previous complaint records."
        )

    return {
        "complaint_id": assessment.complaint_id,
        "title": complaint.title,
        "status": complaint.status,
        "outcome": assessment.outcome,
        "intervention_count": assessment.intervention_count,
        "recommendation": recommendation,
        "recommendation_reasons": recommendation_reasons,
        "requires_follow_up": (
            assessment.requires_follow_up
            or recurrence["unresolved_previous_count"] > 0
            or recurrence["resolved_then_failed_again"]
        ),
        "recurrence": recurrence,
    }
