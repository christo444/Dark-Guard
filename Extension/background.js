// ============================================
// DARK-GUARD BACKGROUND SERVICE WORKER
// ============================================
// Bypasses Host Page CSP and Mixed Content Policies
// by executing HTTP requests outside of the page environment.

const API_URL = "http://localhost:8000/predict";
const IMAGE_API_URL = "http://localhost:8000/predict-image";
const BATCH_IMAGE_API_URL = "http://localhost:8000/predict-images";
const COUNTDOWN_API_URL = "http://localhost:8000/verify-countdown";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        console.log("Background received message:", request.action);
        let url = "";

        if (request.action === "predictText") {
            url = API_URL;
        } else if (request.action === "predictImage") {
            url = IMAGE_API_URL;
        } else if (request.action === "predictBatchImage") {
            url = BATCH_IMAGE_API_URL;
        } else if (request.action === "verifyCountdown") {
            url = COUNTDOWN_API_URL;
        } else {
            console.warn("Unknown action:", request.action);
            sendResponse({ success: false, error: "Unknown action" });
            return false;
        }

        console.log("Background fetching URL:", url);
        
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload)
        })
        .then(response => {
            console.log("Background fetch status:", response.status);
            if (!response.ok) {
                throw new Error(`Backend returned HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Background sending data back to content script");
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error("Background fetch failed:", error);
            sendResponse({ success: false, error: error.toString() });
        });

        return true; // Keeps the message channel open for async response
    } catch (err) {
        console.error("Background synchronous error:", err);
        sendResponse({ success: false, error: err.toString() });
        return false;
    }
});
