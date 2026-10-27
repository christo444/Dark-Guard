import requests
import base64
import os

print("=== 1. VERIFYING TEXT PREDICTIONS FROM CLONED STORE ===")
res_text = requests.post("http://127.0.0.1:8000/predict", json={
    "texts": [
        "Hurry up, only 2 left in stock!",
        "Free standard shipping on orders over $50",
        "High demand! 24 people currently viewing this item",
        "Alex from Chicago just bought Pulse X Watch!"
    ]
})
print(f"Status Code: {res_text.status_code}")
for r in res_text.json()["results"]:
    print(f"  * Text: '{r['text']}'")
    print(f"    -> Dark Pattern: {r['is_dark_pattern']} | Category: {r['category']} | Confidence: {r['confidence']:.2f}")

print("\n=== 2. VERIFYING IMAGE EASYOCR + BERT ON BANNER_URGENCY.JPG ===")
img_path = os.path.join(os.path.dirname(__file__), "demo_site", "images", "banner_urgency.jpg")
with open(img_path, "rb") as f:
    b64_urgency = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

res_img1 = requests.post("http://127.0.0.1:8000/predict-image", json={
    "image_id": "promo-banner-urgency",
    "image": b64_urgency
})
print(f"Status Code: {res_img1.status_code}")
data1 = res_img1.json()
print(f"Image ID: {data1['image_id']}")
print(f"Has Dark Pattern: {data1['has_dark_pattern']}")
for d in data1["detections"]:
    print(f"  * Detected Text: '{d['text']}' (OCR Conf: {d['ocr_confidence']:.2f})")
    print(f"    Coordinates: {d['coordinates']}")
    print(f"    Dark Pattern: {d['is_dark_pattern']} | Category: {d['category']} | Confidence: {d['confidence']:.2f}")

print("\n=== 3. VERIFYING IMAGE EASYOCR + BERT ON BANNER_SOCIAL_PROOF.JPG ===")
img2_path = os.path.join(os.path.dirname(__file__), "demo_site", "images", "banner_social_proof.jpg")
with open(img2_path, "rb") as f:
    b64_social = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

res_img2 = requests.post("http://127.0.0.1:8000/predict-image", json={
    "image_id": "deal-banner-social",
    "image": b64_social
})
print(f"Status Code: {res_img2.status_code}")
data2 = res_img2.json()
print(f"Image ID: {data2['image_id']}")
print(f"Has Dark Pattern: {data2['has_dark_pattern']}")
for d in data2["detections"]:
    print(f"  * Detected Text: '{d['text']}' (OCR Conf: {d['ocr_confidence']:.2f})")
    print(f"    Coordinates: {d['coordinates']}")
    print(f"    Dark Pattern: {d['is_dark_pattern']} | Category: {d['category']} | Confidence: {d['confidence']:.2f}")
