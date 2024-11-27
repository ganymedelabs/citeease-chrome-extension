const { getURL, load, save } = require("./utils");

class CiteEaseDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        getURL("dialogStyle").then((url) => {
            link.setAttribute("href", url);
        });

        const dialog = document.createElement("div");
        dialog.classList.add("dialog");

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

        const localeContainer = document.createElement("div");
        localeContainer.classList.add("select-container");
        const localeLabel = document.createElement("label");
        localeLabel.textContent = "Locale:";
        const localeSelect = document.createElement("select");
        localeSelect.id = "locale-select";
        localeContainer.appendChild(localeLabel);
        localeContainer.appendChild(localeSelect);

        const styleContainer = document.createElement("div");
        styleContainer.classList.add("select-container");
        const styleLabel = document.createElement("label");
        styleLabel.textContent = "Style:";
        const styleSelect = document.createElement("select");
        styleSelect.id = "style-select";
        styleContainer.appendChild(styleLabel);
        styleContainer.appendChild(styleSelect);

        options.appendChild(localeContainer);
        options.appendChild(styleContainer);

        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(options);

        this.shadowRoot.appendChild(link);
        this.shadowRoot.appendChild(dialog);

        closeButton.addEventListener("click", () => this.closeDialog());

        this.localeSelect = localeSelect;
        this.styleSelect = styleSelect;
    }

    populateSelect(selectElement, options) {
        options.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value || option;
            opt.textContent = option.label || option;
            selectElement.appendChild(opt);
        });
    }

    async connectedCallback() {
        const localesURL = await getURL("locales");
        const stylesURL = await getURL("styles");
        const locales = await fetch(localesURL).then((res) => res.json());
        const styles = await fetch(stylesURL).then((res) => res.json());

        this.populateSelect(
            this.localeSelect,
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            }))
        );
        this.populateSelect(
            this.styleSelect,
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            }))
        );

        load("locale").then((savedLocale) => {
            if (savedLocale) this.localeSelect.value = savedLocale;
        });
        load("style").then((savedStyle) => {
            if (savedStyle) this.styleSelect.value = savedStyle;
        });

        this.localeSelect.addEventListener("change", () => save("locale", this.localeSelect.value));
        this.styleSelect.addEventListener("change", () => save("style", this.styleSelect.value));
    }

    closeDialog() {
        this.remove();
    }
}

customElements.define("citeease-dialog", CiteEaseDialog);
