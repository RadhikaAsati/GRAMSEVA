
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models import Complaint, Feedback, Intervention


def analyze_recurrence(db: Session, complaint: Complaint) -> dict:
    if complaint.asset_id is None:
        return {
            "asset_id": None,
            "previous_complaint_count": 0,
            "is_recurring": False,
            "resolved_then_failed_again": False,
            "unresolved_previous_count": 0,
            "previous_unsolved_count": 0,
            "message": (
                "This complaint is not linked to an asset. "
                "Assign an asset to enable recurrence detection."
            ),
            "historical_complaints": [],
        }

    previous_complaints = db.scalars(
        select(Complaint)
        .where(
            Complaint.asset_id == complaint.asset_id,
            Complaint.category == complaint.category,
            Complaint.created_at <= complaint.created_at,
            Complaint.id != complaint.id,
        )
        .order_by(Complaint.created_at.desc(), Complaint.id.desc())
    ).all()

    unresolved_count = 0
    unsolved_count = 0
    resolved_then_failed_again = False
    history = []

    for previous in previous_complaints:
        feedback_records = db.scalars(
            select(Feedback)
            .where(Feedback.complaint_id == previous.id)
            .order_by(Feedback.created_at.desc(), Feedback.id.desc())
        ).all()

        latest_feedback = feedback_records[0] if feedback_records else None
        latest_outcome = latest_feedback.outcome if latest_feedback else None

        interventions = db.scalars(
            select(Intervention)
            .where(Intervention.complaint_id == previous.id)
            .order_by(Intervention.created_at.desc(), Intervention.id.desc())
        ).all()

        elapsed_days = None
        if (
            latest_outcome == "resolved"
            and latest_feedback is not None
            and complaint.created_at >= latest_feedback.created_at
        ):
            elapsed_days = (
                complaint.created_at - latest_feedback.created_at
            ).total_seconds() / 86400

            resolved_then_failed_again = True

        if latest_outcome in (None, "not_solved", "partially_solved"):
            unresolved_count += 1

        if latest_outcome == "not_solved":
            unsolved_count += 1

        history.append({
            "complaint_id": previous.id,
            "title": previous.title,
            "category": previous.category,
            "status": previous.status,
            "latest_citizen_outcome": latest_outcome,
            "reported_resolution_at": (
                latest_feedback.created_at.isoformat()
                if latest_outcome == "resolved"
                and latest_feedback is not None
                else None
            ),
            "days_since_reported_resolution": (
                round(elapsed_days, 2)
                if elapsed_days is not None
                else None
            ),
            "previous_interventions": [
                {
                    "intervention_id": intervention.id,
                    "action_taken": intervention.action_taken,
                    "performed_by": intervention.performed_by,
                    "notes": intervention.notes,
                    "created_at": intervention.created_at.isoformat(),
                }
                for intervention in interventions
            ],
        })

    previous_count = len(previous_complaints)
    is_recurring = previous_count > 0

    if resolved_then_failed_again:
        message = (
            "A previous complaint for this asset and category was "
            "reported as resolved before this new complaint. "
            "Investigate why the issue may have returned and review "
            "the earlier intervention before choosing another repair."
        )
    elif unsolved_count > 0:
        message = (
            "A previous complaint was reported as not solved. "
            "Review the earlier intervention and investigate the "
            "underlying cause before repeating a repair."
        )
    elif unresolved_count > 0:
        message = (
            "Previous complaints lack confirmed resolution or were "
            "only partially solved. Review the history before closing "
            "the current issue."
        )
    elif is_recurring:
        message = (
            "Previous complaints exist for this asset and category. "
            "Review their intervention history before deciding the "
            "next action."
        )
    else:
        message = "No previous complaints were found for this asset and category."

    return {
        "asset_id": complaint.asset_id,
        "previous_complaint_count": previous_count,
        "is_recurring": is_recurring,
        "resolved_then_failed_again": resolved_then_failed_again,
        "unresolved_previous_count": unresolved_count,
        "previous_unsolved_count": unsolved_count,
        "message": message,
        "historical_complaints": history,
    }
