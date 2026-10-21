
from backend.app.api.auth import get_current_user


def authenticate_as(client, user):
    def override_current_user():
        return user

    client.app.dependency_overrides[get_current_user] = override_current_user


def test_citizen_cannot_create_admin_decision(client, user_factory):
    citizen = user_factory(201, "stafftest201@example.test", "citizen")
    authenticate_as(client, citizen)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": 1,
            "decision": "escalate",
            "notes": "Permission test",
        },
    )

    assert response.status_code == 403


def test_worker_cannot_create_admin_decision(client, user_factory):
    worker = user_factory(202, "stafftest202@example.test", "worker")
    authenticate_as(client, worker)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": 1,
            "decision": "escalate",
            "notes": "Permission test",
        },
    )

    assert response.status_code == 403


def test_citizen_cannot_list_admin_decisions(client, user_factory):
    citizen = user_factory(203, "stafftest203@example.test", "citizen")
    authenticate_as(client, citizen)

    response = client.get("/admin-decisions/")

    assert response.status_code == 403


def test_unauthenticated_user_cannot_list_admin_decisions(client):
    response = client.get("/admin-decisions/")
    assert response.status_code == 401


def test_citizen_cannot_create_intervention(
    client, user_factory, complaint_factory
):
    citizen = user_factory(204, "stafftest204@example.test", "citizen")
    complaint = complaint_factory(citizen.id, "Permission test complaint")
    authenticate_as(client, citizen)

    response = client.post(
        "/interventions/",
        json={
            "complaint_id": complaint.id,
            "action_taken": "Permission test",
            "notes": "This must be rejected for citizens.",
        },
    )

    assert response.status_code == 403


def test_unauthenticated_user_cannot_list_interventions(client):
    response = client.get("/interventions/")
    assert response.status_code == 401

def test_worker_can_create_intervention(
    client, user_factory, complaint_factory
):
    worker = user_factory(205, "stafftest205@example.test", "worker")
    complaint = complaint_factory(101, "Worker intervention test")
    complaint.assigned_worker_id = worker.id

    authenticate_as(client, worker)

    response = client.post(
        "/interventions/",
        json={
            "complaint_id": complaint.id,
            "action_taken": "Inspected the streetlight.",
            "notes": "Automated permission test.",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["performed_by"] == worker.full_name

def test_worker_cannot_list_interventions(
    client, user_factory
):
    worker = user_factory(
        206, "stafftest206@example.test", "worker"
    )
    authenticate_as(client, worker)

    response = client.get("/interventions/")

    assert response.status_code == 403


def test_worker_cannot_get_intervention_by_id(
    client, user_factory, complaint_factory
):
    from backend.app.models import Intervention

    admin = user_factory(
        207, "stafftest207@example.test", "admin"
    )
    complaint = complaint_factory(
        102, "Intervention detail permission test"
    )

    intervention = Intervention(
        complaint_id=complaint.id,
        action_taken="Test intervention",
        performed_by=admin.full_name,
        notes="Test notes",
    )

    # Use the existing test database fixture.
    from backend.app.database import get_db

    db_override = client.app.dependency_overrides[get_db]
    db = next(db_override())
    db.add(intervention)
    db.commit()
    db.refresh(intervention)
    intervention_id = intervention.id
    db.close()

    worker = user_factory(
        208, "stafftest208@example.test", "worker"
    )
    authenticate_as(client, worker)

    response = client.get(f"/interventions/{intervention_id}")

    assert response.status_code == 404



def test_citizen_cannot_get_intervention_by_id(
    client, user_factory, complaint_factory
):
    from backend.app.models import Intervention

    citizen = user_factory(
        209, "stafftest209@example.test", "citizen"
    )
    authenticate_as(client, citizen)

    complaint = complaint_factory(
        citizen.id, "Citizen intervention detail test"
    )

    intervention = Intervention(
        complaint_id=complaint.id,
        action_taken="Test intervention",
        performed_by="Test worker",
        notes="Test notes",
    )

def test_admin_can_assign_complaint_to_active_worker(
    client, user_factory, complaint_factory, test_db
):
    from backend.app.models import Complaint

    admin = user_factory(
        220, "assignment220@example.test", "admin"
    )
    citizen = user_factory(
        221, "assignment221@example.test", "citizen"
    )
    worker = user_factory(
        222, "assignment222@example.test", "worker"
    )
    complaint = complaint_factory(
        citizen.id, "Assignment workflow test"
    )

    authenticate_as(client, admin)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": complaint.id,
            "decision": "assign_intervention",
            "notes": "Assign to the responsible worker.",
            "worker_id": worker.id,
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["decision"] == "assign_intervention"

    test_db.refresh(complaint)
    assert complaint.assigned_worker_id == worker.id
    assert complaint.status == "awaiting_intervention"


def test_admin_cannot_assign_complaint_to_citizen(
    client, user_factory, complaint_factory
):
    admin = user_factory(
        223, "assignment223@example.test", "admin"
    )
    citizen = user_factory(
        224, "assignment224@example.test", "citizen"
    )
    complaint = complaint_factory(
        citizen.id, "Invalid assignment test"
    )

    authenticate_as(client, admin)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": complaint.id,
            "decision": "assign_intervention",
            "notes": "This assignment must be rejected.",
            "worker_id": citizen.id,
        },
    )

    assert response.status_code == 400, response.text


def test_admin_cannot_assign_complaint_to_inactive_worker(
    client, user_factory, complaint_factory
):
    admin = user_factory(
        225, "assignment225@example.test", "admin"
    )
    worker = user_factory(
        226, "assignment226@example.test", "worker"
    )
    worker.is_active = False

    citizen = user_factory(
        227, "assignment227@example.test", "citizen"
    )
    complaint = complaint_factory(
        citizen.id, "Inactive worker assignment test"
    )

    authenticate_as(client, admin)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": complaint.id,
            "decision": "assign_intervention",
            "notes": "This assignment must be rejected.",
            "worker_id": worker.id,
        },
    )

    assert response.status_code == 400, response.text


def test_admin_assignment_requires_worker_id(
    client, user_factory, complaint_factory
):
    admin = user_factory(
        228, "assignment228@example.test", "admin"
    )
    citizen = user_factory(
        229, "assignment229@example.test", "citizen"
    )
    complaint = complaint_factory(
        citizen.id, "Missing worker ID test"
    )

    authenticate_as(client, admin)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": complaint.id,
            "decision": "assign_intervention",
            "notes": "Missing worker ID.",
        },
    )

    assert response.status_code == 422, response.text


def test_non_assignment_decision_rejects_worker_id(
    client, user_factory, complaint_factory
):
    admin = user_factory(
        230, "assignment230@example.test", "admin"
    )
    citizen = user_factory(
        231, "assignment231@example.test", "citizen"
    )
    worker = user_factory(
        232, "assignment232@example.test", "worker"
    )
    complaint = complaint_factory(
        citizen.id, "Unexpected worker ID test"
    )

    authenticate_as(client, admin)

    response = client.post(
        "/admin-decisions/",
        json={
            "complaint_id": complaint.id,
            "decision": "escalate",
            "notes": "Escalate the complaint.",
            "worker_id": worker.id,
        },
    )

    assert response.status_code == 422, response.text
