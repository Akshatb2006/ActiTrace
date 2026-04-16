"""Train an XGBoost HAR classifier on the UCI HAR Dataset and save a versioned artifact.

Usage:
    python ml/train.py --version v1.0 --out backend/app/models/store

The artifact is a single .joblib file containing:
    - model           : fitted xgb.XGBClassifier
    - selector        : VarianceThreshold fitted on raw 561-d features
    - drop_columns    : columns dropped after correlation pruning (post-selector indices)
    - top_features    : final ordered list of selected feature column indices
    - feature_names   : original UCI HAR feature names (length 561)
    - activity_labels : class index → label mapping
    - metrics         : {accuracy, macro_f1, train_date}
    - version         : version string
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.feature_selection import VarianceThreshold
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

ACTIVITY_LABELS = [
    "WALKING",
    "WALKING_UPSTAIRS",
    "WALKING_DOWNSTAIRS",
    "SITTING",
    "STANDING",
    "LAYING",
]


def load_dataset(dataset_path: Path):
    X_train = pd.read_csv(dataset_path / "train/X_train.txt", sep=r"\s+", header=None)
    y_train = pd.read_csv(
        dataset_path / "train/y_train.txt", sep=r"\s+", header=None, names=["activity"]
    )["activity"]
    X_test = pd.read_csv(dataset_path / "test/X_test.txt", sep=r"\s+", header=None)
    y_test = pd.read_csv(
        dataset_path / "test/y_test.txt", sep=r"\s+", header=None, names=["activity"]
    )["activity"]
    feature_names = pd.read_csv(
        dataset_path / "features.txt", sep=r"\s+", header=None, names=["idx", "name"]
    )["name"].tolist()
    return X_train, y_train - 1, X_test, y_test - 1, feature_names


def select_features(X_train, X_test):
    selector = VarianceThreshold(threshold=0.0)
    X_train_var = pd.DataFrame(selector.fit_transform(X_train))
    X_test_var = pd.DataFrame(selector.transform(X_test))

    corr = X_train_var.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    drop_columns = [c for c in upper.columns if any(upper[c] > 0.9)]
    X_train_pruned = X_train_var.drop(columns=drop_columns)
    X_test_pruned = X_test_var.drop(columns=drop_columns)
    return selector, drop_columns, X_train_pruned, X_test_pruned


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="UCI HAR Dataset")
    parser.add_argument("--version", default=None)
    parser.add_argument("--out", default="backend/app/models/store")
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    version = args.version or f"v{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

    print(f"[train] loading dataset from {dataset_path}")
    X_train, y_train, X_test, y_test, feature_names = load_dataset(dataset_path)

    print("[train] selecting features")
    selector, drop_columns, X_train_pruned, X_test_pruned = select_features(X_train, X_test)

    print("[train] picking top-100 features by quick model gain")
    quick = xgb.XGBClassifier(
        n_estimators=100, max_depth=5, learning_rate=0.1,
        objective="multi:softprob", num_class=6, random_state=42, n_jobs=-1,
    )
    quick.fit(X_train_pruned, y_train)
    top_features = (
        pd.Series(quick.feature_importances_, index=X_train_pruned.columns)
        .sort_values(ascending=False)
        .head(100)
        .index
        .tolist()
    )

    X_tr_sel = X_train_pruned[top_features]
    X_te_sel = X_test_pruned[top_features]

    X_tr, X_val, y_tr, y_val = train_test_split(
        X_tr_sel, y_train, test_size=0.2, stratify=y_train, random_state=42
    )

    print("[train] fitting tuned model")
    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        objective="multi:softprob", num_class=6, eval_metric="mlogloss",
        early_stopping_rounds=20, random_state=42, n_jobs=-1,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)

    y_pred = model.predict(X_te_sel)
    accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    print(f"[train] test accuracy={accuracy:.4f} macro_f1={macro_f1:.4f}")

    artifact = {
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
    }

    artifact_path = out_dir / f"{version}.joblib"
    joblib.dump(artifact, artifact_path)
    print(f"[train] wrote artifact to {artifact_path}")

    summary = {
        "version": version,
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "train_date": artifact["metrics"]["train_date"],
        "artifact_path": str(artifact_path),
    }
    print(json.dumps(summary, indent=2))
    return summary


if __name__ == "__main__":
    main()
