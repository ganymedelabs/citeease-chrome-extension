import "./CeDialog";
import "./CeButton";
import "./CeSHC";

const identifierPatterns: Record<string, RegExp> = {
    DOI: /((https?:\/\/)?(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+(?<!\.)/,
    URL: /(https?:\/\/)[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+(?<!\.)/,
    PMCID: /PMC\d+/i,
    PMID: /(?<!\p{L})\d{7,10}(?!\p{L})/u,
    ISBN: /(97[89])(-?\d+){4}(-?\d|X)/,
};

async function processNode(node: Node): Promise<void> {
    return new Promise((resolve) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue?.trim() || "";
            let modified = false;
            const fragment = document.createDocumentFragment();

            let remainingText = text;

            for (const [type, regex] of Object.entries(identifierPatterns)) {
                let match: RegExpExecArray | null;

                while ((match = regex.exec(remainingText)) !== null) {
                    const matchText = match[0];
                    const beforeMatch = remainingText.slice(0, match.index);
                    const afterMatch = remainingText.slice(match.index + matchText.length);

                    if (beforeMatch) {
                        fragment.appendChild(document.createTextNode(beforeMatch));
                    }

                    const wrapper = document.createElement("mark");
                    wrapper.style.background = "#40c2c980";
                    wrapper.style.borderRadius = "3px";
                    wrapper.style.display = "inline-flex";
                    wrapper.style.alignItems = "center";

                    const button = document.createElement("ce-button");
                    button.setAttribute("data-type", type);
                    button.setAttribute("data-value", matchText);

                    wrapper.textContent = matchText;
                    wrapper.appendChild(button);
                    fragment.appendChild(wrapper);

                    setTimeout(() => scrollHighlightContainer.addHighlight(wrapper));

                    remainingText = afterMatch;
                    modified = true;
                }
            }

            if (remainingText) {
                fragment.appendChild(document.createTextNode(remainingText));
            }

            if (modified && node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const excludedTags = [
                "SCRIPT",
                "STYLE",
                "NOSCRIPT",
                "SVG",
                "PATH",
                "RECT",
                "CIRCLE",
                "IMAGE",
                "IMG",
                "BR",
                "HR",
            ];
            if (!excludedTags.includes((node as HTMLElement).tagName)) {
                for (const childNode of Array.from(node.childNodes)) {
                    processNode(childNode);
                }
            }
        }

        resolve(undefined);
    });
}

const scrollHighlightContainer = document.createElement("ce-shc");
document.documentElement.appendChild(scrollHighlightContainer);

setTimeout(() => processNode(document.body), 1000);
