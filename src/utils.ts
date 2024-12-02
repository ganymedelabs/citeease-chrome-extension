type URLMessage = { type: string; [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export function getURL(name: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        window.postMessage({ type: "GET_URL" }, "*");

        const handleMessage = (event: MessageEvent<URLMessage>) => {
            if (event.data.type === "SET_URL") {
                window.removeEventListener("message", handleMessage);
                resolve(event.data[name]);
            }
        };

        window.addEventListener("message", handleMessage);
    });
}

export function uid(length: number = 16): string {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function save(key: string, value: any): Promise<boolean> {
    return new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = new CustomEvent<{ action: string; key: string; value: any }>("FROM_INJECTED", {
            detail: { action: "SAVE", key, value },
        });
        window.dispatchEvent(event);

        const handler = (event: Event) => {
            const customEvent = event as CustomEvent<{ action: string; key: string; success: boolean }>;
            if (customEvent.detail.action === "SAVE" && customEvent.detail.key === key) {
                window.removeEventListener("FROM_EXTENSION", handler);
                resolve(customEvent.detail.success);
            }
        };

        window.addEventListener("FROM_EXTENSION", handler as EventListener);
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function load(key: string): Promise<any> {
    return new Promise((resolve) => {
        const event = new CustomEvent<{ action: string; key: string }>("FROM_INJECTED", {
            detail: { action: "LOAD", key },
        });
        window.dispatchEvent(event);

        const handler = (event: Event) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const customEvent = event as CustomEvent<{ action: string; key: string; value: any }>;
            if (customEvent.detail.action === "LOAD" && customEvent.detail.key === key) {
                window.removeEventListener("FROM_EXTENSION", handler);
                resolve(customEvent.detail.value);
            }
        };

        window.addEventListener("FROM_EXTENSION", handler as EventListener);
    });
}

export function createElementFromHTML(htmlString: string): HTMLElement | null {
    const template = document.createElement("template");
    htmlString = htmlString.trim();
    template.innerHTML = htmlString;

    return template.content.firstChild as HTMLElement | null;
}
