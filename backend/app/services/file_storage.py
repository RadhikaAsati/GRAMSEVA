
from pathlib import Path
from uuid import uuid4
import re


MAX_IMAGE_SIZE = 5 * 1024 * 1024

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_ROOT = PROJECT_ROOT / "uploads"
COMPLAINT_PHOTO_DIR = UPLOAD_ROOT / "complaint_photos"

COMPLAINT_PHOTO_DIR.mkdir(parents=True, exist_ok=True)


def detect_image_type(data: bytes) -> tuple[str, str]:
    """Validate image signatures and return the detected MIME type and extension."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"

    if (
        len(data) >= 12
        and data.startswith(b"RIFF")
        and data[8:12] == b"WEBP"
    ):
        return "image/webp", ".webp"

    raise ValueError("Invalid image content. Upload a valid JPEG, PNG, or WebP image.")


def store_complaint_photo(
    original_filename: str,
    data: bytes,
) -> dict:
    """Validate and store a complaint photo using a random filename."""
    if not data:
        raise ValueError("The uploaded image is empty.")

    if len(data) > MAX_IMAGE_SIZE:
        raise ValueError("Image must be 5 MB or smaller.")

    content_type, extension = detect_image_type(data)

    safe_original_filename = Path(original_filename or "photo").name
    safe_original_filename = re.sub(
        r"[\x00-\x1f\x7f]", "", safe_original_filename
    )[:255] or "photo"

    stored_filename = f"{uuid4().hex}{extension}"
    destination = COMPLAINT_PHOTO_DIR / stored_filename

    try:
        with destination.open("xb") as image_file:
            image_file.write(data)
    except OSError:
        raise

    return {
        "file_url": f"/uploads/complaint_photos/{stored_filename}",
        "original_filename": safe_original_filename,
        "content_type": content_type,
        "file_size": len(data),
        "stored_path": destination,
    }


def delete_stored_photo(path: Path) -> None:
    """Remove a stored photo if a later database operation fails."""
    try:
        path.resolve().relative_to(COMPLAINT_PHOTO_DIR.resolve())
    except ValueError:
        raise ValueError("Photo path is outside the permitted storage directory.")

    path.unlink(missing_ok=True)
