/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

import CSLJsonParser from "./CSLJsonParser";
import { getURL, load, save } from "./utils";
import "./CeSelect";

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
        position: relative;
    }

    :host(.floating) {
        position: absolute;
        background: #fff;
        max-width: 400px;
        padding: 20px;
        border-radius: 20px;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 2px #00000012, 0 2px 4px #00000012, 0 4px 8px #00000012,
            0 8px 16px #00000012, 0 16px 32px #00000012, 0 32px 64px #00000012;
        z-index: 1000;
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

    #title {
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
        gap: 10px;
        margin: 0;
        padding-block: 10px;
        font-size: 14px;
        color: #333;
    }

    .citation-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .label {
        position: relative;
        font-size: 12px;
        margin: 0;
        color: #364f6b;
    }

    #reference,
    #intext {
        font-family: Georgia, "Times New Roman", Times, serif;
        text-align: start;
        line-height: 20px;
        margin-block: 0;
        border-radius: 5px;
        margin: 0;
        border-radius: 5px;
        transition: background-color 0.2s ease;
    }

    #reference:focus,
    #intext:focus {
        outline: 0px dotted transparent;
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

    #reference.loading,
    #intext.loading {
        display: none;
    }

    #reference.error,
    #intext.error {
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
        color: white;
        background: #e04b4b;
        padding-inline: 5px;
    }

    :has(.loading) > .skeleton {
        display: inline-block;
        border-radius: 5px;
        width: 100%;
        height: 1em;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: pulse 1.5s infinite ease-in-out;
    }

    :has(.loading) > .skeleton:last-child {
        width: 85%;
    }

    @keyframes pulse {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }

    /* Dialog Options Styles */

    .dialog-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .select-container {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;

    }

    .select-container label {
        display: block;
        font-size: 12px;
        font-weight: bold;
        color: #364f6b;
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

    /* Citeproc Styles */

    .csl-entry.hanging-indentation {
        padding-inline-start: 1.5rem;
        text-indent: -1.5rem;
    }

    .csl-entry:has(.csl-left-margin) {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .csl-entry > .csl-left-margin {
        min-width: fit-content;
    }

    .csl-entry:has(.csl-block) > .csl-left-margin {
        display: none;
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
    private titleElement: HTMLElement | undefined;

    private _type: string = "";
    private _value: string = "";
    private _floating: boolean = false;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const template = `
            <!--html-->
            <style>${styles}</style>
            <div class="dialog-header">
                <div id="title"></div>
            </div>
            <div class="dialog-content">
                <div class="citation-container">
                    <h4 class="label">Reference list entry <span class="copied-feedback" id="reference-feedback"></span></h4>
                    <p id="reference" tabIndex="0" role="button"></p>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                </div>
                <div class="citation-container">
                    <h4 class="label">In-text citation <span class="copied-feedback" id="intext-feedback"></span></h4>
                    <p id="intext" tabIndex="0" role="button"></p>
                    <div class="skeleton"></div>
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

        this.titleElement = shadow.querySelector("#title") as HTMLDivElement;
        this.referenceElement = shadow.querySelector("#reference") as HTMLParagraphElement;
        this.intextElement = shadow.querySelector("#intext") as HTMLParagraphElement;
    }

    async connectedCallback() {
        const localesURL = await getURL("locales", "json/locales.json");
        const stylesURL = await getURL("styles", "json/styles.json");
        const styles: { code: string; name: { long: string } }[] = await fetch(stylesURL!).then((res) => res.json());
        const locales: { code: string; name: { english: string } }[] = await fetch(localesURL!).then((res) =>
            res.json()
        );

        const selectElements = this.shadowRoot?.querySelectorAll("ce-select");
        const styleSelect = Array.from(selectElements!).find((element) => element.id === "style-select");
        const localeSelect = Array.from(selectElements!).find((element) => element.id === "locale-select");

        styleSelect?.populate(
            styles.map((style) => ({
                value: style.code,
                label: style.name.long,
            }))
        );

        localeSelect?.populate(
            locales.map((locale) => ({
                value: locale.code,
                label: locale.name.english,
            }))
        );

        load("style").then((savedStyle) => {
            if (savedStyle) {
                (this.styleSelect as HTMLSelectElement).value = savedStyle as string;
            } else {
                (this.styleSelect as HTMLSelectElement).value = "apa";
            }
        });

        load("locale").then((savedLocale) => {
            if (savedLocale) {
                (this.localeSelect as HTMLSelectElement).value = savedLocale as string;
            } else {
                (this.localeSelect as HTMLSelectElement).value = "en-US";
            }
        });
    }

    private async getCitation(style: string, locale: string) {
        const value = this._value;
        const type = this._type;

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
            case "HTML":
                await parser.fromHTML(value, { prioritizeIdentifiers: ["DOI", "PMID", "PMCID"] });
        }
        /* eslint-enable indent */

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

        const style = this.styleSelect?.value;
        const locale = this.localeSelect?.value;

        if (!style || !locale) return;

        try {
            const [reference, intext] = await this.getCitation(style, locale);

            if (reference && intext) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(reference, "text/html");

                const cslEntry = doc.querySelector(".csl-entry") as HTMLDivElement;
                const cslLeftMargins = doc.querySelectorAll(".csl-left-margin");
                const style = this.styleSelect?.value || "";

                cslLeftMargins.forEach((cslLeftMargin) => {
                    const sibling = cslLeftMargin.previousElementSibling;
                    if (sibling && sibling.classList.contains("csl-block")) {
                        cslLeftMargin.remove();
                    }
                });

                if (/^(apa|modern-language-association|chicago)/.test(style)) {
                    cslEntry.classList.add("hanging-indentation");
                } else {
                    cslEntry.classList.remove("hanging-indentation");
                }

                const cleanedReference = doc.body.innerHTML;

                referenceElement.innerHTML = cleanedReference;
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

    private updateContent() {
        const type = this.type;
        const value = this.value;
        const dataType = this.getAttribute("data-type");
        const dataValue = this.getAttribute("data-value");

        this.titleElement!.textContent = `${dataType === "HTML" ? "" : dataType || type + ": "}${dataValue || value}`;

        this.referenceElement!.onkeydown = (event) => {
            // @ts-expect-error
            if (event.key === "Enter") this.referenceElement?.onclick(event);
        };

        this.intextElement!.onkeydown = (event) => {
            // @ts-expect-error
            if (event.key === "Enter") this.intextElement?.onclick(event);
        };

        this.styleSelect = this.shadowRoot?.querySelector("#style-select") as HTMLSelectElement;
        this.localeSelect = this.shadowRoot?.querySelector("#locale-select") as HTMLSelectElement;

        this.styleSelect.addEventListener("change", () => {
            this.updateDialog();
            save("style", this.styleSelect?.value);
        });
        this.localeSelect.addEventListener("change", () => {
            this.updateDialog();
            save("locale", this.localeSelect?.value);
        });

        if (type.length && value.length) this.updateDialog();
    }

    set type(newType: string) {
        this._type = newType;
        this.setAttribute("type", newType);
        this.updateContent();
    }

    get type(): string {
        return this._type;
    }

    set value(newValue: string) {
        this._value = newValue;
        this.setAttribute("value", newValue);
        this.updateContent();
    }

    get value(): string {
        return this._value;
    }

    set floating(newValue: boolean) {
        this._floating = newValue;

        if (this._floating) {
            this.classList.add("floating");

            const closeButton = document.createElement("button");
            closeButton.textContent = "×";
            closeButton.className = "close-button";
            closeButton.addEventListener("click", () => this.remove());

            const dialogHeader = this.shadowRoot?.querySelector(".dialog-header");
            dialogHeader?.appendChild(closeButton);
        } else {
            this.classList.remove("floating");
            const closeButton = this.shadowRoot?.querySelector(".close-button");
            if (closeButton) closeButton.remove();
        }
    }

    get floating(): boolean {
        return this._floating;
    }
}

customElements.define("ce-dialog", CeDialog);
