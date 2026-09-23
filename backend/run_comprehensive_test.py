import os, sys, json, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_dir = r'C:\Users\chris\OneDrive\Desktop\Main Project\Dark-Guard\backend\model_weights\darkguard-bert-final'
tokenizer = AutoTokenizer.from_pretrained(model_dir)
model = AutoModelForSequenceClassification.from_pretrained(model_dir)

dark_patterns = [
    'Only 1 room left at this price!',
    'Hurry, sale ends in 04:59!',
    '38 people are viewing this right now.',
    'Someone in Chicago just bought this 5 minutes ago.',
    'No thanks, I prefer paying full price.',
    'Yes, enroll me in the VIP program ($49.99/mo after 7 days).',
    'Fares increasing soon! Book today.',
    'Add Trip Protection (Recommended).',
    'Warning: Your computer might be infected! Click here.',
    'By clicking continue, you agree to receive promotional emails.',
    'Are you sure you want to cancel? You will lose all your progress.',
    'Claim your free prize now before time runs out!',
    'Limited time offer! Act now!',
    'This item is in high demand.',
    'Last booked 1 hour ago.'
]

benign_texts = [
    'Add to cart',
    'Checkout',
    'Shop Now',
    'Experience Sound Without Limits',
    '$189.99',
    'Free shipping on orders over $50',
    'Save 15% when you buy two or more.',
    'Use code SUMMER for 20% off.',
    'Subscribe for $9.99/month. Cancel anytime.',
    'Start your 7-day free trial today.',
    'No commitment. Cancel before billing.',
    'Sign up for our newsletter.',
    'Create a free account to track orders.',
    'Continue as guest.',
    'Skip this offer.',
    'In stock and ready to ship.',
    'Standard Economy Fare',
    'Your 14-day free trial begins today.',
    '12 rooms available.',
    'Click here to learn more about our privacy policy.'
]

with open(r'C:\Users\chris\.gemini\antigravity-ide\brain\2af195f7-bc39-4c88-bbb4-2d13ef34f428\final_comprehensive_evaluation.md', 'w', encoding='utf-8') as f:
    f.write('# Comprehensive Model Evaluation\n\n')
    f.write('This test evaluates the NEW model weights provided by the teammate.\n\n')
    
    f.write('## 1. Actual Dark Patterns\n')
    f.write('| INPUT TEXT | LOGIT DIFF | IS_DARK (PREDICTION) | CORRECT? |\n')
    f.write('|---|---|---|---|\n')
    for text in dark_patterns:
        toks = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        with torch.no_grad(): out = model(**toks)
        diff = out.logits[0][1] - out.logits[0][0]
        pred = diff > 0
        correct_str = 'Yes' if pred.item() else 'No'
        f.write(f'| {text} | {diff.item():.4f} | {pred.item()} | **{correct_str}** |\n')
        
    f.write('\n## 2. Benign / Normal Texts\n')
    f.write('| INPUT TEXT | LOGIT DIFF | IS_DARK (PREDICTION) | CORRECT? |\n')
    f.write('|---|---|---|---|\n')
    for text in benign_texts:
        toks = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
        with torch.no_grad(): out = model(**toks)
        diff = out.logits[0][1] - out.logits[0][0]
        pred = diff > 0
        correct_str = 'No' if pred.item() else 'Yes'
        f.write(f'| {text} | {diff.item():.4f} | {pred.item()} | **{correct_str}** |\n')
