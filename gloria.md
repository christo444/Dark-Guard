# Visual Detection Integration Guide
**Prepared for:** Gloria (Student 4 - Visual Dark-Pattern Detection)

---

## 1. Goal
Your role focuses on detecting dark patterns embedded inside images (e.g., fake countdown graphics, urgency banners) using Computer Vision (CV) and OCR, bridging the gap that text-only models miss.

Once your visual detection module is working, it needs to connect with the FastAPI backend so the Chrome Extension can display your results alongside the text-based BERT results.

---

## 2. Integration Strategy

Depending on how your computer vision pipeline works, there are two ways we can integrate your module into the backend. Please review these options and let the Backend Team (Student 2) know which one you prefer so we can build the API endpoint for you.

### Option A: The "OCR to Text" Pipeline (Easiest)
If your pipeline uses OCR (Optical Character Recognition) to extract text embedded inside an image banner, you don't even need a new API! 

You can simply pass the text you extracted from the image directly into our existing BERT endpoint.

**Endpoint:** `POST http://localhost:8000/predict`
```json
{
  "texts": [
    "EXTRACTED_OCR_TEXT_FROM_IMAGE"
  ]
}
```
The BERT model will process your extracted image text exactly like it processes normal website text, and return the category.

### Option B: The "CV Classification" Pipeline (For Visual/Image-based Models)
If you are training a separate Computer Vision model (like a CNN or ResNet) that looks at the *pixels* of the image to detect a fake countdown timer or scarcity banner, we will need to build a new API endpoint specifically for you.

**Proposed Future Endpoint:** `POST http://localhost:8000/predict-image`

**How it will work:**
1. The Chrome Extension (Student 3) finds an image/banner on the webpage.
2. The extension sends the image (as a Base64 string or file upload) to `/predict-image`.
3. The backend will pass that image into **your** Computer Vision model.
4. Your model will return the prediction (e.g., `Fake Countdown Timer`, `Confidence: 88%`).

---

## 3. Next Steps for Gloria
1. Decide whether your final detection will rely on **OCR Text Extraction** (Option A) or **Direct Image Classification** (Option B).
2. If you are doing Option B, let the Backend team know when your `.pth` (or `.h5`) model weights are ready. We will create a `cv_model.py` file in the backend to load your weights, just like we did for the BERT model.
3. Define your categories. Will your visual categories map to the text categories (e.g., `Scarcity`, `Urgency`), or will you have specific visual categories (e.g., `Fake_Timer_Graphic`)? Let the backend team know so we can standardize the output for the Chrome extension!
