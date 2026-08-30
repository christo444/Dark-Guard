from typing import List
from models.schemas import PredictionResult
from models.dummy_model import DummyBertModel

class PredictorService:
    def __init__(self):
        # We will load the actual BERT model here later
        self.model = DummyBertModel()

    def process_texts(self, texts: List[str]) -> List[PredictionResult]:
        results = []
        for text in texts:
            # Preprocess the text here if needed (e.g., removing extra whitespaces)
            cleaned_text = text.strip()
            
            # Predict using the model
            prediction = self.model.predict(cleaned_text)
            
            # Create a structured result
            result = PredictionResult(
                text=text,  # Keep the original text for highlighting on frontend
                is_dark_pattern=prediction["is_dark_pattern"],
                category=prediction["category"],
                confidence=prediction["confidence"]
            )
            results.append(result)
            
        return results
