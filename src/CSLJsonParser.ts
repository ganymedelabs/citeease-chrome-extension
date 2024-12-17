// @ts-ignore
import Citeproc from "citeproc";
import { load, save, uid } from "./utils";
import { type AuthorsArray, type CSLJson, type DateObject } from "./types";

type Options = {
    includeCache?: ("style" | "locale" | "cslJson")[];
    cacheLimit?: number;
    cecheGet?: (key: string) => Promise<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    cacheSet?: (key: string, value: any) => Promise<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
};

type ToBibliographyOptions = {
    style?: string;
    locale?: string;
    format?: "text" | "html" | "rtf" | "asciidoc";
};

type FromHTMLOptions = { prioritizeIdentifiers?: string[]; url?: string; citeAsArticle?: boolean };

type CacheEntry = {
    data: string;
    headers: [string, string][];
    status: number;
    statusText: string;
    timestamp: number;
};

const localeCache: Record<string, string> = (await load("localeFiles")) || {};

class CSLJsonParser {
    private cslJson: CSLJson[];
    private options: Options;
    private CORS_PROXY = "https://corsproxy.io/?";

    constructor(cslJson?: CSLJson[], options?: Options) {
        this.cslJson = cslJson || [];
        this.options = {
            includeCache: ["style", "locale", "cslJson"],
            cacheLimit: 10,
            cecheGet: load,
            cacheSet: save,
            ...options,
        };
    }

    getCslJson() {
        return [...this.cslJson];
    }

    private async fetchWithCache(url: string, storageKey?: string, fetchOptions?: RequestInit): Promise<Response> {
        if (!storageKey) {
            return await fetch(url, fetchOptions);
        }

        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const cache: Record<string, CacheEntry> = (await load(storageKey)) || {};
        const cachedEntry = cache[url];

        if (cachedEntry) {
            const isOlderThanWeek = now - cachedEntry.timestamp > ONE_WEEK;
            const isOffline = !navigator.onLine;

            if (!isOlderThanWeek || isOffline) {
                if (!cachedEntry.data) {
                    console.warn("Cached entry has empty data. Ignoring cache.");
                    delete cache[url];
                    await save(storageKey, cache);
                    return await fetch(url, fetchOptions);
                }

                return new Response(cachedEntry.data, {
                    headers: new Headers(cachedEntry.headers),
                    status: cachedEntry.status,
                    statusText: cachedEntry.statusText,
                });
            }
        }

        const response = await fetch(url, fetchOptions);
        const responseClone = response.clone();

        let data: string;
        try {
            data = await responseClone.text();

            if (!data) {
                throw new Error("Empty response body");
            }
        } catch (error) {
            console.error("Failed to fetch response data:", error);
            throw new Error("Error retrieving response body");
        }

        const headersArray: [string, string][] = [];
        responseClone.headers.forEach((value, key) => {
            headersArray.push([key, value]);
        });

        cache[url] = {
            data,
            headers: headersArray,
            status: responseClone.status,
            statusText: responseClone.statusText,
            timestamp: now,
        };

        const keys = Object.keys(cache);
        if (keys.length > (this.options.cacheLimit as number)) {
            const oldestKey = keys.reduce(
                (oldest, key) => (cache[key].timestamp < cache[oldest].timestamp ? key : oldest),
                keys[0]
            );
            delete cache[oldestKey];
        }

        await save(storageKey, cache);

        return response;
    }

    private async getStyleFile(style: string) {
        const response = await this.fetchWithCache(
            `https://raw.githubusercontent.com/citation-style-language/styles/master/${style}.csl`,
            this.options.includeCache?.includes("style") ? "styleFiles" : undefined
        );
        const text = await response.text();

        return text;
    }

    // WATCH: citeproc can't work with asynchronous function for processorFunctions.retrieveLocale
    private getLocaleFile(lang: string): string {
        const storageKey = "localeFiles";

        if (this.options.includeCache?.includes("locale") && localeCache[lang]) {
            return localeCache[lang];
        }

        const xhr = new XMLHttpRequest();
        xhr.open(
            "GET",
            `https://raw.githubusercontent.com/citation-style-language/locales/master/locales-${lang}.xml`,
            false
        );
        xhr.send(null);

        const text = xhr.responseText;

        localeCache[lang] = text;

        const keys = Object.keys(localeCache);
        if (keys.length > (this.options.cacheLimit as number)) {
            const oldestKey = keys[0];
            delete localeCache[oldestKey];
        }

        save(storageKey, localeCache);

        return text;
    }

    private createAuthorsArray(authors: string[]): AuthorsArray {
        if (!Array.isArray(authors)) return [];
        return authors.map((author) => {
            const names = author.split(/\s+/);
            const given = names.shift() || "";
            const family = names.join(" ");
            return { given, family };
        });
    }

    private createDateObject(yearOrDate: number | Date, month?: number, day?: number): DateObject {
        let year: number;
        let adjustedMonth: number | undefined;
        let adjustedDay: number | undefined;

        if (yearOrDate instanceof Date) {
            year = yearOrDate.getFullYear();
            adjustedMonth = yearOrDate.getMonth() + 1;
            adjustedDay = yearOrDate.getDate();
        } else {
            year = yearOrDate;
            adjustedMonth = month;
            adjustedDay = day;
        }

        const dateParts = [year];
        if (adjustedMonth) dateParts.push(adjustedMonth);
        if (adjustedDay) dateParts.push(adjustedDay);

        return { "date-parts": [dateParts] };
    }

    private async retryWithDelay<T>(func: () => Promise<T>, retries: number = 2, delay: number = 1000): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await func();
            } catch (error) {
                if (i < retries - 1) {
                    console.warn(`Retrying... (${i + 1}/${retries})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

        throw new Error("Unreachable code: retryWithDelay loop exited unexpectedly");
    }

    async fromDOI(doi: string): Promise<this> {
        return this.retryWithDelay(async () => {
            const response = await this.fetchWithCache(
                `https://api.crossref.org/works/${doi}`,
                this.options.includeCache?.includes("cslJson") ? "cslJson" : undefined
            );
            const data = await response.json();
            const { message } = data;

            const newCslJsonObject = {
                id: uid(),
                DOI: message.DOI,
                URL:
                    message.URL ||
                    message.resource.primary.URL ||
                    (message.DOI ? `https://doi.org/${message.DOI}` : undefined),
                ISSN: [...message.ISSN],
                "container-title": message["container-title"][0],
                "container-title-short": message["short-container-title"][0],
                issue: message.issue,
                issued: message.issued || message.published,
                page: message.page,
                publisher: message.publisher,
                "publisher-place": message["publisher-place"],
                source: message.source,
                title: message.title[0],
                volume: message.volume,
                type: message.type,
                accessed: this.createDateObject(new Date()),
                author: message.author,
            };

            this.cslJson.push(newCslJsonObject);
            return this;
        });
    }

    async fromISBN(isbn: string): Promise<this> {
        return this.retryWithDelay(async () => {
            const response = await this.fetchWithCache(
                `https://openlibrary.org/search.json?q=isbn:${isbn}&mode=everything&fields=*,editions`,
                this.options.includeCache?.includes("cslJson") ? "cslJson" : undefined
            );

            const data = await response.json();

            const docs = data.docs[0];
            const edition = docs?.editions?.docs[0];

            const publishDate = edition?.publish_date?.[0] ? new Date(edition.publish_date[0]) : undefined;

            const newCslJsonObject = {
                id: uid(),
                type: "book",
                title: docs?.title,
                "number-of-pages": docs?.number_of_pages_median,
                author: this.createAuthorsArray(docs?.author_name),
                publisher: edition?.publisher?.[0],
                "publisher-place": edition?.publish_place?.[0],
                ISBN: edition?.isbn?.[0] || isbn,
                issued: publishDate ? this.createDateObject(publishDate) : undefined,
                accessed: this.createDateObject(new Date()),
            };

            this.cslJson.push(newCslJsonObject);
            return this;
        });
    }

    private async fromPubmed(identifier: string, identifierType: "PMCID" | "PMID") {
        let url: string;

        /* eslint-disable indent */
        switch (identifierType) {
            case "PMCID":
                url = `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=${identifier}`;
                break;
            case "PMID":
                url = `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=${identifier}`;
                break;
            default:
                throw new Error(`couldn't recognize Pubmed identifier: ${identifierType}`);
        }
        /* eslint-enable indent */

        const response = await this.fetchWithCache(
            url,
            this.options.includeCache?.includes("cslJson") ? "cslJson" : undefined
        );
        const data = await response.json();

        const newCslJsonObject = {
            id: uid(),
            DOI: data?.DOI,
            URL: data.URL || (data.DOI ? `https://doi.org/${data.DOI}` : undefined),
            ISSN: [data?.ISSN],
            "container-title": data?.["container-title"],
            issue: data?.issue,
            issued: data?.issued,
            page: data?.page,
            "publisher-place": data?.["publisher-place"],
            source: data?.source,
            title: data?.title,
            type: data?.type,
            volume: data?.volume,
            accessed: this.createDateObject(new Date()),
            author: data?.author,
        };

        this.cslJson.push(newCslJsonObject);
    }

    async fromPMCID(pmcid: string): Promise<this> {
        return this.retryWithDelay(async () => {
            const pmcIdWithoutPrefix = pmcid.replace(/^PMC/, "");
            await this.fromPubmed(pmcIdWithoutPrefix, "PMCID");
            return this;
        });
    }

    async fromPMID(pmid: string): Promise<this> {
        return this.retryWithDelay(async () => {
            await this.fromPubmed(pmid, "PMID");
            return this;
        });
    }

    async fromHTML(html: string, options?: FromHTMLOptions): Promise<this> {
        /* eslint-disable quotes */
        const { prioritizeIdentifiers = [], citeAsArticle = false } = options || {};
        let { url } = options || {};

        const parser = new DOMParser();
        const document = parser.parseFromString(String(html), "text/html");

        const extractContent = (selector: string, attr?: string, firstOnly = true): string | string[] | undefined => {
            const elements = document.querySelectorAll(selector);
            const values = Array.from(elements).map((el) =>
                attr ? el.getAttribute(attr) || "" : el.textContent || ""
            );
            return values.length === 0 ? undefined : firstOnly ? values[0] : values;
        };

        if (!url) {
            url = (extractContent('meta[property="og:url"]', "content") as string) || "";
        }

        const getAvailableIdentifiers = () => {
            let pmid, pmcid, doi;

            if (url.startsWith("https://pubmed.ncbi.nlm.nih.gov")) {
                const keywords = extractContent('meta[name="keywords"]', "content") as string;
                pmid = keywords.match(/pmid:\d+/)?.[0]?.replace("pmid:", "");
                pmcid = keywords.match(/PMC\d+/)?.[0];
                doi = keywords.match(/doi:[^,]+/)?.[0]?.replace("doi:", "");
            }

            const doiMetas = ['meta[name="publication_doi"]', 'meta[name="citation_doi"]', 'meta[name="wkhealth_doi"]'];
            const pmidMetas = ['meta[name="citation_pmid"]', 'meta[name="ncbi_uid"]'];

            doi = doi || (extractContent(doiMetas.join(", "), "content") as string);
            pmid = pmid || (extractContent(pmidMetas.join(", "), "content") as string);

            return { doi, pmid, pmcid };
        };

        /* eslint-disable indent */
        if (prioritizeIdentifiers.length) {
            const { doi, pmid, pmcid } = getAvailableIdentifiers();
            for (const identifier of prioritizeIdentifiers) {
                switch (identifier) {
                    case "DOI":
                        if (doi) return await this.fromDOI(doi);
                        break;
                    case "PMID":
                        if (pmid) return await this.fromPMID(pmid);
                        break;
                    case "PMCID":
                        if (pmcid) return await this.fromPMCID(pmcid);
                        break;
                    default:
                        break;
                }
            }
        }
        /* eslint-enable indent */

        const createArticleCslJson = () => {
            const contentType = extractContent(
                'meta[name="citation_article_type"], meta[property="og:type"], meta[name="dc.type"]',
                "content"
            ) as string;

            const firstPage = parseInt(
                extractContent(
                    'meta[name="citation_first_page"], meta[name="wkhealth_first_page"], meta[name="prism.startingPage"]',
                    "content"
                ) as string
            );
            const lastPage = parseInt(
                extractContent(
                    'meta[name="citation_last_page"], meta[name="wkhealth_last_page"], meta[name="prism.endingPage"]',
                    "content"
                ) as string
            );

            const authorsArray =
                extractContent('meta[name="citation_author"]', "content", false) ||
                (extractContent('meta[name="wkhealth_authors"]', "content") as string).split(";") ||
                extractContent('meta[name="dc.creator"]', "content", false);

            return {
                id: uid(),
                type: contentType || "article",
                DOI: (
                    extractContent(
                        'meta[name="DOI"], meta[name="citation_doi"], meta[name="wkhealth_doi"], meta[name="prism.doi"]',
                        "content"
                    ) as string
                ).replace("doi:", ""),
                URL:
                    extractContent(
                        'meta[name="citation_fulltext_html_url"], meta[name="wkhealth_fulltext_html_url"], meta[name="prism.url"]',
                        "content"
                    ) || url,
                ISSN: [extractContent('meta[name="citation_issn"], meta[name="wkhealth_issn"]', "content") as string],
                "container-title": extractContent(
                    'meta[name="citation_journal_title"], meta[name="wkhealth_journal_title"], meta[name="prism.issn"]',
                    "content"
                ) as string,
                "container-title-short": extractContent('meta[name="citation_journal_abbrev"]', "content") as string,
                issue: extractContent(
                    'meta[name="citation_issue"], meta[name="wkhealth_issue"], meta[name="prism.number"]',
                    "content"
                ) as string,
                issued: this.createDateObject(
                    new Date(
                        extractContent(
                            'meta[name="citation_publication_date"], meta[name="citation_online_date"], meta[name="wkhealth_article_publication_date"], meta[name="wkhealth_date"], meta[name="dc.date"], meta[name="prism.publicationDate"]',
                            "content"
                        ) as string
                    )
                ),
                page: firstPage && lastPage ? (lastPage - firstPage).toString() : undefined,
                publisher: extractContent(
                    'meta[name="citation_publisher"], meta[name="dc.publisher"], meta[name="prism.publicationName"]',
                    "content"
                ) as string,
                title: extractContent('meta[name="citation_title"], meta[name="wkhealth_title"]', "content") as string,
                volume: extractContent(
                    'meta[name="citation_volume"], meta[name="wkhealth_volume"], meta[name="prism.volume"]',
                    "content"
                ) as string,
                accessed: this.createDateObject(new Date()),
                author: this.createAuthorsArray(authorsArray as string[]),
            };
        };

        let newCslJsonObject: CSLJson;
        const contentType = extractContent(
            'meta[name="citation_article_type"], meta[property="og:type"], meta[name="dc.type"], meta[name="prism.section"]',
            "content"
        ) as string;

        if (citeAsArticle || /(Article|ReviewPaper)/i.test(contentType)) {
            newCslJsonObject = createArticleCslJson() as CSLJson;
        } else {
            newCslJsonObject = {
                id: uid(),
                type: "webpage",
                title: (extractContent("title") || extractContent('meta[property="og:title"]', "content")) as string,
                author: this.createAuthorsArray(
                    extractContent('meta[name="author"], meta[name="article:author"]', "content", false) as string[]
                ),
                "container-title": extractContent(
                    'meta[property="og:site_name"], meta[name="Title"]',
                    "content"
                ) as string,
                publisher: extractContent('meta[property="article:publisher"]', "content") as string,
                accessed: this.createDateObject(new Date()),
                issued: this.createDateObject(new Date(extractContent('meta[name="date"]', "content") as string)),
                URL: url,
            };
        }

        this.cslJson.push(newCslJsonObject);
        return this;
    }
    /* eslint-enable quotes */

    async fromURL(url: string): Promise<this> {
        const secureUrl = url.startsWith("http://") ? url.replace("http://", "https://") : url;

        return this.retryWithDelay(async () => {
            const response = await this.fetchWithCache(
                secureUrl,
                this.options.includeCache?.includes("cslJson") ? "cslJson" : undefined,
                { mode: "no-cors" }
            );
            const text = await response.json();

            await this.fromHTML(text, { url: secureUrl });

            return this;
        });
    }

    async toBibliography(options: ToBibliographyOptions): Promise<[string, string]> {
        return new Promise((resolve) => {
            try {
                const { style = "apa", locale = "en-US", format = "html" } = options;

                const citations: Record<string, CSLJson> = {};
                const itemIDs: string[] = [];
                for (let i = 0, length = this.cslJson.length; i < length; i += 1) {
                    const item = this.cslJson[i];
                    const id = item.id;
                    citations[id] = item;
                    itemIDs.push(id);
                }

                const processorFunctions = {
                    retrieveLocale: () => this.getLocaleFile(locale),
                    retrieveItem: (id: string) => citations[id],
                };

                const intextConfig = {
                    properties: {
                        noteIndex: 0,
                    },
                    citationItems: itemIDs.map((id) => {
                        const targetCitation = processorFunctions.retrieveItem(id);
                        return {
                            id,
                            locator: targetCitation?.locator,
                            label: targetCitation?.label,
                        };
                    }),
                };

                const getFormattedCitations = async (): Promise<[string, string]> => {
                    const styleFile = await this.getStyleFile(style);
                    const citeproc = new Citeproc.Engine(processorFunctions, styleFile);
                    citeproc.setOutputFormat(format.toLowerCase());
                    citeproc.updateItems(itemIDs);
                    const references: string[][] = citeproc.makeBibliography();
                    const intext: string = citeproc.previewCitationCluster(intextConfig, [], [], "html");
                    return [references[1].join(format.toLowerCase() === "rtf" ? "\n" : ""), intext];
                };

                resolve(getFormattedCitations());
            } catch (error) {
                console.error(error);
                resolve(["", ""]);
            }
        });
    }
}

export default CSLJsonParser;
