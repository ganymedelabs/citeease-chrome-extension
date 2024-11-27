require("./CiteEaseDialog");
require("./CiteEaseButton");

function addCiteeaseButtons() {
    const identifierPatterns = {
        DOI: /^((https?:\/\/)?(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/,
        URL: /^(https?:\/\/)[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/,
        PMCID: /^PMC\d+$/,
        PMID: /^\d{7,10}$/,
        ISBN: /^(97[89])\d{9}(\d|X)$/,
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

        const text = element.textContent.trim();
        for (const [type, regex] of Object.entries(identifierPatterns)) {
            if (regex.test(text)) {
                element.style.background = "#40c2c980";
                element.style.paddingInline = "2px";
                element.style.borderRadius = "3px";
                element.style.display = "inline-flex";
                element.style.alignItems = "center";

                const button = document.createElement("citeease-button");
                button.setAttribute("data-type", type);
                button.setAttribute("data-value", text);

                element.appendChild(button);
                break;
            }
        }
    });
}

setTimeout(addCiteeaseButtons, 1000);
