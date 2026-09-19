from pydantic import BaseModel
from typing import List, Optional

class PredictRequest(BaseModel):
    texts: List[str]

class PredictionResult(BaseModel):
    text: str
    is_dark_pattern: bool
    category: str
    confidence: float

class PredictResponse(BaseModel):
    results: List[PredictionResult]

class ImagePredictRequest(BaseModel):
    image: str  # Base64 data URL or HTTP/HTTPS URL
    image_id: Optional[str] = None

class OCRDetectionResult(BaseModel):
    text: str
    ocr_confidence: float
    coordinates: List[List[float]]  # Bounding box polygon [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    is_dark_pattern: bool
    category: str
    confidence: float  # Dark pattern classification confidence

class ImagePredictResponse(BaseModel):
    image_id: Optional[str] = None
    has_dark_pattern: bool
    detections: List[OCRDetectionResult]

class BatchImagePredictRequest(BaseModel):
    images: List[ImagePredictRequest]

class BatchImagePredictResponse(BaseModel):
    results: List[ImagePredictResponse]
