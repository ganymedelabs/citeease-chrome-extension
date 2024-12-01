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

function main() {
    document.addEventListener("DOMContentLoaded", async () => {
        const populateSelect = (id, options, defaultOption) => {
            const selectElement = document.getElementById(id);
            options.forEach((option) => {
                const opt = document.createElement("option");
                opt.value = option.value || option;
                opt.textContent = option.label || option;
                selectElement.appendChild(opt);
                selectElement.value = defaultOption;
            });
        };

        const stylesURL = chrome.runtime.getURL("json/styles.json");
        const localesURL = chrome.runtime.getURL("json/locales.json");
        const locales = await fetch(localesURL).then((res) => res.json());
        const styles = await fetch(stylesURL).then((res) => res.json());

        populateSelect(
            "locale-select",
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            })),
            locale
        );
        populateSelect(
            "style-select",
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            })),
            style
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
