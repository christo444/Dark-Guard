import os
import sys
from backend.models.bert_model import BertModel

model_dir = r'c:\Users\chris\OneDrive\Desktop\Main Project\Dark-Guard\backend\model_weights\darkguard-bert-final'
model = BertModel(model_dir)

test_cases = [
    # --- FALSE POSITIVES FROM PHASE 2 (Should now be Not Dark Pattern) ---
    '3,417',
    '12 rooms available',
    'Order number: 994231',
    '2',
    'In stock and ready to ship',
    'In stock. Ready for standard delivery.',
    'Free standard shipping on orders over $50',
    'Cancel anytime online with 1-click.',
    'You can opt out of this at any time.',
    'Permanently delete your account and all associated data. This action cannot be undone.',
    'No Cost EMI:',
    '1 year manufacturer warranty included',
    'Shop Now',
    'Add to cart',
    
    # --- TRUE POSITIVES (Model should still correctly flag these) ---
    'Hurry up, only 2 left in stock!',
    '24 people are viewing this right now',
    'Uncheck this box if you DO NOT wish to NOT receive daily promotional emails',
    'After your 7-day free trial, you will automatically be billed $199 annually.'
]

results = []
for text in test_cases:
    prediction = model.predict(text)
    results.append({
        'text': text,
        'predicted_category': prediction['category'],
        'confidence': prediction['confidence']
    })

with open('final_model_evaluation.md', 'w', encoding='utf-8') as f:
    f.write('# Final Model Evaluation Report\n\n')
    f.write('This report evaluates the newly retrained `darkguard-bert-final` model natively, without any backend heuristic overrides.\n\n')
    
    f.write('## Evaluation Results\n')
    f.write('| Input Text | Predicted Category | Confidence | Status |\n')
    f.write('|---|---|---|---|\n')
    
    for r in results:
        expected = 'Not Dark Pattern' if r['text'] not in test_cases[-4:] else ('Scarcity' if 'Hurry' in r['text'] else 'Social Proof' if '24 people' in r['text'] else 'Misdirection' if 'Uncheck' in r['text'] else 'Forced Action')
        # Allow slight leniency in exactly which dark pattern class it picks for the true positives, but it MUST be a dark pattern.
        if r['text'] not in test_cases[-4:]:
            mark = '✅ PASS' if r['predicted_category'] == 'Not Dark Pattern' else '❌ FAIL'
        else:
            mark = '✅ PASS' if r['predicted_category'] != 'Not Dark Pattern' else '❌ FAIL'
            
        f.write(f"| {r['text']} | {r['predicted_category']} | {r['confidence']:.2f} | {mark} |\n")

