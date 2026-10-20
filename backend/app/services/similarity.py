
import unicodedata
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from backend.app.models import Complaint


def normalize(text: str | None) -> str:
    """Normalize text while preserving letters from Indian languages."""
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text).casefold()
    text = "".join(
        char if char.isalnum() else " "
        for char in text
    )
    return " ".join(text.split())


def complaint_text(complaint: Complaint) -> str:
    """Build searchable text from complaint and saved AI analysis."""
    parts = [
        complaint.title,
        complaint.description,
        complaint.translated_description,
        complaint.category,
    ]

    analysis = complaint.ai_analysis

    if isinstance(analysis, dict):
        result = analysis.get("result", analysis)

        if isinstance(result, dict):
            parts.extend([
                result.get("issue_summary"),
                result.get("issue_type"),
                result.get("duration"),
            ])

            clues = result.get("location_clues", [])

            if isinstance(clues, list):
                parts.extend(str(clue) for clue in clues)

    return " ".join(str(part) for part in parts if part)


def text_similarity(first: str, second: str) -> float:
    """Return an explainable text-similarity score from 0 to 100."""
    first_normalized = normalize(first)
    second_normalized = normalize(second)

    if not first_normalized or not second_normalized:
        return 0.0

    first_words = set(first_normalized.split())
    second_words = set(second_normalized.split())

    union = first_words | second_words

    jaccard = (
        len(first_words & second_words) / len(union)
        if union
        else 0.0
    )

    sequence_score = SequenceMatcher(
        None,
        first_normalized,
        second_normalized,
    ).ratio()

    return round(
        100 * (0.7 * jaccard + 0.3 * sequence_score),
        1,
    )


def summarize_outcome(feedback: list) -> dict:
    """Summarize recorded citizen outcomes without claiming verification."""
    outcomes = {
        str(item.outcome).strip().casefold()
        for item in feedback
    }

    if "not_solved" in outcomes:
        return {
            "label": "Citizen reported not solved",
            "outcome_signal": "negative",
            "recommendation_hint": (
                "Review why the previous intervention did not resolve "
                "the issue before repeating it."
            ),
        }

    if "partially_solved" in outcomes:
        return {
            "label": "Citizen reported partially solved",
            "outcome_signal": "partial",
            "recommendation_hint": (
                "Review what remains unresolved before planning "
                "a follow-up intervention."
            ),
        }

    if "resolved" in outcomes:
        return {
            "label": "Citizen reported resolved",
            "outcome_signal": "positive",
            "recommendation_hint": (
                "Consider the recorded intervention as a precedent, "
                "but verify that it fits the current case."
            ),
        }

    if not outcomes:
        return {
            "label": "No citizen outcome recorded",
            "outcome_signal": "unknown",
            "recommendation_hint": (
                "Do not assume the historical intervention succeeded."
            ),
        }

    return {
        "label": "Outcome requires review",
        "outcome_signal": "unknown",
        "recommendation_hint": (
            "Review the recorded feedback before drawing conclusions."
        ),
    }


def detect_demo_record(interventions: list, feedback: list) -> bool:
    """Heuristically flag records with obvious demo or test indicators."""
    feedback_text = " ".join(
        str(item.comments or "").casefold()
        for item in feedback
    )

    intervention_text = " ".join(
        " ".join([
            str(item.action_taken or ""),
            str(item.notes or ""),
        ]).casefold()
        for item in interventions
    )

    evidence_items = [
        evidence
        for intervention in interventions
        for evidence in intervention.evidence
    ]

    evidence_text = " ".join(
        str(item.description or "").casefold()
        for item in evidence_items
    )

    evidence_urls = [
        str(item.file_url or "").casefold()
        for item in evidence_items
    ]

    return (
        any(term in feedback_text for term in (
            "verification test",
            "workflow test",
            "test repair",
        ))
        or any(term in intervention_text for term in (
            "workflow test",
            "test intervention",
            "temporary test",
            "test repair",
        ))
        or "demo" in evidence_text
        or any(url.startswith("demo/") for url in evidence_urls)
    )


def find_similar_complaints(
    db: Session,
    complaint_id: int,
    limit: int = 5,
) -> dict:
    """Retrieve earlier similar complaints and their recorded history."""
    current = db.get(Complaint, complaint_id)

    if current is None:
        raise ValueError("Complaint not found")

    historical = (
        db.query(Complaint)
        .filter(
            Complaint.id != current.id,
            Complaint.created_at < current.created_at,
        )
        .order_by(
            Complaint.created_at.desc(),
            Complaint.id.desc(),
        )
        .all()
    )

    current_text = complaint_text(current)
    ranked_cases = []

    for past in historical:
        past_text = complaint_text(past)
        text_score = text_similarity(current_text, past_text)

        same_category = (
            normalize(current.category) == normalize(past.category)
        )

        same_asset = (
            current.asset_id is not None
            and past.asset_id is not None
            and current.asset_id == past.asset_id
        )

        # Ranking score: text similarity (70%), category (20 points),
        # and same confirmed asset (10 points).
        score = round(
            0.7 * text_score
            + (20 if same_category else 0)
            + (10 if same_asset else 0),
            1,
        )

        if score <= 0:
            continue

        reasons = []

        if same_category:
            reasons.append("Same complaint category")

        if same_asset:
            reasons.append("Same linked asset")

        if text_score > 0:
            reasons.append(f"Text similarity: {text_score}/100")

        interventions = sorted(
            past.interventions,
            key=lambda item: (item.created_at, item.id),
        )

        feedback = sorted(
            past.feedback,
            key=lambda item: (item.created_at, item.id),
        )

        evidence_count = sum(
            len(intervention.evidence)
            for intervention in interventions
        )

        latest_intervention_at = (
            max(item.created_at for item in interventions)
            if interventions
            else None
        )

        latest_feedback_at = (
            max(item.created_at for item in feedback)
            if feedback
            else None
        )

        if (
            latest_intervention_at is None
            and latest_feedback_at is None
        ):
            feedback_timing = "no_intervention_or_feedback"
        elif latest_intervention_at is None:
            feedback_timing = "feedback_without_intervention"
        elif latest_feedback_at is None:
            feedback_timing = "intervention_without_feedback"
        elif latest_feedback_at >= latest_intervention_at:
            feedback_timing = "feedback_after_latest_intervention"
        else:
            feedback_timing = "feedback_before_latest_intervention"

        outcome_summary = summarize_outcome(feedback)
        is_demo_record = detect_demo_record(interventions, feedback)

        ranked_cases.append({
            "complaint_id": past.id,
            "title": past.title,
            "description": past.description,
            "category": past.category,
            "status": past.status,
            "historical_outcome_summary": outcome_summary,
            "record_quality": {
                "demo_or_test_record_detected": is_demo_record,
                "note": (
                    "Demo/test detection is heuristic. It may miss test "
                    "records or flag legitimate records. Review manually."
                ),
            },
            "intervention_count": len(interventions),
            "evidence_count": evidence_count,
            "feedback_timing": feedback_timing,
            "created_at": past.created_at.isoformat(),
            "asset": (
                {
                    "id": past.asset.id,
                    "name": past.asset.name,
                    "location": past.asset.location,
                }
                if past.asset
                else None
            ),
            "similarity_score": score,
            "match_reasons": reasons,
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
                            "description": evidence.description,
                            "file_url": evidence.file_url,
                            "created_at": evidence.created_at.isoformat(),
                        }
                        for evidence in sorted(
                            intervention.evidence,
                            key=lambda item: (
                                item.created_at,
                                item.id,
                            ),
                        )
                    ],
                }
                for intervention in interventions
            ],
            "citizen_feedback": [
                {
                    "id": item.id,
                    "outcome": item.outcome,
                    "comments": item.comments,
                    "created_at": item.created_at.isoformat(),
                }
                for item in feedback
            ],
        })

    ranked_cases.sort(
        key=lambda item: (
            -item["similarity_score"],
            item["complaint_id"],
        )
    )

    return {
        "complaint_id": current.id,
        "method": (
            "Explainable text, category, and linked-asset matching"
        ),
        "score_note": (
            "Similarity scores are ranking signals, not probabilities "
            "of a correct match or proof that an intervention will work."
        ),
        "historical_cases_considered": len(historical),
        "similar_cases": ranked_cases[:max(1, min(limit, 10))],
    }
