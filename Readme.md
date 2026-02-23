# 🚀 ActiTrace – Human Activity Recognition Platform

ActiTrace is an end-to-end Machine Learning ecosystem designed to perform Human Activity Recognition (HAR) using wearable sensor data (accelerometer & gyroscope). The platform bridges the gap between raw signal processing and a functional full-stack application, simulating a production-grade on-device activity classifier.

---

## 📌 Project Overview

ActiTrace is built with a modern stack to handle high-frequency sensor data and deliver real-time insights:

| Layer | Technology |
|---|---|
| **Frontend** | React + Tailwind CSS + Recharts |
| **Backend** | FastAPI (Python) |
| **ML Layer** | XGBoost + scikit-learn |
| **Database** | PostgreSQL |
| **Deployment** | Docker + AWS EC2 |

---

## 🧠 Problem Statement

Modern wearable devices generate rich sensor data, but users and researchers often lack:

- Transparent ML pipelines.
- Explainable activity timelines.
- Model version tracking and reproducibility.
- Capabilities to compare sessions across different model versions.

ActiTrace solves this by providing a complete ML lifecycle — from raw data upload to visualization and version control.

---

## 🏗 System Architecture

The architecture follows a modular flow:

- **Frontend (React):** User interaction and data visualization.
- **FastAPI Backend:** Orchestrates requests and manages the database.
- **ML Processing Layer:**
  - *Segmentation:* Slicing raw signals into windows.
  - *Feature Extraction:* Transforming raw data into statistical features.
  - *XGBoost Inference:* Classifying the activity.
- **PostgreSQL:** Persistent storage for users, sessions, and predictions.

---

## 📊 Core Features

### ✅ Session Upload & Processing
- Upload raw accelerometer/gyroscope CSV files.
- CSV validation and model version selection.
- Automatic Segmentation: Sliding window (`2.56s` default) with `50%` overlap.

### ✅ Advanced Feature Extraction
The ML layer extracts key indicators from each window:
- **Time-domain:** Mean, Standard Deviation, Energy, Entropy, and Correlation.
- **Frequency-domain:** FFT-based features for motion intensity analysis.

### ✅ Activity Classification
- **Model:** XGBoost multiclass classifier.
- **Output:** Window-level predictions with associated confidence scoring.

### ✅ Interactive Reporting
- Activity timeline visualization.
- Total time distribution per activity.
- Comprehensive prediction tables with optional ground truth comparison.

### ✅ Model Management
- Train new models on-demand.
- Activate/deactivate specific model versions.
- Track performance metrics like Accuracy & Macro-F1.

---

## 🗄 Database Design

The schema is designed for high granularity and traceability:

| Table | Description |
|---|---|
| **Users** | Account management and authentication. |
| **Sessions** | Metadata for a single recording/upload. |
| **Windows** | Segmented data points (2.56s intervals). |
| **Predictions** | Classification results per window. |
| **ModelVersions** | Metadata and paths for saved `.json` or `.pkl` models. |
| **ActivityLogs** | Audit trail for system actions. |

---

## 🔌 API Endpoints

### Authentication
- `POST /auth/login`
- `POST /auth/signup`

### Sessions & Predictions
- `POST /sessions/upload` — Process new data.
- `GET /sessions/{id}` — Get session metadata.
- `GET /sessions/{id}/predictions` — Get detailed window-level results.
- `GET /sessions/{id}/summary` — Get aggregated activity stats.

### Model Management
- `POST /model/train` — Trigger a training job.
- `GET /model/versions` — List all stored models.
- `PATCH /model/{id}/activate` — Set the primary model for inference.

---

## 📈 ML Evaluation

The system is evaluated against the **UCI HAR Dataset** using:

- **Accuracy:** Overall correctness.
- **Macro F1-score:** To ensure performance across imbalanced activity classes.
- **Confusion Matrix:** To visualize classification errors between similar motions.

---

## 🚀 Deployment

### Local Setup

Ensure you have Docker and Docker Compose installed:

```bash
git clone <your-repo-link>
cd actitrace
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs

### Production Setup (AWS EC2)
- Containerized deployment via Docker.
- Nginx reverse proxy for traffic management.
- SSL encryption enabled via Certbot.

---

## 📂 Project Structure

```
actitrace/
├── frontend/          # React + Tailwind source
├── backend/           # FastAPI application
│   ├── routers/       # API route definitions
│   ├── services/      # Business logic
│   ├── db/            # SQLAlchemy models & migrations
├── ml/                # Machine Learning scripts
│   ├── segmentation.py
│   ├── feature_extraction.py
│   ├── train.py
│   └── inference.py
├── docker-compose.yml
└── README.md
```

---

## 🧪 Future Improvements

- **Explainability:** Integration of SHAP/LIME for feature-level explanations.
- **Performance:** Redis caching layer for rapid report generation.
- **Scale:** Asynchronous inference queue (Celery/RabbitMQ) for large files.
- **Streaming:** Real-time mode via WebSockets.

---

## 📄 License

This project is for educational and research purposes. Dataset license belongs to the original UCI HAR authors.
