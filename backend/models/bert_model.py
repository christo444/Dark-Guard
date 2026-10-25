import os
import json
import torch

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
except ImportError:
    AutoTokenizer = None
    AutoModelForSequenceClassification = None

class BertModel:
    def __init__(self, model_dir: str):
        if AutoTokenizer is None or AutoModelForSequenceClassification is None:
            raise ImportError("The 'transformers' package is not installed.")
            
        print(f"Loading BERT model from {model_dir}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        
        # Multi-class label map is usually stored in config.json (id2label)
        self.label_map = self.model.config.id2label if self.model.config.id2label else {}
        if not self.label_map:
            print("Warning: id2label not found in config! Using fallback labels.")
            self.label_map = {"0": "Not Dark Pattern", "1": "Dark Pattern"}
            
        print("Model loaded successfully!")
    
    def predict(self, text: str):
        # Tokenize the input text
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        # Get predictions without tracking gradients
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Calculate probabilities using softmax
        logits = outputs.logits[0]
        probs = torch.nn.functional.softmax(logits, dim=0)
        
        # Get the predicted class ID
        predicted_class_idx = torch.argmax(probs).item()
        confidence = probs[predicted_class_idx].item()
        
        predicted_class_id = str(predicted_class_idx)
        category = self.label_map.get(predicted_class_idx, self.label_map.get(predicted_class_id, "Unknown"))
        
        return {
            "is_dark_pattern": category != "Not Dark Pattern",
            "category": category,
            "confidence": float(confidence)
        }
