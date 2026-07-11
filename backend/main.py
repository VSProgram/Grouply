from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, engine
from routers import auth, groups, files, ai, announcements, schedule, subjects, lessons

Base.metadata.create_all(bind=engine)
files.UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Grouply",
    description="AI-powered assistant for study groups",
    version="0.1.0",
)

import os

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
if os.getenv("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(files.router)
app.include_router(ai.router)
app.include_router(announcements.router)
app.include_router(schedule.router)
app.include_router(subjects.router)
app.include_router(lessons.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Grouply is running"}
