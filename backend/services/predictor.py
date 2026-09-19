from typing import List, Optional
import os
from models.schemas import (
    PredictionResult,
    ImagePredictRequest,
    ImagePredictResponse,
    OCRDetectionResult
)
from models.bert_model import BertModel
from models.dummy_model import DummyBertModel
from services.ocr_service import OCRService

class PredictorService:
    def __init__(self):
        # Determine path to the extracted model weights
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "model_weights", "darkguard-bert-final")
        
        # Load BERT model if weights exist, otherwise fall back gracefully to DummyBertModel
        if os.path.exists(model_path):
            try:
                print(f"Loading BERT model from {model_path}...")
                self.model = BertModel(model_path)
            except Exception as e:
                print(f"Failed to load BERT model from {model_path}: {e}. Falling back to DummyBertModel.")
                self.model = DummyBertModel()
        else:
            print(f"Notice: Model weights not found at {model_path}. Using DummyBertModel for testing.")
            self.model = DummyBertModel()

        # Initialize OCR Service
        self.ocr_service = OCRService()

    def process_texts(self, texts: List[str]) -> List[PredictionResult]:
        results = []
        for text in texts:
            cleaned_text = text.strip()
            prediction = self.model.predict(cleaned_text)
            
            result = PredictionResult(
                text=text,  # Keep the original text for highlighting on frontend
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
