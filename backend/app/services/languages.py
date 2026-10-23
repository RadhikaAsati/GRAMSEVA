"""Shared language configuration for GRAMSEVA."""

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}

DEFAULT_LANGUAGE = "en"


def validate_language(language: str) -> str:
    """Return a supported language code or raise ValueError."""
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language. Choose one of: "
            f"{', '.join(SUPPORTED_LANGUAGES)}"
        )
    return language
