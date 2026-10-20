
from sqlalchemy.orm import Session

from backend.app.models import AdminDecision, Complaint
from backend.app.services.resolution_engine import assess_resolution
from backend.app.services.recurrence import analyze_recurrence


def get_resolution_analytics(db: Session) -> dict:
    complaints = (
        db.query(Complaint)
        .order_by(
            Complaint.created_at.desc(),
            Complaint.id.desc(),
        )
        .all()
    )

    counts = {
        "awaiting_feedback": 0,
        "resolved": 0,
        "partially_solved": 0,
        "not_solved": 0,
        "needs_review": 0,
        "requires_follow_up": 0,
        "recurring_complaints": 0,
        "resolved_then_failed_again": 0,
    }

    complaint_details = []

    for complaint in complaints:
        # Collect citizen feedback in chronological order.
        feedback_records = sorted(
            complaint.feedback,
            key=lambda item: (item.created_at, item.id),
        )

        outcomes = [
            item.outcome
            for item in feedback_records
        ]

        # Assess the complaint using the existing resolution engine.
        assessment = assess_resolution(
            complaint_id=complaint.id,
            intervention_count=len(complaint.interventions),
            citizen_outcomes=outcomes,
        )

        # Analyze earlier complaints for the same asset and category.
        recurrence = analyze_recurrence(db, complaint)

        # Retrieve administrator decisions, newest first.
        admin_decisions = (
            db.query(AdminDecision)
            .filter(
                AdminDecision.complaint_id == complaint.id
            )
            .order_by(
                AdminDecision.created_at.desc(),
                AdminDecision.id.desc(),
            )
            .all()
        )

        latest_outcome = outcomes[-1] if outcomes else None

        # Determine complaint priority.
        priority_reasons = []

        if complaint.status == "escalated":
            priority = "high"
            priority_reasons.append(
                "The complaint has been escalated by an administrator."
            )

        elif recurrence["resolved_then_failed_again"]:
            priority = "high"
            priority_reasons.append(
                "An earlier complaint for this asset and category "
                "was reported as resolved before this complaint."
            )

        elif latest_outcome == "not_solved":
            priority = "high"
            priority_reasons.append(
                "The latest citizen feedback reports that the issue "
                "was not solved."
            )

        elif latest_outcome == "partially_solved":
            priority = "medium"
            priority_reasons.append(
                "The latest citizen feedback reports that the issue "
                "was only partially solved."
            )

        elif complaint.status == "under_review":
            priority = "medium"
            priority_reasons.append(
                "The complaint has been marked for administrator review."
            )

        elif assessment.outcome == "awaiting_feedback":
            priority = "medium"
            priority_reasons.append(
                "Citizen feedback is needed before resolution can "
                "be confirmed."
            )

        elif recurrence["is_recurring"]:
            priority = "medium"
            priority_reasons.append(
                "Previous complaint history exists for the same "
                "asset and category."
            )

        else:
            priority = "normal"
            priority_reasons.append(
                "No higher-priority condition was identified "
                "by the current rules."
            )

        # Start with the resolution engine's recommendation.
        recommendation = assessment.recommendation

        if complaint.status == "escalated":
            recommendation = (
                "Review the escalation, investigate the underlying "
                "cause, and record the administrator's next action."
            )

        elif recurrence["resolved_then_failed_again"]:
            recommendation = (
                "Investigate why the issue may have returned. "
                "Review earlier repairs and worker notes, then "
                "request citizen feedback for the current complaint."
            )

        elif latest_outcome == "not_solved":
            recommendation = (
                "Investigate the underlying cause and review previous "
                "interventions before choosing another repair."
            )

        elif latest_outcome == "partially_solved":
            recommendation = (
                "Arrange a follow-up intervention for the remaining "
                "problem and request updated citizen feedback."
            )

        elif complaint.status == "under_review":
            recommendation = (
                "Review the complaint details, previous interventions, "
                "citizen feedback, and available evidence before "
                "deciding the next action."
            )

        # An administrator's latest decision helps determine whether
        # the complaint still needs attention.
        latest_decision = (
            admin_decisions[0] if admin_decisions else None
        )

        admin_requires_follow_up = (
            latest_decision is not None
            and latest_decision.decision in (
                "escalate",
                "mark_for_review",
            )
        )

        requires_follow_up = (
            assessment.requires_follow_up
            or recurrence["resolved_then_failed_again"]
            or latest_outcome in (
                "not_solved",
                "partially_solved",
            )
            or admin_requires_follow_up
            or complaint.status in (
                "escalated",
                "under_review",
            )
        )

        # Update aggregate counts only after combining all conditions.
        counts[assessment.outcome] += 1

        if requires_follow_up:
            counts["requires_follow_up"] += 1

        if recurrence["is_recurring"]:
            counts["recurring_complaints"] += 1

        if recurrence["resolved_then_failed_again"]:
            counts["resolved_then_failed_again"] += 1

        # Keep the complaint's complete administrator decision history.
        decision_history = [
            {
                "id": decision.id,
                "decision": decision.decision,
                "administrator": decision.administrator,
                "notes": decision.notes,
                "created_at": (
                    decision.created_at.isoformat()
                    if decision.created_at
                    else None
                ),
            }
            for decision in admin_decisions
        ]

        complaint_details.append(
            {
                "complaint_id": complaint.id,
                "title": complaint.title,
                "category": complaint.category,
                "asset_id": complaint.asset_id,
                "status": complaint.status,
                "outcome": assessment.outcome,
                "priority": priority,
                "priority_reasons": priority_reasons,
                "intervention_count": assessment.intervention_count,
                "requires_follow_up": requires_follow_up,
                "is_recurring": recurrence["is_recurring"],
                "resolved_then_failed_again": (
                    recurrence["resolved_then_failed_again"]
                ),
                "recommendation": recommendation,
                "history_warning": (
                    recurrence["message"]
                    if recurrence["is_recurring"]
                    else None
                ),
                "admin_decisions": decision_history,
            }
        )

    # Only complaints requiring further attention enter this queue.
    review_queue = [
        complaint
        for complaint in complaint_details
        if complaint["requires_follow_up"]
    ]

    priority_order = {
        "high": 0,
        "medium": 1,
        "normal": 2,
    }

    review_queue.sort(
        key=lambda complaint: (
            priority_order.get(complaint["priority"], 3),
            complaint["complaint_id"],
        )
    )

    return {
        "total_complaints": len(complaints),
        "outcome_counts": counts,
        "complaints": complaint_details,
        "review_queue": review_queue,
    }
