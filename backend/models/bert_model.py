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
        
        # Load the custom label map provided by Student 1
        label_map_path = os.path.join(model_dir, "label_map.json")
        if os.path.exists(label_map_path):
            with open(label_map_path, "r") as f:
                self.label_map = json.load(f)
        else:
            print("Warning: label_map.json not found! Using fallback labels.")
            self.label_map = {"0": "Not Dark Pattern", "1": "Dark Pattern"}
            
        print("Model loaded successfully!")
    
    def predict(self, text: str):
        # Tokenize the input text
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        # Get predictions without tracking gradients
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Calculate logit difference between Class 1 (Dark Pattern) and Class 0
        logits = outputs.logits[0].tolist()
        logit_diff = logits[1] - logits[0]
        
        # Use native prediction without artificial thresholding to expose model behavior
        is_dark_pattern = logits[1] > logits[0]
        
        if is_dark_pattern:
            predicted_class_id = "1"
            confidence = torch.nn.functional.sigmoid(torch.tensor(logit_diff)).item()
        else:
            predicted_class_id = "0"
            confidence = 1.0 - torch.nn.functional.sigmoid(torch.tensor(logit_diff)).item()
            
        category = self.label_map.get(predicted_class_id, "Unknown")
        
        return {
            "is_dark_pattern": category != "Not Dark Pattern",
            "category": category,
            "confidence": float(confidence)
        }
