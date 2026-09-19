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
            
        # Convert logits to probabilities using softmax
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get the highest probability and its corresponding class index
        confidence, predicted_class_tensor = torch.max(probs, dim=-1)
        
        predicted_class_id = str(predicted_class_tensor.item())
        category = self.label_map.get(predicted_class_id, "Unknown")
        
        return {
            "is_dark_pattern": category != "Not Dark Pattern",
            "category": category,
            "confidence": float(confidence.item())
        }
