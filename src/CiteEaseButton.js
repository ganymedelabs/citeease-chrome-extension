const { getURL, load } = require("./utils");
const CSLJsonParser = require("./CSLJsonParser");

const citationStyles = `
    p {
        margin: 0;
        border-radius: 5px;
    }

    .loading, .error {
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

async function getCitation(type, value) {
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

    const style = await load("style");
    const locale = await load("locale");

    return await parser.toBibliography({ style, locale });
}

async function updateDialog(referenceContent, intextContent) {
    const citeeaseDialog = document.querySelector("citeease-dialog");
    const shadowRoot = citeeaseDialog.shadowRoot;

    if (!shadowRoot) return;

    const localeSelect = shadowRoot.getElementById("locale-select");
    const styleSelect = shadowRoot.getElementById("style-select");

    const locale = localeSelect.value;
    const style = styleSelect.value;

    const identifierType = citeeaseDialog.getAttribute("data-type");
    const identifierValue = citeeaseDialog.getAttribute("data-value");

    referenceContent.textContent = "";
    intextContent.textContent = "";

    referenceContent.classList.add("loading");
    intextContent.classList.add("loading");

    try {
        const [reference, intext] = await getCitation(identifierType, identifierValue, style, locale);

        if (reference) {
            referenceContent.innerHTML = reference;
            intextContent.innerHTML = intext;
            referenceContent.classList.remove("error", "loading");
            intextContent.classList.remove("error", "loading");
        } else {
            throw new Error("Failed to retrieve citation data");
        }
    } catch (error) {
        referenceContent.innerHTML = "Failed to retrieve source data";
        intextContent.innerHTML = "Failed to format in-text citation";
        referenceContent.classList.remove("loading");
        intextContent.classList.remove("loading");
        referenceContent.classList.add("error");
        intextContent.classList.add("error");
    }
}

class CiteEaseButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        getURL("buttonStyle").then((url) => link.setAttribute("href", url));

        const buttonIcon = document.createElement("img");
        buttonIcon.alt = "Icon by Pikselan (https://www.freepik.com/icon/science_15060166)";
        getURL("icon").then((url) => (buttonIcon.src = url));

        this.shadowRoot.appendChild(link);
        this.shadowRoot.appendChild(buttonIcon);

        this.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const openDialog = document.querySelector("citeease-dialog");
            if (openDialog) openDialog.remove();

            const dialog = document.createElement("citeease-dialog");
            const identifierType = this.getAttribute("data-type");
            const identifierValue = this.getAttribute("data-value");

            dialog.setAttribute("data-type", identifierType);
            dialog.setAttribute("data-value", identifierValue);

            const titleSlot = document.createElement("span");
            titleSlot.setAttribute("slot", "title");
            titleSlot.textContent = `${identifierType}: ${identifierValue}`;

            const referenceSlot = document.createElement("div");
            referenceSlot.setAttribute("slot", "reference");

            const referenceStyleElement = document.createElement("style");
            referenceStyleElement.textContent = `${citationStyles}\n${referenceStyles}`;
            const referenceContent = document.createElement("p");

            referenceSlot.appendChild(referenceStyleElement);
            referenceSlot.appendChild(referenceContent);

            const intextSlot = document.createElement("div");
            intextSlot.setAttribute("slot", "intext");

            const intextStyleElement = document.createElement("style");
            intextStyleElement.textContent = `${citationStyles}\n${intextStyles}`;
            const intextContent = document.createElement("p");

            intextSlot.appendChild(intextStyleElement);
            intextSlot.appendChild(intextContent);

            referenceContent.classList.remove("error");
            intextContent.classList.remove("error");
            referenceContent.classList.add("loading");
            intextContent.classList.add("loading");

            getCitation(identifierType, identifierValue).then(([reference, intext]) => {
                if (reference) {
                    referenceContent.innerHTML = reference;
                    intextContent.innerHTML = intext;
                    referenceContent.classList.remove("error", "loading");
                    intextContent.classList.remove("error", "loading");
                    referenceSlot.onclick = () => navigator.clipboard.writeText(referenceContent.textContent.trim());
                    intextSlot.onclick = () => navigator.clipboard.writeText(intextContent.textContent.trim());
                    // TODO: Add feedback to the copying function
                } else {
                    referenceContent.innerHTML = "Failed to retrieve source data";
                    intextContent.innerHTML = "Failed to format in-text citation";
                    referenceContent.classList.remove("loading");
                    intextContent.classList.remove("loading");
                    referenceContent.classList.add("error");
                    intextContent.classList.add("error");
                }
            });

            dialog.appendChild(titleSlot);
            dialog.appendChild(referenceSlot);
            dialog.appendChild(intextSlot);

            document.body.appendChild(dialog);

            const rect = this.getBoundingClientRect();
            dialog.style.top = `${rect.bottom + window.scrollY}px`;
            dialog.style.left = `${rect.left + window.scrollX}px`;

            const citeeaseDialog = document.querySelector("citeease-dialog");
            const shadowRoot = citeeaseDialog.shadowRoot;

            if (shadowRoot) {
                const localeSelect = shadowRoot.getElementById("locale-select");
                const styleSelect = shadowRoot.getElementById("style-select");

                localeSelect.addEventListener("change", () => updateDialog(referenceContent, intextContent));
                styleSelect.addEventListener("change", () => updateDialog(referenceContent, intextContent));
            }

            const closeDialog = (event) => {
                if (!dialog.contains(event.target) && event.target !== this) {
                    dialog.remove();
                    document.removeEventListener("click", closeDialog);
                }
            };
            document.addEventListener("click", closeDialog);
        });
    }
}

customElements.define("citeease-button", CiteEaseButton);
