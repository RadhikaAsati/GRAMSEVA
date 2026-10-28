from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from backend.app.api.auth import get_current_user
from backend.app.api.complaints import get_accessible_complaint
from backend.app.database import get_db
from backend.app.models import User
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/worker-voice",
    tags=["Worker Voice Transcription"],
)


class WorkerTranscriptionResponse(BaseModel):
    complaint_id: int
    language: str
    transcript: str


@router.post("/transcribe", response_model=WorkerTranscriptionResponse)
async def transcribe_worker_recording(
    complaint_id: int = Form(..., gt=0),
    language: Literal["mr", "hi"] = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if (current_user.role or "").strip().lower() != "worker":
        raise HTTPException(
            status_code=403,
            detail="Only field workers can use this transcription endpoint.",
        )

    get_accessible_complaint(complaint_id, db, current_user)

    allowed_types = {
        ".webm", ".wav", ".mp3", ".m4a", ".ogg", ".opus",
        ".flac", ".aac", ".aiff",
    }
    suffix = Path(audio_file.filename or "recording.webm").suffix.lower()

    if suffix not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format.",
        )

    max_audio_size = 10 * 1024 * 1024

    try:
        audio_bytes = await audio_file.read(max_audio_size + 1)
    finally:
        await audio_file.close()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="The recording is empty.")

    if len(audio_bytes) > max_audio_size:
        raise HTTPException(
            status_code=413,
            detail="Recording must be 10 MB or smaller.",
        )

    from backend.app.services.transcription import transcribe_audio

    try:
        transcript = transcribe_audio(
            audio_bytes=audio_bytes,
            suffix=suffix,
            language=language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"Worker voice transcription failed: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Transcription failed. Please try again or enter the details manually.",
        ) from exc

    return WorkerTranscriptionResponse(
        complaint_id=complaint_id,
        language=language,
        transcript=transcript,
    )
