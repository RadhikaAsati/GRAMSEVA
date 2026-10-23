from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import User

router = APIRouter(prefix="/preferences", tags=["Preferences"])

LanguageCode = Literal["en", "hi", "mr"]


class LanguagePreferenceUpdate(BaseModel):
    preferred_language: LanguageCode


class LanguagePreferenceResponse(BaseModel):
    preferred_language: LanguageCode


@router.get("/language", response_model=LanguagePreferenceResponse)
def get_language_preference(
    current_user: User = Depends(get_current_user),
):
    return {"preferred_language": current_user.preferred_language or "en"}


@router.put("/language", response_model=LanguagePreferenceResponse)
def update_language_preference(
    payload: LanguagePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.preferred_language = payload.preferred_language
    db.commit()
    db.refresh(current_user)

    return {"preferred_language": current_user.preferred_language}
