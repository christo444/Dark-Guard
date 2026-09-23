from typing import List, Optional
import os
from models.schemas import (
    PredictionResult,
    ImagePredictRequest,
    ImagePredictResponse,
    OCRDetectionResult,
    ContextualTextRequest
)
from models.bert_model import BertModel
from models.dummy_model import DummyBertModel
from services.ocr_service import OCRService

class PredictorService:
    def __init__(self):
        # Determine path to the extracted model weights
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "model_weights", "darkguard-bert-final")
        if os.path.exists(model_path):
            self.model = BertModel(model_path)
        else:
            print("Warning: darkguard-bert-final weights not found. Using DummyBertModel.")
            self.model = DummyBertModel()

        # Initialize OCR Service
        self.ocr_service = OCRService()

    def process_texts(self, texts: List[ContextualTextRequest]) -> List[PredictionResult]:
        results = []
        
        # Cache predictions by context to avoid redundant model runs for the same UI component
        context_cache = {}

        for req in texts:
            # The context injection pipeline is flawed and causes collateral highlighting.
            # Since the model is now retrained to accurately classify isolated strings, 
            # we evaluate the candidate_text directly.
            candidate_cleaned = req.candidate_text.strip()
            
            if candidate_cleaned not in context_cache:
                prediction = self.model.predict(candidate_cleaned)
                context_cache[candidate_cleaned] = prediction
            else:
                prediction = context_cache[candidate_cleaned]
            
            result = PredictionResult(
                candidate_text=req.candidate_text,
                context=req.context,
                is_dark_pattern=prediction["is_dark_pattern"],
                category=prediction["category"],
                confidence=prediction["confidence"]
            )
            results.append(result)
            
        return results

    def process_image(self, image_input: str, image_id: Optional[str] = None) -> ImagePredictResponse:
        """
        Processes a single image:
        1. Uses EasyOCR to extract embedded text and coordinates.
        2. Feeds extracted texts into the BERT model.
        3. Returns dark pattern labels, confidence scores, and bounding coordinates.
        """
        extracted_items = self.ocr_service.extract_text_and_coordinates(image_input)
        
        detections: List[OCRDetectionResult] = []
        has_dark_pattern = False

        for item in extracted_items:
            text = item["text"]
            coords = item["coordinates"]
            ocr_conf = item["ocr_confidence"]

            # Predict using BERT / Dummy model
            prediction = self.model.predict(text)
            
            is_dark = prediction["is_dark_pattern"]
            if is_dark:
                has_dark_pattern = True

            detection = OCRDetectionResult(
                text=text,
                ocr_confidence=ocr_conf,
                coordinates=coords,
                is_dark_pattern=is_dark,
                category=prediction["category"],
                confidence=prediction["confidence"]
            )
            detections.append(detection)

        return ImagePredictResponse(
            image_id=image_id,
            has_dark_pattern=has_dark_pattern,
            detections=detections
        )

    def process_images(self, image_requests: List[ImagePredictRequest]) -> List[ImagePredictResponse]:
        results = []
        for req in image_requests:
            res = self.process_image(req.image, req.image_id)
            results.append(res)
        return results
