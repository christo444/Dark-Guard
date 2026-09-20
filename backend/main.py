from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    PredictRequest,
    PredictResponse,
    ImagePredictRequest,
    ImagePredictResponse,
    BatchImagePredictRequest,
    BatchImagePredictResponse,
    CountdownVerifyRequest,
    CountdownVerifyResponse,
    BatchCountdownVerifyRequest,
    BatchCountdownVerifyResponse,
)
from services.predictor import PredictorService
# pyrefly: ignore [missing-import]
from services.countdown_service import CountdownVerifierService

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
countdown_service = CountdownVerifierService()

@app.get("/")
def read_root():
    return {
        "message": (
            "Welcome to DarkGuard API. POST to /predict for text, "
            "/predict-image for images, /verify-countdown for countdown timers."
        )
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not request.texts:
        raise HTTPException(status_code=422, detail="The 'texts' array cannot be empty.")
    
    try:
        results = predictor_service.process_texts(request.texts)
        return PredictResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-image", response_model=ImagePredictResponse)
def predict_image(request: ImagePredictRequest):
    if not request.image:
        raise HTTPException(status_code=422, detail="The 'image' field cannot be empty.")
    
    try:
        result = predictor_service.process_image(request.image, request.image_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-images", response_model=BatchImagePredictResponse)
def predict_images(request: BatchImagePredictRequest):
    if not request.images:
        raise HTTPException(status_code=422, detail="The 'images' list cannot be empty.")
    
    try:
        results = predictor_service.process_images(request.images)
        return BatchImagePredictResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-countdown", response_model=CountdownVerifyResponse)
def verify_countdown(request: CountdownVerifyRequest):
    if not request.element_selector:
        raise HTTPException(status_code=422, detail="The 'element_selector' field cannot be empty.")

    try:
        return countdown_service.verify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-countdowns", response_model=BatchCountdownVerifyResponse)
def verify_countdowns(request: BatchCountdownVerifyRequest):
    if not request.countdowns:
        raise HTTPException(status_code=422, detail="The 'countdowns' list cannot be empty.")

    try:
        results = countdown_service.verify_batch(request.countdowns)
        return BatchCountdownVerifyResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))