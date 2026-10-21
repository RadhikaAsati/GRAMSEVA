from uuid import uuid4

from backend.app.api.auth import get_current_user
from backend.app.models import ComplaintAttachment
from backend.app.services.file_storage import COMPLAINT_PHOTO_DIR


def authenticate_as(client, user):
    def override_current_user():
        return user

    client.app.dependency_overrides[get_current_user] = override_current_user


def create_test_photo(test_db, complaint):
    # Valid PNG signature for exercising the protected file endpoint.
    content = bytes.fromhex(
        "89504e470d0a1a0a"
        "0000000d494844520000000100000001"
        "08060000001f15c489"
    )
    filename = f"{uuid4().hex}.png"
    photo_path = COMPLAINT_PHOTO_DIR / filename
    photo_path.write_bytes(content)

    attachment = ComplaintAttachment(
        complaint_id=complaint.id,
        file_url=f"/uploads/complaint_photos/{filename}",
        original_filename="test-photo.png",
        content_type="image/png",
        file_size=len(content),
        description="Security test photo",
    )
    test_db.add(attachment)
    test_db.commit()
    test_db.refresh(attachment)

    return attachment, photo_path


def test_unauthenticated_user_cannot_access_complaint_photo(
    client, citizen_factory, complaint_factory, test_db
):
    owner = citizen_factory(101, "photo-owner@example.test")
    complaint = complaint_factory(owner.id, "Owner photo complaint")
    attachment, photo_path = create_test_photo(test_db, complaint)

    try:
        response = client.get(
            f"/complaints/{complaint.id}/attachments/"
            f"{attachment.id}/photo"
        )
        assert response.status_code == 401
    finally:
        photo_path.unlink(missing_ok=True)


def test_citizen_can_access_own_complaint_photo(
    client, citizen_factory, complaint_factory, test_db
):
    owner = citizen_factory(102, "photo-owner2@example.test")
    complaint = complaint_factory(owner.id, "My photo complaint")
    attachment, photo_path = create_test_photo(test_db, complaint)

    try:
        authenticate_as(client, owner)
        response = client.get(
            f"/complaints/{complaint.id}/attachments/"
            f"{attachment.id}/photo"
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("image/png")
        assert response.content == photo_path.read_bytes()
        assert response.headers.get("x-content-type-options") == "nosniff"
    finally:
        photo_path.unlink(missing_ok=True)


def test_citizen_cannot_access_another_citizens_photo(
    client, citizen_factory, complaint_factory, test_db
):
    owner = citizen_factory(103, "photo-owner3@example.test")
    other = citizen_factory(104, "photo-other@example.test")
    complaint = complaint_factory(owner.id, "Private photo complaint")
    attachment, photo_path = create_test_photo(test_db, complaint)

    try:
        authenticate_as(client, other)
        response = client.get(
            f"/complaints/{complaint.id}/attachments/"
            f"{attachment.id}/photo"
        )
        assert response.status_code == 404
    finally:
        photo_path.unlink(missing_ok=True)


def test_attachment_must_belong_to_requested_complaint(
    client, citizen_factory, complaint_factory, test_db
):
    owner = citizen_factory(105, "photo-owner4@example.test")
    complaint = complaint_factory(owner.id, "First complaint")
    other_complaint = complaint_factory(owner.id, "Second complaint")
    attachment, photo_path = create_test_photo(test_db, complaint)

    try:
        authenticate_as(client, owner)
        response = client.get(
            f"/complaints/{other_complaint.id}/attachments/"
            f"{attachment.id}/photo"
        )
        assert response.status_code == 404
    finally:
        photo_path.unlink(missing_ok=True)


def test_missing_photo_attachment_returns_404(
    client, citizen_factory, complaint_factory
):
    owner = citizen_factory(106, "photo-owner5@example.test")
    complaint = complaint_factory(owner.id, "Missing photo complaint")

    authenticate_as(client, owner)
    response = client.get(
        f"/complaints/{complaint.id}/attachments/999999/photo"
    )

    assert response.status_code == 404
