/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

import CSLJsonParser from "./CSLJsonParser";
import { getURL, load, save } from "./utils";
import "./CeSelect";

type ShowOptions = { dataType?: string; dataValue?: string; targetElement?: HTMLElement };

const styles = `
    /* css */
    * {
        box-sizing: border-box;
    }

    *:focus-visible {
        outline: 2px solid #364f6b;
    }

    :host {
        font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Oxygen,
            Ubuntu,
            Cantarell,
            "Open Sans",
            "Helvetica Neue",
            sans-serif;
        position: absolute;
        background: white;
        border-radius: 3px 20px 20px 20px;
        padding: 20px;
        max-width: 400px;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 2px #00000012, 0 2px 4px #00000012, 0 4px 8px #00000012,
            0 8px 16px #00000012, 0 16px 32px #00000012, 0 32px 64px #00000012;
        z-index: 1000;
        opacity: 1;
        transform: scale(1);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }

    :host(.hidden) {
        opacity: 0;
        transform: scale(0.95);
    }

    /* Dialog Header Styles */

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
        margin-bottom: 10px;
    }

    ::slotted([slot="title"]) {
        font-size: 20px;
        font-weight: bold;
        color: #333;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .close-button {
        user-select: none;
        background: #ff5f5f;
        color: white;
        border: none;
        border-radius: 50%;
        min-width: 24px;
        max-height: 24px;
        text-align: center;
        cursor: pointer;
        font-size: 16px;
        line-height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 1px 2px #00000015, 0 2px 4px #00000015;
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    .close-button:hover {
        background: #e04b4b;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 1px 2px #00000020, 0 2px 4px #00000020,
            0 4px 8px #00000020;
    }

    /* Dialog Content Styles */

    .dialog-content {
        display: flex;
        flex-direction: column;
        margin: 0;
        gap: 10px;
        padding-block: 10px;
        font-size: 14px;
        color: #333;
        max-height: 300px;
        overflow: auto;
    }

    .citation-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: auto;
    }

    .label {
        position: relative;
        font-size: 12px;
        margin: 0;
        color: #364f6b;
    }

    ::slotted([slot="reference"]),
    ::slotted([slot="intext"]) {
        font-family: Georgia, "Times New Roman", Times, serif;
        text-align: start;
        line-height: 20px;
        margin-block: 0;
        border-radius: 5px;
    }

    /* Dialog Options Styles */

    .dialog-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .select-container {
        min-width: 0;
    }

    .select-container label {
        display: block;
        font-size: 12px;
        font-weight: bold;
        color: #364f6b;
        margin: 0 0 5px;
    }

    .select-container ce-select {
        width: 100%;
    }

    /* Copied Feedback */

    .copied-feedback {
        position: relative;
        right: 10px;
        opacity: 0;
        color: #35c46e;
        font-size: 12px;
        transition: right 0.5s ease, opacity 0.5s ease;
    }

    .copied-feedback.show {
        position: relative;
        opacity: 1;
        right: 0px;
    }
    /* !css */
`;

const citationStyles = `
    /* css */
    #reference,
    #intext {
        all: unset;
        margin: 4px;
        border-radius: 5px;
        transition: background-color 0.2s ease-out;
    }

    #reference:focus-visible,
    #intext:focus-visible {
        outline: 2px dotted #bcbcbc;
        outline-offset: 2px;
    }

    #reference:not(.loading):not(.error):hover,
    #intext:not(.loading):not(.error):hover {
        background: #ededed;
    }

    .loading,
    .error {
        font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Oxygen,
            Ubuntu,
            Cantarell,
            "Open Sans",
            "Helvetica Neue",
            sans-serif;
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

    /* Citeproc Styles */

    .csl-entry:has(.csl-left-margin) {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .csl-entry > .csl-left-margin {
        min-width: fit-content;
    }
    /* !css */
`;

declare global {
    interface HTMLElementTagNameMap {
        "ce-dialog": CeDialog;
    }
}

class CeDialog extends HTMLElement {
    private styleSelect: HTMLSelectElement | undefined;
    private localeSelect: HTMLSelectElement | undefined;
    private referenceElement: HTMLElement | undefined;
    private intextElement: HTMLElement | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const template = `
            <!--html-->
            <style>${styles}</style>
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
                    <ce-select id="style-select"></ce-select>
                </div>
                <div class="select-container">
                    <label for="locale-select">Locale:</label>
                    <ce-select id="locale-select"></ce-select>
                </div>
            </div>
            <!--!html-->
        `;

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.innerHTML = template;

        const closeButton = shadow.querySelector(".close-button") as HTMLButtonElement;
        closeButton.addEventListener("click", () => this.close());
    }

    private async getCitation() {
        const type = this.getAttribute("data-type") as string;
        const value = this.getAttribute("data-value") as string;

        /* eslint-disable indent */
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
        /* eslint-enable indent */

        const style = this.styleSelect?.value || "apa";
        const locale = this.localeSelect?.value || "en-US";

        return await parser.toBibliography({ style, locale });
    }

    private async updateDialog() {
        const referenceElement = this.referenceElement as HTMLElement;
        const intextElement = this.intextElement as HTMLElement;
        const shadow = this.shadowRoot as ShadowRoot;

        referenceElement.textContent = "";
        intextElement.textContent = "";
        referenceElement.classList.remove("error");
        intextElement.classList.remove("error");
        referenceElement.classList.add("loading");
        intextElement.classList.add("loading");
        referenceElement.onclick = () => undefined;
        intextElement.onclick = () => undefined;

        try {
            const [reference, intext] = await this.getCitation();

            if (reference) {
                referenceElement.innerHTML = reference;
                intextElement.innerHTML = intext;
                referenceElement.classList.remove("error", "loading");
                intextElement.classList.remove("error", "loading");

                referenceElement.onclick = () => {
                    navigator.clipboard.writeText(referenceElement.textContent!.trim()).then(() => {
                        const feedback = shadow.querySelector("#reference-feedback") as HTMLElement;
                        feedback.textContent = "Copied!";
                        feedback.classList.add("show");
                        setTimeout(() => feedback.classList.remove("show"), 2000);
                    });
                };

                intextElement.onclick = () => {
                    navigator.clipboard.writeText(intextElement.textContent!.trim()).then(() => {
                        const feedback = shadow.querySelector("#intext-feedback") as HTMLElement;
                        feedback.textContent = "Copied!";
                        feedback.classList.add("show");
                        setTimeout(() => feedback.classList.remove("show"), 2000);
                    });
                };
            } else {
                throw new Error("Failed to retrieve citation data");
            }
        } catch (error) {
            console.error(error);

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
        const styles: { code: string; name: { long: string } }[] = await fetch(stylesURL!).then((res) => res.json());
        const locales: { code: string; name: { english: string } }[] = await fetch(localesURL!).then((res) =>
            res.json()
        );

        const selectElements = this.shadowRoot?.querySelectorAll("ce-select");
        const styleSelect = Array.from(selectElements!).find((element) => element.id === "style-select");
        const localeSelect = Array.from(selectElements!).find((element) => element.id === "locale-select");

        // @ts-expect-error
        styleSelect?.populate(
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            }))
        );
        // @ts-expect-error
        localeSelect?.populate(
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            }))
        );

        load("style").then((savedStyle: string) => {
            if (savedStyle) (this.styleSelect as HTMLSelectElement).value = savedStyle;
        });
        load("locale").then((savedLocale: string) => {
            if (savedLocale) (this.localeSelect as HTMLSelectElement).value = savedLocale;
        });

        const closeDialog = (event: Event) => {
            if (!this.contains(event.target as Node) && event.target !== this) {
                this.close();
                document.removeEventListener("click", closeDialog);
            }
        };

        document.addEventListener("click", closeDialog);
    }

    show(options: ShowOptions) {
        const { dataType, dataValue, targetElement } = options;

        this.setAttribute("data-type", dataType!);
        this.setAttribute("data-value", dataValue!);

        const titleSlot = document.createElement("div");
        titleSlot.slot = "title";
        titleSlot.textContent = `${dataType}: ${dataValue}`;

        const referenceSlot = document.createElement("div");
        referenceSlot.slot = "reference";
        referenceSlot.style.overflow = "visible";
        referenceSlot.innerHTML = `
            <!--html-->
            <style>${citationStyles}</style>
            <button id="reference"></button>
            <!--!html-->
        `;

        const intextSlot = document.createElement("div");
        intextSlot.slot = "intext";
        intextSlot.style.overflow = "visible";
        intextSlot.innerHTML = `
            <!--html-->
            <style>${citationStyles}</style>
            <button id="intext"></button>
            <!--!html-->
        `;

        this.append(titleSlot!, referenceSlot!, intextSlot!);
        this.referenceElement = referenceSlot?.querySelector("#reference") as HTMLElement;
        this.intextElement = intextSlot?.querySelector("#intext") as HTMLElement;

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            this.style.top = `${rect.bottom + window.scrollY}px`;
            this.style.left = `${rect.left + window.scrollX}px`;
        }

        this.styleSelect = this.shadowRoot?.getElementById("style-select") as HTMLSelectElement;
        this.localeSelect = this.shadowRoot?.getElementById("locale-select") as HTMLSelectElement;

        this.styleSelect.addEventListener("change", () => {
            this.updateDialog();
            save("style", this.styleSelect?.value);
        });
        this.localeSelect.addEventListener("change", () => {
            this.updateDialog();
            save("locale", this.localeSelect?.value);
        });

        this.updateDialog();
        document.documentElement.append(this);
        this.classList.remove("hidden");
    }

    close() {
        this.classList.add("hidden");
        setTimeout(() => this.remove(), 200);
    }
}

customElements.define("ce-dialog", CeDialog);
