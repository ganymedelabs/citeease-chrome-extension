/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

const styles = `
    /* css */
    :host {
        --container-width: 5px;
        --container-hover-width: 15px;
        --container-hover-bg: #0000001a;
        --highlight-bg: #40c2c980;
        --highlight-height: 5px;
        --highlight-radius: 1px;
        --transition-fast: 0.2s ease;

        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        z-index: 9999;
    }

    #container {
        width: var(--container-width);
        height: 100%;
        transition: width var(--transition-fast), 
                    background-color var(--transition-fast);
    }

    #container:hover {
        width: var(--container-hover-width);
        background: var(--container-hover-bg);
    }

    .highlight {
        position: absolute;
        left: 0;
        right: 0;
        background: var(--highlight-bg);
        height: var(--highlight-height);
        width: 100%;
        border-radius: var(--highlight-radius);
        transform-origin: center;
        transition: scale var(--transition-fast);
    }

    .highlight:hover {
        scale: 2;
    }
    /* !css */
`;

declare global {
    interface HTMLElementTagNameMap {
        "ce-shc": CeSHC; // CiteEase Scroll Highlight Container
    }
}

class CeSHC extends HTMLElement {
    private highlights: { highlight: HTMLElement; element: HTMLElement }[] = [];
    private throttledUpdateHighlights: () => void = () => {};
    private throttleLimit: number = 500;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.innerHTML = `
            <!--html-->
            <style>${styles}</style>
            <div id="container"></div>
            <!--!html-->
        `;

        this.updateHighlights = this.updateHighlights.bind(this);
    }

    connectedCallback(): void {
        this.throttledUpdateHighlights = this.throttle(this.updateHighlights, this.throttleLimit);
        window.addEventListener("resize", this.throttledUpdateHighlights);
    }

    disconnectedCallback(): void {
        window.removeEventListener("resize", this.throttledUpdateHighlights);
    }

    // eslint-disable-next-line no-unused-vars
    private throttle<T>(func: (...args: T[]) => void, limit: number) {
        let inThrottle: boolean;
        return function (this: T, ...args: T[]) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    addHighlight(element: HTMLElement): void {
        const getValidRect = (element: HTMLElement) => {
            let currentElement = element;
            while (currentElement) {
                const rect = currentElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return rect;
                }
                currentElement = currentElement.parentElement as HTMLElement;
            }
            return null;
        };

        const rect = getValidRect(element);

        if (rect) {
            const container = this.shadowRoot?.getElementById("container") as HTMLElement;
            const position = window.scrollY + rect.top;

            const highlight = document.createElement("div");
            highlight.className = "highlight";
            highlight.style.top = `${(position / document.body.scrollHeight) * 100}%`;

            highlight.addEventListener("click", () => {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            });

            container.appendChild(highlight);
            this.highlights.push({ highlight, element });
        }
    }

    updateHighlights(): void {
        const getValidRect = (element: HTMLElement) => {
            let currentElement = element;
            while (currentElement) {
                const rect = currentElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return rect;
                }
                currentElement = currentElement.parentElement as HTMLElement;
            }
            return null;
        };

        this.highlights.forEach(({ highlight, element }) => {
            const rect = getValidRect(element);
            if (rect) {
                const position = window.scrollY + rect.top;
                highlight.style.top = `${(position / document.body.scrollHeight) * 100}%`;
            } else {
                highlight.style.display = "none";
            }
        });
    }
}

customElements.define("ce-shc", CeSHC);
