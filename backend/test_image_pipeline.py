import io
import base64
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from main import app

def create_sample_banner(text="Hurry! Only 2 left in stock"):
    # Create an image banner with clear text
    img = Image.new("RGB", (500, 100), color=(255, 240, 240))
    draw = ImageDraw.Draw(img)
    
    # Draw simple bounding text
    draw.text((20, 35), text, fill=(200, 0, 0))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

def test_full_pipeline():
    print("\n--- Starting Dark-Guard Pipeline Tests ---")
    client = TestClient(app)
    
    # 1. Test Root
    res_root = client.get("/")
    assert res_root.status_code == 200
    print("[OK] GET / returned 200:", res_root.json())
    
    # 2. Test Text Prediction
    res_text = client.post("/predict", json={
        "texts": [
            "Hurry up, only 2 left in stock!",
            "Welcome to our shop!"
        ]
    })
    assert res_text.status_code == 200
    text_data = res_text.json()
    print("[OK] POST /predict returned 200:")
    for item in text_data["results"]:
        print(f"  - '{item['text']}' -> Dark: {item['is_dark_pattern']}, Category: {item['category']}, Conf: {item['confidence']:.2f}")

    # 3. Test Image Prediction with EasyOCR + Model
    print("\nGenerating synthetic banner image with text: 'Hurry! Only 2 left in stock'...")
    image_b64 = create_sample_banner("Hurry! Only 2 left in stock")
    
    res_img = client.post("/predict-image", json={
        "image_id": "test-img-001",
        "image": image_b64
    })
    assert res_img.status_code == 200
    img_data = res_img.json()
    print("[OK] POST /predict-image returned 200:")
    print(f"  - Image ID: {img_data['image_id']}")
    print(f"  - Has Dark Pattern: {img_data['has_dark_pattern']}")
    print(f"  - Detections Count: {len(img_data['detections'])}")
    for det in img_data["detections"]:
        print(f"    * Detected Text: '{det['text']}' (OCR Conf: {det['ocr_confidence']:.2f})")
        print(f"      Coordinates: {det['coordinates']}")
        print(f"      Dark Pattern: {det['is_dark_pattern']} | Category: {det['category']} | Confidence: {det['confidence']:.2f}")
    
    # 4. Test Batch Image Prediction
    res_batch = client.post("/predict-images", json={
        "images": [
            {"image_id": "batch-img-1", "image": image_b64}
        ]
    })
    assert res_batch.status_code == 200
    batch_data = res_batch.json()
    print("[OK] POST /predict-images returned 200:")
    print(f"  - Batch Results Count: {len(batch_data['results'])}")

    print("\n[ALL TESTS PASSED SUCCESSFULLY]")

if __name__ == "__main__":
    test_full_pipeline()
