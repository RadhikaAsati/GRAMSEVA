
from backend.tests.test_staff_permissions import authenticate_as


def test_unauthenticated_user_cannot_list_evidence(client):
    response = client.get("/evidence/")
    assert response.status_code == 401


def test_unauthenticated_user_cannot_get_evidence(client):
    response = client.get("/evidence/1")
    assert response.status_code == 401


def test_unauthenticated_user_cannot_create_evidence(client):
    response = client.post(
        "/evidence/",
        json={
            "intervention_id": 1,
            "file_url": "demo/evidence.jpg",
            "description": "Permission test",
        },
    )
    assert response.status_code == 401


def test_worker_cannot_list_evidence(client, user_factory):
    worker = user_factory(
        604, "evidencetest604@example.test", "worker"
    )
    authenticate_as(client, worker)

    response = client.get("/evidence/")
    assert response.status_code == 403


def test_worker_cannot_get_evidence(client, user_factory):
    worker = user_factory(
        606, "evidencetest606@example.test", "worker"
    )
    authenticate_as(client, worker)

    response = client.get("/evidence/1")
    assert response.status_code == 403

def test_citizen_cannot_get_evidence(client, user_factory):
    citizen = user_factory(602, "evidencetest602@example.test", "citizen")
    authenticate_as(client, citizen)

    response = client.get("/evidence/1")
    assert response.status_code == 403


def test_citizen_cannot_create_evidence(client, user_factory):
    citizen = user_factory(603, "evidencetest603@example.test", "citizen")
    authenticate_as(client, citizen)

    response = client.post(
        "/evidence/",
        json={
            "intervention_id": 1,
            "file_url": "demo/evidence.jpg",
            "description": "Must be rejected for citizens",
        },
    )
    assert response.status_code == 403


def test_worker_cannot_list_evidence(client, user_factory):
    worker = user_factory(604, "evidencetest604@example.test", "worker")
    authenticate_as(client, worker)

    response = client.get("/evidence/")
    assert response.status_code == 403


def test_admin_can_list_evidence(client, user_factory):
    admin = user_factory(605, "evidencetest605@example.test", "admin")
    authenticate_as(client, admin)

    response = client.get("/evidence/")
    assert response.status_code == 200
