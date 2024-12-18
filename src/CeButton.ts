/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

import { getURL } from "./utils";

const styles = `
    /* css */
    :host {
        --color-background: white;
        --color-hover: #eee;
        --shadow-layer: 0 1px 2px #00000015, 0 2px 4px #00000015;
        --shadow-layer-hover: 0 1px 2px #00000020, 0 2px 4px #00000020, 0 4px 8px #00000020;
        --radius-small: 3px;
        --size-small: 16px;
        --size-max: calc(var(--size-small) + (var(--spacing-tiny) * 2));
        --spacing-small: 5px;
        --spacing-tiny: 2px;
        --transition-fast: 0.2s ease;

        user-select: none;
        display: flex;
        align-items: center;
        max-height: var(--size-max);
        max-width: var(--size-max);
        margin-left: var(--spacing-small);
        padding: var(--spacing-tiny);
        background: var(--color-background);
        border: none;
        border-radius: var(--radius-small);
        cursor: pointer;
        pointer-events: auto;
        box-shadow: var(--shadow-layer);
        transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    :host(:hover) {
        background: var(--color-hover);
        box-shadow: var(--shadow-layer-hover);
    }

    img {
        display: block;
        width: var(--size-small);
        height: var(--size-small);
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

        const template = `
            <!--html-->
            <style>${styles}</style>
            <img alt="Icon by Pikselan (https://www.freepik.com/icon/science_15060166)" />
            <!--!html-->
        `;

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.innerHTML = template;

        getURL("icon").then((url: string | undefined) => {
            const iconElement = shadow.querySelector("img");
            if (url && iconElement) {
                iconElement.src = url;
            }
        });

        this.handleClick = this.handleClick.bind(this);
    }

    connectedCallback(): void {
        this.addEventListener("click", this.handleClick);
    }

    disconnectedCallback(): void {
        this.removeEventListener("click", this.handleClick);
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
