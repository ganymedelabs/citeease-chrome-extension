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
        box-shadow: 0 1px 2px #00000015, 0 2px 4px #00000015;
        transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
    }

    :host(:hover) {
        background: #eee;
        box-shadow: 0 1px 2px #00000020, 0 2px 4px #00000020, 0 4px 8px #00000020;
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

        const shadow = this.shadowRoot as ShadowRoot;

        const styleElement = document.createElement("style");
        styleElement.textContent = styles;

        const iconElement = document.createElement("img");
        iconElement.alt = "Icon by Pikselan (https://www.freepik.com/icon/science_15060166)";
        getURL("icon").then((url: string | undefined) => {
            if (url) iconElement.src = url;
        });

        shadow.append(styleElement, iconElement);

        this.addEventListener("click", this.handleClick.bind(this));
    }

    private handleClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        const existingDialog = document.querySelector("ce-dialog");
        if (existingDialog) existingDialog.remove();

        const identifierType = this.getAttribute("data-type") || "";
        const identifierValue = this.getAttribute("data-value") || "";

        const dialog = document.createElement("ce-dialog");
        dialog.type = identifierType;
        dialog.value = identifierValue;
        dialog.floating = true;

        const rect = (event.target as HTMLElement).getBoundingClientRect();
        dialog.style.top = `${rect.bottom + window.scrollY}px`;
        dialog.style.left = `${rect.left + window.scrollX}px`;
        dialog.style.borderTopLeftRadius = "3px";

        document.documentElement.append(dialog);

        const closeDialog = (event: Event) => {
            if (!dialog.contains(event.target as Node) && event.target !== dialog) {
                dialog.remove();
                document.removeEventListener("click", closeDialog);
            }
        };

        document.addEventListener("click", closeDialog);
    }
}

customElements.define("ce-button", CeButton);
