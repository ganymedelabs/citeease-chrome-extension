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
                dialog!.value = html;
                dialog!.type = "HTML";
            }
        );
    });
}

main();
