const { getURL, load, save, createElementFromHTML } = require("./utils");
const CSLJsonParser = require("./CSLJsonParser");
require("./CiteEaseMenu");

const citationStyles = `
    #reference,
    #intext {
        margin: 0;
        border-radius: 5px;
        transition: background-color 0.2s ease-out;
    }

    #reference:not(.loading):not(.error):hover,
    #intext:not(.loading):not(.error):hover {
        background: #ededed;
    }

    .loading,
    .error {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
            "Open Sans", "Helvetica Neue", sans-serif;
    }

    .loading {
        display: inline-block;
        width: 100%;
        height: 1em;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: pulse 1.5s infinite ease-in-out;
    }

    .error {
        color: white;
        background: #e04b4b;
        padding-inline: 5px;
    }

    @keyframes pulse {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
`;

const referenceStyles = `
    .csl-entry:has(.csl-left-margin) {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .csl-entry > .csl-left-margin {
        min-width: fit-content;
    }
`;

const intextStyles = "";

class CiteEaseDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const dialogTemplate = `
            <link rel="stylesheet" href="">
            <div class="dialog-header">
                <slot name="title"></slot>
                <button class="close-button">×</button>
            </div>
            <div class="dialog-content">
                <div class="citation-container">
                    <h4 class="label">Reference list entry <span class="copied-feedback" id="reference-feedback"></span></h4>
                    <slot name="reference"></slot>
                </div>
                <div class="citation-container">
                    <h4 class="label">In-text citation <span class="copied-feedback" id="intext-feedback"></span></h4>
                    <slot name="intext"></slot>
                </div>
            </div>
            <div class="dialog-options">
                <div class="select-container">
                    <label for="style-select">Style:</label>
                    <select id="style-select"></select>
                </div>
                <div class="select-container">
                    <label for="locale-select">Locale:</label>
                    <select id="locale-select"></select>
                </div>
            </div>
            <citeease-menu></citeease-menu>
        `;

        const dialogElement = createElementFromHTML(`<div>${dialogTemplate}</div>`);
        this.shadowRoot.appendChild(dialogElement);

        const link = this.shadowRoot.querySelector("link");
        getURL("dialogStyle").then((url) => {
            link.setAttribute("href", url);
        });

        const closeButton = this.shadowRoot.querySelector(".close-button");
        closeButton.addEventListener("click", () => this.close());

        this.styleSelect = this.shadowRoot.querySelector("#style-select");
        this.localeSelect = this.shadowRoot.querySelector("#locale-select");

        this.styleSelect.addEventListener("change", () => {
            this.#updateDialog();
            save("style", this.styleSelect.value);
        });
        this.localeSelect.addEventListener("change", () => {
            this.#updateDialog();
            save("locale", this.localeSelect.value);
        });
    }

    #populateSelect(selectElement, options) {
        options.forEach((option) => {
            const opt = createElementFromHTML(`
                <option value="${option.value || option}">${option.label || option}</option>
            `);
            selectElement.appendChild(opt);
        });
    }

    async #getCitation() {
        const type = this.getAttribute("data-type");
        const value = this.getAttribute("data-value");

        const parser = new CSLJsonParser();
        switch (type) {
            case "URL":
                await parser.fromURL(value);
                break;
            case "DOI":
                await parser.fromDOI(value);
                break;
            case "PMID":
                await parser.fromPMID(value);
                break;
            case "PMCID":
                await parser.fromPMCID(value);
                break;
            case "ISBN":
                await parser.fromISBN(value);
                break;
        }

        const style = this.styleSelect.value;
        const locale = this.localeSelect.value;

        return await parser.toBibliography({ style, locale });
    }

    async #updateDialog() {
        const referenceElement = this.referenceElement;
        const intextElement = this.intextElement;

        referenceElement.textContent = "";
        intextElement.textContent = "";
        referenceElement.classList.add("loading");
        intextElement.classList.add("loading");
        referenceElement.onclick = () => undefined;
        intextElement.onclick = () => undefined;

        try {
            const [reference, intext] = await this.#getCitation();

            if (reference) {
                referenceElement.innerHTML = reference;
                intextElement.innerHTML = intext;
                referenceElement.classList.remove("error", "loading");
                intextElement.classList.remove("error", "loading");

                referenceElement.onclick = () => {
                    navigator.clipboard.writeText(referenceElement.textContent.trim()).then(() => {
                        const feedback = this.shadowRoot.querySelector("#reference-feedback");
                        feedback.textContent = "Copied!";
                        feedback.classList.add("show");
                        setTimeout(() => feedback.classList.remove("show"), 2000);
                    });
                };

                intextElement.onclick = () => {
                    navigator.clipboard.writeText(intextElement.textContent.trim()).then(() => {
                        const feedback = this.shadowRoot.querySelector("#intext-feedback");
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

    async connectedCallback() {
        const localesURL = await getURL("locales");
        const stylesURL = await getURL("styles");
        const locales = await fetch(localesURL).then((res) => res.json());
        const styles = await fetch(stylesURL).then((res) => res.json());

        this.#populateSelect(
            this.styleSelect,
            styles.map((style) => ({ value: style.code, label: style.name.long }))
        );
        this.#populateSelect(
            this.localeSelect,
            locales.map((locale) => ({ value: locale.code, label: locale.name.english }))
        );

        load("style").then((savedStyle) => {
            if (savedStyle) this.styleSelect.value = savedStyle;
        });
        load("locale").then((savedLocale) => {
            if (savedLocale) this.localeSelect.value = savedLocale;
        });
    }

    show(options) {
        const { dataType, dataValue, targetElement } = options;

        this.setAttribute("data-type", dataType);
        this.setAttribute("data-value", dataValue);

        const titleSlot = createElementFromHTML(`
            <div slot="title">${dataType}: ${dataValue}</div>
        `);

        const referenceSlot = createElementFromHTML(`
            <div slot="reference">
                <style>${citationStyles}\n${referenceStyles}</style>
                <p id="reference"></p>
            </div>
        `);

        const intextSlot = createElementFromHTML(`
            <div slot="intext">
                <style>${citationStyles}\n${intextStyles}</style>
                <p id="intext"></p>
            </div>
        `);

        this.append(titleSlot, referenceSlot, intextSlot);
        this.referenceElement = referenceSlot.querySelector("#reference");
        this.intextElement = intextSlot.querySelector("#intext");

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            this.style.top = `${rect.bottom + window.scrollY}px`;
            this.style.left = `${rect.left + window.scrollX}px`;
        }

        this.#updateDialog();
        document.documentElement.append(this);
        this.classList.remove("hidden");
    }

    close() {
        this.classList.add("hidden");
        setTimeout(() => this.remove(), 200);
    }
}

customElements.define("citeease-dialog", CiteEaseDialog);
