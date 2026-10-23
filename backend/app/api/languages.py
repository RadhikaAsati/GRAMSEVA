
from fastapi import APIRouter

from backend.app.services.languages import (
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
)

router = APIRouter(prefix="/languages", tags=["Languages"])


@router.get("")
def get_supported_languages():
    return {
        "default_language": DEFAULT_LANGUAGE,
        "supported_languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ],
    }
