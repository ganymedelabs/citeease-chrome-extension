import CSLJsonParser from "./CSLJsonParser"; // eslint-disable-line import/no-unresolved

// const CSLJsonParser: CSLJsonParser = require("./CSLJsonParser");

let style: string = "apa";
let locale: string = "en-US";

async function save(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

async function load(key: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
}

type SelectItem = {
    value: string;
    label: string;
};

function populateSelect(id: string, items: SelectItem[], defaultOption: string): void {
    const totalItems = items.length;
    const itemHeight = 30;
    const visibleItemsCount = Math.ceil(200 / itemHeight);
    const buffer = 5;

    const selectBox = document.getElementById(id) as HTMLDivElement;

    const displayBox = document.createElement("div");
    displayBox.classList.add("display-box");
    selectBox.setAttribute("value", defaultOption);
    displayBox.textContent = items.find((item) => item.value === defaultOption)?.label || "";
    selectBox.appendChild(displayBox);

    let container: HTMLDivElement | null = null;

    const renderItems = (start: number, end: number): void => {
        if (!container) return;
        const list = container.firstChild as HTMLDivElement;

        Array.from(list.children).forEach((child) => {
            const index = parseInt((child as HTMLElement).getAttribute("data-index") || "-1", 10);
            if (index < start || index >= end) {
                child.remove();
            }
        });

        for (let i = start; i < end; i++) {
            if (!document.querySelector(`.item[data-index="${i}"]`)) {
                const item = document.createElement("div");
                item.classList.add("item");
                item.textContent = items[i].label;
                (item as any).value = items[i].value; // eslint-disable-line @typescript-eslint/no-explicit-any
                item.style.top = `${i * itemHeight}px`;
                item.setAttribute("data-index", i.toString());

                item.addEventListener("click", () => {
                    selectBox.setAttribute("value", items[i].value);
                    displayBox.textContent = items[i].label;

                    const changeEvent = new Event("change", { bubbles: true });
                    selectBox.dispatchEvent(changeEvent);

                    removeDropdown();
                });

                list.appendChild(item);
            }
        }
    };

    const createDropdown = (): void => {
        container = document.createElement("div");
        container.className = "container";

        const list = document.createElement("div");
        list.style.position = "relative";
        list.style.height = `${totalItems * itemHeight}px`;

        container.appendChild(list);
        document.body.appendChild(container);

        const rect = selectBox.getBoundingClientRect();
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top - 200}px`;
        container.style.width = `${rect.width}px`;

        renderItems(0, visibleItemsCount + buffer * 2);

        container.addEventListener("scroll", () => {
            const scrollTop = container!.scrollTop;
            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            const end = Math.min(totalItems, start + visibleItemsCount + buffer * 2);
            renderItems(start, end);
        });

        document.addEventListener("click", handleClickOutside);
    };

    const removeDropdown = (): void => {
        if (container) {
            container.remove();
            container = null;
            document.removeEventListener("click", handleClickOutside);
        }
    };

    const handleClickOutside = (event: MouseEvent): void => {
        if (!selectBox.contains(event.target as Node) && !container?.contains(event.target as Node)) {
            removeDropdown();
        }
    };

    selectBox.addEventListener("click", (event) => {
        event.stopPropagation();
        if (container) {
            removeDropdown();
        } else {
            createDropdown();
        }
    });

    const observer = new MutationObserver(() => {
        const selectedItem = items.find((item) => item.value === selectBox.getAttribute("value"));
        if (selectedItem) {
            displayBox.textContent = selectedItem.label;
        }
    });

    observer.observe(selectBox, { attributes: true, attributeFilter: ["value"] });
}

async function updateDialog(html: string, currentTabURL: string): Promise<void> {
    const referenceElement = document.getElementById("reference") as HTMLElement;
    const intextElement = document.getElementById("intext") as HTMLElement;

    referenceElement.textContent = "";
    intextElement.textContent = "";
    referenceElement.classList.add("loading");
    intextElement.classList.add("loading");
    referenceElement.onclick = null;
    intextElement.onclick = null;

    try {
        const parser = new CSLJsonParser();
        await parser.fromHTML(html, { prioritizeIdentifiers: ["DOI", "PMCID", "PMID"], url: currentTabURL });
        const [reference, intext] = await parser.toBibliography({ style, locale });

        if (reference) {
            referenceElement.innerHTML = reference;
            intextElement.innerHTML = intext;
            referenceElement.classList.remove("error", "loading");
            intextElement.classList.remove("error", "loading");

            referenceElement.onclick = () => {
                navigator.clipboard.writeText(referenceElement.textContent?.trim() || "").then(() => {
                    const feedback = document.querySelector("#reference-feedback") as HTMLElement;
                    feedback.textContent = "Copied!";
                    feedback.classList.add("show");
                    setTimeout(() => feedback.classList.remove("show"), 2000);
                });
            };

            intextElement.onclick = () => {
                navigator.clipboard.writeText(intextElement.textContent?.trim() || "").then(() => {
                    const feedback = document.querySelector("#intext-feedback") as HTMLElement;
                    feedback.textContent = "Copied!";
                    feedback.classList.add("show");
                    setTimeout(() => feedback.classList.remove("show"), 2000);
                });
            };
        } else {
            throw new Error("Failed to retrieve citation data");
        }
    } catch (error) {
        console.error(error);

        referenceElement.innerHTML = "Failed to retrieve source data";
        intextElement.innerHTML = "Failed to format in-text citation";
        referenceElement.classList.remove("loading");
        intextElement.classList.remove("loading");
        referenceElement.classList.add("error");
        intextElement.classList.add("error");
        referenceElement.onclick = null;
        intextElement.onclick = null;
    }
}

async function main(): Promise<void> {
    document.addEventListener("DOMContentLoaded", async () => {
        const stylesURL = chrome.runtime.getURL("json/styles.json");
        const localesURL = chrome.runtime.getURL("json/locales.json");
        const styles: { code: string; name: { long: string } }[] = await fetch(stylesURL).then((res) => res.json());
        const locales: { code: string; name: { english: string } }[] = await fetch(localesURL).then((res) =>
            res.json()
        );

        populateSelect(
            "style-select",
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            })),
            style
        );

        populateSelect(
            "locale-select",
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            })),
            locale
        );

        style = (await load("style")) ?? style;
        locale = (await load("locale")) ?? locale;
        (document.getElementById("style-select") as HTMLSelectElement).value = style;
        (document.getElementById("locale-select") as HTMLSelectElement).value = locale;

        const currentTabURL = await new Promise<string>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (result) => resolve(result[0].url as string));
        });
        (document.getElementById("title") as HTMLDivElement).textContent = currentTabURL;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id as number },
                    func: () => document.documentElement.outerHTML,
                },
                (results) => {
                    const html = results[0].result as string;

                    (document.getElementById("style-select") as HTMLSelectElement).addEventListener(
                        "change",
                        (event) => {
                            style = (event.target as HTMLSelectElement).value;
                            save("style", style);
                            updateDialog(html, currentTabURL);
                        }
                    );

                    (document.getElementById("locale-select") as HTMLSelectElement).addEventListener(
                        "change",
                        (event) => {
                            locale = (event.target as HTMLSelectElement).value;
                            save("locale", locale);
                            updateDialog(html, currentTabURL);
                        }
                    );

                    updateDialog(html, currentTabURL);
                }
            );
        });
    });
}

main();
