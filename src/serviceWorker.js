chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_TAB_URL") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            if (activeTab) {
                sendResponse({ url: activeTab.url });
            } else {
                sendResponse({ url: null });
            }
        });
        return true;
    }
});
