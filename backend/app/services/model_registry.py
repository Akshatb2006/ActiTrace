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
    """Return the best-accuracy active version. Multiple versions may be active
    — this picks the one to use when an upload doesn't specify a model_version_id."""
    active = (
        db.query(ModelVersion)
        .filter(ModelVersion.is_active.is_(True))
        .order_by(ModelVersion.accuracy.desc())
        .all()
    )
    if not active:
        raise RuntimeError("No active model version is configured")
    return active[0]


def sync_filesystem_to_db(db: DBSession) -> int:
    """Discover any artifacts on disk that aren't yet registered as ModelVersion rows.

    When the DB is empty, mark every discovered artifact as active so operators
    can pick any version on upload from day one. The best-accuracy one is the
    default for uploads that don't specify a model_version_id — see
    `get_active_version`.
    """
    settings = get_settings()
    store_dir = settings.model_store_dir
    store_dir.mkdir(parents=True, exist_ok=True)

    db_was_empty = db.query(ModelVersion).count() == 0

    new_rows: list[ModelVersion] = []
    for artifact_path in sorted(store_dir.glob("*.joblib")):
        version_name = artifact_path.stem
        existing = db.query(ModelVersion).filter(ModelVersion.version_name == version_name).first()
        if existing:
            continue
        artifact = ModelArtifact(artifact_path)
        new_rows.append(
            ModelVersion(
                version_name=version_name,
                accuracy=artifact.metrics["accuracy"],
                macro_f1=artifact.metrics["macro_f1"],
                is_active=db_was_empty,
                artifact_path=str(artifact_path),
            )
        )

    if not new_rows:
        return 0

    for row in new_rows:
        db.add(row)
    db.commit()
    return len(new_rows)
