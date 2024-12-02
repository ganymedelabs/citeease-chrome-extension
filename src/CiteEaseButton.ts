import { getURL } from "./utils";

class CiteEaseButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        getURL("buttonStyle").then((url: string | undefined) => link.setAttribute("href", url!));

        const buttonIcon = document.createElement("img");
        buttonIcon.alt = "Icon by Pikselan (https://www.freepik.com/icon/science_15060166)";
        getURL("icon").then((url: string | undefined) => (buttonIcon.src = url!));

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.appendChild(link);
        shadow.appendChild(buttonIcon);

        this.addEventListener("click", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const openDialog = document.querySelector("citeease-dialog");
            if (openDialog) openDialog.remove();

            const identifierType = this.getAttribute("data-type") as string;
            const identifierValue = this.getAttribute("data-value") as string;

            const dialog = document.createElement("citeease-dialog");
            dialog.show({
                dataValue: identifierValue,
                dataType: identifierType,
                targetElement: event.target as HTMLElement,
            });
        });
    }
}

customElements.define("citeease-button", CiteEaseButton);
