console.log("Dark-Guard extension loaded!");


// ============================================
// DARK-GUARD CONFIGURATION
// ============================================

const API_URL = "http://localhost:8000/predict";
const IMAGE_API_URL = "http://localhost:8000/predict-image";
const BATCH_IMAGE_API_URL = "http://localhost:8000/predict-images";
const COUNTDOWN_API_URL = "http://localhost:8000/verify-countdown";

const COUNTDOWN_OBSERVE_WINDOW_MS = 8000;
const TIME_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;
const COUNTDOWN_ATTR_PATTERN = /countdown|timer|clock|expir|deal-?end|sale-?end/i;

// Store text that has already been analyzed
const analyzedTexts = new Set();

// Store highlighted text
const highlightedTexts = new Set();

// Store images that have already been analyzed (by src or element ID)
const analyzedImages = new Set();

// Store images that have already been highlighted
const highlightedImages = new Set();

// Store countdown elements currently being tracked/already tracked this page load
const analyzedCountdowns = new Set();

// Store countdown elements already flagged as fake (by persistent selector)
const flaggedCountdowns = new Set();

// Ignore mutation records created by Dark-Guard highlights
const ignoredMutationTargets = new WeakSet();

// Used for MutationObserver debounce
let detectionTimeout = null;

function normalizeText(text) {
    return text
        .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<countdown>")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


// ============================================
// 1. EXTRACT TEXT FROM WEBPAGE
// ============================================

let textIntersectionObserver = null;

function initTextObserver() {
    if (textIntersectionObserver) return;
    
    textIntersectionObserver = new IntersectionObserver((entries) => {
        const visibleTexts = [];
        
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                textIntersectionObserver.unobserve(element);
                
                const candidateText = element.innerText?.trim();
                if (!candidateText || candidateText.length < 4 || candidateText.length > 500) return;
                
                const normalizedCandidateText = normalizeText(candidateText);
                if (!normalizedCandidateText || analyzedTexts.has(normalizedCandidateText)) return;
                
                // Prefer the smallest candidate
                const hasMeaningfulDescendant = [...element.querySelectorAll(
                    "p, span, div, button, a, h1, h2, h3, h4, h5, label"
                )].some(descendant => {
                    const descendantText = descendant.innerText?.trim();
                    const normalizedDescendantText = descendantText && normalizeText(descendantText);
                    return normalizedDescendantText && (
                        normalizedDescendantText === normalizedCandidateText ||
                        normalizedCandidateText.includes(normalizedDescendantText)
                    );
                });

                if (hasMeaningfulDescendant) return;

                // Find meaningful context container
                let container = element.parentElement;
                while (container && container !== document.body) {
                    const containerText = container.innerText?.trim();
                    if (containerText && containerText.length > 20 && containerText.length <= 1000) {
                        break;
                    }
                    if (containerText && containerText.length > 1000) {
                        container = container.firstElementChild || container;
                        break;
                    }
                    container = container.parentElement;
                }
                const contextText = (container ? container.innerText : candidateText).trim().substring(0, 1000).replace(/\s+/g, " ");

                analyzedTexts.add(normalizedCandidateText);
                visibleTexts.push({ candidate_text: candidateText, context: contextText });
            }
        });
        
        if (visibleTexts.length > 0) {
            // Deduplicate by candidate_text
            const uniqueMap = new Map();
            visibleTexts.forEach(item => {
                if (!uniqueMap.has(item.candidate_text)) {
                    uniqueMap.set(item.candidate_text, item);
                }
            });
            const uniqueTexts = Array.from(uniqueMap.values());

            console.log(`Dark-Guard: ${uniqueTexts.length} text snippet(s) became visible, scanning contextual blocks...`);
            checkDarkPatterns(uniqueTexts).then(results => {
                results.forEach(result => highlightDarkPattern(result));
            });
        }
    }, { rootMargin: "300px" });
}


// ============================================
// 2. SEND TEXT TO FASTAPI
// ============================================

async function checkDarkPatterns(texts) {
    return new Promise((resolve) => {
        console.log("Dark-Guard: Sending texts to backend via background script:", texts);
        chrome.runtime.sendMessage(
            { action: "predictText", payload: { texts: texts } },
            (response) => {
                console.error("[DEBUG Text] response is:", response, "lastError is:", chrome.runtime.lastError);
                if (chrome.runtime.lastError) {
                    console.error("Dark-Guard API Error (Text) - lastError:", chrome.runtime.lastError.message);
                    resolve([]);
                    return;
                }
                if (response && response.success) {
                    console.log("Dark-Guard: Text predictions response:", response.data);
                    resolve(response.data.results || []);
                } else {
                    console.error("Dark-Guard API Error (Text):", response ? JSON.stringify(response) : "undefined");
                    resolve([]);
                }
            }
        );
    });
}


// ============================================
// 3. HIGHLIGHT TEXT DARK PATTERN
// ============================================

function highlightDarkPattern(result) {
    // Only process actual dark patterns
    if (!result.is_dark_pattern) {
        return;
    }

    const targetText = result.candidate_text;
    const normalizedTargetText = normalizeText(targetText);

    if (highlightedTexts.has(normalizedTargetText)) {
        return;
    }

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {
        const nodeText = node.nodeValue;

        if (!nodeText || !nodeText.includes(targetText)) {
            return;
        }

        // Don't highlight our own generated elements
        if (node.parentElement?.closest(".dark-pattern-highlight")) {
            return;
        }

        const wasHighlighted = createHighlight(node, targetText, result);
        if (wasHighlighted) {
            highlightedTexts.add(normalizedTargetText);
        }
    });
}


// ============================================
// 4. CREATE TEXT HIGHLIGHT ELEMENT
// ============================================

function createHighlight(node, targetText, result) {
    const text = node.nodeValue;
    const index = text.indexOf(targetText);

    if (index === -1) {
        return false;
    }

    const before = text.substring(0, index);
    const after = text.substring(index + targetText.length);

    // Create highlight span
    const span = document.createElement("span");
    span.textContent = targetText;
    span.className = "dark-pattern-highlight";

    const confidence = (result.confidence * 100).toFixed(1);
    span.title = `Warning: ${result.category} tactic detected\nConfidence: ${confidence}%`;

    // Rebuild text nodes
    const fragment = document.createDocumentFragment();

    if (before) {
        fragment.appendChild(document.createTextNode(before));
    }

    fragment.appendChild(span);

    if (after) {
        fragment.appendChild(document.createTextNode(after));
    }

    // Replace original text
    if (node.parentNode) {
        ignoredMutationTargets.add(node.parentNode);
        node.parentNode.replaceChild(fragment, node);
        return true;
    }

    return false;
}


// ============================================
// 5. EXTRACT IMAGES FROM WEBPAGE
// ============================================

function getImageDataOrUrl(imgElement) {
    // Attempt to extract Base64 dataURL via canvas (fast, supports same-origin/data URIs)
    try {
        const w = imgElement.naturalWidth || imgElement.width || imgElement.clientWidth;
        const h = imgElement.naturalHeight || imgElement.height || imgElement.clientHeight;

        if (w > 0 && h > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(w, 1200); // Cap width to 1200 for fast OCR processing
            canvas.height = Math.round(h * (canvas.width / w));

            const ctx = canvas.getContext("2d");
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

            if (dataUrl && dataUrl.startsWith("data:image/")) {
                return dataUrl;
            }
        }
    } catch (e) {
        // Canvas tainted by CORS for cross-origin images
    }

    // Fall back to image URL so Python backend can fetch it directly
    return imgElement.currentSrc || imgElement.src;
}

let imageIntersectionObserver = null;

function initImageObserver() {
    if (imageIntersectionObserver) return;
    
    imageIntersectionObserver = new IntersectionObserver((entries) => {
        const visibleImages = [];
        
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                imageIntersectionObserver.unobserve(img); // Only scan once!
                
                // Assign unique tracking ID if not present
                if (!img.dataset.darkguardImgId) {
                    img.dataset.darkguardImgId = `dg-img-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                }

                const src = img.currentSrc || img.src;
                if (!src || analyzedImages.has(src)) {
                    return;
                }

                const imagePayload = getImageDataOrUrl(img);
                if (!imagePayload) {
                    return;
                }

                analyzedImages.add(src);
                visibleImages.push({
                    image_id: img.dataset.darkguardImgId,
                    image: imagePayload,
                    element: img
                });
            }
        });
        
        if (visibleImages.length > 0) {
            console.log(`Dark-Guard: ${visibleImages.length} image(s) became visible, scanning now...`);
            checkImageDarkPatterns(visibleImages).then(imageResults => {
                imageResults.forEach(imgResult => {
                    if (imgResult.has_dark_pattern) {
                        console.log("⚠️ DARK PATTERN (IMAGE):", imgResult);
                        highlightImageDarkPattern(imgResult);
                    }
                });
            });
        }
    }, { rootMargin: "300px" }); // Start scanning slightly before they appear on screen
}


// ============================================
// 6. SEND IMAGES TO FASTAPI FOR OCR + BERT
// ============================================

async function checkImageDarkPatterns(images) {
    if (images.length === 0) {
        return [];
    }

    const payload = images.map(item => ({
        image_id: item.image_id,
        image: item.image
    }));

    return new Promise((resolve) => {
        console.log(`Dark-Guard: Sending ${payload.length} image(s) to backend via background script...`);
        chrome.runtime.sendMessage(
            { action: "predictBatchImage", payload: { images: payload } },
            (response) => {
                console.error("[DEBUG Image] response is:", response, "lastError is:", chrome.runtime.lastError);
                if (chrome.runtime.lastError) {
                    console.error("Dark-Guard API Error (Image) - lastError:", chrome.runtime.lastError.message);
                    resolve([]);
                    return;
                }
                if (response && response.success) {
                    console.log("Dark-Guard: Batch image response:", response.data);
                    resolve(response.data.results || []);
                } else {
                    console.error("Dark-Guard API Error (Image):", response ? JSON.stringify(response) : "undefined");
                    resolve([]);
                }
            }
        );
    });
}


// ============================================
// 7. HIGHLIGHT IMAGE DARK PATTERN
// ============================================

function highlightImageDarkPattern(result) {
    if (!result || !result.has_dark_pattern || !result.detections) {
        return;
    }

    const imgId = result.image_id;
    if (!imgId || highlightedImages.has(imgId)) {
        return;
    }

    const imgElement = document.querySelector(`img[data-darkguard-img-id="${imgId}"]`);
    if (!imgElement) {
        return;
    }

    const darkDetections = result.detections.filter(d => d.is_dark_pattern);
    if (darkDetections.length === 0) {
        return;
    }

    // Mark as highlighted to prevent re-processing
    highlightedImages.add(imgId);

    // 1. Highlight the image border and glow
    imgElement.classList.add("dark-pattern-img-highlight");

    // 2. Format tooltip text
    const tooltipText = darkDetections.map(d => {
        const confPercent = (d.confidence * 100).toFixed(1);
        const ocrPercent = (d.ocr_confidence * 100).toFixed(1);
        return `⚠️ Warning: ${d.category} detected in image!\nText: "${d.text}"\nConfidence: ${confPercent}% (OCR: ${ocrPercent}%)`;
    }).join("\n\n");

    imgElement.title = tooltipText;

    // 3. Ensure parent element supports absolute overlays
    const parent = imgElement.parentElement;
    if (parent) {
        ignoredMutationTargets.add(parent);

        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === "static") {
            parent.style.position = "relative";
        }

        // 4. Create floating warning badge on top of image
        const badge = document.createElement("div");
        badge.className = "dark-pattern-img-badge";
        badge.textContent = `⚠️ ${darkDetections[0].category}`;
        badge.title = tooltipText;
        parent.appendChild(badge);

        // Position badge over image
        const imgRect = imgElement.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const offsetX = imgRect.left - parentRect.left;
        const offsetY = imgRect.top - parentRect.top;

        badge.style.left = `${Math.max(0, offsetX + 6)}px`;
        badge.style.top = `${Math.max(0, offsetY + 6)}px`;

        // 5. Draw bounding box overlays for detected text coordinates
        darkDetections.forEach(det => {
            if (det.coordinates && det.coordinates.length >= 4) {
                const xs = det.coordinates.map(p => p[0]);
                const ys = det.coordinates.map(p => p[1]);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                const naturalW = imgElement.naturalWidth || imgElement.clientWidth || 1;
                const naturalH = imgElement.naturalHeight || imgElement.clientHeight || 1;
                const scaleX = imgElement.clientWidth / naturalW;
                const scaleY = imgElement.clientHeight / naturalH;

                const overlay = document.createElement("div");
                overlay.className = "dark-pattern-bbox-overlay";
                overlay.style.left = `${offsetX + minX * scaleX}px`;
                overlay.style.top = `${offsetY + minY * scaleY}px`;
                overlay.style.width = `${(maxX - minX) * scaleX}px`;
                overlay.style.height = `${(maxY - minY) * scaleY}px`;
                overlay.title = `Text: "${det.text}" (${det.category} - ${(det.confidence * 100).toFixed(1)}%)`;

                parent.appendChild(overlay);
            }
        });
    }
}


// ============================================
// 8. EXTRACT COUNTDOWN TIMERS
// ============================================

function parseTimeToSeconds(text) {
    const match = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) {
        return null;
    }

    const parts = match.slice(1).filter(Boolean).map(Number);

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return null;
}

// A lightweight, mostly-stable selector used as a storage key so we can
// recognize "the same timer" across page reloads/navigations, separate
// from the random per-load dataset id used to avoid re-tracking within
// a single page session.
function generatePersistentSelector(el) {
    if (el.id) {
        return `#${el.id}`;
    }

    const path = [];
    let node = el;

    while (node && node.nodeType === 1 && path.length < 5) {
        let selector = node.tagName.toLowerCase();

        if (node.className && typeof node.className === "string") {
            const cls = node.className.trim().split(/\s+/).slice(0, 2).join(".");
            if (cls) {
                selector += `.${cls}`;
            }
        }

        const parent = node.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === node.tagName);
            if (siblings.length > 1) {
                selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
            }
        }

        path.unshift(selector);
        node = node.parentElement;
    }

    return path.join(" > ");
}

function findCandidateCountdowns() {
    const elements = document.querySelectorAll("body *");
    const candidates = [];

    elements.forEach(el => {
        // Prefer leaf-ish elements; skip anything already being tracked
        if (el.children.length > 3) {
            return;
        }
        if (el.dataset.darkguardCountdownId) {
            return;
        }

        const idClass = `${el.id} ${el.className}`;
        const text = el.innerText?.trim();

        if (!text || text.length > 60) {
            return;
        }

        const matchesHint = COUNTDOWN_ATTR_PATTERN.test(idClass) || TIME_PATTERN.test(text);
        if (!matchesHint) {
            return;
        }

        // Must actually parse to a live clock value, not just contain digits
        if (parseTimeToSeconds(text) === null) {
            return;
        }

        candidates.push(el);
    });

    return candidates;
}


// ============================================
// 9. BEHAVIORAL VERIFICATION (OBSERVE + SCORE)
// ============================================

function getCountdownStorageKey(persistentSelector) {
    return `darkguard_countdown_${location.hostname}_${persistentSelector}`;
}

// Falls back to an in-memory store when running outside a real extension
// context (e.g. index.html's own <script src="../Extension/content.js">
// tag, opened without the extension loaded). This keeps content.js from
// throwing on `chrome is not defined` in that mode. The trade-off: without
// real chrome.storage, nothing persists across an actual page reload, so
// reset-on-reload detection only works when the real extension is loaded.
const hasExtensionStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
const inMemoryCountdownStore = {};

function loadPriorCountdownRecord(persistentSelector) {
    const key = getCountdownStorageKey(persistentSelector);

    if (!hasExtensionStorage) {
        return Promise.resolve(inMemoryCountdownStore[key] || null);
    }

    return new Promise(resolve => {
        chrome.storage.local.get([key], res => resolve(res[key] || null));
    });
}

function saveCountdownRecord(persistentSelector, record) {
    const key = getCountdownStorageKey(persistentSelector);

    if (!hasExtensionStorage) {
        inMemoryCountdownStore[key] = record;
        return;
    }

    chrome.storage.local.set({ [key]: record });
}

function detectLoopOrJump(readings) {
    for (let i = 1; i < readings.length; i++) {
        const delta = readings[i].seconds - readings[i - 1].seconds;
        if (delta > 1) return true;   // ticked upward -> loop/reset
        if (delta < -5) return true;  // dropped far more than elapsed time
    }
    return false;
}

function scanStorageForDeadline(approxTargetEpoch) {
    // Look for a plausible real target timestamp in localStorage/sessionStorage,
    // within +/- 60s of what this countdown implies (handles both
    // second-based and millisecond-based epoch timestamps).
    const stores = [localStorage, sessionStorage];

    for (const store of stores) {
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            const val = store.getItem(key);
            const num = Number(val);
            if (!Number.isFinite(num)) continue;

            const asMs = num > 1e12 ? num : num * 1000;
            if (Math.abs(asMs - approxTargetEpoch) < 60000) {
                return true;
            }
        }
    }
    return false;
}

function trackCountdownElement(el) {
    const countdownId = `dg-countdown-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    el.dataset.darkguardCountdownId = countdownId;
    analyzedCountdowns.add(countdownId);

    const startText = el.innerText?.trim() || "";
    const startSeconds = parseTimeToSeconds(startText);
    if (startSeconds === null) {
        return;
    }

    const startTime = Date.now();
    const readings = [{ seconds: startSeconds, t: startTime }];

    const localObserver = new MutationObserver(() => {
        const seconds = parseTimeToSeconds(el.innerText?.trim() || "");
        if (seconds !== null) {
            readings.push({ seconds, t: Date.now() });
        }
    });

    localObserver.observe(el, { childList: true, characterData: true, subtree: true });

    setTimeout(async () => {
        localObserver.disconnect();
        await analyzeCountdown(el, startSeconds, startTime, readings);
    }, COUNTDOWN_OBSERVE_WINDOW_MS);
}

async function analyzeCountdown(el, startSeconds, startTime, readings) {
    const now = Date.now();
    const elapsedSec = (now - startTime) / 1000;
    const expectedRemaining = startSeconds - elapsedSec;
    const lastReading = readings[readings.length - 1];
    const observedRemaining = lastReading ? lastReading.seconds : startSeconds;

    const persistentSelector = generatePersistentSelector(el);
    const approxTargetEpoch = startTime + startSeconds * 1000;

    const persistedDeadlineFound = scanStorageForDeadline(approxTargetEpoch);
    const loopedOrJumped = detectLoopOrJump(readings);

    // Compare against what we recorded last time we saw this element on
    // this site, to catch "resets to full time every reload" timers.
    const prior = await loadPriorCountdownRecord(persistentSelector);
    let resetOnReload = false;

    if (prior && prior.observedRemaining !== undefined) {
        const timeSincePrior = (now - prior.lastSeenAt) / 1000;
        const shouldHaveRemaining = prior.observedRemaining - timeSincePrior;
        if (shouldHaveRemaining > 5 && startSeconds > shouldHaveRemaining + 15) {
            resetOnReload = true;
        }
    }

    saveCountdownRecord(persistentSelector, {
        startSeconds,
        observedRemaining,
        lastSeenAt: now
    });

    const evidence = {
        reset_on_reload: resetOnReload,
        persisted_deadline_found: persistedDeadlineFound,
        looped_or_jumped: loopedOrJumped,
        no_consequence_at_zero: false, // TODO: needs a longer-running zero-crossing watcher
        initial_value_seconds: startSeconds,
        observed_remaining_seconds: observedRemaining,
        expected_remaining_seconds: expectedRemaining
    };

    await verifyCountdown(el, persistentSelector, evidence);
}

async function verifyCountdown(el, persistentSelector, evidence) {
    return new Promise((resolve) => {
        console.log("Dark-Guard: Sending countdown evidence to backend via background script:", evidence);
        const payload = {
            page_url: location.href,
            element_selector: persistentSelector,
            evidence,
            element_text_sample: (el.innerText || "").trim().slice(0, 60)
        };
        chrome.runtime.sendMessage(
            { action: "verifyCountdown", payload: payload },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Dark-Guard API Error (Countdown) - lastError:", chrome.runtime.lastError.message);
                    resolve();
                    return;
                }
                if (response && response.success) {
                    const result = response.data;
                    console.log("Dark-Guard: Countdown verification response:", result);

                    if (result.is_dark_pattern) {
                        console.log("⚠️ DARK PATTERN (COUNTDOWN):", result);
                        highlightCountdownDarkPattern(el, persistentSelector, result);
                    }
                } else {
                    console.error("Dark-Guard API Error (Countdown):", response?.error);
                }
                resolve();
            }
        );
    });
}


// ============================================
// 10. HIGHLIGHT COUNTDOWN DARK PATTERN
// ============================================

function highlightCountdownDarkPattern(el, persistentSelector, result) {
    if (flaggedCountdowns.has(persistentSelector)) {
        return;
    }
    flaggedCountdowns.add(persistentSelector);

    // 1. Outline the timer element itself
    el.classList.add("dark-pattern-countdown-highlight");

    const confidence = (result.confidence * 100).toFixed(1);
    const tooltipText = `⚠️ Warning: Fake countdown detected!\nConfidence: ${confidence}%`;
    el.title = tooltipText;

    // 2. Float a badge near it, same approach as the image badge
    const parent = el.parentElement;
    if (!parent) {
        return;
    }

    ignoredMutationTargets.add(parent);

    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === "static") {
        parent.style.position = "relative";
    }

    const badge = document.createElement("div");
    badge.className = "dark-pattern-countdown-badge";
    badge.textContent = "⚠️ Fake Countdown";
    badge.title = tooltipText;
    parent.appendChild(badge);

    const elRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const offsetX = elRect.left - parentRect.left;
    const offsetY = elRect.top - parentRect.top;

    badge.style.left = `${Math.max(0, offsetX)}px`;
    badge.style.top = `${Math.max(0, offsetY - 20)}px`;
}


// ============================================
// 11. TEXT DETECTOR RUNNER
// ============================================

async function runTextDetector() {
    initTextObserver();

    const elements = document.querySelectorAll(
        "p, span, div, button, a, h1, h2, h3, h4, h5, label"
    );
    let queuedCount = 0;

    elements.forEach(el => {
        if (!el.dataset.darkguardTextObserved) {
            el.dataset.darkguardTextObserved = "true";
            textIntersectionObserver.observe(el);
            queuedCount++;
        }
    });

    if (queuedCount > 0) {
        console.log(`Dark-Guard: Queued ${queuedCount} text element(s) for lazy scanning...`);
    }
}


// ============================================
// 12. IMAGE DETECTOR RUNNER
// ============================================

async function runImageDetector() {
    initImageObserver();

    const imgElements = document.querySelectorAll("img");
    let queuedCount = 0;
    
    imgElements.forEach((img) => {
        const width = img.naturalWidth || img.width || img.clientWidth;
        const height = img.naturalHeight || img.height || img.clientHeight;

        // Ignore tiny utility icons, tracking pixels, bullets (<40px)
        if (width > 0 && height > 0 && (width < 40 || height < 40)) {
            return;
        }

        if (!img.dataset.darkguardObserved) {
            img.dataset.darkguardObserved = "true";
            imageIntersectionObserver.observe(img);
            queuedCount++;
        }
    });
    
    if (queuedCount > 0) {
        console.log(`Dark-Guard: Queued ${queuedCount} image(s) for lazy scanning...`);
    }
}


// ============================================
// 13. COUNTDOWN DETECTOR RUNNER
// ============================================

async function runCountdownDetector() {
    const candidates = findCandidateCountdowns();

    if (candidates.length === 0) {
        return;
    }

    console.log("Dark-Guard: Candidate countdown timers to observe:", candidates.length);

    // Fire-and-forget: each candidate observes itself for ~8s in the
    // background and reports in asynchronously, so this doesn't block
    // the rest of the detection pipeline.
    candidates.forEach(el => trackCountdownElement(el));
}


// ============================================
// 14. MAIN DETECTOR (FUSION PIPELINE)
// ============================================

async function runDetector() {
    console.log("Dark-Guard: Scanning webpage for text and countdown timers (Image scanning temporarily disabled)...");

    await Promise.allSettled([
        runTextDetector(),
        // runImageDetector(), // Temporarily disabled as requested
        runCountdownDetector()
    ]);
}


// ============================================
// 15. INITIAL SCAN
// ============================================

runDetector();


// ============================================
// 16. MUTATION OBSERVER
// ============================================

const observer = new MutationObserver(mutations => {
    const ignoredTargetsInBatch = new Set();

    const hasExternalMutation = mutations.some(mutation => {
        if (ignoredMutationTargets.has(mutation.target)) {
            ignoredTargetsInBatch.add(mutation.target);
            return false;
        }

        const isInsideHighlight = mutation.target.parentElement?.closest(
            ".dark-pattern-highlight, .dark-pattern-img-highlight, .dark-pattern-img-badge, .dark-pattern-bbox-overlay, .dark-pattern-countdown-highlight, .dark-pattern-countdown-badge"
        );

        return !isInsideHighlight;
    });

    ignoredTargetsInBatch.forEach(target => {
        ignoredMutationTargets.delete(target);
    });

    if (!hasExternalMutation) {
        return;
    }

    // Cancel previous timer
    clearTimeout(detectionTimeout);

    // Wait 1 second before re-scanning
    detectionTimeout = setTimeout(() => {
        console.log("Dark-Guard: Page content changed, re-scanning...");
        runDetector();
    }, 1000);
});

// Watch webpage for changes
observer.observe(
    document.body,
    {
        childList: true,
        subtree: true,
        characterData: true
    }
);