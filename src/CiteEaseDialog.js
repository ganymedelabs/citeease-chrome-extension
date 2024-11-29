const { getURL, load, save } = require("./utils");
const CSLJsonParser = require("./CSLJsonParser");

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

        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        getURL("dialogStyle").then((url) => {
            link.setAttribute("href", url);
        });

        const header = document.createElement("div");
        header.classList.add("dialog-header");

        const titleSlot = document.createElement("slot");
        titleSlot.name = "title";
        header.appendChild(titleSlot);

        const closeButton = document.createElement("button");
        closeButton.classList.add("close-button");
        closeButton.textContent = "×";
        header.appendChild(closeButton);

        const content = document.createElement("div");
        content.classList.add("dialog-content");

        const referenceContainer = document.createElement("div");
        referenceContainer.classList.add("citation-container");

        const referenceLabel = document.createElement("h4");
        referenceLabel.classList.add("label");
        referenceLabel.textContent = "Reference list entry";

        const referenceSlot = document.createElement("slot");
        referenceSlot.name = "reference";

        referenceContainer.appendChild(referenceLabel);
        referenceContainer.appendChild(referenceSlot);

        const intextContainer = document.createElement("div");
        intextContainer.classList.add("citation-container");

        const intextLabel = document.createElement("h4");
        intextLabel.classList.add("label");
        intextLabel.textContent = "In-text citation";

        const intextSlot = document.createElement("slot");
        intextSlot.name = "intext";

        intextContainer.appendChild(intextLabel);
        intextContainer.appendChild(intextSlot);

        content.appendChild(referenceContainer);
        content.appendChild(intextContainer);

        const options = document.createElement("div");
        options.classList.add("dialog-options");

        const styleContainer = document.createElement("div");
        styleContainer.classList.add("select-container");
        const styleLabel = document.createElement("label");
        styleLabel.setAttribute("for", "style-select");
        styleLabel.textContent = "Style:";
        const styleSelect = document.createElement("select");
        styleSelect.id = "style-select";
        styleContainer.appendChild(styleLabel);
        styleContainer.appendChild(styleSelect);

        const localeContainer = document.createElement("div");
        localeContainer.classList.add("select-container");
        const localeLabel = document.createElement("label");
        localeLabel.setAttribute("for", "locale-select");
        localeLabel.textContent = "Locale:";
        const localeSelect = document.createElement("select");
        localeSelect.id = "locale-select";
        localeContainer.appendChild(localeLabel);
        localeContainer.appendChild(localeSelect);

        options.appendChild(localeContainer);
        options.appendChild(styleContainer);

        this.shadowRoot.appendChild(link);
        this.shadowRoot.appendChild(header);
        this.shadowRoot.appendChild(content);
        this.shadowRoot.appendChild(options);

        closeButton.addEventListener("click", () => this.close());

        this.styleSelect = styleSelect;
        this.localeSelect = localeSelect;
    }

    #populateSelect(selectElement, options) {
        options.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value || option;
            opt.textContent = option.label || option;
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
                referenceElement.onclick = () => navigator.clipboard.writeText(referenceElement.textContent.trim());
                intextElement.onclick = () => navigator.clipboard.writeText(intextElement.textContent.trim());
                // TODO: Show feedback after copying the text
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
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            }))
        );
        this.#populateSelect(
            this.localeSelect,
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            }))
        );

        load("style").then((savedStyle) => {
            if (savedStyle) this.styleSelect.value = savedStyle;
        });
        load("locale").then((savedLocale) => {
            if (savedLocale) this.localeSelect.value = savedLocale;
        });

        const closeDialog = (event) => {
            if (!this.contains(event.target) && event.target !== this) {
                this.close();
                document.removeEventListener("click", closeDialog);
            }
        };

        document.addEventListener("click", closeDialog);
    }

    show(options) {
        const { dataType, dataValue, targetElement } = options;

        this.setAttribute("data-type", dataType);
        this.setAttribute("data-value", dataValue);

        const titleSlot = document.createElement("div");
        titleSlot.setAttribute("slot", "title");
        titleSlot.textContent = `${dataType}: ${dataValue}`;

        const referenceSlot = document.createElement("div");
        referenceSlot.setAttribute("slot", "reference");

        const referenceStyleElement = document.createElement("style");
        referenceStyleElement.textContent = `${citationStyles}\n${referenceStyles}`;
        const referenceElement = document.createElement("p");
        referenceElement.id = "reference";

        referenceSlot.appendChild(referenceStyleElement);
        referenceSlot.appendChild(referenceElement);

        const intextSlot = document.createElement("div");
        intextSlot.setAttribute("slot", "intext");

        const intextStyleElement = document.createElement("style");
        intextStyleElement.textContent = `${citationStyles}\n${intextStyles}`;
        const intextElement = document.createElement("p");
        intextElement.id = "intext";

        intextSlot.appendChild(intextStyleElement);
        intextSlot.appendChild(intextElement);

        this.appendChild(titleSlot);
        this.appendChild(referenceSlot);
        this.appendChild(intextSlot);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            this.style.top = `${rect.bottom + window.scrollY}px`;
            this.style.left = `${rect.left + window.scrollX}px`;
        }

        this.referenceElement = referenceElement;
        this.intextElement = intextElement;

        this.styleSelect.addEventListener("change", () => {
            this.#updateDialog();
            save("style", this.styleSelect.value);
        });
        this.localeSelect.addEventListener("change", () => {
            this.#updateDialog();
            save("locale", this.localeSelect.value);
        });
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
