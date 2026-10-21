
from backend.app.api.auth import get_current_user
from backend.app.models import Complaint
from backend.tests.test_staff_permissions import authenticate_as


def test_unauthenticated_user_cannot_access_resolution(client, complaint_factory):
    complaint = complaint_factory(401, "Resolution auth test")

    response = client.get(f"/resolution/{complaint.id}")

    assert response.status_code == 401


def test_citizen_can_access_own_resolution(
    client, user_factory, complaint_factory
):
    citizen = user_factory(402, "resolution402@example.test", "citizen")
    complaint = complaint_factory(citizen.id, "Own resolution test")
    authenticate_as(client, citizen)

    response = client.get(f"/resolution/{complaint.id}")

    assert response.status_code == 200, response.text
    assert response.json()["complaint_id"] == complaint.id


def test_citizen_cannot_access_another_citizens_resolution(
    client, user_factory, complaint_factory
):
    citizen_a = user_factory(403, "resolution403@example.test", "citizen")
    citizen_b = user_factory(404, "resolution404@example.test", "citizen")
    complaint = complaint_factory(citizen_b.id, "Private resolution test")
    authenticate_as(client, citizen_a)

    response = client.get(f"/resolution/{complaint.id}")

    assert response.status_code == 404


def test_unauthenticated_user_cannot_access_case_history(
    client, complaint_factory
):
    complaint = complaint_factory(405, "Case history auth test")

    response = client.get(f"/complaints/{complaint.id}/case-history")

    assert response.status_code == 401


def test_citizen_can_access_own_case_history(
    client, user_factory, complaint_factory
):
    citizen = user_factory(406, "history406@example.test", "citizen")
    complaint = complaint_factory(citizen.id, "Own case history test")
    authenticate_as(client, citizen)

    response = client.get(f"/complaints/{complaint.id}/case-history")

    assert response.status_code == 200, response.text
    assert response.json()["complaint"]["id"] == complaint.id


def test_citizen_cannot_access_another_citizens_case_history(
    client, user_factory, complaint_factory
):
    citizen_a = user_factory(407, "history407@example.test", "citizen")
    citizen_b = user_factory(408, "history408@example.test", "citizen")
    complaint = complaint_factory(citizen_b.id, "Private case history test")
    authenticate_as(client, citizen_a)

    response = client.get(f"/complaints/{complaint.id}/case-history")

    assert response.status_code == 404


def test_unauthenticated_user_cannot_access_similar_cases(
    client, complaint_factory
):
    complaint = complaint_factory(409, "Similar cases auth test")

    response = client.get(f"/complaints/{complaint.id}/similar-cases")

    assert response.status_code == 401


def test_citizen_cannot_access_another_citizens_similar_cases(
    client, user_factory, complaint_factory
):
    citizen_a = user_factory(410, "similar410@example.test", "citizen")
    citizen_b = user_factory(411, "similar411@example.test", "citizen")
    complaint = complaint_factory(citizen_b.id, "Private similar cases test")
    authenticate_as(client, citizen_a)

    response = client.get(f"/complaints/{complaint.id}/similar-cases")

    assert response.status_code == 404

def test_citizen_similar_cases_hide_historical_private_details(
    client, user_factory, complaint_factory, test_db
):
    from backend.app.models import Intervention, Feedback

    citizen = user_factory(
        412, "similar412@example.test", "citizen"
    )
    current = complaint_factory(citizen.id, "Current streetlight issue")
    historical = complaint_factory(
        413, "PRIVATE historical streetlight complaint"
    )

    historical.category = current.category
    historical.description = (
        "PRIVATE description containing personal information"
    )
    test_db.add(historical)
    test_db.commit()

    intervention = Intervention(
        complaint_id=historical.id,
        action_taken="PRIVATE repair details",
        performed_by="PRIVATE worker name",
        notes="PRIVATE internal notes",
    )
    test_db.add(intervention)
    test_db.commit()

    feedback = Feedback(
        complaint_id=historical.id,
        outcome="not_solved",
        comments="PRIVATE citizen feedback",
    )
    test_db.add(feedback)
    test_db.commit()

    authenticate_as(client, citizen)

    response = client.get(
        f"/complaints/{current.id}/similar-cases"
    )

    assert response.status_code == 200, response.text
    body = response.json()

    # The learning signal should remain available.
    assert "similar_cases" in body

    # Private historical details must not be returned.
    serialized = response.text
    assert "PRIVATE historical streetlight complaint" not in serialized
    assert "PRIVATE description containing personal information" not in serialized
    assert "PRIVATE repair details" not in serialized
    assert "PRIVATE worker name" not in serialized
    assert "PRIVATE internal notes" not in serialized
    assert "PRIVATE citizen feedback" not in serialized

def test_worker_similar_cases_hide_historical_private_details(
    client, user_factory, complaint_factory, test_db
):
    from backend.app.models import Intervention, Feedback

    worker = user_factory(
        414, "worker414@example.test", "worker"
    )
    citizen = user_factory(
        415, "citizen415@example.test", "citizen"
    )

    current = complaint_factory(
        citizen.id, "Current streetlight issue"
    )
    historical = complaint_factory(
        416, "PRIVATE historical streetlight complaint"
    )

    # Workers should only access complaints assigned to them.
    current.assigned_worker_id = worker.id
    test_db.add(current)

    historical.category = current.category
    historical.description = (
        "PRIVATE description containing personal information"
    )
    test_db.add(historical)
    test_db.commit()

    intervention = Intervention(
        complaint_id=historical.id,
        action_taken="PRIVATE repair details",
        performed_by="PRIVATE worker name",
        notes="PRIVATE internal notes",
    )
    test_db.add(intervention)
    test_db.commit()

    feedback = Feedback(
        complaint_id=historical.id,
        outcome="not_solved",
        comments="PRIVATE citizen feedback",
    )
    test_db.add(feedback)
    test_db.commit()

    authenticate_as(client, worker)

    response = client.get(
        f"/complaints/{current.id}/similar-cases"
    )

    assert response.status_code == 200, response.text
    body = response.json()

    # Workers can still receive useful, filtered learning signals.
    assert "similar_cases" in body

    # Historical private details must not leak to the worker.
    serialized = response.text
    assert "PRIVATE historical streetlight complaint" not in serialized
    assert "PRIVATE description containing personal information" not in serialized
    assert "PRIVATE repair details" not in serialized
    assert "PRIVATE worker name" not in serialized
    assert "PRIVATE internal notes" not in serialized
    assert "PRIVATE citizen feedback" not in serialized
