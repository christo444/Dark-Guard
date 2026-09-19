from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    PredictRequest,
    PredictResponse,
    ImagePredictRequest,
    ImagePredictResponse,
    BatchImagePredictRequest,
    BatchImagePredictResponse
)
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
    return {"message": "Welcome to DarkGuard API. POST to /predict for text, /predict-image for images."}

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
