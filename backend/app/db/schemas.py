from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    role: str
    created_at: datetime


class TokenOut(BaseModel):
    token: str
    user: UserOut


class ModelVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    version_name: str
    accuracy: float
    macro_f1: float
    train_date: datetime
    is_active: bool


class TrainResponse(BaseModel):
    model_version: str
    accuracy: float
    macro_f1: float


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime]
    model_version_id: str


class TimelineEntry(BaseModel):
    window_index: int
    start_time: float
    end_time: float
    activity: str
    confidence: float
    ground_truth: Optional[str] = None


class SessionDetail(BaseModel):
    session_id: str
    filename: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime]
    model_version: str
    timeline: list[TimelineEntry]
    summary: dict[str, float]


class UploadResponse(BaseModel):
    session_id: str
    status: str
