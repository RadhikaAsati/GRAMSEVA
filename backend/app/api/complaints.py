
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset, Complaint, ComplaintAttachment
from backend.app.services.file_storage import (
    MAX_IMAGE_SIZE,
    store_complaint_photo,
    delete_stored_photo,
)
from backend.app.services.translation import translate_to_english
from backend.app.services.asset_matching import match_assets

router = APIRouter(prefix="/complaints", tags=["Complaints"])


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1, max_length=50)
    asset_id: int | None = None
    original_language: Literal["mr", "hi", "en"] = "en"
    input_method: Literal["text", "voice"] = "text"
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

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

@router.post("/", response_model=ComplaintResponse, status_code=201)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
):
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

@router.get("/", response_model=list[ComplaintResponse])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(Complaint).order_by(Complaint.id).all()


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    return complaint

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
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
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
@router.get(
    "/{complaint_id}/attachments",
    response_model=list[AttachmentResponse],
)
def list_complaint_photos(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
        )

    return (
        db.query(ComplaintAttachment)
        .filter(ComplaintAttachment.complaint_id == complaint_id)
        .order_by(ComplaintAttachment.id)
        .all()
    )
@router.get("/{complaint_id}/asset-candidates")
def get_asset_candidates(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    try:
        return match_assets(db, complaint_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.post("/{complaint_id}/confirm-asset", response_model=ComplaintResponse)
def confirm_complaint_asset(
    complaint_id: int,
    payload: AssetLinkRequest,
    db: Session = Depends(get_db),
):
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
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


@router.post("/voice", response_model=ComplaintResponse, status_code=201)
async def create_voice_complaint(
    audio_file: UploadFile = File(...),
    category: str = Form(..., min_length=1, max_length=50),
    original_language: Literal["mr", "hi"] = Form(...),
    title: str = Form(default="Voice complaint", max_length=200),
    asset_id: int | None = Form(default=None),
    latitude: float | None = Form(default=None, ge=-90, le=90),
    longitude: float | None = Form(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="Provide both latitude and longitude, or leave both empty.",
        )
    max_audio_size = 10 * 1024 * 1024
    allowed_extensions = {
        ".wav", ".mp3", ".m4a", ".ogg", ".flac",
        ".aac", ".aiff", ".webm", ".opus",
    }

    filename = audio_file.filename or ""
    suffix = __import__("pathlib").Path(filename).suffix.lower()

    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format. Upload WAV, MP3, M4A, OGG, FLAC, AAC, AIFF, WebM, or Opus.",
        )

    audio_bytes = await audio_file.read(max_audio_size + 1)
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
            raise HTTPException(status_code=404, detail="Asset not found")

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
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print(f"Voice transcription failed: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Voice transcription failed. Please try again with a clear recording.",
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
    }

    try:
        translated = translate_to_english(transcript, original_language)
        complaint_data["translated_description"] = translated
        complaint_data["translation_status"] = "completed"
    except Exception as exc:
        print(f"Voice complaint translation failed: {type(exc).__name__}: {exc}")
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

@router.post("/{complaint_id}/understand")
def understand_existing_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    import hashlib
    import json

    from backend.app.services.complaint_understanding import (
        understand_complaint,
    )

    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found",
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
        raise HTTPException(status_code=400, detail=str(exc))
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
