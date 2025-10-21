from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import QWalkRequest
from app.qwalk import simulate_qwalk

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/api/qwalk")
async def qwalk(req: QWalkRequest):
    probs = simulate_qwalk(req.n_positions, req.steps, req.coin,
                           req.custom_coin_angles, req.start_pos)
    return {"probabilities": probs}
