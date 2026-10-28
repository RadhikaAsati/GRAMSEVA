
from backend.app.api.auth import get_current_user
from backend.app.models import Feedback, Complaint, Intervention
from backend.tests.test_staff_permissions import authenticate_as


def test_unauthenticated_user_cannot_list_feedback(client):
    response = client.get("/feedback/")
    assert response.status_code == 401


def test_citizen_can_submit_feedback_for_own_complaint(
    client, user_factory, complaint_factory, test_db
):
    citizen = user_factory(301, "feedback301@example.test", "citizen")
    complaint = complaint_factory(citizen.id, "My feedback test")

    intervention = Intervention(
        complaint_id=complaint.id,
        action_taken="Test repair completed",
        performed_by="Test worker",
        notes="Work recorded for feedback test",
    )
    test_db.add(intervention)
    test_db.commit()

    authenticate_as(client, citizen)

    response = client.post(
        "/feedback/",
        json={
            "complaint_id": complaint.id,
            "outcome": "resolved",
            "comments": "The repair is complete.",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["complaint_id"] == complaint.id
    saved = test_db.query(Feedback).filter_by(complaint_id=complaint.id).first()
    assert saved is not None
    assert saved.outcome == "resolved"


def test_citizen_cannot_submit_feedback_for_another_citizens_complaint(
    client, user_factory, complaint_factory
):
    citizen_a = user_factory(302, "feedback302@example.test", "citizen")
    citizen_b = user_factory(303, "feedback303@example.test", "citizen")
    complaint_b = complaint_factory(citizen_b.id, "Another citizen's complaint")
    authenticate_as(client, citizen_a)

    response = client.post(
        "/feedback/",
        json={
            "complaint_id": complaint_b.id,
            "outcome": "not_solved",
            "comments": "Unauthorized feedback attempt.",
        },
    )

    assert response.status_code == 404, response.text


def test_citizen_cannot_view_another_citizens_feedback(
    client, user_factory, complaint_factory, test_db
):
    citizen_a = user_factory(304, "feedback304@example.test", "citizen")
    citizen_b = user_factory(305, "feedback305@example.test", "citizen")
    complaint_b = complaint_factory(citizen_b.id, "Private feedback complaint")

    feedback = Feedback(
        complaint_id=complaint_b.id,
        outcome="resolved",
        comments="Private citizen feedback",
    )
    test_db.add(feedback)
    test_db.commit()
    test_db.refresh(feedback)

    authenticate_as(client, citizen_a)
    response = client.get(f"/feedback/{feedback.id}")

    assert response.status_code == 404, response.text


def test_citizen_feedback_list_contains_only_own_complaints_feedback(
    client, user_factory, complaint_factory, test_db
):
    citizen_a = user_factory(306, "feedback306@example.test", "citizen")
    citizen_b = user_factory(307, "feedback307@example.test", "citizen")
    complaint_a = complaint_factory(citizen_a.id, "Citizen A complaint")
    complaint_b = complaint_factory(citizen_b.id, "Citizen B complaint")

    own_feedback = Feedback(
        complaint_id=complaint_a.id,
        outcome="resolved",
        comments="Own feedback",
    )
    other_feedback = Feedback(
        complaint_id=complaint_b.id,
        outcome="not_solved",
        comments="Other citizen feedback",
    )
    test_db.add_all([own_feedback, other_feedback])
    test_db.commit()

    authenticate_as(client, citizen_a)
    response = client.get("/feedback/")

    assert response.status_code == 200, response.text
    returned_ids = {item["complaint_id"] for item in response.json()}
    assert complaint_a.id in returned_ids
    assert complaint_b.id not in returned_ids


def test_worker_can_list_feedback(
    client, user_factory
):
    worker = user_factory(308, "feedback308@example.test", "worker")
    authenticate_as(client, worker)

    response = client.get("/feedback/")

    assert response.status_code == 200, response.text

def test_unknown_role_cannot_list_feedback(
    client, user_factory
):
    unknown_user = user_factory(
        309, "feedback309@example.test", "supervisor"
    )
    authenticate_as(client, unknown_user)

    response = client.get("/feedback/")

    assert response.status_code == 403


def test_admin_can_list_feedback(
    client, user_factory
):
    admin = user_factory(
        310, "feedback310@example.test", "admin"
    )
    authenticate_as(client, admin)

    response = client.get("/feedback/")

    assert response.status_code == 200, response.text

def test_worker_feedback_list_only_contains_assigned_complaints(
    client, user_factory, complaint_factory, test_db
):
    worker_a = user_factory(
        340, "feedback340@example.test", "worker"
    )
    worker_b = user_factory(
        341, "feedback341@example.test", "worker"
    )
    citizen_a = user_factory(
        342, "feedback342@example.test", "citizen"
    )
    citizen_b = user_factory(
        343, "feedback343@example.test", "citizen"
    )

    complaint_a = complaint_factory(
        citizen_a.id, "Assigned to worker A"
    )
    complaint_b = complaint_factory(
        citizen_b.id, "Assigned to worker B"
    )

    complaint_a.assigned_worker_id = worker_a.id
    complaint_b.assigned_worker_id = worker_b.id
    test_db.commit()

    test_db.add_all([
        Feedback(
            complaint_id=complaint_a.id,
            outcome="resolved",
            comments="Feedback for worker A",
        ),
        Feedback(
            complaint_id=complaint_b.id,
            outcome="not_solved",
            comments="Private feedback for worker B",
        ),
    ])
    test_db.commit()

    authenticate_as(client, worker_a)
    response = client.get("/feedback/")

    assert response.status_code == 200, response.text
    returned = response.json()
    assert [item["complaint_id"] for item in returned] == [
        complaint_a.id
    ]
    assert "Private feedback for worker B" not in response.text


def test_worker_cannot_view_feedback_for_unassigned_complaint(
    client, user_factory, complaint_factory, test_db
):
    worker = user_factory(
        344, "feedback344@example.test", "worker"
    )
    citizen = user_factory(
        345, "feedback345@example.test", "citizen"
    )
    complaint = complaint_factory(
        citizen.id, "Another worker's complaint"
    )

    feedback = Feedback(
        complaint_id=complaint.id,
        outcome="resolved",
        comments="Private feedback",
    )
    test_db.add(feedback)
    test_db.commit()
    test_db.refresh(feedback)

    authenticate_as(client, worker)
    response = client.get(f"/feedback/{feedback.id}")

    assert response.status_code == 404, response.text
