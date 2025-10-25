from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.models import QWalkRequest
from app.qwalk import simulate_qwalk
import os

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# === API ROUTES ===
@app.post("/api/qwalk")
async def qwalk(req: QWalkRequest):
    probs = simulate_qwalk(
        req.n_positions,
        req.steps,
        req.coin,
        req.custom_coin_angles,
        req.start_pos
    )
    return {"probabilities": probs}

# === STATIC FRONTEND ===
frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend/public")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

# === ROOT FALLBACK ===
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    index_path = os.path.join(frontend_path, "index.html")
    return FileResponse(index_path)