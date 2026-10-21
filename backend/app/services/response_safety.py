
def citizen_safe_recurrence(recurrence: dict) -> dict:
    """Return recurrence signals without exposing historical case details."""
    return {
        "asset_id": recurrence.get("asset_id"),
        "previous_complaint_count": recurrence.get(
            "previous_complaint_count", 0
        ),
        "is_recurring": recurrence.get("is_recurring", False),
        "resolved_then_failed_again": recurrence.get(
            "resolved_then_failed_again", False
        ),
        "unresolved_previous_count": recurrence.get(
            "unresolved_previous_count", 0
        ),
        "previous_unsolved_count": recurrence.get(
            "previous_unsolved_count", 0
        ),
        "message": recurrence.get("message"),
        # Deliberately omit historical_complaints, including titles,
        # statuses, worker notes, and intervention details.
    }


def citizen_safe_case_history(response: dict) -> dict:
    """Remove staff-only information from a case-history response."""
    safe_response = dict(response)

    safe_response["interventions"] = [
        {
            "action_taken": item.get("action_taken"),
            "created_at": item.get("created_at"),
        }
        for item in response.get("interventions", [])
    ]

    safe_response["citizen_feedback"] = [
        {
            "outcome": item.get("outcome"),
            "created_at": item.get("created_at"),
        }
        for item in response.get("citizen_feedback", [])
    ]

    # Staff-only information.
    safe_response.pop("admin_decisions", None)

    safe_response["recurrence"] = citizen_safe_recurrence(
        response.get("recurrence", {})
    )

    return safe_response
