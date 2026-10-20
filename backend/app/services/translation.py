
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

SUPPORTED_LANGUAGES = {
    "mr": "Marathi",
    "hi": "Hindi",
    "en": "English",
}


def translate_to_english(text: str, source_language: str) -> str:
    """Translate Marathi or Hindi text to English using Gemini."""

    if source_language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language: {source_language}"
        )

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    original_text = text.strip()

    if source_language == "en":
        return original_text

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. Check the project-root .env file."
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key)

    prompt = f"""
Translate the following civic-service complaint from
{SUPPORTED_LANGUAGES[source_language]} into English.

Rules:
- Preserve the original meaning and important details.
- Do not add facts or assumptions.
- Do not answer the complaint or suggest a solution.
- Return only the English translation.

Complaint:
{original_text}
"""

    response = client.models.generate_content(
        model=model,
        contents=prompt,
    )

    translated_text = response.text

    if not translated_text or not translated_text.strip():
        raise RuntimeError(
            "Gemini returned an empty translation."
        )

    return translated_text.strip()
