
from dataclasses import dataclass


@dataclass
class ResolutionAssessment:
    complaint_id: int
    outcome: str
    recommendation: str
    intervention_count: int
    requires_follow_up: bool


def assess_resolution(
    complaint_id: int,
    intervention_count: int,
    citizen_outcomes: list[str],
) -> ResolutionAssessment:
    """
    Provide a basic resolution assessment using intervention
    history and citizen feedback.
    """

    if not citizen_outcomes:
        return ResolutionAssessment(
            complaint_id=complaint_id,
            outcome="awaiting_feedback",
            recommendation="Request citizen feedback before confirming resolution.",
            intervention_count=intervention_count,
            requires_follow_up=intervention_count == 0,
        )

    latest_outcome = citizen_outcomes[-1]

    if latest_outcome == "not_solved":
        return ResolutionAssessment(
            complaint_id=complaint_id,
            outcome="not_solved",
            recommendation="Reopen the issue for further investigation and intervention.",
            intervention_count=intervention_count,
            requires_follow_up=True,
        )

    if latest_outcome == "partially_solved":
        return ResolutionAssessment(
            complaint_id=complaint_id,
            outcome="partially_solved",
            recommendation="Arrange a follow-up intervention for the remaining problem.",
            intervention_count=intervention_count,
            requires_follow_up=True,
        )

    if latest_outcome == "resolved":
        return ResolutionAssessment(
            complaint_id=complaint_id,
            outcome="resolved",
            recommendation="Record the citizen-reported resolution and monitor for recurrence.",
            intervention_count=intervention_count,
            requires_follow_up=False,
        )

    return ResolutionAssessment(
        complaint_id=complaint_id,
        outcome="needs_review",
        recommendation="Review the feedback before deciding the next action.",
        intervention_count=intervention_count,
        requires_follow_up=True,
    )
