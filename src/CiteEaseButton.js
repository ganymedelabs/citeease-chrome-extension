const { getURL } = require("./utils");

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

            const identifierType = this.getAttribute("data-type");
            const identifierValue = this.getAttribute("data-value");

            const dialog = document.createElement("citeease-dialog");
            dialog.show({ dataValue: identifierValue, dataType: identifierType, targetElement: event.target });
        });
    }
}

customElements.define("citeease-button", CiteEaseButton);
