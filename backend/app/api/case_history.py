
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.services.similarity import find_similar_complaints
from backend.app.database import get_db
from backend.app.models import AdminDecision, Complaint
from backend.app.services.recurrence import analyze_recurrence
from backend.app.services.resolution_engine import assess_resolution
from backend.app.api.auth import get_current_user
from backend.app.api.complaints import get_accessible_complaint
from backend.app.services.response_safety import citizen_safe_case_history

router = APIRouter(
    prefix="/complaints",
    tags=["Complaint Case History"],
)


@router.get("/{complaint_id}/case-history")
def get_case_history(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    complaint = get_accessible_complaint(
        complaint_id=complaint_id,
        db=db,
        current_user=current_user,
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

    response = {
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

    role = (current_user.role or "").strip().lower()

    if role == "citizen":
        return citizen_safe_case_history(response)

    return response


@router.get("/{complaint_id}/similar-cases")
def get_similar_cases(
    complaint_id: int,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    get_accessible_complaint(
        complaint_id=complaint_id,
        db=db,
        current_user=current_user,
    )

    try:
        result = find_similar_complaints(
            db=db,
            complaint_id=complaint_id,
            limit=max(1, min(limit, 10)),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    role = (current_user.role or "").strip().lower()

    # Staff can inspect detailed history for operational decisions.

    # Only administrators receive detailed historical case records.
    if role == "admin":
        return result

    # Citizens and workers receive privacy-filtered learning signals.
    safe_cases = []
    for case in result.get("similar_cases", []):
        safe_cases.append({
            "category": case.get("category"),
            "status": case.get("status"),
            "historical_outcome_summary": case.get(
                "historical_outcome_summary"
            ),
            "record_quality": case.get("record_quality"),
            "intervention_count": case.get("intervention_count"),
            "similarity_score": case.get("similarity_score"),
            "match_reasons": case.get("match_reasons"),
        })

    return {
        "complaint_id": result.get("complaint_id"),
        "method": result.get("method"),
        "score_note": result.get("score_note"),
        "historical_cases_considered": result.get(
            "historical_cases_considered"
        ),
        "similar_cases": safe_cases,
    }


    # Citizens receive learning signals, not another complaint's
    # identifying details, comments, evidence URLs, or worker notes.
    safe_cases = []
    for case in result.get("similar_cases", []):
        safe_cases.append({
            "category": case.get("category"),
            "status": case.get("status"),
            "historical_outcome_summary": case.get(
                "historical_outcome_summary"
            ),
            "record_quality": case.get("record_quality"),
            "intervention_count": case.get("intervention_count"),
            "similarity_score": case.get("similarity_score"),
            "match_reasons": case.get("match_reasons"),
        })

    return {
        "complaint_id": result.get("complaint_id"),
        "method": result.get("method"),
        "score_note": result.get("score_note"),
        "historical_cases_considered": result.get(
            "historical_cases_considered"
        ),
        "similar_cases": safe_cases,
    }
