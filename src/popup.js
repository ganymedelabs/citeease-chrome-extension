const CSLJsonParser = require("./CSLJsonParser");

const config = {
    style: "apa",
    locale: "en-US",
};

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
        await parser.fromHTML(html, { prioritizeIdentifiers: ["DOI", "PMCID", "PMID"], url: currentTabURL }); // DOI should be the first because it's the quickest one to retreive data from.
        const [reference, intext] = await parser.toBibliography(config);

        if (reference) {
            referenceElement.innerHTML = reference;
            intextElement.innerHTML = intext;
            referenceElement.classList.remove("error", "loading");
            intextElement.classList.remove("error", "loading");
            referenceElement.onclick = () => navigator.clipboard.writeText(referenceElement.textContent.trim());
            intextElement.onclick = () => navigator.clipboard.writeText(intextElement.textContent.trim());
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
            config.locale
        );
        populateSelect(
            "style-select",
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            })),
            config.style
        );

        const loadedConfig = await load("config");
        if (loadedConfig) Object.assign(config, loadedConfig);
        document.getElementById("style-select").value = config.style;
        document.getElementById("locale-select").value = config.locale;

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
                        config.style = event.target.value;
                        save("config", config);
                        updateDialog(html, currentTabURL);
                    });

                    document.getElementById("locale-select").addEventListener("change", (event) => {
                        config.locale = event.target.value;
                        save("config", config);
                        updateDialog(html, currentTabURL);
                    });

                    updateDialog(html, currentTabURL);
                }
            );
        });
    });
}

main();
