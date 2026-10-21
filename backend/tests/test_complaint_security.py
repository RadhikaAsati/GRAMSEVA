
import pytest

from backend.app.api.auth import get_current_user
from datetime import datetime, timedelta, timezone

import jwt

from backend.app.config import settings
from backend.app.services.auth import create_access_token

@pytest.fixture
def two_citizens(citizen_factory):
    citizen_a = citizen_factory(101, "citizen101@example.test")
    citizen_b = citizen_factory(102, "citizen102@example.test")
    return citizen_a, citizen_b


def authenticate_as(client, user):
    def override_current_user():
        return user

    client.app.dependency_overrides[get_current_user] = override_current_user


def test_complaint_list_requires_authentication(client):
    response = client.get("/complaints/")
    assert response.status_code == 401


def test_complaint_detail_requires_authentication(client):
    response = client.get("/complaints/999999")
    assert response.status_code == 401


def test_citizen_can_access_own_complaint(
    client, two_citizens, complaint_factory
):
    citizen_a, _ = two_citizens
    complaint = complaint_factory(citizen_a.id, "My streetlight")

    authenticate_as(client, citizen_a)
    response = client.get(f"/complaints/{complaint.id}")

    assert response.status_code == 200
    assert response.json()["id"] == complaint.id
    assert response.json()["title"] == "My streetlight"


def test_citizen_cannot_access_another_citizens_complaint(
    client, two_citizens, complaint_factory
):
    citizen_a, citizen_b = two_citizens
    complaint = complaint_factory(citizen_b.id, "Private complaint")

    authenticate_as(client, citizen_a)
    response = client.get(f"/complaints/{complaint.id}")

    assert response.status_code == 404


def test_citizen_list_contains_only_own_complaints(
    client, two_citizens, complaint_factory
):
    citizen_a, citizen_b = two_citizens
    own_complaint = complaint_factory(citizen_a.id, "My complaint")
    complaint_factory(citizen_b.id, "Other citizen complaint")

    authenticate_as(client, citizen_a)
    response = client.get("/complaints/")

    assert response.status_code == 200
    returned_ids = [item["id"] for item in response.json()]
    assert returned_ids == [own_complaint.id]


def test_missing_complaint_returns_404(client, two_citizens):
    citizen_a, _ = two_citizens
    authenticate_as(client, citizen_a)

    response = client.get("/complaints/999999")

    assert response.status_code == 404


def test_create_complaint_assigns_authenticated_citizen(
    client, two_citizens,test_db
):
    
    citizen_a, _ = two_citizens
    authenticate_as(client, citizen_a)

    response = client.post(
        "/complaints/",
        json={
            "title": "Test streetlight",
            "description": "The streetlight is not working.",
            "category": "streetlight",
            "original_language": "en",
            "input_method": "text",
        },
    )

    assert response.status_code == 201, response.text

    from backend.app.models import Complaint

    saved_complaint = test_db.get(Complaint, response.json()["id"])
    assert saved_complaint is not None
    assert saved_complaint.citizen_id == citizen_a.id



def test_create_complaint_cannot_choose_another_owner(
    client, two_citizens
):
    citizen_a, citizen_b = two_citizens
    authenticate_as(client, citizen_a)

    response = client.post(
        "/complaints/",
        json={
            "title": "Ownership tampering attempt",
            "description": "Attempt to assign this to another user.",
            "category": "streetlight",
            "original_language": "en",
            "input_method": "text",
            "citizen_id": citizen_b.id,
        },
    )

    assert response.status_code == 201, response.text
    assert "citizen_id" not in response.json()

def test_invalid_token_is_rejected(client):
    response = client.get(
        "/complaints/",
        headers={"Authorization": "Bearer invalid.test.token"},
    )

    assert response.status_code == 401


def test_expired_token_is_rejected(client, two_citizens):
    citizen_a, _ = two_citizens

    now = datetime.now(timezone.utc)
    expired_token = jwt.encode(
        {
            "sub": str(citizen_a.id),
            "role": "citizen",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get(
        "/complaints/",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_valid_jwt_can_access_own_complaints(
    client, two_citizens, complaint_factory
):
    citizen_a, _ = two_citizens
    complaint = complaint_factory(citizen_a.id, "JWT test complaint")
    token = create_access_token(citizen_a.id, citizen_a.role)

    response = client.get(
        f"/complaints/{complaint.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == complaint.id
