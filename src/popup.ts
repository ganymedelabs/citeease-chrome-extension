import CSLJsonParser from "./CSLJsonParser";
import "./CeSelect";

let style: string = "apa";
let locale: string = "en-US";

async function save(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

async function load(key: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
}

async function updateDialog(html: string, currentTabURL: string): Promise<void> {
    const referenceElement = document.getElementById("reference") as HTMLElement;
    const intextElement = document.getElementById("intext") as HTMLElement;

    referenceElement.textContent = "";
    intextElement.textContent = "";
    referenceElement.classList.remove("error");
    intextElement.classList.remove("error");
    referenceElement.classList.add("loading");
    intextElement.classList.add("loading");
    referenceElement.onclick = null;
    intextElement.onclick = null;

    try {
        const parser = new CSLJsonParser();
        await parser.fromHTML(html, { prioritizeIdentifiers: ["DOI", "PMCID", "PMID"], url: currentTabURL });
        const [reference, intext] = await parser.toBibliography({ style, locale });

        if (reference) {
            referenceElement.innerHTML = reference;
            intextElement.innerHTML = intext;
            referenceElement.classList.remove("error", "loading");
            intextElement.classList.remove("error", "loading");

            referenceElement.onclick = () => {
                navigator.clipboard.writeText(referenceElement.textContent?.trim() || "").then(() => {
                    const feedback = document.querySelector("#reference-feedback") as HTMLElement;
                    feedback.textContent = "Copied!";
                    feedback.classList.add("show");
                    setTimeout(() => feedback.classList.remove("show"), 2000);
                });
            };

            intextElement.onclick = () => {
                navigator.clipboard.writeText(intextElement.textContent?.trim() || "").then(() => {
                    const feedback = document.querySelector("#intext-feedback") as HTMLElement;
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
        referenceElement.onclick = null;
        intextElement.onclick = null;
    }
}

async function main(): Promise<void> {
    document.addEventListener("DOMContentLoaded", async () => {
        // const stylesURL = chrome.runtime.getURL("json/styles.json");
        // const localesURL = chrome.runtime.getURL("json/locales.json");
        // const styles: { code: string; name: { long: string } }[] = await fetch(stylesURL).then((res) => res.json());
        // const locales: { code: string; name: { english: string } }[] = await fetch(localesURL).then((res) =>
        //     res.json()
        // );

        // const selectElements = document.querySelectorAll("ce-select");
        // const styleSelect = Array.from(selectElements).find((element) => element.id === "style-select");
        // const localeSelect = Array.from(selectElements).find((element) => element.id === "locale-select");

        // styleSelect?.populate(
        //     styles.map((style) => ({
        //         value: style.code,
        //         label: style.name.long,
        //     }))
        // );

        // localeSelect?.populate(
        //     locales.map((locale) => ({
        //         value: locale.code,
        //         label: locale.name.english,
        //     }))
        // );

        style = (await load("style")) ?? style;
        locale = (await load("locale")) ?? locale;
        (document.getElementById("style-select") as HTMLSelectElement).value = style;
        (document.getElementById("locale-select") as HTMLSelectElement).value = locale;

        const currentTabURL = await new Promise<string>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (result) => resolve(result[0].url as string));
        });
        (document.getElementById("title") as HTMLDivElement).textContent = currentTabURL;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id as number },
                    func: () => document.documentElement.outerHTML,
                },
                (results) => {
                    const html = results[0].result as string;

                    (document.getElementById("style-select") as HTMLSelectElement).addEventListener(
                        "change",
                        (event) => {
                            style = (event.target as HTMLSelectElement).value;
                            save("style", style);
                            updateDialog(html, currentTabURL);
                        }
                    );

                    (document.getElementById("locale-select") as HTMLSelectElement).addEventListener(
                        "change",
                        (event) => {
                            locale = (event.target as HTMLSelectElement).value;
                            save("locale", locale);
                            updateDialog(html, currentTabURL);
                        }
                    );

                    updateDialog(html, currentTabURL);
                }
            );
        });
    });
}

main();
