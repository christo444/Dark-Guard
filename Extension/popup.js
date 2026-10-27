const enabledToggle = document.querySelector("#enabled-toggle");
const scanButton = document.querySelector("#scan-button");
const clearButton = document.querySelector("#clear-button");
const status = document.querySelector("#status");

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) {
        throw new Error("No active tab found.");
    }

    return tab;
}

async function sendMessage(message) {
    const tab = await getActiveTab();

    try {
        return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
        console.error("Dark-Guard popup error:", error);
        throw new Error("Reload the page and try again.");
    }
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    enabledToggle.checked = enabled;
});

enabledToggle.addEventListener("change", async () => {
    const enabled = enabledToggle.checked;

    await chrome.storage.local.set({ enabled });

    try {
        await sendMessage({ type: "SET_ENABLED", enabled });
        status.textContent = enabled
            ? "Detection enabled"
            : "Detection disabled";
    } catch (error) {
        status.textContent = error.message;
    }
});

scanButton.addEventListener("click", async () => {
    status.textContent = "Scanning...";

    try {
        await sendMessage({ type: "SCAN_PAGE" });
        status.textContent = "Scan started";
    } catch (error) {
        status.textContent = error.message;
    }
});

clearButton.addEventListener("click", async () => {
    try {
        await sendMessage({ type: "CLEAR_HIGHLIGHTS" });
        status.textContent = "Highlights cleared";
    } catch (error) {
        status.textContent = error.message;
    }
});
