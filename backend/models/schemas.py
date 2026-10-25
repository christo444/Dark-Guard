from pydantic import BaseModel
from typing import List, Optional

class ContextualTextRequest(BaseModel):
    candidate_text: str
    context: str

class PredictRequest(BaseModel):
    texts: List[ContextualTextRequest]

class PredictionResult(BaseModel):
    candidate_text: str
    context: str
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


# ------------------------------------------------------------------
# Database & Model Retraining Logging Schemas
# ------------------------------------------------------------------

class LogDetectionItem(BaseModel):
    page_url: Optional[str] = None
    domain: Optional[str] = None
    source_type: str = "text"  # "text", "image", "countdown"
    candidate_text: str
    context: Optional[str] = None
    category: str
    confidence: float
    model_version: str = "darkguard-bert-final"

class LogDetectionsRequest(BaseModel):
    page_url: str
    domain: Optional[str] = None
    detections: List[LogDetectionItem]

class ReviewDetectionRequest(BaseModel):
    review_status: str  # "false_positive", "confirmed", "unreviewed"
    corrected_label: Optional[str] = None  # e.g. "Not Dark Pattern" or corrected category
    reviewer_notes: Optional[str] = None

class DetectionRecord(BaseModel):
    id: int
    timestamp: str
    page_url: Optional[str] = None
    domain: Optional[str] = None
    source_type: str
    candidate_text: str
    context: Optional[str] = None
    category: str
    confidence: float
    model_version: str
    review_status: str
    corrected_label: Optional[str] = None
    reviewer_notes: Optional[str] = None

class DatabaseStatsResponse(BaseModel):
    total_detections: int
    unreviewed_count: int
    confirmed_count: int
    false_positive_count: int
    category_counts: dict
    source_counts: dict