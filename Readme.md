# 🚀 ActiTrace – Human Activity Recognition Platform

ActiTrace is an end-to-end Machine Learning system that performs Human Activity Recognition (HAR) using wearable sensor data (accelerometer & gyroscope).  

The system allows users to:

- Upload wearable sensor sessions
- Automatically segment and extract features
- Run XGBoost-based activity classification
- Visualize activity timelines
- View session summaries and analytics
- Retrain and manage model versions

---

# 📌 Project Overview

ActiTrace bridges Machine Learning and full-stack application development.

It is built with:

- **Frontend:** React + Tailwind + Recharts
- **Backend:** FastAPI (Python)
- **ML Layer:** XGBoost + scikit-learn
- **Database:** PostgreSQL
- **Deployment:** Docker + AWS EC2

The system is designed to simulate an on-device activity classifier with an application layer.

---

# 🧠 Problem Statement

Modern wearable devices generate rich sensor data, but users and researchers lack:

- Transparent ML pipelines
- Explainable activity timelines
- Model version tracking
- Reproducible inference
- Session comparison capabilities

ActiTrace solves this by providing a complete ML lifecycle with visualization and version control.

---

# 🏗 System Architecture


Frontend (React)
↓
FastAPI Backend
↓
ML Processing Layer

Segmentation

Feature Extraction

XGBoost Inference
↓
PostgreSQL Database
↓
Report Visualization


---

# 📊 Core Features

## ✅ Session Upload
- Upload accelerometer / gyroscope data
- CSV validation
- Model version selection
- Re-run inference option

## ✅ Automatic Segmentation
- Sliding window (2.56s default)
- 50% overlap
- Window-level processing

## ✅ Feature Extraction
- Mean
- Standard deviation
- Energy
- Entropy
- Correlation
- Frequency-domain features

## ✅ Activity Classification
- XGBoost multiclass classifier
- Window-level predictions
- Confidence scoring

## ✅ Report Page
- Activity timeline visualization
- Total time per activity
- Activity distribution chart
- Prediction table
- Optional ground truth comparison

## ✅ Model Management
- Train new model
- Store model versions
- Activate/deactivate models
- Track accuracy & macro-F1

---

# 🗄 Database Design

Main tables:

- Users
- Sessions
- Windows
- Predictions
- ModelVersions
- ActivityLogs

Supports:
- Window-level granularity
- Model version traceability
- Explainability extension

---

# 🔌 API Endpoints

### Authentication
- `POST /auth/login`
- `POST /auth/signup`

### Sessions
- `POST /sessions/upload`
- `GET /sessions/{id}`
- `GET /sessions`

### Predictions
- `GET /sessions/{id}/predictions`
- `GET /sessions/{id}/summary`

### Model Management
- `POST /model/train`
- `GET /model/versions`
- `PATCH /model/{id}/activate`

---

# 📈 ML Evaluation

Primary metrics:

- Accuracy
- Macro F1-score
- Confusion Matrix

Success Criteria:
- Macro F1 comparable to published HAR benchmarks
- Stable inference across sessions
- Clear activity separation in timeline view
- Retraining without breaking historical sessions

---

# 🚀 Deployment

## Local Setup (Docker)

```bash
git clone <repo>
cd actitrace
docker compose up --build
```

Access:
- Frontend → http://localhost:3000
- Backend  → http://localhost:8000/docs

The first registered account becomes an admin (can train and activate models).

## Local Setup (without Docker)

Backend:
```bash
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt

# 1. Train and persist the initial model artifact
python ml/train.py --version v1.0

# 2. Run the API (defaults to SQLite at ./actitrace.db)
cd backend && JWT_SECRET=dev-secret uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000  (proxies /api → http://localhost:8000)
```

## Quick smoke test

```bash
# create admin account
curl -X POST http://localhost:8000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.dev","password":"pass1234"}'

# upload the first 50 windows of the UCI test set as a session
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.dev","password":"pass1234"}' | jq -r .token)
head -50 "UCI HAR Dataset/test/X_test.txt" > /tmp/sample.txt
curl -X POST http://localhost:8000/sessions/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/sample.txt"
```

Production Deployment

AWS EC2 (Single VM)

Docker containers

Nginx reverse proxy

Environment variable configuration

SSL enabled

📂 Project Structure
actitrace/
│
├── frontend/
├── backend/
│   ├── routers/
│   ├── services/
│   ├── db/
│   ├── models/
│
├── ml/
│   ├── segmentation.py
│   ├── feature_extraction.py
│   ├── train.py
│   ├── inference.py
│
├── docker-compose.yml
├── README.md
📊 Dataset

Human Activity Recognition Using Smartphones Dataset
UCI Machine Learning Repository

Activities:

WALKING

WALKING_UPSTAIRS

WALKING_DOWNSTAIRS

SITTING

STANDING

LAYING

🎯 Target Users

ML engineers

Fitness analytics researchers

Wearable device developers

Students learning end-to-end ML systems

🔐 Non-Functional Requirements

JWT-based authentication

Stable inference

Model version isolation

Clean UI feedback states

Database consistency

Error logging

🧪 Future Improvements

Redis caching layer

Async inference queue

Real-time streaming mode

SHAP explainability visualization

Leave-one-subject-out evaluation

Kubernetes deployment

📌 Conclusion

ActiTrace is not just a classifier.
It is a full ML system with:

Upload → Process → Predict → Store → Visualize → Retrain → Compare

It demonstrates:

End-to-end ML engineering

Backend integration

Database design

Model lifecycle management

Production deployment readiness

📄 License

This project is for educational and research purposes.
Dataset license belongs to the original UCI HAR authors.