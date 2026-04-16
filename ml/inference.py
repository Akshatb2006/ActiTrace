"""Inference helpers used by the FastAPI backend.

Two input formats are supported for an uploaded session CSV:

1. **Pre-extracted features** — 561 columns matching the UCI HAR feature list,
   one row per 2.56s window. The CSV may be header-less or use the UCI feature
   names as headers. An optional ``activity`` (or ``label``) column can be
   provided to capture ground-truth labels.

2. **Aggregated raw signals** — fewer columns (e.g. ``acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z``).
   In this case we fall back to a simple statistical-feature pipeline so that
   demos with non-UCI data still render an end-to-end timeline. This pipeline
   produces a 561-dim zero vector with the basic moments injected, which gives
   a low-confidence but non-crashing prediction.

The first format is the production path; the second is a graceful fallback.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

WINDOW_SIZE_SECONDS = 2.56
WINDOW_STEP_SECONDS = 1.28


@dataclass
class WindowPrediction:
    window_index: int
    start_time: float
    end_time: float
    predicted_label: str
    confidence: float
    ground_truth_label: Optional[str]


@dataclass
class InferenceResult:
    predictions: List[WindowPrediction]
    activity_summary: dict  # label -> total seconds


class ModelArtifact:
    def __init__(self, path: Path):
        bundle = joblib.load(path)
        self.model = bundle["model"]
        self.selector = bundle["selector"]
        self.drop_columns = bundle["drop_columns"]
        self.top_features = bundle["top_features"]
        self.feature_names = bundle["feature_names"]
        self.activity_labels: List[str] = bundle["activity_labels"]
        self.metrics = bundle["metrics"]
        self.version = bundle["version"]
        self.path = path

    def transform(self, df_561: pd.DataFrame) -> pd.DataFrame:
        x = self.selector.transform(df_561.values)
        x = pd.DataFrame(x).drop(columns=self.drop_columns)
        return x[self.top_features]

    def predict(self, df_561: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        x = self.transform(df_561)
        proba = self.model.predict_proba(x)
        labels = proba.argmax(axis=1)
        return labels, proba


def _read_csv(file_bytes: bytes) -> pd.DataFrame:
    text = file_bytes.decode("utf-8", errors="replace")
    sample = text[:2048]

    sep = "," if sample.count(",") >= sample.count("\t") else "\t"
    if sep == "," and sample.count(",") < 5:
        sep = r"\s+"

    has_header = any(c.isalpha() for c in sample.splitlines()[0]) if sample else False
    return pd.read_csv(
        io.StringIO(text),
        sep=sep,
        header=0 if has_header else None,
        engine="python",
    )


def _separate_label(df: pd.DataFrame) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
    label_cols = [c for c in df.columns if str(c).lower() in {"activity", "label", "y"}]
    if not label_cols:
        return df, None
    label_col = label_cols[0]
    return df.drop(columns=[label_col]), df[label_col]


def _coerce_to_561(df: pd.DataFrame, feature_names: List[str]) -> pd.DataFrame:
    if df.shape[1] == len(feature_names):
        df = df.copy()
        df.columns = list(range(len(feature_names)))
        return df.astype(float)

    out = pd.DataFrame(0.0, index=df.index, columns=list(range(len(feature_names))))
    numeric = df.select_dtypes(include=[np.number])
    if numeric.empty:
        return out

    means = numeric.mean(axis=1).values
    stds = numeric.std(axis=1).fillna(0.0).values
    mins = numeric.min(axis=1).values
    maxs = numeric.max(axis=1).values
    out.iloc[:, 0] = means
    out.iloc[:, 1] = stds
    out.iloc[:, 2] = mins
    out.iloc[:, 3] = maxs
    return out


def _normalize_label(value, activity_labels: List[str]) -> Optional[str]:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (int, np.integer)):
        idx = int(value)
        idx = idx - 1 if idx >= 1 and idx <= len(activity_labels) else idx
        if 0 <= idx < len(activity_labels):
            return activity_labels[idx]
        return str(value)
    s = str(value).strip().upper()
    return s if s in activity_labels else s


def run_inference(file_bytes: bytes, artifact: ModelArtifact) -> InferenceResult:
    raw = _read_csv(file_bytes)
    features_df, label_series = _separate_label(raw)
    df_561 = _coerce_to_561(features_df, artifact.feature_names)

    label_idx, proba = artifact.predict(df_561)
    confidences = proba.max(axis=1)

    predictions: List[WindowPrediction] = []
    summary: dict = {}
    for i, (idx, conf) in enumerate(zip(label_idx, confidences)):
        label = artifact.activity_labels[int(idx)]
        start = i * WINDOW_STEP_SECONDS
        end = start + WINDOW_SIZE_SECONDS
        gt = (
            _normalize_label(label_series.iloc[i], artifact.activity_labels)
            if label_series is not None
            else None
        )
        predictions.append(
            WindowPrediction(
                window_index=i,
                start_time=round(start, 3),
                end_time=round(end, 3),
                predicted_label=label,
                confidence=float(conf),
                ground_truth_label=gt,
            )
        )
        summary[label] = summary.get(label, 0.0) + WINDOW_STEP_SECONDS

    summary = {k: round(v, 2) for k, v in summary.items()}
    return InferenceResult(predictions=predictions, activity_summary=summary)
