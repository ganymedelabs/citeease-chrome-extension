function injectScript(): void {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.bundle.js");
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
}

async function sendMessages(): Promise<void> {
    const icon: string = chrome.runtime.getURL("images/icon-48.png");
    const dialogStyle: string = chrome.runtime.getURL("citeease-dialog.css");
    const buttonStyle: string = chrome.runtime.getURL("citeease-button.css");
    const menuStyle: string = chrome.runtime.getURL("citeease-menu.css");
    const styles: string = chrome.runtime.getURL("json/styles.json");
    const locales: string = chrome.runtime.getURL("json/locales.json");

    const getCurrentTabURL = (): Promise<string | null> => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_TAB_URL" }, (response: { url: string | null }) => {
                if (response && response.url) {
                    resolve(response.url);
                } else {
                    console.error("Failed to fetch current tab URL:", response);
                    resolve(null);
                }
            });
        });
    };

    window.addEventListener("message", async (event: MessageEvent) => {
        if (event.data.type === "GET_URL") {
            const currentTab = await getCurrentTabURL();
            window.postMessage(
                {
                    type: "SET_URL",
                    icon,
                    dialogStyle,
                    buttonStyle,
                    menuStyle,
                    styles,
                    locales,
                    currentTab,
                },
                "*"
            );
        }
    });

    window.addEventListener("FROM_INJECTED", async (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customEvent = event as CustomEvent<{ action: string; key: string; value?: any }>;

        const { action, key, value } = customEvent.detail;

        if (action === "SAVE") {
            await chrome.storage.local.set({ [key]: value });
            window.dispatchEvent(new CustomEvent("FROM_EXTENSION", { detail: { action: "SAVE", key, success: true } }));
        }

        if (action === "LOAD") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chrome.storage.local.get([key], (result: Record<string, any>) => {
                const value = result[key];
                window.dispatchEvent(new CustomEvent("FROM_EXTENSION", { detail: { action: "LOAD", key, value } }));
            });
        }
    });
}

injectScript();
sendMessages();
