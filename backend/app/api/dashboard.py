
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset, Complaint, Intervention
from backend.app.services.analytics import get_resolution_analytics
from backend.app.services.recurrence import analyze_recurrence

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def get_dashboard(db: Session = Depends(get_db)):
    complaints = (
        db.query(Complaint)
        .order_by(
            Complaint.created_at.desc(),
            Complaint.id.desc(),
        )
        .all()
    )

    analytics = get_resolution_analytics(db)

    complaints_needing_follow_up = analytics[
        "outcome_counts"
    ]["requires_follow_up"]

    total_assets = db.query(Asset).count()
    total_interventions = db.query(Intervention).count()

    complaints_awaiting_feedback = 0
    recurring_complaints = []

    for complaint in complaints:
        feedback_records = sorted(
            complaint.feedback,
            key=lambda item: (item.created_at, item.id),
        )

        outcomes = [
            item.outcome
            for item in feedback_records
        ]

        has_interventions = len(complaint.interventions) > 0

        awaiting_feedback = (
            complaint.status == "awaiting_feedback"
            or (
                not outcomes
                and has_interventions
                and complaint.status not in {
                    "escalated",
                    "under_review",
                }
            )
        )

        if awaiting_feedback:
            complaints_awaiting_feedback += 1

        recurrence = analyze_recurrence(db, complaint)

        if recurrence["is_recurring"]:
            recurring_complaints.append(
                {
                    "complaint_id": complaint.id,
                    "title": complaint.title,
                    "category": complaint.category,
                    "asset_id": complaint.asset_id,
                    "status": complaint.status,
                    "message": recurrence["message"],
                    "resolved_then_failed_again": (
                        recurrence["resolved_then_failed_again"]
                    ),
                    "previous_complaint_count": (
                        recurrence["previous_complaint_count"]
                    ),
                }
            )

    return {
        "summary": {
            "total_assets": total_assets,
            "total_complaints": len(complaints),
            "total_interventions": total_interventions,
            "complaints_awaiting_feedback": (
                complaints_awaiting_feedback
            ),
            "complaints_needing_follow_up": (
                complaints_needing_follow_up
            ),
            "recurring_complaints": len(recurring_complaints),
        },
        "recurring_complaints": recurring_complaints,
        "recent_complaints": [
            {
                "id": complaint.id,
                "title": complaint.title,
                "category": complaint.category,
                "status": complaint.status,
                "asset_id": complaint.asset_id,
                "created_at": complaint.created_at.isoformat(),
            }
            for complaint in complaints[:10]
        ],
    }


@router.get("/analytics")
def resolution_analytics(db: Session = Depends(get_db)):
    return get_resolution_analytics(db)
