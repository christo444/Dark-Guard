console.log("Dark-Guard extension loaded!");


// ============================================
// DARK-GUARD CONFIGURATION
// ============================================

const API_URL = "http://localhost:8000/predict";


// Store text that has already been analyzed
const analyzedTexts = new Set();

// Store highlighted text
const highlightedTexts = new Set();

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

        console.log(
            "Sending texts to backend:",
            texts
        );


        const response = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    texts: texts
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );

        }


        const data = await response.json();


        console.log(
            "Backend response:",
            data
        );


        return data.results || [];


    } catch (error) {

        console.error(
            "Dark-Guard API Error:",
            error
        );

        return [];
    }
}


// ============================================
// 3. HIGHLIGHT DARK PATTERN
// ============================================

function highlightDarkPattern(result) {

    // Only process actual dark patterns
    if (!result.is_dark_pattern) {
        return;
    }


    const targetText = result.text;


    // Prevent highlighting the same text twice
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

        textNodes.push(
            walker.currentNode
        );

    }


    textNodes.forEach(node => {

        const nodeText = node.nodeValue;


        if (!nodeText) {
            return;
        }


        if (!nodeText.includes(targetText)) {
            return;
        }


        // Don't highlight our own generated elements
        if (node.parentElement?.closest(".dark-pattern-highlight")) {
            return;
        }


        const wasHighlighted = createHighlight(
            node,
            targetText,
            result
        );

        if (wasHighlighted) {
            highlightedTexts.add(normalizedTargetText);
        }

    });
}


// ============================================
// 4. CREATE HIGHLIGHT ELEMENT
// ============================================

function createHighlight(
    node,
    targetText,
    result
) {

    const text = node.nodeValue;


    const index = text.indexOf(
        targetText
    );


    if (index === -1) {
        return;
    }


    const before =
        text.substring(
            0,
            index
        );


    const after =
        text.substring(
            index + targetText.length
        );


    // Create highlight span
    const span =
        document.createElement("span");


    span.textContent =
        targetText;


    span.className =
        "dark-pattern-highlight";


    // ========================================
    // Tooltip
    // ========================================

    const confidence =
        (result.confidence * 100).toFixed(1);


    span.title =
        `Warning: ${result.category} tactic detected\n` +
        `Confidence: ${confidence}%`;


    // ========================================
    // Rebuild the text
    // ========================================

    const fragment =
        document.createDocumentFragment();


    if (before) {

        fragment.appendChild(
            document.createTextNode(before)
        );

    }


    fragment.appendChild(span);


    if (after) {

        fragment.appendChild(
            document.createTextNode(after)
        );

    }


    // Replace original text
    if (node.parentNode) {

        ignoredMutationTargets.add(node.parentNode);

        node.parentNode.replaceChild(
            fragment,
            node
        );

        return true;
    }


    return false;
}


// ============================================
// 5. MAIN DETECTOR
// ============================================

async function runDetector() {

    console.log(
        "Dark-Guard: Scanning webpage..."
    );


    // Extract all webpage text
    const allTexts =
        extractTexts();


    console.log(
        "Extracted texts:",
        allTexts.length
    );


    // Only send NEW text to backend
    const newTexts =
        allTexts.filter(
            text =>
                !analyzedTexts.has(normalizeText(text))
        );


    if (newTexts.length === 0) {

        console.log(
            "Dark-Guard: No new text."
        );

        return;
    }


    console.log(
        "New texts to analyze:",
        newTexts.length
    );


    // Mark texts as analyzed
    newTexts.forEach(
        text =>
            analyzedTexts.add(normalizeText(text))
    );


    // Send to FastAPI
    const results =
        await checkDarkPatterns(
            newTexts
        );


    console.log(
        "Predictions:",
        results
    );


    // Process predictions
    results.forEach(result => {

        if (result.is_dark_pattern) {

            console.log(
                "⚠️ DARK PATTERN:",
                result
            );


            highlightDarkPattern(
                result
            );

        }

    });

}


// ============================================
// 6. INITIAL PAGE SCAN
// ============================================

runDetector();


// ============================================
// 7. MUTATION OBSERVER
// ============================================

const observer =
    new MutationObserver(mutations => {

        const ignoredTargetsInBatch = new Set();

        const hasExternalMutation = mutations.some(mutation => {

            if (ignoredMutationTargets.has(mutation.target)) {
                ignoredTargetsInBatch.add(mutation.target);
                return false;
            }

            return !mutation.target.parentElement?.closest(
                ".dark-pattern-highlight"
            );
        });

        ignoredTargetsInBatch.forEach(target => {
            ignoredMutationTargets.delete(target);
        });

        if (!hasExternalMutation) {
            return;
        }

        // Cancel previous timer
        clearTimeout(
            detectionTimeout
        );


        // Wait 1 second before scanning
        detectionTimeout =
            setTimeout(() => {

                console.log(
                    "Dark-Guard: Page changed."
                );


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