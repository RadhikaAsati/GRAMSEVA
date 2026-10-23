import calendar
from datetime import date
from fastapi import APIRouter, Depends
from backend.app.api.dependencies import require_roles
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset, Complaint, Intervention
from backend.app.services.analytics import get_resolution_analytics
from backend.app.services.recurrence import analyze_recurrence

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_roles("admin", "worker"))],
)


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
    analytics = get_resolution_analytics(db)

    # Prepare the latest six calendar months, including months with zero complaints.
    today = date.today()
    monthly_counts = {}

    for offset in reversed(range(6)):
        month_index = today.year * 12 + (today.month - 1) - offset
        year = month_index // 12
        month = month_index % 12 + 1

        monthly_counts[(year, month)] = 0

    # Count actual complaints by their creation month.
    complaint_dates = (
        db.query(Complaint.created_at)
        .filter(Complaint.created_at.is_not(None))
        .all()
    )

    for (created_at,) in complaint_dates:
        key = (created_at.year, created_at.month)

        if key in monthly_counts:
            monthly_counts[key] += 1

    monthly_complaints = [
        {
            "month": calendar.month_abbr[month],
            "year": year,
            "count": count,
        }
        for (year, month), count in monthly_counts.items()
    ]

    # Preserve all existing resolution analytics and add the trend data.
    return {
        **analytics,
        "monthly_complaints": monthly_complaints,
    }

