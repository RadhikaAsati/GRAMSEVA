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

app = FastAPI(
    title="GRAMSEVA API",
    description="Outcome-Adaptive Civic Service Resolution and Rural E-Governance System",
    version="1.0.0",
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
