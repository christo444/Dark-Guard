console.log("Dark-Guard extension loaded!");


// ============================================
// DARK-GUARD CONFIGURATION
// ============================================

const API_URL = "http://localhost:8000/predict";
const IMAGE_API_URL = "http://localhost:8000/predict-image";
const BATCH_IMAGE_API_URL = "http://localhost:8000/predict-images";

// Store text that has already been analyzed
const analyzedTexts = new Set();

// Store highlighted text
const highlightedTexts = new Set();

// Store images that have already been analyzed (by src or element ID)
const analyzedImages = new Set();

// Store images that have already been highlighted
const highlightedImages = new Set();

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

function extractTexts() {
    const elements = document.querySelectorAll(
        "p, span, div, button, a, h1, h2, h3, h4, h5, label"
    );

    const texts = [];
    const normalizedTexts = new Set();

    elements.forEach(element => {
        const text = element.innerText?.trim();

        // Ignore empty text
        if (!text) {
            return;
        }

        // Ignore very short text
        if (text.length < 4) {
            return;
        }

        // Ignore extremely large sections
        if (text.length > 500) {
            return;
        }

        const normalizedText = normalizeText(text);

        if (!normalizedText || normalizedTexts.has(normalizedText)) {
            return;
        }

        // Prefer the smallest candidate containing this visible message.
        const hasMeaningfulDescendant = [...element.querySelectorAll(
            "p, span, div, button, a, h1, h2, h3, h4, h5, label"
        )].some(descendant => {
            const descendantText = descendant.innerText?.trim();
            const normalizedDescendantText = descendantText && normalizeText(descendantText);
            return normalizedDescendantText && (
                normalizedDescendantText === normalizedText ||
                normalizedText.includes(normalizedDescendantText)
            );
        });

        if (hasMeaningfulDescendant) {
            return;
        }

        normalizedTexts.add(normalizedText);
        texts.push(text);
    });

    // Remove duplicate text
    return [...new Set(texts)];
}


// ============================================
// 2. SEND TEXT TO FASTAPI
// ============================================

async function checkDarkPatterns(texts) {
    try {
        console.log("Dark-Guard: Sending texts to backend:", texts);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ texts: texts })
        });

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("Dark-Guard: Text predictions response:", data);
        return data.results || [];

    } catch (error) {
        console.error("Dark-Guard API Error (Text):", error);
        return [];
    }
}


// ============================================
// 3. HIGHLIGHT TEXT DARK PATTERN
// ============================================

function highlightDarkPattern(result) {
    // Only process actual dark patterns
    if (!result.is_dark_pattern) {
        return;
    }

    const targetText = result.text;
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

function extractImages() {
    const imgElements = document.querySelectorAll("img");
    const candidates = [];

    imgElements.forEach((img, idx) => {
        // Skip hidden or unrendered images
        const width = img.naturalWidth || img.width || img.clientWidth;
        const height = img.naturalHeight || img.height || img.clientHeight;

        // Ignore tiny utility icons, tracking pixels, bullets (<40px)
        if (width < 40 || height < 40) {
            return;
        }

        const src = img.currentSrc || img.src;
        if (!src) {
            return;
        }

        // Avoid re-scanning same image src
        if (analyzedImages.has(src)) {
            return;
        }

        // Assign unique tracking ID if not present
        if (!img.dataset.darkguardImgId) {
            img.dataset.darkguardImgId = `dg-img-${Date.now()}-${idx}`;
        }

        const imagePayload = getImageDataOrUrl(img);
        if (!imagePayload) {
            return;
        }

        analyzedImages.add(src);
        candidates.push({
            image_id: img.dataset.darkguardImgId,
            image: imagePayload,
            element: img
        });
    });

    return candidates;
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

    try {
        console.log(`Dark-Guard: Sending ${payload.length} image(s) to backend...`);

        // Try batch endpoint first
        const batchResponse = await fetch(BATCH_IMAGE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ images: payload })
        });

        if (batchResponse.ok) {
            const data = await batchResponse.json();
            console.log("Dark-Guard: Batch image response:", data);
            return data.results || [];
        }

        console.warn(`Dark-Guard: Batch endpoint returned ${batchResponse.status}, falling back to single endpoint...`);
    } catch (err) {
        console.warn("Dark-Guard: Batch image request failed, trying single endpoint fallback...", err);
    }

    // Fallback: send one by one to /predict-image (Option B from gloria.md)
    const results = [];
    for (const item of payload) {
        try {
            const response = await fetch(IMAGE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(item)
            });

            if (response.ok) {
                const resData = await response.json();
                results.push(resData);
            }
        } catch (singleErr) {
            console.error(`Dark-Guard: Error predicting image ${item.image_id}:`, singleErr);
        }
    }

    return results;
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
// 8. TEXT DETECTOR RUNNER
// ============================================

async function runTextDetector() {
    const allTexts = extractTexts();
    const newTexts = allTexts.filter(text => !analyzedTexts.has(normalizeText(text)));

    if (newTexts.length === 0) {
        return;
    }

    console.log("Dark-Guard: New texts to analyze:", newTexts.length);

    newTexts.forEach(text => analyzedTexts.add(normalizeText(text)));

    const results = await checkDarkPatterns(newTexts);

    results.forEach(result => {
        if (result.is_dark_pattern) {
            console.log("⚠️ DARK PATTERN (TEXT):", result);
            highlightDarkPattern(result);
        }
    });
}


// ============================================
// 9. IMAGE DETECTOR RUNNER
// ============================================

async function runImageDetector() {
    const candidateImages = extractImages();

    if (candidateImages.length === 0) {
        return;
    }

    console.log("Dark-Guard: Candidate images to analyze:", candidateImages.length);

    const imageResults = await checkImageDarkPatterns(candidateImages);

    imageResults.forEach(imgResult => {
        if (imgResult.has_dark_pattern) {
            console.log("⚠️ DARK PATTERN (IMAGE):", imgResult);
            highlightImageDarkPattern(imgResult);
        }
    });
}


// ============================================
// 10. MAIN DETECTOR (FUSION PIPELINE)
// ============================================

async function runDetector() {
    console.log("Dark-Guard: Scanning webpage for text and images...");

    await Promise.allSettled([
        runTextDetector(),
        runImageDetector()
    ]);
}


// ============================================
// 11. INITIAL SCAN
// ============================================

runDetector();


// ============================================
// 12. MUTATION OBSERVER
// ============================================

const observer = new MutationObserver(mutations => {
    const ignoredTargetsInBatch = new Set();

    const hasExternalMutation = mutations.some(mutation => {
        if (ignoredMutationTargets.has(mutation.target)) {
            ignoredTargetsInBatch.add(mutation.target);
            return false;
        }

        const isInsideHighlight = mutation.target.parentElement?.closest(
            ".dark-pattern-highlight, .dark-pattern-img-highlight, .dark-pattern-img-badge, .dark-pattern-bbox-overlay"
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