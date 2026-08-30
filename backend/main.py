from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import PredictRequest, PredictResponse
from services.predictor import PredictorService

app = FastAPI(
    title="DarkGuard API",
    description="Backend API for DarkGuard Chrome Extension",
    version="1.0.0"
)

# Allow CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor_service = PredictorService()

@app.get("/")
def read_root():
    return {"message": "Welcome to DarkGuard API. POST to /predict for classification."}

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not request.texts:
        raise HTTPException(status_code=422, detail="The 'texts' array cannot be empty.")
    
    try:
        results = predictor_service.process_texts(request.texts)
        return PredictResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
