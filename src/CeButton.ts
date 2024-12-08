/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

import { getURL } from "./utils";

const styles = `
    /* css */
    :host {
        user-select: none;
        display: inline-block;
        margin-left: 5px;
        padding: 2px;
        background: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        text-align: center;
        pointer-events: auto;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 1px 2px #00000015, 0 2px 4px #00000015;
        transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
    }

    :host(:hover) {
        background: #eee;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 1px 2px #00000020, 0 2px 4px #00000020,
            0 4px 8px #00000020;
    }

    img {
        display: block;
        width: 16px;
        height: 16px;
        margin: auto;
    }
    /* !css */
`;

declare global {
    interface HTMLElementTagNameMap {
        "ce-button": CeButton;
    }
}

class CeButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.innerHTML = styles;

        const buttonIcon = document.createElement("img");
        buttonIcon.alt = "Icon by Pikselan (https://www.freepik.com/icon/science_15060166)";
        getURL("icon").then((url: string | undefined) => (buttonIcon.src = url!));

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.append(style, buttonIcon);

        this.addEventListener("click", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const openDialog = document.querySelector("ce-dialog");
            if (openDialog) openDialog.remove();

            const identifierType = this.getAttribute("data-type") as string;
            const identifierValue = this.getAttribute("data-value") as string;

            const dialog = document.createElement("ce-dialog");
            dialog.show({
                dataValue: identifierValue,
                dataType: identifierType,
                targetElement: event.target as HTMLElement,
            });
        });
    }
}

customElements.define("ce-button", CeButton);
