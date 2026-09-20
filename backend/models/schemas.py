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


# ------------------------------------------------------------------
# Countdown Timer Behavioral Verification
# ------------------------------------------------------------------
# Unlike text/image dark patterns, a countdown timer can't be judged
# from a single snapshot. The extension observes the element's
# behavior (does it reset on reload? is there a real stored deadline?
# does it ever hit zero and actually do something?) and sends that
# evidence here for scoring.

class CountdownEvidence(BaseModel):
    reset_on_reload: bool = False
    persisted_deadline_found: bool = False
    looped_or_jumped: bool = False
    no_consequence_at_zero: bool = False
    initial_value_seconds: Optional[float] = None
    observed_remaining_seconds: Optional[float] = None
    expected_remaining_seconds: Optional[float] = None

class CountdownVerifyRequest(BaseModel):
    page_url: str
    element_selector: str
    evidence: CountdownEvidence
    element_text_sample: Optional[str] = None

class CountdownVerifyResponse(BaseModel):
    element_selector: str
    is_dark_pattern: bool
    category: str = "FAKE_COUNTDOWN"
    confidence: float
    evidence: CountdownEvidence

class BatchCountdownVerifyRequest(BaseModel):
    countdowns: List[CountdownVerifyRequest]

class BatchCountdownVerifyResponse(BaseModel):
    results: List[CountdownVerifyResponse]