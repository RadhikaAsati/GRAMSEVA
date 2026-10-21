
from fastapi import APIRouter, Depends, HTTPException
from backend.app.api.dependencies import require_roles
from backend.app.api.auth import get_current_user
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Asset

router = APIRouter(prefix="/assets", tags=["Assets"])



class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    asset_type: str = Field(min_length=1, max_length=50)
    location: str = Field(min_length=1, max_length=255)
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "Provide both latitude and longitude, or leave both empty."
            )
        return self


class AssetResponse(BaseModel):
    id: int
    name: str
    asset_type: str
    location: str
    description: str | None
    is_active: bool
    latitude: float | None = None
    longitude: float | None = None

    model_config = {"from_attributes": True}


@router.post(
    "/",
    response_model=AssetResponse,
    status_code=201,
)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "worker")),
):
    asset = Asset(**payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/", response_model=list[AssetResponse])
def list_assets(db: Session = Depends(get_db)):
    return db.query(Asset).order_by(Asset.id).all()


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)

    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset
