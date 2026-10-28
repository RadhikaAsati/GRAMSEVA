from backend.app.api.auth import get_current_user


def authenticate_as(client, user):
    def override_current_user():
        return user

    client.app.dependency_overrides[get_current_user] = (
        override_current_user
    )


def test_translate_own_complaint(client, citizen_factory, complaint_factory, monkeypatch):
    citizen = citizen_factory(201, "translation201@example.test")
    complaint = complaint_factory(citizen.id, "Streetlight issue")
    complaint.description = "रस्त्यावरील दिवा बंद आहे."
    complaint.original_language = "mr"
    complaint.translated_description = "The streetlight is not working."

    # The stored English translation must remain unchanged.
    original_english = complaint.translated_description

    # Avoid making a real Gemini API call in automated tests.
    def fake_translate_text(text, source_language, target_language):
        assert source_language == "mr"
        assert target_language == "hi"

        if text == "रस्त्यावरील दिवा बंद आहे.":
            return "सड़क की लाइट बंद है।"
        if text == "Streetlight issue":
            return "स्ट्रीटलाइट की समस्या"

        raise AssertionError(f"Unexpected translation input: {text}")

    monkeypatch.setattr(
        "backend.app.api.complaints.translate_text",
        fake_translate_text,
    )

    authenticate_as(client, citizen)

    response = client.post(
        f"/complaints/{complaint.id}/translate",
        json={"target_language": "hi"},
    )

    assert response.status_code == 200, response.text
    data = response.json()

    assert data["original_description"] == "रस्त्यावरील दिवा बंद आहे."
    assert data["original_language"] == "mr"
    assert data["target_language"] == "hi"
    assert data["translation"] == "सड़क की लाइट बंद है।"

    # Confirm the original and existing English translation are untouched.
    assert complaint.description == "रस्त्यावरील दिवा बंद आहे."
    assert complaint.translated_description == original_english


def test_citizen_cannot_translate_another_citizens_complaint(
    client, citizen_factory, complaint_factory, monkeypatch
):
    owner = citizen_factory(202, "translation202@example.test")
    other_citizen = citizen_factory(203, "translation203@example.test")
    complaint = complaint_factory(owner.id, "Private complaint")

    def unexpected_translation(*args, **kwargs):
        raise AssertionError("Translation must not run for unauthorized users")

    monkeypatch.setattr(
        "backend.app.api.complaints.translate_text",
        unexpected_translation,
    )

    authenticate_as(client, other_citizen)

    response = client.post(
        f"/complaints/{complaint.id}/translate",
        json={"target_language": "hi"},
    )

    assert response.status_code == 404


def test_translation_rejects_unsupported_language(
    client, citizen_factory, complaint_factory, monkeypatch
):
    citizen = citizen_factory(204, "translation204@example.test")
    complaint = complaint_factory(citizen.id, "Language validation test")

    def unexpected_translation(*args, **kwargs):
        raise AssertionError("Translation must not run for invalid language")

    monkeypatch.setattr(
        "backend.app.api.complaints.translate_text",
        unexpected_translation,
    )

    authenticate_as(client, citizen)

    response = client.post(
        f"/complaints/{complaint.id}/translate",
        json={"target_language": "fr"},
    )

    assert response.status_code == 422


def test_translation_failure_does_not_modify_complaint(
    client, citizen_factory, complaint_factory, monkeypatch, test_db
):
    citizen = citizen_factory(205, "translation205@example.test")
    complaint = complaint_factory(citizen.id, "Translation failure test")

    original_description = complaint.description
    original_english = complaint.translated_description

    def failed_translation(*args, **kwargs):
        raise RuntimeError("Simulated translation provider failure")

    monkeypatch.setattr(
        "backend.app.api.complaints.translate_text",
        failed_translation,
    )

    authenticate_as(client, citizen)

    response = client.post(
        f"/complaints/{complaint.id}/translate",
        json={"target_language": "hi"},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Translation is temporarily unavailable. Please try again."
    )

    test_db.refresh(complaint)
    assert complaint.description == original_description
    assert complaint.translated_description == original_english