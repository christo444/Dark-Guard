from pydantic import BaseModel
from typing import List

class PredictRequest(BaseModel):
    texts: List[str]

class PredictionResult(BaseModel):
    text: str
    is_dark_pattern: bool
    category: str
    confidence: float

class PredictResponse(BaseModel):
    results: List[PredictionResult]
