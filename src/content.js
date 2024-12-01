function injectScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.bundle.js");
    script.onload = function () {
        this.remove();
    };
    document.documentElement.appendChild(script);
}

async function sendMessages() {
    const icon = chrome.runtime.getURL("images/icon-48.png");
    const dialogStyle = chrome.runtime.getURL("citeease-dialog.css");
    const buttonStyle = chrome.runtime.getURL("citeease-button.css");
    const menuStyle = chrome.runtime.getURL("citeease-menu.css");
    const styles = chrome.runtime.getURL("json/styles.json");
    const locales = chrome.runtime.getURL("json/locales.json");

    const getCurrentTabURL = () => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_TAB_URL" }, (response) => {
                if (response && response.url) {
                    resolve(response.url);
                } else {
                    console.error("Failed to fetch current tab URL:", response);
                    resolve(null);
                }
            });
        });
    };

    window.addEventListener("message", async (event) => {
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

    window.addEventListener("FROM_INJECTED", async (event) => {
        const { action, key, value } = event.detail;

        if (action === "SAVE") {
            await chrome.storage.local.set({ [key]: value });
            window.dispatchEvent(new CustomEvent("FROM_EXTENSION", { detail: { action: "SAVE", key, success: true } }));
        }

        if (action === "LOAD") {
            chrome.storage.local.get([key], (result) => {
                const value = result[key];
                window.dispatchEvent(new CustomEvent("FROM_EXTENSION", { detail: { action: "LOAD", key, value } }));
            });
        }
    });
}

injectScript();
sendMessages();
