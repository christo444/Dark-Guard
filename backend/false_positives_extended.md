# Extended False Positives Model Test Results

These are completely normal, benign statements across various categories (promotions, informational labels, clear subscriptions, standard CTAs) that the darkguard-bert-final model incorrectly flags as dark patterns.

| INPUT TEXT | LOGITS [Not Dark, Dark] | LOGIT DIFF | IS_DARK_PATTERN |
|---|---|---|---|
| Save 15% when you buy two or more items. | [-3.4320, 3.6640] | 7.0960 | **True** |
| Free shipping on all orders over . | [4.1469, -4.0348] | -8.1817 | **False** |
| Use code SUMMER for  off your entire purchase. | [-1.5065, 1.9584] | 3.4648 | **True** |
| Sign up for our weekly newsletter for exclusive tips. | [4.5330, -4.5009] | -9.0339 | **False** |
| Create a free account to track your orders. | [4.3187, -4.4738] | -8.7925 | **False** |
| Continue as guest. | [4.2487, -4.5229] | -8.7716 | **False** |
| No thanks, I will pay full price. | [-5.1147, 5.3765] | 10.4913 | **True** |
| Skip this offer and proceed to checkout. | [-3.2692, 3.0058] | 6.2749 | **True** |
| Subscribe for .99/month. Cancel anytime. | [-5.0308, 5.2645] | 10.2953 | **True** |
| Your 14-day free trial will begin today. No commitment. | [-5.0839, 5.3712] | 10.4552 | **True** |
| We will remind you 3 days before your trial ends. | [-4.6533, 4.3739] | 9.0272 | **True** |
| Cancel before the next billing cycle to avoid charges. | [4.2220, -4.2579] | -8.4799 | **False** |
| Only 5 items left in stock (more on the way). | [-5.0925, 5.1471] | 10.2396 | **True** |
| 3 guests are currently looking at this property. | [-5.1323, 5.2469] | 10.3792 | **True** |
| Last booked 2 hours ago. | [-5.2110, 5.3172] | 10.5283 | **True** |
| This item is currently trending in your area. | [2.3259, -1.5824] | -3.9084 | **False** |
| Get my free quote. | [4.0639, -4.2313] | -8.2952 | **False** |
| Download your free e-book now. | [2.0914, -2.1489] | -4.2403 | **False** |
| Click here to learn more about our privacy policy. | [4.5190, -4.5496] | -9.0686 | **False** |
| Prices are subject to change based on availability. | [4.5007, -4.4097] | -8.9103 | **False** |
| Join our loyalty program to earn points on every purchase. | [4.2778, -4.3235] | -8.6013 | **False** |
| Refer a friend and get  off your next order. | [3.0470, -2.9122] | -5.9592 | **False** |
| Take our 2-minute survey to help us improve. | [2.5471, -1.9688] | -4.5159 | **False** |
| Try it risk-free for 30 days. Money-back guarantee. | [-4.8884, 4.7890] | 9.6774 | **True** |
| You have 1 unread message in your inbox. | [-4.0924, 4.0117] | 8.1042 | **True** |
