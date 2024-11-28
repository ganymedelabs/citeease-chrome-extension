const { getURL, load } = require("./utils");
const CSLJsonParser = require("./CSLJsonParser");

const referenceStyles = `
    p {
        margin: 0;
    }

    .csl-entry:has(.csl-left-margin) {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .csl-entry > .csl-left-margin {
        min-width: fit-content;
    }
`;

const intextStyles = `
    p {
        margin: 0;
    }
`;

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

function updateOpenDialog() {
    const openDialog = document.querySelector("citeease-dialog");
    if (!openDialog) return;

    const referenceElement = openDialog.querySelector(".reference");
    const intextElement = openDialog.querySelector(".intext");
    const identifierType = openDialog.getAttribute("data-type");
    const identifierValue = openDialog.getAttribute("data-value");

    if (referenceElement && intextElement && identifierType && identifierValue) {
        getCitation(identifierType, identifierValue).then(([reference, intext]) => {
            referenceElement.innerHTML = reference;
            intextElement.innerHTML = intext;
        });
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
            referenceStyleElement.textContent = referenceStyles;
            const referenceContent = document.createElement("p");
            referenceSlot.onclick = () => navigator.clipboard.writeText(referenceContent.textContent.trim());
            // TODO: Add feedback to the copying function

            referenceSlot.appendChild(referenceStyleElement);
            referenceSlot.appendChild(referenceContent);

            const intextSlot = document.createElement("div");
            intextSlot.setAttribute("slot", "intext");

            const intextStyleElement = document.createElement("style");
            intextStyleElement.textContent = intextStyles;
            const intextContent = document.createElement("p");
            intextSlot.onclick = () => navigator.clipboard.writeText(intextContent.textContent.trim());
            // TODO: Add feedback to the copying function

            intextSlot.appendChild(intextStyleElement);
            intextSlot.appendChild(intextContent);

            getCitation(identifierType, identifierValue).then(([reference, intext]) => {
                referenceContent.innerHTML = reference;
                intextContent.innerHTML = intext;
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

                localeSelect.addEventListener("change", updateOpenDialog);
                styleSelect.addEventListener("change", updateOpenDialog);
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
