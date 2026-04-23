from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession

from app.db.database import get_db
from app.db.models import ModelVersion, Prediction, Session, User, Window
from app.db.schemas import SessionDetail, SessionOut, TimelineEntry, UploadResponse
from app.services.insights import generate_insights
from app.services.model_registry import get_active_version
from app.services.session_processor import process_session
from app.utils.security import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/upload", response_model=UploadResponse)
async def upload_session(
    file: UploadFile = File(...),
    labels: Optional[UploadFile] = File(None),
    model_version_id: Optional[str] = Form(None),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    if model_version_id:
        version = db.query(ModelVersion).filter(ModelVersion.id == model_version_id).first()
        if not version:
            raise HTTPException(status_code=404, detail="Model version not found")
    else:
        version = get_active_version(db)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    labels_bytes = await labels.read() if labels is not None else None

    session = Session(
        user_id=user.id,
        model_version_id=version.id,
        filename=file.filename or "session.csv",
        status="processing",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    try:
        process_session(db, session, file_bytes, version, labels_bytes=labels_bytes)
    except Exception as exc:
        session.status = "failed"
        session.summary_json = {"error": str(exc)}
        db.commit()
        raise HTTPException(status_code=400, detail=f"Inference failed: {exc}") from exc

    return UploadResponse(session_id=session.id, status=session.status)


@router.get("", response_model=list[SessionOut])
def list_sessions(
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SessionOut]:
    rows = (
        db.query(Session)
        .filter(Session.user_id == user.id)
        .order_by(Session.uploaded_at.desc())
        .all()
    )
    return [SessionOut.model_validate(r) for r in rows]


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionDetail:
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rows = (
        db.query(Window, Prediction)
        .join(Prediction, Prediction.window_id == Window.id)
        .filter(Window.session_id == session.id)
        .order_by(Window.window_index.asc())
        .all()
    )

    timeline = [
        TimelineEntry(
            window_index=w.window_index,
            start_time=w.start_time,
            end_time=w.end_time,
            activity=p.predicted_label,
            confidence=p.confidence,
            ground_truth=p.ground_truth_label,
        )
        for w, p in rows
    ]

    return SessionDetail(
        session_id=session.id,
        filename=session.filename,
        status=session.status,
        uploaded_at=session.uploaded_at,
        processed_at=session.processed_at,
        model_version=session.model_version.version_name,
        timeline=timeline,
        summary=session.summary_json or {},
    )


@router.get("/{session_id}/summary")
def get_summary(
    session_id: str,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.id,
        "summary": session.summary_json or {},
        "status": session.status,
    }


@router.get("/{session_id}/insights")
def get_insights(
    session_id: str,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = session.summary_json or {}
    if not summary:
        raise HTTPException(status_code=400, detail="Session has no summary yet")

    rows = (
        db.query(Window, Prediction)
        .join(Prediction, Prediction.window_id == Window.id)
        .filter(Window.session_id == session.id)
        .order_by(Window.window_index.asc())
        .all()
    )
    timeline = [
        {"activity": p.predicted_label, "confidence": p.confidence}
        for _, p in rows
    ]

    try:
        text = generate_insights(summary, timeline)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"session_id": session.id, "insights": text}
