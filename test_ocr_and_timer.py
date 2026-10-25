import os
import sys
import base64
import requests

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def file_to_base64_data_uri(filepath):
    with open(filepath, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("utf-8")
    ext = os.path.splitext(filepath)[1].lower().replace(".", "")
    mime = "jpeg" if ext in ["jpg", "jpeg"] else "png"
    return f"data:image/{mime};base64,{b64}"

def run_tests():
    print("=" * 70)
    print("       DARK-GUARD: OCR & COUNTDOWN TIMER VERIFICATION SUITE")
    print("=" * 70)

    # ---------------------------------------------------------
    # PART 1: TEST EASYOCR & IMAGE PREDICTION FUNCTIONALITY
    # ---------------------------------------------------------
    print("\n[PART 1] TESTING OCR AND IMAGE PREDICTION PIPELINE")
    print("-" * 50)

    dp_images_dir = os.path.join(os.path.dirname(__file__), "mock-store", "public", "dp_images")
    test_images = [
        {"name": "urgency_banner.png", "expected_cat": "Urgency", "type": "Urgency Banner"},
        {"name": "social_proof.png", "expected_cat": "Social Proof", "type": "Social Proof Card"},
        {"name": "sneaking.png", "expected_cat": "Sneaking", "type": "Sneak Add Card"}
    ]

    ocr_passed = 0
    total_ocr_tests = len(test_images)

    for item in test_images:
        img_path = os.path.join(dp_images_dir, item["name"])
        if not os.path.exists(img_path):
            print(f"❌ Error: Test image {item['name']} not found at {img_path}")
            continue

        data_uri = file_to_base64_data_uri(img_path)
        payload = {
            "image_id": f"test-{item['name']}",
            "image": data_uri
        }

        res = requests.post(f"{BASE_URL}/predict-image", json=payload, timeout=30)
        if res.status_code != 200:
            print(f"❌ POST /predict-image failed with HTTP {res.status_code}: {res.text}")
            continue

        data = res.json()
        print(f"\n* Testing Image: '{item['name']}' ({item['type']})")
        print(f"  - Server Response HTTP 200")
        print(f"  - has_dark_pattern: {data['has_dark_pattern']}")
        print(f"  - Total OCR Text Detections: {len(data['detections'])}")

        has_valid_coords = True
        found_expected_cat = False

        for det in data["detections"]:
            coords = det["coordinates"]
            ocr_conf = det["ocr_confidence"]
            cat = det["category"]
            conf = det["confidence"]
            text = det["text"]

            # Validate polygon coordinates (must be 4 points [[x,y],...])
            if not (isinstance(coords, list) and len(coords) == 4 and all(len(p) == 2 for p in coords)):
                has_valid_coords = False

            print(f"    - Extracted Text: '{text}' (OCR Conf: {ocr_conf:.2f})")
            print(f"      Dark Pattern: {det['is_dark_pattern']} | Category: {cat} (Conf: {conf:.2f})")
            print(f"      Polygon Box: {coords}")

            if det["is_dark_pattern"]:
                found_expected_cat = True

        if data["has_dark_pattern"] and has_valid_coords and found_expected_cat:
            print(f"  -> RESULT: ✅ PASS (OCR extracted text + coordinates + dark pattern flagged correctly)")
            ocr_passed += 1
        else:
            print(f"  -> RESULT: ❌ FAIL")

    # Test Batch Image API
    print("\n* Testing Batch Image Endpoint (POST /predict-images)...")
    batch_payload = {
        "images": [
            {"image_id": "batch-1", "image": file_to_base64_data_uri(os.path.join(dp_images_dir, "urgency_banner.png"))},
            {"image_id": "batch-2", "image": file_to_base64_data_uri(os.path.join(dp_images_dir, "social_proof.png"))}
        ]
    }
    res_batch = requests.post(f"{BASE_URL}/predict-images", json=batch_payload, timeout=40)
    if res_batch.status_code == 200 and len(res_batch.json()["results"]) == 2:
        print("  -> Batch OCR API: ✅ PASS (Processed 2 images simultaneously)")
        batch_passed = True
    else:
        print(f"  -> Batch OCR API: ❌ FAIL (HTTP {res_batch.status_code})")
        batch_passed = False

    # ---------------------------------------------------------
    # PART 2: TEST COUNTDOWN TIMER BEHAVIORAL VERIFICATION
    # ---------------------------------------------------------
    print("\n\n[PART 2] TESTING COUNTDOWN TIMER BEHAVIORAL VERIFICATION")
    print("-" * 50)

    timer_scenarios = [
        {
            "name": "Scenario 1: Timer Resets Every Reload (Deceptive Fake Timer)",
            "url": "https://shady-deal-store.com/checkout",
            "selector": "#flash-sale-clock",
            "evidence": {
                "reset_on_reload": True,
                "persisted_deadline_found": False,
                "looped_or_jumped": False,
                "no_consequence_at_zero": False,
                "initial_value_seconds": 300,
                "observed_remaining_seconds": 298,
                "expected_remaining_seconds": 298
            },
            "expect_dark": True
        },
        {
            "name": "Scenario 2: Timer Jumps / Loops Back & Drifts (Deceptive Fake Timer)",
            "url": "https://fake-airline-tickets.com/seats",
            "selector": ".urgency-timer",
            "evidence": {
                "reset_on_reload": False,
                "persisted_deadline_found": False,
                "looped_or_jumped": True,
                "no_consequence_at_zero": False,
                "initial_value_seconds": 600,
                "observed_remaining_seconds": 580,
                "expected_remaining_seconds": 450  # Drift > 5 seconds
            },
            "expect_dark": True
        },
        {
            "name": "Scenario 3: Legitimate Sale with Real Persisted Target Deadline",
            "url": "https://legit-brand-outlet.com/black-friday",
            "selector": "#official-sale-end",
            "evidence": {
                "reset_on_reload": False,
                "persisted_deadline_found": True, # Stored in localStorage
                "looped_or_jumped": False,
                "no_consequence_at_zero": False,
                "initial_value_seconds": 86400,
                "observed_remaining_seconds": 86392,
                "expected_remaining_seconds": 86392
            },
            "expect_dark": False
        },
        {
            "name": "Scenario 4: High-Harm Combined Signals (Reset + Drift + Loop)",
            "url": "https://scam-discount-hub.com/product",
            "selector": "div.countdown-urgent",
            "evidence": {
                "reset_on_reload": True,
                "persisted_deadline_found": False,
                "looped_or_jumped": True,
                "no_consequence_at_zero": True,
                "initial_value_seconds": 120,
                "observed_remaining_seconds": 115,
                "expected_remaining_seconds": 80
            },
            "expect_dark": True
        }
    ]

    timer_passed = 0
    total_timer_tests = len(timer_scenarios)

    for item in timer_scenarios:
        req = {
            "page_url": item["url"],
            "element_selector": item["selector"],
            "evidence": item["evidence"],
            "element_text_sample": "04:59"
        }
        res = requests.post(f"{BASE_URL}/verify-countdown", json=req, timeout=10)
        if res.status_code != 200:
            print(f"❌ POST /verify-countdown failed with HTTP {res.status_code}")
            continue

        resp_data = res.json()
        is_dark = resp_data["is_dark_pattern"]
        conf = resp_data["confidence"]
        cat = resp_data["category"]

        print(f"\n* {item['name']}")
        print(f"  - Element: '{item['selector']}' | URL: {item['url']}")
        print(f"  - Dark Pattern: {is_dark} (Confidence / Fakeness Score: {conf:.2f})")
        print(f"  - Category: {cat}")

        match = (is_dark == item["expect_dark"])
        if match:
            print(f"  -> RESULT: ✅ PASS (Correctly identified as {'FAKE' if is_dark else 'LEGITIMATE'})")
            timer_passed += 1
        else:
            print(f"  -> RESULT: ❌ FAIL (Expected {item['expect_dark']}, got {is_dark})")

    # Test Batch Countdown Endpoint
    print("\n* Testing Batch Countdown Endpoint (POST /verify-countdowns)...")
    batch_req = {
        "countdowns": [
            {
                "page_url": timer_scenarios[0]["url"],
                "element_selector": timer_scenarios[0]["selector"],
                "evidence": timer_scenarios[0]["evidence"]
            },
            {
                "page_url": timer_scenarios[2]["url"],
                "element_selector": timer_scenarios[2]["selector"],
                "evidence": timer_scenarios[2]["evidence"]
            }
        ]
    }
    res_batch_timer = requests.post(f"{BASE_URL}/verify-countdowns", json=batch_req, timeout=10)
    if res_batch_timer.status_code == 200 and len(res_batch_timer.json()["results"]) == 2:
        print("  -> Batch Countdown API: ✅ PASS (Processed 2 timer verifications)")
        batch_timer_passed = True
    else:
        print(f"  -> Batch Countdown API: ❌ FAIL")
        batch_timer_passed = False

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------
    print("\n" + "=" * 70)
    print("                    FINAL VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"1. EasyOCR Single Image Extraction:   {ocr_passed}/{total_ocr_tests} PASSED")
    print(f"2. EasyOCR Batch Processing:          {'PASSED' if batch_passed else 'FAILED'}")
    print(f"3. Countdown Behavioral Verification: {timer_passed}/{total_timer_tests} PASSED")
    print(f"4. Countdown Batch Processing:        {'PASSED' if batch_timer_passed else 'FAILED'}")
    
    all_ok = (ocr_passed == total_ocr_tests and batch_passed and timer_passed == total_timer_tests and batch_timer_passed)
    if all_ok:
        print("\n🎉 ALL OCR AND COUNTDOWN TIMER FUNCTIONALITIES WORK PERFECTLY!")
    else:
        print("\n⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.")

if __name__ == "__main__":
    run_tests()
