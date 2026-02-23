# ActiTrace – System Design Document

## Project Overview

ActiTrace is a Human Activity Recognition (HAR) platform that:

- Accepts wearable sensor data (accelerometer / gyroscope)
- Segments and extracts features
- Runs XGBoost-based classification
- Stores predictions and metadata
- Visualizes activity timelines and summaries
- Supports model retraining and versioning

This document covers:

- High-Level Design (HLD)
- Low-Level Design (LLD)
- Data Flow Diagram
- Database Schema (ERD)
- API Contracts
- Deployment Plan
- Feature Breakdown

---

# 1. High-Level Design (HLD)

## Architecture Overview
Frontend (React + Tailwind + Recharts)
↓
FastAPI Backend (REST API Layer)
↓
ML Service Layer

Segmentation

Feature Extraction

XGBoost Inference
↓
PostgreSQL Database
↓
Model Artifact Storage


## Core Components

### Frontend
- Dashboard
- Upload Session
- Report Page
- Model Admin
- Authentication

### Backend (FastAPI)
- Auth routes
- Session routes
- Prediction routes
- Model management routes

### ML Layer
- Sliding window segmentation
- Feature extraction pipeline
- XGBoost model inference
- Model evaluation
- Model versioning

### Database
- Users
- Sessions
- Windows
- Predictions
- Model Versions
- Activity Logs

---

# 2. Low-Level Design (LLD)

## Backend Structure


app/
├── main.py
├── routers/
│ ├── auth.py
│ ├── sessions.py
│ ├── predictions.py
│ ├── model.py
│
├── services/
│ ├── segmentation.py
│ ├── feature_extraction.py
│ ├── inference.py
│ ├── training.py
│
├── db/
│ ├── models.py
│ ├── schemas.py
│ ├── database.py
│
├── utils/


---

## Upload Flow

1. Receive file
2. Validate format
3. Segment into sliding windows
4. Extract features
5. Load active model
6. Run inference
7. Store predictions
8. Return session ID

---

## Prediction Flow

GET /sessions/{id}

- Fetch predictions
- Aggregate activity durations
- Build timeline JSON
- Return response

---

# 3. Data Flow Diagram (DFD)

## Level 0

User  
↓  
Frontend  
↓  
Backend API  
↓  
ML Processing  
↓  
Database  

---

## Level 1

Upload File  
→ Validate  
→ Segment  
→ Extract Features  
→ XGBoost Predict  
→ Store in DB  
→ Return Results  
→ Render Timeline  

---

# 4. Database Schema (ERD)

## Users

| Field | Type |
|-------|------|
| id | string (PK) |
| email | string |
| password_hash | string |
| role | string |
| created_at | timestamp |

---

## Sessions

| Field | Type |
|-------|------|
| id | string (PK) |
| user_id | FK → Users |
| model_version_id | FK → ModelVersion |
| filename | string |
| status | string |
| uploaded_at | timestamp |
| processed_at | timestamp |

---

## Windows

| Field | Type |
|-------|------|
| id | string (PK) |
| session_id | FK → Sessions |
| start_time | float |
| end_time | float |
| feature_vector | jsonb |

---

## Predictions

| Field | Type |
|-------|------|
| id | string (PK) |
| window_id | FK → Windows |
| predicted_label | string |
| confidence | float |
| ground_truth_label | string |

---

## Model Versions

| Field | Type |
|-------|------|
| id | string (PK) |
| version_name | string |
| accuracy | float |
| macro_f1 | float |
| train_date | timestamp |
| is_active | boolean |

---

## Relationships

User → Sessions  
Session → Windows  
Window → Predictions  
ModelVersion → Sessions  

---

# 5. API Contracts

## Authentication

### POST /auth/login

Request:

{
"email": "...",
"password": "..."
}


Response:

{
"token": "jwt_token"
}


---

## Upload Session

### POST /sessions/upload

Request:
- Multipart file
- model_version_id

Response:

{
"session_id": "...",
"status": "completed"
}


---

## Get Predictions

### GET /sessions/{id}

Response:

{
"session_id": "...",
"timeline": [
{
"start_time": 0,
"end_time": 2.56,
"activity": "WALKING",
"confidence": 0.93
}
],
"summary": {
"WALKING": 120,
"SITTING": 60
}
}


---

## Train Model

### POST /model/train

Response:

{
"model_version": "v2.0",
"accuracy": 0.94,
"macro_f1": 0.93
}


---

# 6. Feature Breakdown

## Core Features

- Session upload
- Sliding window segmentation
- Feature extraction
- XGBoost inference
- Timeline visualization
- Activity distribution
- Model retraining
- Version comparison

## ML-Specific Features

- Window-level prediction
- Confidence scoring
- Macro-F1 evaluation
- Confusion matrix generation
- Model version rollback

---

# 7. Deployment Plan

## Infrastructure

- AWS EC2 (Single VM)
- Docker containers
- Nginx reverse proxy
- PostgreSQL database

---

## Containers

- frontend
- backend
- postgres
- optional redis

---

## Deployment Steps

1. Launch EC2
2. Install Docker + Docker Compose
3. Build images
4. Run containers
5. Configure SSL
6. Set environment variables

---

## Environment Variables

- DATABASE_URL
- SECRET_KEY
- MODEL_PATH
- JWT_SECRET
- FRONTEND_URL

---

# 8. Non-Functional Requirements

- Stable inference across sessions
- Model version isolation
- API response time < 2s for report retrieval
- Secure authentication (JWT)
- Error logging and monitoring

---

# 9. Scalability Considerations

- Horizontal scaling of backend
- Model artifact versioning
- Separate ML inference service (future)
- Redis caching for frequent session retrieval
- Asynchronous processing queue (future)

---

# 10. Conclusion

ActiTrace is designed as a modular ML system with:

- Clear separation of frontend, API, ML, and database
- Full model lifecycle management
- Explainable and traceable predictions
- Scalable architecture foundation

The system supports the complete ML workflow:

Upload → Process → Predict → Store → Visualize → Retrain → Compare