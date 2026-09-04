# Model Evaluation Report
**Prepared for:** Hima Baijuraj (Student 1 - ML / Data Lead)
**Date:** September 2026
**Task:** BERT Model Fine-Tuning Evaluation

---

## 1. Executive Summary
The fine-tuned BERT model was integrated into the FastAPI backend and tested against a comprehensive benchmark dataset designed to evaluate edge cases, subtle manipulative text, and standard e-commerce copy. 

**Overall Verdict:** The model is performing exceptionally well on core dark pattern categories (Scarcity, Urgency, Social Proof, Misdirection). However, it struggles with the "Forced Action" category and exhibits minor False Positive tendencies on standard e-commerce shipping/warranty copy.

---

## 2. Strengths (What is working perfectly)

The model is highly confident (90% - 99%) and accurate in identifying the following categories:

* **Scarcity & Urgency:** Flawlessly identifies countdown timers, low stock warnings, and expiring carts. 
  * *Example:* "Hurry! Only 2 items left in stock." (Scarcity - 99%)
* **Social Proof:** Perfectly identifies fake activity notifications and high-demand claims.
  * *Example:* "John from Texas just bought this 2 minutes ago!" (Social Proof - 98%)
* **Misdirection (Confirmshaming & Trick Questions):** Accurately detects manipulative language meant to shame the user or trick them into opting in.
  * *Example:* "No thanks, I prefer to pay full price and lose money." (Misdirection - 97%)
* **True Negatives:** Successfully ignores standard cookie popups, "added to cart" messages, and even "Out of stock" text without falsely flagging them as Scarcity.

---

## 3. Areas for Improvement (What needs retraining)

### A. False Negatives (Missed Dark Patterns)
The model completely failed to identify "Forced Action" dark patterns, classifying them as completely safe.
* **Test Input:** *"You must create an account to view the price of this item."*
* **Model Output:** `Not Dark Pattern` (98% confidence)
* **Action Required:** Introduce more examples of **Forced Action** (e.g., forcing account creation, forcing email submission to continue) into the training dataset. 

### B. False Positives (Flagging normal text)
The model flagged standard warranty and shipping information as a dark pattern. It seems overly sensitive to text containing prices, numbers, or the word "free".
* **Test Input:** *"This product comes with a 1-year manufacturer warranty and free shipping on orders over $50."*
* **Model Output:** `Other` (69% confidence)
* **Action Required:** Add more standard, non-manipulative e-commerce text containing prices, shipping rules, and warranties to the `Not Dark Pattern` training dataset.

### C. Low Confidence on "Sneaking" & "Hidden Costs"
While the model successfully flagged these as dark patterns (categorizing them as `Other`), its confidence was extremely low (40% - 50%).
* **Test Input:** *"By clicking checkout, you agree to add the $14.99 premium protection plan to your cart."*
* **Model Output:** `Other` (42% confidence)
* **Action Required:** Beef up the training data with examples of Sneaking (adding items to cart automatically) and Hidden Costs (service fees applied at checkout).

---

## 4. Next Steps for Student 1
1. **Dataset Augmentation:** Review the training dataset (`dataset.tsv`) and inject 50-100 new rows covering **Forced Action**, **Sneaking**, and **Standard E-commerce Copy** (to fix the false positives).
2. **Retraining:** Run another fine-tuning pass (3-4 epochs as defined in your methodology) with the augmented dataset.
3. **Re-export:** Zip the new `.safetensors` and `config.json` files and upload them to Google Drive so the Backend team can run this benchmark test again!
