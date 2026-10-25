// ============================================
// DARK-GUARD POPUP CONTROLLER
// ============================================

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

let currentTabId = null;
let currentSummaryData = null;
let currentEvaluation = null;
let isHighlightsHidden = false;

document.addEventListener("DOMContentLoaded", () => {
    initPopup();
    setupButtons();
});

function initPopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            showError("Unable to access active tab.");
            return;
        }

        const tab = tabs[0];
        currentTabId = tab.id;

        try {
            const parsedUrl = new URL(tab.url);
            const domainEl = document.querySelector("#siteDomain .domain-text");
            if (domainEl) {
                domainEl.textContent = parsedUrl.hostname || "Active Page";
            }
        } catch (e) {
            document.querySelector("#siteDomain .domain-text").textContent = "Local / File";
        }

        loadPageSummary(tab.id);
    });
}

function loadPageSummary(tabId) {
    chrome.tabs.sendMessage(tabId, { action: "getPageSummary" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
            // Attempt auto-injection if tab was open before extension reload
            if (chrome.scripting && chrome.scripting.executeScript) {
                chrome.scripting.insertCSS({ target: { tabId }, files: ["styles.css"] }).catch(() => {});
                chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
                    if (chrome.runtime.lastError) {
                        renderEmptyState("Content script not detected. Try refreshing the page.");
                        return;
                    }
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { action: "getPageSummary" }, (retryRes) => {
                            if (retryRes && retryRes.success) {
                                currentSummaryData = retryRes;
                                processDetections(retryRes);
                            } else {
                                renderEmptyState("Scanning in progress... Click Re-Scan or refresh the page.");
                            }
                        });
                    }, 500);
                });
                return;
            }

            // Content script not loaded (e.g. chrome:// page or initial inject delay)
            renderEmptyState("Content script not detected. Try refreshing the page.");
            return;
        }

        currentSummaryData = response;
        processDetections(response);
    });
}

function processDetections(summary) {
    const textItems = summary.detections.texts || [];
    const imageItems = summary.detections.images || [];
    const timerItems = summary.detections.countdowns || [];

    const totalCount = textItems.length + imageItems.length + timerItems.length;

    // Update Quick Counts
    document.getElementById("countTotal").textContent = totalCount;
    document.getElementById("countText").textContent = textItems.length;
    document.getElementById("countImages").textContent = imageItems.length;
    document.getElementById("countTimers").textContent = timerItems.length;

    // Format all patterns for evaluation
    const patternPayload = [
        ...textItems.map(t => ({ category: t.category, text_or_target: t.text, confidence: t.confidence, source: "text" })),
        ...imageItems.map(i => ({ category: i.category, text_or_target: i.text, confidence: i.confidence, source: "image" })),
        ...timerItems.map(c => ({ category: c.category, text_or_target: c.text, confidence: c.confidence, source: "countdown" }))
    ];

    // Request evaluateSite from backend via background service worker
    chrome.runtime.sendMessage(
        {
            action: "evaluateSite",
            payload: {
                page_url: summary.url,
                patterns: patternPayload
            }
        },
        (res) => {
            if (res && res.success && res.data) {
                currentEvaluation = res.data;
                renderEvaluation(res.data, patternPayload);
            } else {
                // Offline fallback using identical client formula
                console.log("Dark-Guard: Using client fallback evaluation calculation");
                const fallbackEval = computeLocalEvaluation(summary.url, patternPayload);
                currentEvaluation = fallbackEval;
                renderEvaluation(fallbackEval, patternPayload);
            }
        }
    );
}

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
        letterGrade = "A";
        riskLevel = "Safe";
        summaryMessage = "Clean website. No significant deceptive design tactics found.";
    } else if (safetyScore >= 75) {
        letterGrade = "B";
        riskLevel = "Low Risk";
        summaryMessage = "Mostly safe. Minor marketing pressure tactics detected.";
    } else if (safetyScore >= 50) {
        letterGrade = "C";
        riskLevel = "Moderate Risk";
        summaryMessage = "Exercise caution. Multiple manipulative patterns detected.";
    } else if (safetyScore >= 30) {
        letterGrade = "D";
        riskLevel = "High Risk";
        summaryMessage = "High risk of deception. Sneaky charges or forced actions likely.";
    } else {
        letterGrade = "F";
        riskLevel = "Critical";
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

function renderEvaluation(data, patterns) {
    const scoreCard = document.getElementById("scoreCard");
    const scoreNumber = document.getElementById("safetyScore");
    const letterGrade = document.getElementById("letterGrade");
    const riskBadge = document.getElementById("riskBadge");
    const summaryMsg = document.getElementById("summaryMessage");

    // Animate score number
    animateValue(scoreNumber, 0, data.safety_score, 500);

    letterGrade.textContent = data.letter_grade;
    riskBadge.textContent = data.risk_level.toUpperCase();
    summaryMsg.textContent = data.summary_message;

    // Set risk color theme
    scoreCard.className = "score-card";
    const riskKey = data.risk_level.toLowerCase().replace(/\s+/g, "-");
    scoreCard.classList.add(`risk-${riskKey}`);

    // Render Category Breakdown
    renderCategoryPills(data.category_breakdown);

    // Render Detections Feed
    renderDetectionsFeed(patterns);
}

function renderCategoryPills(breakdown) {
    const container = document.getElementById("categoryPills");
    const countTag = document.getElementById("breakdownTag");
    container.innerHTML = "";

    const categories = Object.keys(breakdown || {});
    countTag.textContent = `${categories.length} Types`;

    if (categories.length === 0) {
        container.innerHTML = `<div class="empty-hint">No deceptive categories detected.</div>`;
        return;
    }

    categories.forEach(cat => {
        const count = breakdown[cat];
        const cfg = SEVERITY_CONFIG[cat] || { severity: "medium" };
        const pill = document.createElement("div");
        pill.className = `category-pill cat-${cfg.severity}`;
        pill.innerHTML = `<span>${cat}</span><span class="pill-count">${count}</span>`;
        container.appendChild(pill);
    });
}

function renderDetectionsFeed(patterns) {
    const feed = document.getElementById("detectionsFeed");
    const countTag = document.getElementById("detectionsCountTag");
    feed.innerHTML = "";

    countTag.textContent = `${patterns.length} Found`;

    if (!patterns || patterns.length === 0) {
        feed.innerHTML = `
            <div class="empty-feed">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>No dark patterns currently visible on screen.</span>
            </div>
        `;
        return;
    }

    patterns.forEach(item => {
        const cfg = SEVERITY_CONFIG[item.category] || { severity: "medium" };
        const confPct = Math.round((item.confidence || 0.95) * 100);

        const card = document.createElement("div");
        card.className = "detection-item";

        const sourceIcon = item.source === "image" ? "🖼️ Image" : item.source === "countdown" ? "⏱️ Timer" : "🔤 Text";

        card.innerHTML = `
            <div class="item-header">
                <span class="item-category ${cfg.severity}">${item.category}</span>
                <span class="item-meta">${sourceIcon} • ${confPct}% Conf</span>
            </div>
            <div class="item-text" title="${escapeHtml(item.text_or_target)}">
                "${escapeHtml(item.text_or_target)}"
            </div>
        `;

        feed.appendChild(card);
    });
}

function setupButtons() {
    const btnRescan = document.getElementById("btnRescan");
    const btnToggle = document.getElementById("btnToggleHighlights");
    const btnCopy = document.getElementById("btnCopyAudit");

    // Re-Scan Button
    btnRescan.addEventListener("click", () => {
        if (!currentTabId) return;

        btnRescan.classList.add("spin");
        chrome.tabs.sendMessage(currentTabId, { action: "triggerRescan" }, (response) => {
            setTimeout(() => {
                btnRescan.classList.remove("spin");
                loadPageSummary(currentTabId);
            }, 800);
        });
    });

    // Toggle Highlights Button
    btnToggle.addEventListener("click", () => {
        if (!currentTabId) return;

        chrome.tabs.sendMessage(currentTabId, { action: "toggleHighlightsVisibility" }, (response) => {
            if (response && response.success) {
                isHighlightsHidden = response.isHidden;
                const toggleText = document.getElementById("toggleText");
                toggleText.textContent = isHighlightsHidden ? "Show Marks" : "Hide Marks";
                btnToggle.classList.toggle("active", isHighlightsHidden);
            }
        });
    });

    // Copy Audit Report
    btnCopy.addEventListener("click", () => {
        if (!currentEvaluation) return;

        const auditMd = generateAuditMarkdown(currentEvaluation);
        navigator.clipboard.writeText(auditMd).then(() => {
            const originalTitle = btnCopy.title;
            btnCopy.style.borderColor = "#10b981";
            btnCopy.style.color = "#10b981";
            setTimeout(() => {
                btnCopy.style.borderColor = "";
                btnCopy.style.color = "";
            }, 1200);
        });
    });
}

function generateAuditMarkdown(evalData) {
    const breakdown = Object.entries(evalData.category_breakdown || {})
        .map(([k, v]) => `* **${k}:** ${v}`)
        .join("\n") || "None";

    return `# Dark-Guard Audit Report
* **Target URL:** ${evalData.page_url}
* **Safety Score:** ${evalData.safety_score} / 100 (Grade ${evalData.letter_grade})
* **Risk Level:** ${evalData.risk_level}
* **Total Dark Patterns Detected:** ${evalData.total_dark_patterns}
* **Summary:** ${evalData.summary_message}

### Category Breakdown
${breakdown}

*Generated by Dark-Guard Chrome Extension*`;
}

function animateValue(obj, start, end, duration) {
    if (isNaN(end)) {
        obj.textContent = "--";
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function renderEmptyState(message) {
    document.getElementById("safetyScore").textContent = "100";
    document.getElementById("letterGrade").textContent = "A";
    document.getElementById("riskBadge").textContent = "CLEAN / IDLE";
    document.getElementById("summaryMessage").textContent = message;
    document.getElementById("countTotal").textContent = "0";
    document.getElementById("categoryPills").innerHTML = `<div class="empty-hint">${message}</div>`;
}

function showError(msg) {
    document.getElementById("summaryMessage").textContent = msg;
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
