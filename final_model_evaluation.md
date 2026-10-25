# Final Model Evaluation Report

This report evaluates the newly retrained `darkguard-bert-final` model natively, without any backend heuristic overrides.

## Evaluation Results
| Input Text | Predicted Category | Confidence | Status |
|---|---|---|---|
| 3,417 | Not Dark Pattern | 1.00 | ✅ PASS |
| 12 rooms available | Scarcity | 1.00 | ❌ FAIL |
| Order number: 994231 | Not Dark Pattern | 1.00 | ✅ PASS |
| 2 | Not Dark Pattern | 1.00 | ✅ PASS |
| In stock and ready to ship | Not Dark Pattern | 1.00 | ✅ PASS |
| In stock. Ready for standard delivery. | Not Dark Pattern | 1.00 | ✅ PASS |
| Free standard shipping on orders over $50 | Not Dark Pattern | 0.99 | ✅ PASS |
| Cancel anytime online with 1-click. | Not Dark Pattern | 1.00 | ✅ PASS |
| You can opt out of this at any time. | Not Dark Pattern | 1.00 | ✅ PASS |
| Permanently delete your account and all associated data. This action cannot be undone. | Not Dark Pattern | 1.00 | ✅ PASS |
| No Cost EMI: | Not Dark Pattern | 0.99 | ✅ PASS |
| 1 year manufacturer warranty included | Not Dark Pattern | 0.98 | ✅ PASS |
| Shop Now | Not Dark Pattern | 1.00 | ✅ PASS |
| Add to cart | Not Dark Pattern | 0.99 | ✅ PASS |
| Hurry up, only 2 left in stock! | Scarcity | 1.00 | ✅ PASS |
| 24 people are viewing this right now | Social Proof | 1.00 | ✅ PASS |
| Uncheck this box if you DO NOT wish to NOT receive daily promotional emails | Misdirection | 1.00 | ✅ PASS |
| After your 7-day free trial, you will automatically be billed $199 annually. | Sneaking | 0.99 | ✅ PASS |
