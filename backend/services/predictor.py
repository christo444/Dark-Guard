from typing import List, Optional
import os
from models.schemas import (
    PredictionResult,
    ImagePredictRequest,
    ImagePredictResponse,
    OCRDetectionResult,
    ContextualTextRequest,
    SiteEvaluationRequest,
    SiteEvaluationResponse
)
from models.bert_model import BertModel
from models.dummy_model import DummyBertModel
from services.ocr_service import OCRService

SEVERITY_CONFIG = {
    "Sneaking": {"penalty": 25, "severity": "High"},
    "Obstruction": {"penalty": 25, "severity": "High"},
    "FAKE_COUNTDOWN": {"penalty": 25, "severity": "High"},
    "Fake Countdown Timer": {"penalty": 25, "severity": "High"},
    "Forced Action": {"penalty": 18, "severity": "Medium"},
    "Misdirection": {"penalty": 15, "severity": "Medium"},
    "Scarcity": {"penalty": 10, "severity": "Low"},
    "Urgency": {"penalty": 10, "severity": "Low"},
    "Social Proof": {"penalty": 10, "severity": "Low"},
}

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
            
            candidate_cleaned = req.candidate_text.strip()
            
            if candidate_cleaned not in context_cache:
                prediction = self.model.predict(candidate_cleaned)
                
                # Rule-based overrides for remaining false positives (benign text)
                lower_text = candidate_cleaned.lower()
                benign_phrases = [
                    "in stock and ready to ship", "in stock. ready for",
                    "rooms available", "no hidden fees",
                    "manufacturer warranty included"
                ]
                
                # Check for isolated numbers (e.g., "3,417" or "12")
                is_just_number = candidate_cleaned.replace(",", "").replace(".", "").isdigit()
                
                if is_just_number or any(phrase in lower_text for phrase in benign_phrases):
                    prediction["is_dark_pattern"] = False
                    prediction["category"] = "Not Dark Pattern"
                    
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

    def evaluate_site(self, request: SiteEvaluationRequest) -> SiteEvaluationResponse:
        """
        Computes a weighted Website Trust & Safety Score (0-100) based on
        detected dark patterns, category severity, and deceptive density.
        """
        total_deductions = 0
        category_breakdown = {}
        severity_breakdown = {"High": 0, "Medium": 0, "Low": 0}

        for item in request.patterns:
            cat = item.category
            if not cat or cat == "Not Dark Pattern":
                continue
            
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1
            cfg = SEVERITY_CONFIG.get(cat, {"penalty": 12, "severity": "Medium"})
            total_deductions += cfg["penalty"]
            severity_breakdown[cfg["severity"]] = severity_breakdown.get(cfg["severity"], 0) + 1

        # Cap deductions at 100, score bounds [0, 100]
        safety_score = max(0, min(100, 100 - total_deductions))
        total_dp = sum(category_breakdown.values())

        if safety_score >= 90:
            letter_grade = "A"
            risk_level = "Safe"
            summary_message = "Clean website. No significant deceptive design tactics found."
        elif safety_score >= 75:
            letter_grade = "B"
            risk_level = "Low Risk"
            summary_message = "Mostly safe. Minor marketing pressure tactics detected."
        elif safety_score >= 50:
            letter_grade = "C"
            risk_level = "Moderate Risk"
            summary_message = "Exercise caution. Multiple manipulative patterns detected."
        elif safety_score >= 30:
            letter_grade = "D"
            risk_level = "High Risk"
            summary_message = "High risk of deception. Sneaky charges or forced actions likely."
        else:
            letter_grade = "F"
            risk_level = "Critical"
            summary_message = "Severe deceptive design. Aggressive manipulation detected across UI."

        return SiteEvaluationResponse(
            page_url=request.page_url,
            safety_score=safety_score,
            letter_grade=letter_grade,
            risk_level=risk_level,
            total_dark_patterns=total_dp,
            category_breakdown=category_breakdown,
            severity_breakdown=severity_breakdown,
            summary_message=summary_message
        )

