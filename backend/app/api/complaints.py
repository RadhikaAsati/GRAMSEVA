import logging

logger = logging.getLogger(__name__)
from datetime import datetime
from pathlib import Path
from typing import Literal
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from backend.app.api.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import (
    Asset,
    Complaint,
    ComplaintAttachment,
    User,
)
from backend.app.services.asset_matching import match_assets
from backend.app.services.file_storage import (
    MAX_IMAGE_SIZE,
    delete_stored_photo,
    store_complaint_photo,
)
from backend.app.services.translation import (
    translate_text,
    translate_to_english,
)
from backend.app.services.file_storage import (
    COMPLAINT_PHOTO_DIR,
    MAX_IMAGE_SIZE,
    delete_stored_photo,
    store_complaint_photo,
)


class ComplaintTranslationRequest(BaseModel):
    target_language: Literal["en", "hi", "mr"]


class ComplaintTranslationResponse(BaseModel):
    complaint_id: int
    original_language: str
    original_description: str
    target_language: str
    translation: str


class ComplaintDraftUnderstandingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10000)
    category: str = Field(min_length=1, max_length=50)
    original_language: Literal["mr", "hi", "en"] = "en"

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"],
    dependencies=[Depends(get_current_user)],
)


# ---------------------------------------------------------
# Authorization helpers
# ---------------------------------------------------------

def ensure_complaint_access(
    complaint: Complaint,
    current_user: User,
) -> None:
    """Enforce complaint access by role, ownership, and assignment."""

    role = (current_user.role or "").strip().lower()

    if role == "admin":
        return

    if role == "worker":
        if complaint.assigned_worker_id == current_user.id:
            return

        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    if role == "citizen" and complaint.citizen_id == current_user.id:
        return

    raise HTTPException(
        status_code=404,
        detail="Complaint not found",
    )


def get_accessible_complaint(
    complaint_id: int,
    db: Session,
    current_user: User,
) -> Complaint:
    """Fetch a complaint and verify access before using it."""

    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    ensure_complaint_access(complaint, current_user)
    return complaint


def ensure_staff_role(current_user: User) -> None:
    """Restrict staff-only actions to workers and administrators."""

    role = (current_user.role or "").strip().lower()

    if role not in {"admin", "worker"}:
        raise HTTPException(
            status_code=403,
            detail="Worker or administrator permission required.",
        )


# ---------------------------------------------------------
# Request and response schemas
# ---------------------------------------------------------

class ComplaintCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1, max_length=50)
    asset_id: int | None = None
    original_language: Literal["mr", "hi", "en"] = "en"
    input_method: Literal["text", "voice"] = "text"
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    village: str | None = Field(default=None, max_length=150)
    ward: str | None = Field(default=None, max_length=100)
    landmark: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "Provide both latitude and longitude, or leave both empty."
            )
        return self


class AssetLinkRequest(BaseModel):
    asset_id: int = Field(gt=0)


class ComplaintResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    status: str
    asset_id: int | None
    latitude: float | None = None
    longitude: float | None = None
    village: str | None = None
    ward: str | None = None
    landmark: str | None = None
    created_at: datetime
    original_language: str = "en"
    translated_description: str | None = None
    translation_status: str = "pending"
    input_method: str = "text"
    transcription_status: str = "not_applicable"

    model_config = {"from_attributes": True}

class AttachmentResponse(BaseModel):
    id: int
    complaint_id: int
    file_url: str
    original_filename: str
    content_type: str
    file_size: int
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# Create a text complaint
# ---------------------------------------------------------

@router.post("/", response_model=ComplaintResponse, status_code=201)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (current_user.role or "").strip().lower() != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Only citizens can submit complaints through this endpoint.",
        )

    if payload.asset_id is not None:
        asset = db.get(Asset, payload.asset_id)

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found",
            )

        if not asset.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot link a complaint to an inactive asset",
            )

    complaint_data = payload.model_dump()

    # Never accept ownership from the request body.
    complaint_data["citizen_id"] = current_user.id

    original_text = payload.description

    if payload.original_language == "en":
        complaint_data["translated_description"] = original_text
        complaint_data["translation_status"] = "not_needed"
    else:
        try:
            translated = translate_to_english(
                original_text,
                payload.original_language,
            )
            complaint_data["translated_description"] = translated
            complaint_data["translation_status"] = "completed"
        except Exception as exc:
            print(
                f"Translation failed for language "
                f"{payload.original_language}: "
                f"{type(exc).__name__}: {exc}"
            )
            complaint_data["translated_description"] = None
            complaint_data["translation_status"] = "failed"

    complaint = Complaint(**complaint_data)
    db.add(complaint)

    try:
        db.commit()
        db.refresh(complaint)
    except Exception:
        db.rollback()
        raise

    return complaint


# ---------------------------------------------------------
# List complaints visible to the current user
# ---------------------------------------------------------

@router.get("/", response_model=list[ComplaintResponse])
def list_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = (current_user.role or "").strip().lower()

    query = db.query(Complaint)

    if role == "citizen":
        query = query.filter(Complaint.citizen_id == current_user.id)
    elif role == "worker":
        query = query.filter(
            Complaint.assigned_worker_id == current_user.id
        )
    elif role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view complaints.",
        )

    return query.order_by(Complaint.id).all()

# ---------------------------------------------------------
# Get one complaint
# ---------------------------------------------------------
@router.post("/draft/understand")
def understand_complaint_draft(
    payload: ComplaintDraftUnderstandingRequest,
    current_user: User = Depends(get_current_user),
):
    """Analyze an unsaved complaint draft without writing to the database."""

    if (current_user.role or "").strip().lower() != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Only citizens can analyze a complaint draft.",
        )

    from backend.app.services.complaint_understanding import (
        understand_complaint,
    )

    try:
        result = understand_complaint(
            title=payload.title.strip() or "Untitled complaint",
            description=payload.description.strip(),
            category=payload.category,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Draft complaint understanding failed")
        raise HTTPException(
            status_code=502,
            detail="AI understanding is temporarily unavailable. You can still submit your complaint.",
    )

    if result.get("missing_information"):
        result["needs_human_review"] = True

    return {
        "analysis": result,
        "saved_to_database": False,
    }
@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )
@router.post(
    "/{complaint_id}/translate",
    response_model=ComplaintTranslationResponse,
)
def translate_complaint(
    complaint_id: int,
    payload: ComplaintTranslationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Translate a complaint without modifying its stored text."""

    complaint = get_accessible_complaint(
        complaint_id=complaint_id,
        db=db,
        current_user=current_user,
    )

    original_description = complaint.description
    original_language = complaint.original_language or "en"

    try:
        translated_text = translate_text(
            text=original_description,
            source_language=original_language,
            target_language=payload.target_language,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except Exception:
        logger.exception(
            "Complaint translation failed: complaint_id=%s, "
            "source_language=%s, target_language=%s",
            complaint_id,
            original_language,
            payload.target_language,
        )
        raise HTTPException(
            status_code=502,
            detail="Translation is temporarily unavailable. Please try again.",
        )

    return ComplaintTranslationResponse(
        complaint_id=complaint.id,
        original_language=original_language,
        original_description=original_description,
        target_language=payload.target_language,
        translation=translated_text,
    )

# ---------------------------------------------------------
# Upload a complaint photo
# ---------------------------------------------------------

@router.post(
    "/{complaint_id}/attachments",
    response_model=AttachmentResponse,
    status_code=201,
)
async def upload_complaint_photo(
    complaint_id: int,
    image: UploadFile = File(...),
    description: str | None = Form(default=None, max_length=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    try:
        image_bytes = await image.read(MAX_IMAGE_SIZE + 1)
    finally:
        await image.close()

    try:
        stored = store_complaint_photo(
            original_filename=image.filename or "photo",
            data=image_bytes,
        )
    except ValueError as exc:
        message = str(exc)
        status_code = 413 if "5 MB" in message else 415

        if "empty" in message.lower():
            status_code = 400

        raise HTTPException(
            status_code=status_code,
            detail=message,
        )

    attachment = ComplaintAttachment(
        complaint_id=complaint.id,
        file_url=stored["file_url"],
        original_filename=stored["original_filename"],
        content_type=stored["content_type"],
        file_size=stored["file_size"],
        description=description,
    )

    try:
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
    except Exception:
        db.rollback()
        delete_stored_photo(stored["stored_path"])
        raise

    return attachment


# ---------------------------------------------------------
# List photos for a complaint
# ---------------------------------------------------------

@router.get(
    "/{complaint_id}/attachments",
    response_model=list[AttachmentResponse],
)
def list_complaint_photos(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    attachments = (
    db.query(ComplaintAttachment)
    .filter(ComplaintAttachment.complaint_id == complaint_id)
    .order_by(ComplaintAttachment.id)
    .all()
    )
    return [attachment_response(item) for item in attachments]
# ---------------------------------------------------------
# Securely retrieve a complaint photo
# ---------------------------------------------------------

@router.get(
    "/{complaint_id}/attachments/{attachment_id}/photo",
    response_class=FileResponse,
)
def get_complaint_photo(
    complaint_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the user may access this complaint.
    get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    # Ensure the attachment belongs to this complaint.
    attachment = (
        db.query(ComplaintAttachment)
        .filter(
            ComplaintAttachment.id == attachment_id,
            ComplaintAttachment.complaint_id == complaint_id,
        )
        .first()
    )

    if attachment is None:
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    # Accept only the expected legacy storage URL format.
    prefix = "/uploads/complaint_photos/"
    if not attachment.file_url.startswith(prefix):
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    stored_filename = attachment.file_url[len(prefix):]

    # Filenames created by the storage service are UUIDs with an
    # approved image extension. Reject path separators and traversal.
    if (
        not stored_filename
        or Path(stored_filename).name != stored_filename
        or "/" in stored_filename
        or "\\" in stored_filename
    ):
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    expected_extension = allowed_types.get(attachment.content_type)
    if (
        expected_extension is None
        or not stored_filename.endswith(expected_extension)
    ):
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    photo_path = COMPLAINT_PHOTO_DIR / stored_filename

    try:
        photo_path.resolve().relative_to(
            COMPLAINT_PHOTO_DIR.resolve()
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    if not photo_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    return FileResponse(
        path=photo_path,
        media_type=attachment.content_type,
        filename=attachment.original_filename,
        content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff"},
    )
def attachment_response(
    attachment: ComplaintAttachment,
) -> AttachmentResponse:
    return AttachmentResponse(
        id=attachment.id,
        complaint_id=attachment.complaint_id,
        file_url=(
            f"/complaints/{attachment.complaint_id}"
            f"/attachments/{attachment.id}/photo"
        ),
        original_filename=attachment.original_filename,
        content_type=attachment.content_type,
        file_size=attachment.file_size,
        description=attachment.description,
        created_at=attachment.created_at,
    )

# ---------------------------------------------------------
# Suggest matching assets
# ---------------------------------------------------------

@router.get("/{complaint_id}/asset-candidates")
def get_asset_candidates(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    try:
        return match_assets(db, complaint_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ---------------------------------------------------------
# Confirm an asset link
# ---------------------------------------------------------

@router.post(
    "/{complaint_id}/confirm-asset",
    response_model=ComplaintResponse,
)
def confirm_complaint_asset(
    complaint_id: int,
    payload: AssetLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Linking an asset is a staff action, not a citizen action.
    ensure_staff_role(current_user)

    complaint = get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    if complaint.asset_id is not None:
        raise HTTPException(
            status_code=409,
            detail="This complaint already has an asset linked.",
        )

    asset = db.get(Asset, payload.asset_id)

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail="Asset not found",
        )

    if not asset.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot link a complaint to an inactive asset",
        )

    complaint.asset_id = asset.id

    try:
        db.commit()
        db.refresh(complaint)
    except Exception:
        db.rollback()
        raise

    return complaint


# ---------------------------------------------------------
# Create a voice complaint
# ---------------------------------------------------------

@router.post(
    "/voice",
    response_model=ComplaintResponse,
    status_code=201,
)
async def create_voice_complaint(
    audio_file: UploadFile = File(...),
    category: str = Form(..., min_length=1, max_length=50),
    original_language: Literal["mr", "hi"] = Form(...),
    title: str = Form(default="Voice complaint", max_length=200),
    asset_id: int | None = Form(default=None),
    latitude: float | None = Form(default=None, ge=-90, le=90),
    longitude: float | None = Form(default=None, ge=-180, le=180),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if (current_user.role or "").strip().lower() != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Only citizens can submit complaints through this endpoint.",
        )

    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="Provide both latitude and longitude, or leave both empty.",
        )

    max_audio_size = 10 * 1024 * 1024

    allowed_extensions = {
        ".wav",
        ".mp3",
        ".m4a",
        ".ogg",
        ".flac",
        ".aac",
        ".aiff",
        ".webm",
        ".opus",
    }

    filename = audio_file.filename or ""
    suffix = Path(filename).suffix.lower()

    if suffix not in allowed_extensions:
        await audio_file.close()
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported audio format. Upload WAV, MP3, M4A, "
                "OGG, FLAC, AAC, AIFF, WebM, or Opus."
            ),
        )

    try:
        audio_bytes = await audio_file.read(max_audio_size + 1)
    finally:
        await audio_file.close()

    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded audio file is empty.",
        )

    if len(audio_bytes) > max_audio_size:
        raise HTTPException(
            status_code=413,
            detail="Audio file must be 10 MB or smaller.",
        )

    if asset_id is not None:
        asset = db.get(Asset, asset_id)

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found",
            )

        if not asset.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot link a complaint to an inactive asset",
            )

    from backend.app.services.transcription import transcribe_audio

    try:
        transcript = transcribe_audio(
            audio_bytes=audio_bytes,
            suffix=suffix,
            language=original_language,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        print(
            f"Voice transcription failed: "
            f"{type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "Voice transcription failed. "
                "Please try again with a clear recording."
            ),
        )

    complaint_data = {
        "title": title.strip() or "Voice complaint",
        "description": transcript,
        "category": category.strip(),
        "asset_id": asset_id,
        "original_language": original_language,
        "input_method": "voice",
        "transcription_status": "completed",
        "latitude": latitude,
        "longitude": longitude,
        # Link the complaint to the authenticated citizen.
        "citizen_id": current_user.id,
    }

    try:
        translated = translate_to_english(
            transcript,
            original_language,
        )
        complaint_data["translated_description"] = translated
        complaint_data["translation_status"] = "completed"
    except Exception as exc:
        print(
            f"Voice complaint translation failed: "
            f"{type(exc).__name__}: {exc}"
        )
        complaint_data["translated_description"] = None
        complaint_data["translation_status"] = "failed"

    complaint = Complaint(**complaint_data)
    db.add(complaint)

    try:
        db.commit()
        db.refresh(complaint)
    except Exception:
        db.rollback()
        raise

    return complaint


# ---------------------------------------------------------
# AI complaint understanding
# ---------------------------------------------------------

@router.post("/{complaint_id}/understand")
def understand_existing_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import hashlib
    import json

    complaint = get_accessible_complaint(
        complaint_id,
        db,
        current_user,
    )

    from backend.app.services.complaint_understanding import (
        understand_complaint,
    )

    source_text = (
        complaint.translated_description
        or complaint.description
    )

    source_fingerprint = hashlib.sha256(
        json.dumps(
            {
                "title": complaint.title,
                "category": complaint.category,
                "source_text": source_text,
            },
            sort_keys=True,
            ensure_ascii=False,
        ).encode("utf-8")
    ).hexdigest()

    analysis_version = "1.0"
    saved_analysis = complaint.ai_analysis

    if (
        isinstance(saved_analysis, dict)
        and complaint.ai_analysis_version == analysis_version
        and saved_analysis.get("_source_fingerprint")
        == source_fingerprint
        and isinstance(saved_analysis.get("result"), dict)
    ):
        return {
            "complaint_id": complaint.id,
            "original_language": complaint.original_language,
            "original_description": complaint.description,
            "translated_description": complaint.translated_description,
            "analysis": saved_analysis["result"],
            "saved_to_database": True,
            "analysis_cached": True,
            "analysis_version": analysis_version,
        }

    try:
        result = understand_complaint(
            title=complaint.title,
            description=complaint.description,
            category=complaint.category,
            translated_description=complaint.translated_description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        print(
            f"Complaint understanding failed: "
            f"{type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=502,
            detail="AI complaint understanding failed. Please try again.",
        )

    if result.get("missing_information"):
        result["needs_human_review"] = True

    complaint.ai_analysis = {
        "result": result,
        "_source_fingerprint": source_fingerprint,
    }
    complaint.ai_analysis_version = analysis_version

    try:
        db.commit()
        db.refresh(complaint)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="AI analysis could not be saved.",
        )

    return {
        "complaint_id": complaint.id,
        "original_language": complaint.original_language,
        "original_description": complaint.description,
        "translated_description": complaint.translated_description,
        "analysis": result,
        "saved_to_database": True,
        "analysis_cached": False,
        "analysis_version": analysis_version,
    }