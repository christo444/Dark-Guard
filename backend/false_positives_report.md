# False Positives Model Test Results

These are completely normal, benign statements that the model incorrectly flags as dark patterns.

| INPUT TEXT | LOGITS [Not Dark, Dark] | LOGIT DIFF | IS_DARK_PATTERN |
|---|---|---|---|
| Unlock 20% Off Your First Order | [-4.7431, 4.4433] | 9.1864 | **True** |
| Join our exclusive VIP club today and get instant access to our best deals, secret sales, and premium content! | [-4.5770, 4.0980] | 8.6750 | **True** |
| Yes, Give Me 20% Off! | [-5.1195, 5.2486] | 10.3681 | **True** |
| 12 rooms available | [-3.3988, 3.1366] | 6.5353 | **True** |
| Unlock the full potential of your team with our premium features. No hidden fees, we promise! | [-3.7922, 3.2086] | 7.0008 | **True** |
| Cancel anytime online with 1 click. | [-1.1563, 1.7612] | 2.9175 | **True** |
| Start 7-Day Free Trial | [-4.8950, 4.8456] | 9.7406 | **True** |
