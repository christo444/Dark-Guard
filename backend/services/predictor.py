from typing import List
import os
from models.schemas import PredictionResult
from models.bert_model import BertModel

class PredictorService:
    def __init__(self):
        # Determine path to the extracted model weights
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "model_weights", "darkguard-bert-final")
        
        # Load the actual BERT model
        self.model = BertModel(model_path)

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
