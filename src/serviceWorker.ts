chrome.runtime.onMessage.addListener(
    // eslint-disable-next-line no-unused-vars
    (message: { type: string }, sender, sendResponse: (response: { url: string | undefined }) => void) => {
        if (message.type === "GET_TAB_URL") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                sendResponse({ url: activeTab ? activeTab.url : undefined });
            });
            return true;
        }
    }
);
