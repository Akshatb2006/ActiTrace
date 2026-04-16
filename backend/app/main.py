from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.database import Base, SessionLocal, engine
from app.db import models  # noqa: F401  (register tables)
from app.routers import auth, model, sessions
from app.services.model_registry import sync_filesystem_to_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        added = sync_filesystem_to_db(db)
        if added:
            print(f"[startup] registered {added} model artifact(s) from disk")
    finally:
        db.close()
    yield


app = FastAPI(
    title="ActiTrace API",
    version="1.0.0",
    description="Human Activity Recognition platform — backend API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(model.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
