"""Run inference on uploaded sessions and persist results."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session as DBSession

from app.db.models import ModelVersion, Prediction, Session, Window
from app.services.model_registry import load_artifact

import sys
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
from ml.inference import run_inference  # noqa: E402


def process_session(
    db: DBSession,
    session: Session,
    file_bytes: bytes,
    model_version: ModelVersion,
    labels_bytes: bytes | None = None,
) -> None:
    artifact = load_artifact(Path(model_version.artifact_path))
    result = run_inference(file_bytes, artifact, labels_bytes=labels_bytes)

    for win_pred in result.predictions:
        window = Window(
            session_id=session.id,
            window_index=win_pred.window_index,
            start_time=win_pred.start_time,
            end_time=win_pred.end_time,
        )
        db.add(window)
        db.flush()
        db.add(
            Prediction(
                window_id=window.id,
                predicted_label=win_pred.predicted_label,
                confidence=win_pred.confidence,
                ground_truth_label=win_pred.ground_truth_label,
            )
        )

    session.summary_json = result.activity_summary
    session.status = "completed"
    session.processed_at = datetime.now(timezone.utc)
    db.commit()
