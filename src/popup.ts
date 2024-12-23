import "./CeDialog";

async function main() {
    const dialog = document.querySelector("ce-dialog");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        dialog?.setAttribute("data-value", tabs[0].url!);
        dialog?.setAttribute("data-type", "HTML");

        chrome.scripting.executeScript(
            {
                target: { tabId: tabs[0].id as number },
                func: () => document.documentElement.outerHTML,
            },
            (results) => {
                const html = results[0].result as string;

                const cleanHtml = (html: string): string => {
                    const tagsToRemove = [
                        "script",
                        "style",
                        "noscript",
                        "link",
                        "svg",
                        "path",
                        "rect",
                        "circle",
                        "img",
                        "input",
                        "textarea",
                        "br",
                        "hr",
                    ];

                    tagsToRemove.forEach((tag) => {
                        const pairedTagRegex = new RegExp(`<${tag}[^>]*?>.*?<\\/${tag}>`, "gis");
                        html = html.replace(pairedTagRegex, "");

                        const selfClosingTagRegex = new RegExp(`<${tag}[^>]*?\\s*/?>`, "gis");
                        html = html.replace(selfClosingTagRegex, "");
                    });

                    const commentRegex = /<!--[\s\S]*?-->/g;
                    html = html.replace(commentRegex, "");

                    html = html.replace(/>\s+</g, "><");
                    html = html.replace(/\s+/g, " ");
                    html = html.trim();

                    return html;
                };

                const cleanedHtml = cleanHtml(html);

                dialog!.value = cleanedHtml;
                dialog!.type = "HTML";
            }
        );
    });
}

main();
