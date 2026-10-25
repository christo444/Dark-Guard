// ============================================
// DARK-GUARD POPUP CONTROLLER
// ============================================

let currentTabId = null;
let currentSummaryData = null;
let currentPatterns = [];
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

    // Format all patterns
    const patternPayload = [
        ...textItems.map(t => ({ category: t.category, text_or_target: t.text, confidence: t.confidence, source: "text" })),
        ...imageItems.map(i => ({ category: i.category, text_or_target: i.text, confidence: i.confidence, source: "image" })),
        ...timerItems.map(c => ({ category: c.category, text_or_target: c.text, confidence: c.confidence, source: "countdown" }))
    ];
    currentPatterns = patternPayload;

    // Update Status Card
    const statusCard = document.getElementById("statusCard");
    const statusBadge = document.getElementById("statusBadge");
    const statusMessage = document.getElementById("statusMessage");

    if (totalCount > 0) {
        statusCard.classList.add("has-detections");
        statusBadge.textContent = "THREATS DETECTED";
        statusMessage.textContent = `${totalCount} deceptive dark pattern(s) identified on this page.`;
    } else {
        statusCard.classList.remove("has-detections");
        statusBadge.textContent = "PAGE CLEAN";
        statusMessage.textContent = "No deceptive marketing or dark patterns found on this page.";
    }

    // Build Category Breakdown
    const categoryBreakdown = {};
    patternPayload.forEach(item => {
        const cat = item.category;
        if (!cat || cat === "Not Dark Pattern") return;
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    renderCategoryPills(categoryBreakdown);
    renderDetectionsFeed(patternPayload);
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
        const pill = document.createElement("div");
        pill.className = `category-pill cat-default`;
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
        const confPct = Math.round((item.confidence || 0.95) * 100);

        const card = document.createElement("div");
        card.className = "detection-item";

        const sourceIcon = item.source === "image" ? "🖼️ Image" : item.source === "countdown" ? "⏱️ Timer" : "🔤 Text";

        card.innerHTML = `
            <div class="item-header">
                <span class="item-category">${item.category}</span>
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
        if (!currentSummaryData) return;

        const auditMd = generateAuditMarkdown(currentSummaryData, currentPatterns);
        navigator.clipboard.writeText(auditMd).then(() => {
            btnCopy.style.borderColor = "#10b981";
            btnCopy.style.color = "#10b981";
            setTimeout(() => {
                btnCopy.style.borderColor = "";
                btnCopy.style.color = "";
            }, 1200);
        });
    });
}

function generateAuditMarkdown(summary, patterns) {
    const breakdown = {};
    patterns.forEach(p => {
        breakdown[p.category] = (breakdown[p.category] || 0) + 1;
    });

    const breakdownText = Object.entries(breakdown)
        .map(([k, v]) => `* **${k}:** ${v}`)
        .join("\n") || "None";

    const itemsText = patterns.map((p, idx) => {
        return `${idx + 1}. [${p.source.toUpperCase()}] **${p.category}** (${Math.round((p.confidence || 0.95) * 100)}%): "${p.text_or_target}"`;
    }).join("\n") || "No dark patterns detected.";

    return `# Dark-Guard Audit Report
* **Target URL:** ${summary.url}
* **Domain:** ${summary.hostname || "Active Page"}
* **Total Dark Patterns Detected:** ${patterns.length}

### Category Breakdown
${breakdownText}

### Detailed Detections
${itemsText}

*Generated by Dark-Guard Chrome Extension*`;
}

function renderEmptyState(message) {
    const statusCard = document.getElementById("statusCard");
    const statusBadge = document.getElementById("statusBadge");
    const statusMessage = document.getElementById("statusMessage");

    if (statusCard) statusCard.classList.remove("has-detections");
    if (statusBadge) statusBadge.textContent = "IDLE";
    if (statusMessage) statusMessage.textContent = message;

    const countTotal = document.getElementById("countTotal");
    const countText = document.getElementById("countText");
    const countImages = document.getElementById("countImages");
    const countTimers = document.getElementById("countTimers");
    const categoryPills = document.getElementById("categoryPills");

    if (countTotal) countTotal.textContent = "0";
    if (countText) countText.textContent = "0";
    if (countImages) countImages.textContent = "0";
    if (countTimers) countTimers.textContent = "0";
    if (categoryPills) categoryPills.innerHTML = `<div class="empty-hint">${message}</div>`;
}

function showError(msg) {
    const statusMessage = document.getElementById("statusMessage");
    if (statusMessage) statusMessage.textContent = msg;
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
