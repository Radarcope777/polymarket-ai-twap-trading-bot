from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Polymarket TWAP ML Service")


class PredictRequest(BaseModel):
    features: dict[str, float]
    model_version: str = "baseline-v1"


class PredictResponse(BaseModel):
    fair_prob_up: float
    confidence: float
    model_version: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    twap_edge = req.features.get("twapVsStrike", 0)
    book_imbalance = req.features.get("bookImbalance", 0)
    logit = twap_edge * 8 + book_imbalance * 2
    fair_prob_up = 1 / (1 + pow(2.718, -logit))
    confidence = min(0.95, abs(fair_prob_up - 0.5) * 2 + 0.3)
    return PredictResponse(fair_prob_up=fair_prob_up, confidence=confidence, model_version=req.model_version)


@app.post("/train")
def train():
    return {"status": "queued", "message": "Training pipeline started"}
