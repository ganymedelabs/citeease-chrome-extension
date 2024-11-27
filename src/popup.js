const CSLJsonParser = require("./CSLJsonParser.js");
const { save, load, getURL } = require("./utils");

const config = {
    style: "apa",
    locale: "en-US",
};

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

        const localesURL = await getURL("locales");
        const stylesURL = await getURL("styles");
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

        const loadedObject = await load("config");
        Object.assign(config, loadedObject.config);
        document.getElementById("style-select").value = config.style;
        document.getElementById("locale-select").value = config.locale;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    func: () => document.documentElement.outerHTML,
                },
                (results) => {
                    const html = results[0].result;

                    async function updateReference() {
                        const parser = new CSLJsonParser();
                        await parser.fromHTML(html, { prioritizeIdentifiers: ["PMCID", "PMID", "DOI"] });
                        const [reference, intext] = await parser.toBibliography(config);
                        document.getElementById("reference").innerHTML = reference;
                        document.getElementById("intext").innerHTML = intext;
                    }

                    document.getElementById("style-select").addEventListener("change", (event) => {
                        config.style = event.target.value;
                        save("config", config);
                        updateReference();
                    });

                    document.getElementById("locale-select").addEventListener("change", (event) => {
                        config.locale = event.target.value;
                        save("config", config);
                        updateReference();
                    });

                    updateReference();
                }
            );
        });
    });
}

main();
