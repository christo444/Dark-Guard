import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.models.bert_model import BertModel

model_dir = os.path.join(root_dir, "backend", "model_weights", "darkguard-bert-final")
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

print("\n" + "=" * 60)
print("       DARKGUARD-BERT-FINAL NATIVE BENCHMARK EVALUATION")
print("=" * 60)
print(f"{'Input Text':<45} | {'Category':<16} | {'Conf':<5} | Status")
print("-" * 75)

for r in results:
    if r['text'] not in test_cases[-4:]:
        mark = '[PASS]' if r['predicted_category'] == 'Not Dark Pattern' else '[FAIL]'
    else:
        mark = '[PASS]' if r['predicted_category'] != 'Not Dark Pattern' else '[FAIL]'
        
    print(f"{r['text'][:43]:<45} | {r['predicted_category']:<16} | {r['confidence']:.2f}  | {mark}")
print("=" * 75 + "\n")

