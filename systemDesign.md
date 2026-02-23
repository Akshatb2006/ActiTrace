# ActiTrace – System Design Document

## Project Overview

ActiTrace is a Human Activity Recognition (HAR) platform that:

- Accepts wearable sensor data (accelerometer / gyroscope)
- Segments and extracts features
- Runs XGBoost-based classification
- Stores predictions and metadata
- Visualizes activity timelines and summaries
- Supports model retraining and versioning

This document covers High-Level Design (HLD), Low-Level Design (LLD), Data Flow Diagrams, Database Schema (ERD), API Contracts, Deployment Plan, and Feature Breakdown.

---

# 1. High-Level Design (HLD)

## Architecture Overview

<img width="4013" height="2933" alt="image" src="https://github.com/user-attachments/assets/419de70b-2f12-401e-b8a7-de892b02e4dd" />


The system follows a layered architecture: the React frontend communicates with a FastAPI backend, which orchestrates the ML service layer (segmentation, feature extraction, XGBoost inference), persists results in PostgreSQL, and stores model artifacts separately.

## Core Components

**Frontend** — Dashboard, Upload Session, Report Page, Model Admin, Authentication.

**Backend (FastAPI)** — Auth routes, Session routes, Prediction routes, Model management routes.

**ML Layer** — Sliding window segmentation, feature extraction pipeline, XGBoost model inference, model evaluation and versioning.

**Database** — Users, Sessions, Windows, Predictions, Model Versions, Activity Logs.

---

# 2. Low-Level Design (LLD)

## Backend Structure

```
app/
├── main.py
├── routers/
│   ├── auth.py
│   ├── sessions.py
│   ├── predictions.py
│   └── model.py
├── services/
│   ├── segmentation.py
│   ├── feature_extraction.py
│   ├── inference.py
│   └── training.py
├── db/
│   ├── models.py
│   ├── schemas.py
│   └── database.py
└── utils/
```

## Upload Flow



The upload flow proceeds as follows: receive and validate the file, segment it into sliding windows (`2.56s`, 50% overlap), extract time-domain and frequency-domain features, load the active model version, run XGBoost inference, store predictions in the database, and return the session ID.

## Prediction Flow

`GET /sessions/{id}` fetches predictions, aggregates activity durations, builds a timeline JSON, and returns the complete response.

---

# 3. Data Flow Diagram (DFD)
<img width="3653" height="3293" alt="image" src="https://github.com/user-attachments/assets/08352159-3735-4cae-b3b7-187124f38ae1" />

## Level 0

```
User → Frontend → Backend API → ML Processing → Database
```

## Level 1


Each uploaded file passes through a sequential pipeline: validation ensures schema correctness, segmentation splits the signal, feature extraction computes statistical descriptors, XGBoost classifies each window, results are stored in PostgreSQL, and the frontend renders the activity timeline.

---

# 4. Database Schema (ERD)

<img width="4013" height="2933" alt="image" src="https://github.com/user-attachments/assets/765f5454-7a04-47c0-a386-9bf9862b1adf" />


## Users

| Field | Type |
|---|---|
| id | string (PK) |
| email | string |
| password_hash | string |
| role | string |
| created_at | timestamp |

## Sessions

| Field | Type |
|---|---|
| id | string (PK) |
| user_id | FK → Users |
| model_version_id | FK → ModelVersion |
| filename | string |
| status | string |
| uploaded_at | timestamp |
| processed_at | timestamp |

## Windows

| Field | Type |
|---|---|
| id | string (PK) |
| session_id | FK → Sessions |
| start_time | float |
| end_time | float |
| feature_vector | jsonb |

## Predictions

| Field | Type |
|---|---|
| id | string (PK) |
| window_id | FK → Windows |
| predicted_label | string |
| confidence | float |
| ground_truth_label | string |

## Model Versions

| Field | Type |
|---|---|
| id | string (PK) |
| version_name | string |
| accuracy | float |
| macro_f1 | float |
| train_date | timestamp |
| is_active | boolean |

## Relationships

`User → Sessions → Windows → Predictions`, with `ModelVersion` linked to `Sessions`.

---

# 5. API Contracts

## Authentication

### POST /auth/login

```json
// Request
{ "email": "...", "password": "..." }

// Response
{ "token": "jwt_token" }
```

## Upload Session
<img width="3293" height="4013" alt="image" src="https://github.com/user-attachments/assets/d5771768-1c3b-4e23-9587-5ff4afa0ceb0" />

### POST /sessions/upload

Request: Multipart file + `model_version_id`

```json
// Response
{ "session_id": "...", "status": "completed" }
```

## Get Predictions

### GET /sessions/{id}

```json
{
  "session_id": "...",
  "timeline": [
    { "start_time": 0, "end_time": 2.56, "activity": "WALKING", "confidence": 0.93 }
  ],
  "summary": {
    "WALKING": 120,
    "SITTING": 60
  }
}
```

## Train Model

### POST /model/train

```json
// Response
{ "model_version": "v2.0", "accuracy": 0.94, "macro_f1": 0.93 }
```

---

# 6. Feature Breakdown

## Core Features

- Session upload and sliding window segmentation
- Feature extraction (time-domain + frequency-domain)
- XGBoost inference with confidence scoring
- Activity timeline visualization and distribution charts
- Model retraining and version comparison

## ML-Specific Features

- Window-level prediction with confidence scores
- Macro-F1 evaluation and confusion matrix generation
- Model version rollback

---

# 7. Deployment Plan
<img width="4013" height="2933" alt="image" src="https://github.com/user-attachments/assets/11d56f75-53a7-4f31-9587-6b374c671045" />

## Infrastructure


The production system runs on a single AWS EC2 VM with Docker Compose orchestrating four containers — frontend, backend, PostgreSQL, and optional Redis — behind an Nginx reverse proxy with SSL via Certbot.

## Containers

- `frontend` — React + Tailwind build
- `backend` — FastAPI + ML services
- `postgres` — Persistent data store
- `redis` *(optional)* — Caching layer

## Deployment Steps

1. Launch EC2 instance
2. Install Docker + Docker Compose
3. Build images
4. Run containers
5. Configure SSL via Certbot
6. Set environment variables

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Application secret |
| `MODEL_PATH` | Path to model artifacts |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | CORS allowed origin |

---

# 8. Non-Functional Requirements

- Stable inference across sessions with model version isolation
- API response time < 2s for report retrieval
- Secure authentication via JWT
- Error logging and monitoring

---

# 9. Scalability Considerations

- Horizontal scaling of the backend service
- Separate ML inference microservice (future)
- Redis caching for frequent session retrieval
- Asynchronous processing queue via Celery/RabbitMQ (future)

---

# 10. Conclusion

ActiTrace is designed as a modular ML system with clear separation of frontend, API, ML, and database layers, full model lifecycle management, explainable and traceable predictions, and a scalable architecture foundation.

```
Upload → Process → Predict → Store → Visualize → Retrain → Compare
```
