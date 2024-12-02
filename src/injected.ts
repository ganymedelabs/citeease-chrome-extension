import "./CiteEaseDialog";
import "./CiteEaseButton";

function addCiteeaseButtons(): void {
    const identifierPatterns: Record<string, RegExp> = {
        DOI: /^((https?:\/\/)?(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/,
        URL: /^(https?:\/\/)[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/,
        PMCID: /^PMC\d+$/,
        PMID: /^\d{7,10}$/,
        ISBN: /^(97[89])(-?\d+){4}(-?\d|X)$/,
    };

    const elements = document.querySelectorAll("body *");
    elements.forEach((element) => {
        const excludedTags = [
            "SCRIPT",
            "STYLE",
            "NONSCRIPT",
            "SVG",
            "PATH",
            "RECT",
            "CIRCLE",
            "IMAGE",
            "IMG",
            "BR",
            "HR",
            "CITE",
        ];
        if (new RegExp(excludedTags.join("|"), "i").test(element.nodeName)) return;

        let text = (element.textContent || "").trim();
        let modified = false;

        for (const [type, regex] of Object.entries(identifierPatterns)) {
            text = text.replace(regex, (match) => {
                modified = true;
                const wrapper = document.createElement("span");
                wrapper.style.background = "#40c2c980";
                wrapper.style.borderRadius = "3px";
                wrapper.style.display = "inline-flex";
                wrapper.style.alignItems = "center";

                const button = document.createElement("citeease-button");
                button.setAttribute("data-type", type);
                button.setAttribute("data-value", match);

                wrapper.innerHTML = match;
                wrapper.appendChild(button);

                return wrapper.outerHTML;
            });
        }

        if (modified) {
            element.innerHTML = text;
        }
    });
}

setTimeout(addCiteeaseButtons, 1000);
