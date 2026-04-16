"""Loads model artifacts from disk and caches the active version."""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from app.config import get_settings
from app.db.models import ModelVersion

import sys
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
from ml.inference import ModelArtifact  # noqa: E402

_lock = threading.Lock()
_cache: dict[str, ModelArtifact] = {}


def load_artifact(path: Path) -> ModelArtifact:
    key = str(path.resolve())
    with _lock:
        if key not in _cache:
            _cache[key] = ModelArtifact(path)
        return _cache[key]


def invalidate_cache(path: Optional[Path] = None) -> None:
    with _lock:
        if path is None:
            _cache.clear()
        else:
            _cache.pop(str(path.resolve()), None)


def get_active_version(db: DBSession) -> ModelVersion:
    version = db.query(ModelVersion).filter(ModelVersion.is_active.is_(True)).first()
    if version is None:
        raise RuntimeError("No active model version is configured")
    return version


def sync_filesystem_to_db(db: DBSession) -> int:
    """Discover any artifacts on disk that aren't yet registered as ModelVersion rows."""
    settings = get_settings()
    store_dir = settings.model_store_dir
    store_dir.mkdir(parents=True, exist_ok=True)

    added = 0
    for artifact_path in sorted(store_dir.glob("*.joblib")):
        version_name = artifact_path.stem
        existing = db.query(ModelVersion).filter(ModelVersion.version_name == version_name).first()
        if existing:
            continue
        artifact = ModelArtifact(artifact_path)
        is_first = db.query(ModelVersion).count() == 0
        db.add(
            ModelVersion(
                version_name=version_name,
                accuracy=artifact.metrics["accuracy"],
                macro_f1=artifact.metrics["macro_f1"],
                is_active=is_first,
                artifact_path=str(artifact_path),
            )
        )
        added += 1
    if added:
        db.commit()
    return added
