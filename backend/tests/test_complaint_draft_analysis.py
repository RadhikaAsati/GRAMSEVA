
def test_citizen_can_analyze_draft_without_saving_complaint(
    client, citizen_factory, test_db, monkeypatch
):
    from backend.app.api.auth import get_current_user
    from backend.app.models import Complaint

    citizen = citizen_factory(201, "draftcitizen@example.test")

    def authenticate():
        return citizen

    client.app.dependency_overrides[get_current_user] = authenticate

    def fake_understand_complaint(**kwargs):
        assert kwargs["title"] == "Water problem"
        assert "three days" in kwargs["description"]
        return {
            "issue_summary": "Water supply unavailable for three days",
            "issue_type": "water supply failure",
            "location_clues": ["village"],
            "duration": "three days",
            "urgency": "normal",
            "urgency_reason": "Several families are affected.",
            "missing_information": ["specific village name"],
            "needs_human_review": True,
        }

    monkeypatch.setattr(
        "backend.app.services.complaint_understanding.understand_complaint",
        fake_understand_complaint,
    )

    response = client.post(
        "/complaints/draft/understand",
        json={
            "title": "Water problem",
            "description": "No water supply in our village for three days.",
            "category": "Water Supply",
            "original_language": "en",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["saved_to_database"] is False
    assert response.json()["analysis"]["duration"] == "three days"

    saved = (
        test_db.query(Complaint)
        .filter(Complaint.citizen_id == citizen.id)
        .all()
    )
    assert saved == []
