class DummyBertModel:
    def __init__(self):
        # A simple keyword-based mock for testing while the real BERT model is being trained.
        self.dark_pattern_keywords = {
            "hurry": "Urgency",
            "time": "Urgency",
            "offer": "Urgency",
            "left": "Scarcity",
            "only": "Scarcity",
            "stock": "Scarcity",
            "exclusive": "Social Proof",
            "bought": "Social Proof"
        }
    
    def predict(self, text: str):
        text_lower = text.lower()
        for keyword, category in self.dark_pattern_keywords.items():
            if keyword in text_lower:
                return {
                    "is_dark_pattern": True,
                    "category": category,
                    "confidence": 0.85 # Mock confidence
                }
        
        return {
            "is_dark_pattern": False,
            "category": "Not Dark Pattern",
            "confidence": 0.95
        }
