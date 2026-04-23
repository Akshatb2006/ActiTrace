from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.db.database import get_db
from app.db.models import ModelVersion, User
from app.db.schemas import ModelVersionOut, TrainResponse
from app.services.model_registry import invalidate_cache
from app.services.training import train_new_version
from app.utils.security import get_current_user, require_admin

router = APIRouter(prefix="/model", tags=["model"])


class TrainRequest(BaseModel):
    version_name: Optional[str] = None


@router.post("/train", response_model=TrainResponse)
def train(
    payload: Optional[TrainRequest] = None,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> TrainResponse:
    name = payload.version_name if payload else None
    try:
        mv = train_new_version(db, name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TrainResponse(model_version=mv.version_name, accuracy=mv.accuracy, macro_f1=mv.macro_f1)


@router.get("/versions", response_model=list[ModelVersionOut])
def list_versions(
    db: DBSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ModelVersionOut]:
    rows = db.query(ModelVersion).order_by(ModelVersion.train_date.desc()).all()
    return [ModelVersionOut.model_validate(r) for r in rows]


@router.patch("/{model_id}/activate", response_model=ModelVersionOut)
def activate(
    model_id: str,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ModelVersionOut:
    """Mark a version active. Multiple versions may be active simultaneously —
    each remains selectable on upload. The default for uploads that don't
    specify a version is the active one with the highest accuracy."""
    target = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Model version not found")
    target.is_active = True
    db.commit()
    db.refresh(target)
    invalidate_cache()
    return ModelVersionOut.model_validate(target)


@router.patch("/{model_id}/deactivate", response_model=ModelVersionOut)
def deactivate(
    model_id: str,
    db: DBSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ModelVersionOut:
    target = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Model version not found")
    active_count = db.query(ModelVersion).filter(ModelVersion.is_active.is_(True)).count()
    if target.is_active and active_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate the last active model — activate another version first.",
        )
    target.is_active = False
    db.commit()
    db.refresh(target)
    invalidate_cache()
    return ModelVersionOut.model_validate(target)
