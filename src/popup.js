const CSLJsonParser = require("./CSLJsonParser");

let style = "apa";
let locale = "en-US";

async function save(key, value) {
    await chrome.storage.local.set({ [key]: value });
}

async function load(key) {
    return await new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
}

function populateSelect(id, items, defaultOption) {
    const totalItems = items.length;
    const itemHeight = 30;
    const visibleItemsCount = Math.ceil(200 / itemHeight);
    const buffer = 5;

    const selectBox = document.getElementById(id);

    const displayBox = document.createElement("div");
    displayBox.classList.add("display-box");
    selectBox.value = defaultOption;
    displayBox.textContent = items.find((item) => item.value === defaultOption).label;
    selectBox.appendChild(displayBox);

    let container;

    const renderItems = (start, end) => {
        const list = container.firstChild;

        [...list.children].forEach((child) => {
            const index = parseInt(child.getAttribute("data-index"), 10);
            if (index < start || index >= end) {
                child.remove();
            }
        });

        for (let i = start; i < end; i++) {
            if (!document.querySelector(`.item[data-index="${i}"]`)) {
                const item = document.createElement("div");
                item.classList.add("item");
                item.textContent = items[i].label;
                item.value = items[i].value;
                item.style.top = `${i * itemHeight}px`;
                item.setAttribute("data-index", i);

                item.addEventListener("click", () => {
                    selectBox.value = item.value;
                    displayBox.textContent = items[i].label;

                    const changeEvent = new Event("change", { bubbles: true });
                    selectBox.dispatchEvent(changeEvent);

                    removeDropdown();
                });

                list.appendChild(item);
            }
        }
    };

    const createDropdown = () => {
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
            const scrollTop = container.scrollTop;
            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            const end = Math.min(totalItems, start + visibleItemsCount + buffer * 2);
            renderItems(start, end);
        });

        document.addEventListener("click", handleClickOutside);
    };

    const removeDropdown = () => {
        if (container) {
            container.remove();
            container = null;
            document.removeEventListener("click", handleClickOutside);
        }
    };

    const handleClickOutside = (event) => {
        if (!selectBox.contains(event.target) && !container.contains(event.target)) {
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
        const selectedItem = items.find((item) => item.value === selectBox.value);
        if (selectedItem) {
            displayBox.textContent = selectedItem.label;
        }
    });

    observer.observe(selectBox, { attributes: true, attributeFilter: ["value"] });
}

async function updateDialog(html, currentTabURL) {
    const referenceElement = document.getElementById("reference");
    const intextElement = document.getElementById("intext");

    referenceElement.textContent = "";
    intextElement.textContent = "";
    referenceElement.classList.add("loading");
    intextElement.classList.add("loading");
    referenceElement.onclick = () => undefined;
    intextElement.onclick = () => undefined;

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
                navigator.clipboard.writeText(referenceElement.textContent.trim()).then(() => {
                    const feedback = document.querySelector("#reference-feedback");
                    feedback.textContent = "Copied!";
                    feedback.classList.add("show");
                    setTimeout(() => feedback.classList.remove("show"), 2000);
                });
            };

            intextElement.onclick = () => {
                navigator.clipboard.writeText(intextElement.textContent.trim()).then(() => {
                    const feedback = document.querySelector("#intext-feedback");
                    feedback.textContent = "Copied!";
                    feedback.classList.add("show");
                    setTimeout(() => feedback.classList.remove("show"), 2000);
                });
            };
        } else {
            throw new Error("Failed to retrieve citation data");
        }
    } catch (error) {
        referenceElement.innerHTML = "Failed to retrieve source data";
        intextElement.innerHTML = "Failed to format in-text citation";
        referenceElement.classList.remove("loading");
        intextElement.classList.remove("loading");
        referenceElement.classList.add("error");
        intextElement.classList.add("error");
        referenceElement.onclick = () => undefined;
        intextElement.onclick = () => undefined;
    }
}

async function main() {
    document.addEventListener("DOMContentLoaded", async () => {
        const stylesURL = chrome.runtime.getURL("json/styles.json");
        const localesURL = chrome.runtime.getURL("json/locales.json");
        const styles = await fetch(stylesURL).then((res) => res.json());
        const locales = await fetch(localesURL).then((res) => res.json());

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
        document.getElementById("style-select").value = style;
        document.getElementById("locale-select").value = locale;

        const currentTabURL = await new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (result) => resolve(result[0].url));
        });
        document.getElementById("title").textContent = currentTabURL;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    func: () => document.documentElement.outerHTML,
                },
                (results) => {
                    const html = results[0].result;

                    document.getElementById("style-select").addEventListener("change", (event) => {
                        style = event.target.value;
                        save("style", style);
                        updateDialog(html, currentTabURL);
                    });

                    document.getElementById("locale-select").addEventListener("change", (event) => {
                        locale = event.target.value;
                        save("locale", locale);
                        updateDialog(html, currentTabURL);
                    });

                    updateDialog(html, currentTabURL);
                }
            );
        });
    });
}

main();
