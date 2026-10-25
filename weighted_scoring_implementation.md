# Dark-Guard: Weighted Website Trust & Safety Scoring Specification
*Archived Implementation Guide & Blueprint for Future Re-Integration*

---

## 1. Overview & Mathematical Scoring Formula

The **Weighted Website Trust & Safety Scoring** mechanism evaluates an entire visited e-commerce website based on the aggregate presence, category severity, and volume of detected dark patterns.

### Scoring Formula
$$\text{Safety Score} = \max\left(0, 100 - \sum_{i=1}^{N} \text{Penalty}(\text{Category}_i)\right)$$

* Initial clean base score: **100 points**
* For each detected pattern, a severity-weighted point penalty is subtracted.
* The score is clamped between **0** (Critically Deceptive) and **100** (Completely Safe).

---

## 2. Severity Weight Configuration (`SEVERITY_CONFIG`)

| Category | Severity Level | Point Deduction | Justification |
|---|---|---|---|
| **Sneaking** | High | **25 pts** | Directly charges hidden fees or pre-checks items in cart without explicit consent. |
| **Obstruction** | High | **25 pts** | Intentionally creates barriers (e.g. roach motel, impossible cancellation). |
| **Fake Countdown Timer** | High | **25 pts** | Deceptively fabricates urgency using client-side resetting clocks. |
| **Forced Action** | Medium | **18 pts** | Coerces shoppers into signing up or sharing data to proceed. |
| **Misdirection** | Medium | **15 pts** | Employs visual tricks or asymmetric button colors (confirmshaming). |
| **Scarcity** | Low | **10 pts** | Artificial inventory warnings (*"Only 2 left!"*). |
| **Urgency** | Low | **10 pts** | Text pressure (*"Hurry, sale ends soon!"*). |
| **Social Proof** | Low | **10 pts** | Activity nudges (*"24 people viewing this!"*). |

---

## 3. Academic Grade & Risk Level Thresholds

| Safety Score | Letter Grade | Risk Level | User Summary Message | Theme Color |
|---|---|---|---|---|
| **90 – 100** | **Grade A** | **Safe / Clean** | "Clean website. No significant deceptive design tactics found." | Emerald Green (`#10b981`) |
| **75 – 89** | **Grade B** | **Low Risk** | "Mostly safe. Minor marketing pressure tactics detected." | Sky Blue (`#38bdf8`) |
| **50 – 74** | **Grade C** | **Moderate Risk** | "Exercise caution. Multiple manipulative patterns detected." | Amber Orange (`#f59e0b`) |
| **30 – 49** | **Grade D** | **High Risk** | "High risk of deception. Sneaky charges or forced actions likely." | Burnt Orange (`#f97316`) |
| **0 – 29** | **Grade F** | **Critical** | "Severe deceptive design. Aggressive manipulation detected across UI." | Crimson Red (`#ef4444`) |

---

## 4. Backend Code Reference (FastAPI & Pydantic)

### A. Schemas (`backend/models/schemas.py`)
```python
class DetectedPatternItem(BaseModel):
    category: str
    text_or_target: str
    confidence: float
    source: str = "text"  # "text", "image", "countdown"

class SiteEvaluationRequest(BaseModel):
    page_url: str
    patterns: List[DetectedPatternItem]

class SiteEvaluationResponse(BaseModel):
    page_url: str
    safety_score: int              # 0 to 100
    letter_grade: str              # "A", "B", "C", "D", "F"
    risk_level: str                # "Safe", "Low Risk", "Moderate Risk", "High Risk", "Critical"
    total_dark_patterns: int
    category_breakdown: dict
    severity_breakdown: dict
    summary_message: str
```

### B. Service Method (`backend/services/predictor.py`)
```python
SEVERITY_CONFIG = {
    "Sneaking": {"penalty": 25, "severity": "High"},
    "Obstruction": {"penalty": 25, "severity": "High"},
    "FAKE_COUNTDOWN": {"penalty": 25, "severity": "High"},
    "Fake Countdown Timer": {"penalty": 25, "severity": "High"},
    "Forced Action": {"penalty": 18, "severity": "Medium"},
    "Misdirection": {"penalty": 15, "severity": "Medium"},
    "Scarcity": {"penalty": 10, "severity": "Low"},
    "Urgency": {"penalty": 10, "severity": "Low"},
    "Social Proof": {"penalty": 10, "severity": "Low"},
}

def evaluate_site(self, request: SiteEvaluationRequest) -> SiteEvaluationResponse:
    total_deductions = 0
    category_breakdown = {}
    severity_breakdown = {"High": 0, "Medium": 0, "Low": 0}

    for item in request.patterns:
        cat = item.category
        if not cat or cat == "Not Dark Pattern":
            continue
        
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1
        cfg = SEVERITY_CONFIG.get(cat, {"penalty": 12, "severity": "Medium"})
        total_deductions += cfg["penalty"]
        severity_breakdown[cfg["severity"]] = severity_breakdown.get(cfg["severity"], 0) + 1

    safety_score = max(0, min(100, 100 - total_deductions))
    total_dp = sum(category_breakdown.values())

    if safety_score >= 90:
        letter_grade = "A"
        risk_level = "Safe"
        summary_message = "Clean website. No significant deceptive design tactics found."
    elif safety_score >= 75:
        letter_grade = "B"
        risk_level = "Low Risk"
        summary_message = "Mostly safe. Minor marketing pressure tactics detected."
    elif safety_score >= 50:
        letter_grade = "C"
        risk_level = "Moderate Risk"
        summary_message = "Exercise caution. Multiple manipulative patterns detected."
    elif safety_score >= 30:
        letter_grade = "D"
        risk_level = "High Risk"
        summary_message = "High risk of deception. Sneaky charges or forced actions likely."
    else:
        letter_grade = "F"
        risk_level = "Critical"
        summary_message = "Severe deceptive design. Aggressive manipulation detected across UI."

    return SiteEvaluationResponse(
        page_url=request.page_url,
        safety_score=safety_score,
        letter_grade=letter_grade,
        risk_level=risk_level,
        total_dark_patterns=total_dp,
        category_breakdown=category_breakdown,
        severity_breakdown=severity_breakdown,
        summary_message=summary_message
    )
```

### C. Route (`backend/main.py`)
```python
@app.post("/evaluate-site", response_model=SiteEvaluationResponse)
def evaluate_site(request: SiteEvaluationRequest):
    try:
        return predictor_service.evaluate_site(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 5. Extension UI Reference

### A. Popup Score Dial (`Extension/popup.html`)
```html
<section class="score-card" id="scoreCard">
    <div class="score-left">
        <div class="score-dial">
            <span class="score-number" id="safetyScore">--</span>
            <span class="score-max">/100</span>
        </div>
        <div class="grade-pill" id="letterGrade">--</div>
    </div>
    <div class="score-right">
        <div class="risk-badge" id="riskBadge">ANALYZING PAGE</div>
        <p class="summary-text" id="summaryMessage">Scanning page text, image banners, and countdown timers...</p>
    </div>
</section>
```

### B. Background Proxy Handler (`Extension/background.js`)
```javascript
const EVALUATE_API_URL = "http://localhost:8000/evaluate-site";

if (request.action === "evaluateSite") {
    url = EVALUATE_API_URL;
}
```

### C. Popup Client Fallback Calculation (`Extension/popup.js`)
```javascript
const SEVERITY_CONFIG = {
    "Sneaking": { penalty: 25, severity: "high" },
    "Obstruction": { penalty: 25, severity: "high" },
    "FAKE_COUNTDOWN": { penalty: 25, severity: "high" },
    "Fake Countdown Timer": { penalty: 25, severity: "high" },
    "Forced Action": { penalty: 18, severity: "medium" },
    "Misdirection": { penalty: 15, severity: "medium" },
    "Scarcity": { penalty: 10, severity: "low" },
    "Urgency": { penalty: 10, severity: "low" },
    "Social Proof": { penalty: 10, severity: "low" }
};

function computeLocalEvaluation(url, patterns) {
    let totalDeductions = 0;
    const categoryBreakdown = {};
    const severityBreakdown = { High: 0, Medium: 0, Low: 0 };

    patterns.forEach(item => {
        const cat = item.category;
        if (!cat || cat === "Not Dark Pattern") return;

        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
        const cfg = SEVERITY_CONFIG[cat] || { penalty: 12, severity: "medium" };
        totalDeductions += cfg.penalty;

        const sevKey = cfg.severity.charAt(0).toUpperCase() + cfg.severity.slice(1);
        severityBreakdown[sevKey] = (severityBreakdown[sevKey] || 0) + 1;
    });

    const safetyScore = Math.max(0, Math.min(100, 100 - totalDeductions));
    const totalDp = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);

    let letterGrade = "A";
    let riskLevel = "Safe";
    let summaryMessage = "Clean website. No significant deceptive design tactics found.";

    if (safetyScore >= 90) {
        letterGrade = "A"; riskLevel = "Safe";
        summaryMessage = "Clean website. No significant deceptive design tactics found.";
    } else if (safetyScore >= 75) {
        letterGrade = "B"; riskLevel = "Low Risk";
        summaryMessage = "Mostly safe. Minor marketing pressure tactics detected.";
    } else if (safetyScore >= 50) {
        letterGrade = "C"; riskLevel = "Moderate Risk";
        summaryMessage = "Exercise caution. Multiple manipulative patterns detected.";
    } else if (safetyScore >= 30) {
        letterGrade = "D"; riskLevel = "High Risk";
        summaryMessage = "High risk of deception. Sneaky charges or forced actions likely.";
    } else {
        letterGrade = "F"; riskLevel = "Critical";
        summaryMessage = "Severe deceptive design. Aggressive manipulation detected across UI.";
    }

    return {
        page_url: url,
        safety_score: safetyScore,
        letter_grade: letterGrade,
        risk_level: riskLevel,
        total_dark_patterns: totalDp,
        category_breakdown: categoryBreakdown,
        severity_breakdown: severityBreakdown,
        summary_message: summaryMessage
    };
}
```

---

## 6. How to Re-Integrate Whenever Your Team Is Ready

1. Copy the schemas back into [`backend/models/schemas.py`](file:///c:/Users/chris/OneDrive/Desktop/Main%20Project/Dark-Guard/backend/models/schemas.py).
2. Add `evaluate_site` back to [`backend/services/predictor.py`](file:///c:/Users/chris/OneDrive/Desktop/Main%20Project/Dark-Guard/backend/services/predictor.py).
3. Register `@app.post("/evaluate-site")` in [`backend/main.py`](file:///c:/Users/chris/OneDrive/Desktop/Main%20Project/Dark-Guard/backend/main.py).
4. Restore `evaluateSite` handler in [`Extension/background.js`](file:///c:/Users/chris/OneDrive/Desktop/Main%20Project/Dark-Guard/Extension/background.js) and the score dial card in [`Extension/popup.html`](file:///c:/Users/chris/OneDrive/Desktop/Main%20Project/Dark-Guard/Extension/popup.html).
