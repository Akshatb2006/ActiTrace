"""Programmatic wrapper around ml/train.py for the /model/train endpoint."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session as DBSession

from app.config import get_settings
from app.db.models import ModelVersion

import sys
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
from ml.train import load_dataset, select_features  # noqa: E402

import joblib  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import accuracy_score, f1_score  # noqa: E402
from sklearn.pipeline import Pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

ACTIVITY_LABELS = [
    "WALKING", "WALKING_UPSTAIRS", "WALKING_DOWNSTAIRS",
    "SITTING", "STANDING", "LAYING",
]


def train_new_version(db: DBSession, version_name: str | None = None) -> ModelVersion:
    settings = get_settings()
    dataset_path = settings.dataset_path
    store_dir = settings.model_store_dir
    store_dir.mkdir(parents=True, exist_ok=True)

    version = version_name or f"v{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    if db.query(ModelVersion).filter(ModelVersion.version_name == version).first():
        raise ValueError(f"Version {version} already exists")

    X_train, y_train, X_test, y_test, feature_names = load_dataset(dataset_path)
    selector, drop_columns, X_train_pruned, X_test_pruned = select_features(X_train, X_test)

    top_features = list(X_train_pruned.columns)
    X_tr_sel = X_train_pruned[top_features]
    X_te_sel = X_test_pruned[top_features]

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, max_iter=5000)),
    ])
    model.fit(X_tr_sel, y_train)

    y_pred = model.predict(X_te_sel)
    accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))

    artifact_path = store_dir / f"{version}.joblib"
    joblib.dump({
        "model": model,
        "selector": selector,
        "drop_columns": drop_columns,
        "top_features": top_features,
        "feature_names": feature_names,
        "activity_labels": ACTIVITY_LABELS,
        "metrics": {
            "accuracy": accuracy,
            "macro_f1": macro_f1,
            "train_date": datetime.now(timezone.utc).isoformat(),
        },
        "version": version,
    }, artifact_path)

    mv = ModelVersion(
        version_name=version,
        accuracy=accuracy,
        macro_f1=macro_f1,
        is_active=False,
        artifact_path=str(artifact_path),
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv
