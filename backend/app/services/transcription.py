
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from google import genai

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

LANGUAGE_CODES = {
    "mr": "mr-IN",
    "hi": "hi-IN",
}


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

    client = genai.Client(api_key=api_key)
    uploaded_file = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            uploaded_file = client.files.upload(file=temp_path)

            interaction = client.interactions.create(
                model=model,
                input=[
                    {
                        "type": "audio",
                        "uri": uploaded_file.uri,
                        "mime_type": uploaded_file.mime_type,
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
            Path(temp_path).unlink(missing_ok=True)

    finally:
        if uploaded_file is not None:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as exc:
                print(
                    "Temporary Gemini file cleanup failed:",
                    type(exc).__name__,
                )
