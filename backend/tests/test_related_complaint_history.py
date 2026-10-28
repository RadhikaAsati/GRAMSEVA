from datetime import datetime, timedelta

from backend.app.models import Complaint, Feedback, Intervention
from backend.app.api.case_history import get_case_history
from backend.app.services.similarity import find_similar_complaints


def test_complaint_21_history_includes_unsolved_complaint_20(
    test_db, user_factory
):
    worker = user_factory(
        921, "history-worker@example.test", "admin"
    )

    now = datetime.utcnow()

    previous = Complaint(
        id=20,
        title="School ke paas wali street light five din se kharab hai",
        description=(
            "Street light near the school is not working. "
            "Students face poor visibility at night."
        ),
        category="Street Lights",
        status="awaiting_intervention",
        latitude=21.1768645,
        longitude=79.0606934,
        village="Nagpur",
        landmark="School ke paas",
        created_at=now - timedelta(days=5),
    )
    current = Complaint(
        id=21,
        title="Street light not working near school",
        description=(
            "The streetlight near the school is still not working."
        ),
        category="Street Lights",
        status="awaiting_intervention",
        latitude=21.1768645,
        longitude=79.0606934,
        village="Nagpur",
        landmark="near the school",
        created_at=now,
    )
    test_db.add_all([previous, current])
    test_db.flush()

    test_db.add(
        Intervention(
            complaint_id=20,
            action_taken="Inspected and repaired the streetlight connection.",
            performed_by="Sayali Deshpande",
            notes="Monitor for recurring faults.",
            created_at=now - timedelta(days=1),
        )
    )
    test_db.add(
        Feedback(
            complaint_id=20,
            outcome="not_solved",
            comments="The light still turns off after a few minutes.",
            created_at=now - timedelta(hours=1),
        )
    )
    test_db.commit()

    # Verify the similarity engine finds the earlier complaint first.
    similar = find_similar_complaints(
        db=test_db, complaint_id=21, limit=10
    )
    assert any(
        case["complaint_id"] == 20
        for case in similar["similar_cases"]
    )

    # Exercise the actual case-history endpoint function.
    result = get_case_history(
        complaint_id=21,
        db=test_db,
        current_user=worker,
    )

    history = result["recurrence"]["historical_complaints"]
    earlier = next(
        item for item in history if item["complaint_id"] == 20
    )

    assert earlier["latest_citizen_outcome"] == "not_solved"
    assert len(earlier["previous_interventions"]) == 1
    assert (
        earlier["previous_interventions"][0]["performed_by"]
        == "Sayali Deshpande"
    )
    assert "repaired the streetlight" in (
        earlier["previous_interventions"][0]["action_taken"]
    )
