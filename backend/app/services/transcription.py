import os
import tempfile
import time
import mimetypes
from pathlib import Path

from dotenv import load_dotenv
from google import genai

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

LANGUAGE_CODES = {
    "mr": "mr-IN",
    "hi": "hi-IN",
}

MAX_FILE_WAIT_SECONDS = 60


def transcribe_audio(audio_bytes: bytes, suffix: str, language: str) -> str:
    if language not in LANGUAGE_CODES:
        raise ValueError("Language must be Marathi (mr) or Hindi (hi).")

    if not audio_bytes:
        raise ValueError("The uploaded audio file is empty.")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing from .env.")

    model = os.getenv(
        "GEMINI_TRANSCRIPTION_MODEL",
        "gemini-3.5-transcribe",
    )

    suffix = suffix.lower()
    mime_type = mimetypes.guess_type(f"recording{suffix}")[0]
    if not mime_type:
        mime_type = {
            ".webm": "audio/webm",
            ".m4a": "audio/mp4",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".opus": "audio/opus",
            ".flac": "audio/flac",
            ".aac": "audio/aac",
            ".aiff": "audio/aiff",
        }.get(suffix)

    if not mime_type or not mime_type.startswith("audio/"):
        raise ValueError("Unsupported audio format.")

    client = genai.Client(api_key=api_key)
    uploaded_file = None
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        uploaded_file = client.files.upload(file=temp_path)

        # Gemini files can take time to become ACTIVE after upload.
        deadline = time.monotonic() + MAX_FILE_WAIT_SECONDS

        while True:
            state = getattr(uploaded_file, "state", None)
            state_name = getattr(state, "name", str(state or ""))
            state_name = state_name.rsplit(".", 1)[-1].upper()

            if state_name == "ACTIVE":
                break

            if state_name in {"FAILED", "ERROR"}:
                raise RuntimeError(
                    f"Gemini audio file processing failed (state={state_name})."
                )

            if time.monotonic() >= deadline:
                raise RuntimeError(
                    "Gemini audio file did not become ACTIVE within 60 seconds."
                )

            time.sleep(1)
            uploaded_file = client.files.get(name=uploaded_file.name)

        interaction = client.interactions.create(
            model=model,
            input=[
                {
                    "type": "audio",
                    "uri": uploaded_file.uri,
                    "mime_type": uploaded_file.mime_type or mime_type,
                }
            ],
            generation_config={
                "transcription_config": {
                    "language_codes": [LANGUAGE_CODES[language]],
                    "mode": "smart",
                }
            },
        )

        transcript = (interaction.output_text or "").strip()
        if not transcript:
            raise RuntimeError(
                "The transcription service returned empty text."
            )

        return transcript

    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)

        if uploaded_file is not None:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as exc:
                print(
                    "Temporary Gemini file cleanup failed:",
                    type(exc).__name__,
                )
