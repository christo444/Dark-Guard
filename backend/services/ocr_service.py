import io
import re
import base64
import requests
import numpy as np
from PIL import Image
import easyocr
import torch

class OCRService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(OCRService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, languages=None, use_gpu=None):
        if self._initialized:
            return
        
        if languages is None:
            languages = ['en']
        
        if use_gpu is None:
            use_gpu = torch.cuda.is_available()
            
        print(f"Initializing EasyOCR Reader (languages={languages}, gpu={use_gpu})...")
        self.reader = easyocr.Reader(languages, gpu=use_gpu)
        print("EasyOCR Reader loaded successfully!")
        self._initialized = True

    def _load_image(self, image_input: str) -> np.ndarray:
        """
        Loads an image from a Base64 data URL, raw Base64 string, or remote HTTP/HTTPS URL.
        Returns RGB NumPy array suitable for EasyOCR.
        """
        image_input = image_input.strip()
        
        # Case 1: Remote HTTP/HTTPS URL
        if image_input.startswith("http://") or image_input.startswith("https://"):
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            }
            response = requests.get(image_input, headers=headers, timeout=10)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content)).convert("RGB")
            return np.array(image)

        # Case 2: Base64 data URL (e.g., data:image/png;base64,...)
        if "base64," in image_input:
            image_data = image_input.split("base64,", 1)[1]
        else:
            image_data = image_input

        # Decode base64
        decoded = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(decoded)).convert("RGB")
        return np.array(image)

    def extract_text_and_coordinates(self, image_input: str):
        """
        Extracts embedded text and bounding polygon coordinates from an image using EasyOCR.
        Returns a list of dicts:
        [
            {
                "text": "...",
                "coordinates": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
                "ocr_confidence": 0.95
            },
            ...
        ]
        """
        try:
            img_np = self._load_image(image_input)
        except Exception as e:
            print(f"Error loading image: {e}")
            return []

        # Run EasyOCR
        try:
            ocr_results = self.reader.readtext(img_np)
        except Exception as e:
            print(f"Error executing EasyOCR: {e}")
            return []

        extracted = []
        for bbox, text, conf in ocr_results:
            cleaned_text = str(text).strip()
            if not cleaned_text:
                continue
                
            # Convert polygon coordinates to standard python floats [[x1, y1], ...]
            formatted_coords = [[float(point[0]), float(point[1])] for point in bbox]
            
            extracted.append({
                "text": cleaned_text,
                "coordinates": formatted_coords,
                "ocr_confidence": float(conf)
            })

        return extracted
