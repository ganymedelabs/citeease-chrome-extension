function getURL(name) {
    return new Promise((resolve) => {
        window.postMessage({ type: "GET_URL" }, "*");

        const handleMessage = (event) => {
            if (event.data.type === "SET_URL") {
                window.removeEventListener("message", handleMessage);
                resolve(event.data[name]);
            }
        };

        window.addEventListener("message", handleMessage);
    });
}

function uid(length = 16) {
    if (length <= 0) {
        throw new Error("Length must be a positive number");
    }

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let result = "";
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }

    return result;
}

async function save(key, value) {
    return new Promise((resolve) => {
        const event = new CustomEvent("FROM_INJECTED", { detail: { action: "SAVE", key, value } });
        window.dispatchEvent(event);

        window.addEventListener("FROM_EXTENSION", function handler(event) {
            if (event.detail.action === "SAVE" && event.detail.key === key) {
                window.removeEventListener("FROM_EXTENSION", handler);
                resolve(event.detail.success);
            }
        });
    });
}

async function load(key) {
    return new Promise((resolve) => {
        const event = new CustomEvent("FROM_INJECTED", { detail: { action: "LOAD", key } });
        window.dispatchEvent(event);

        window.addEventListener("FROM_EXTENSION", function handler(event) {
            if (event.detail.action === "LOAD" && event.detail.key === key) {
                window.removeEventListener("FROM_EXTENSION", handler);
                resolve(event.detail.value);
            }
        });
    });
}

function createElementFromHTML(htmlString) {
    const template = document.createElement("template");
    htmlString = htmlString.trim();
    template.innerHTML = htmlString;

    return template.content.firstChild;
}

module.exports = { getURL, uid, save, load, createElementFromHTML };
