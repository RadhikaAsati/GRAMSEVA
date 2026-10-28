from pathlib import Path
from fastapi import FastAPI
from backend.app.api.complaints import router as complaints_router
from backend.app.api.assets import router as assets_router
from backend.app.api.interventions import router as interventions_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.resolution import router as resolution_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.case_history import router as case_history_router
from backend.app.api.admin_decisions import router as admin_decisions_router
from backend.app.api.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.preferences import router as preferences_router
from backend.app.api.languages import router as languages_router
from backend.app.api.admin_users import router as admin_users_router
from backend.app.api.worker_voice import router as worker_voice_router

app = FastAPI(
    title="GRAMSEVA API",
    description="Outcome-Adaptive Civic Service Resolution and Rural E-Governance System",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = PROJECT_ROOT / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app.include_router(assets_router)
app.include_router(complaints_router)
app.include_router(interventions_router)
app.include_router(evidence_router)
app.include_router(feedback_router)
app.include_router(resolution_router)
app.include_router(dashboard_router)
app.include_router(case_history_router)
app.include_router(admin_decisions_router)
app.include_router(auth_router)
app.include_router(preferences_router)
app.include_router(languages_router)
app.include_router(admin_users_router)
app.include_router(worker_voice_router)

@app.get("/")
def home():
    return {
        "project": "GRAMSEVA",
        "message": "Backend is running!",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GRAMSEVA Backend",
    }
