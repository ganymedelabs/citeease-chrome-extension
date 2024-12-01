const Citeproc = require("citeproc");
const { uid } = require("./utils");

class CSLJsonParser {
    constructor(cslJson) {
        this.cslJson = cslJson || [];
    }

    #CORS_PROXY = "https://corsproxy.io/?";

    async #getCslFile(style) {
        const response = await fetch(
            `https://raw.githubusercontent.com/citation-style-language/styles/master/${style}.csl`
        );
        const text = await response.text();

        return text;
    }

    #getLocaleFile(lang) {
        const xhr = new XMLHttpRequest();
        xhr.open(
            "GET",
            `https://raw.githubusercontent.com/citation-style-language/locales/master/locales-${lang}.xml`,
            false
        );
        xhr.send(null);
        const text = xhr.responseText;

        return text;
    }

    #createAuthorsArray(authors) {
        return authors.map((author) => {
            const names = author.split(/\s+/);
            const given = names.shift() || "";
            const family = names.join(" ");
            return { given, family };
        });
    }

    #createDateObject(yearOrDate, month, day) {
        let year;
        let adjustedMonth;
        let adjustedDay;

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

    async #retryWithDelay(func, retries = 2, delay = 1000) {
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
    }

    async fromDOI(doi) {
        return this.#retryWithDelay(async () => {
            const response = await fetch(`${this.#CORS_PROXY}https://api.crossref.org/works/${doi}`);
            const data = await response.json();
            const { message } = data;

            const newCslJsonObject = {
                id: uid(),
                DOI: message.DOI,
                URL: message.URL || (message.DOI ? `https://doi.org/${message.DOI}` : undefined),
                ISSN: message.ISSN,
                "container-title": message["container-title"][0],
                issue: message.issue,
                issued: message.issued,
                page: message.page,
                publisher: message.publisher,
                "publisher-place": message["publisher-place"],
                source: message.source,
                title: message.title[0],
                volume: message.volume,
                type: message.type,
                accessed: this.#createDateObject(new Date()),
                author: message.author,
            };

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
        });
    }

    async fromISBN(isbn) {
        return this.#retryWithDelay(async () => {
            const response = await fetch(
                `https://openlibrary.org/search.json?q=isbn:${isbn}&mode=everything&fields=*,editions`
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
                author: this.#createAuthorsArray(docs?.author_name),
                publisher: edition?.publisher?.[0],
                "publisher-place": edition?.publish_place?.[0],
                ISBN: edition?.isbn?.[0] || isbn,
                issued: publishDate ? this.#createDateObject(publishDate) : undefined,
                accessed: this.#createDateObject(new Date()),
            };

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
        });
    }

    async fromPMCID(pmcid) {
        return this.#retryWithDelay(async () => {
            const pmcIdWithoutPrefix = pmcid.replace(/^PMC/, "");

            const response = await fetch(
                `${this.#CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=${pmcIdWithoutPrefix}`
            );
            const data = await response.json();

            let newCslJsonObject;

            if (data?.DOI) {
                newCslJsonObject = await this.fromDOI(data.DOI);
            } else {
                newCslJsonObject = {
                    id: uid(),
                    URL: data?.URL,
                    ISSN: data?.ISSN,
                    "container-title": data?.["container-title"],
                    issue: data?.issue,
                    issued: data?.issued,
                    page: data?.page,
                    "publisher-place": data?.["publisher-place"],
                    source: data?.source,
                    title: data?.title,
                    type: data?.type,
                    volume: data?.volume,
                    accessed: this.#createDateObject(new Date()),
                    author: data?.author,
                };

                this.cslJson.push(newCslJsonObject);
            }

            return newCslJsonObject;
        });
    }

    async fromPMID(pmid) {
        return this.#retryWithDelay(async () => {
            const response = await fetch(
                `${this.#CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=${pmid}`
            );
            const data = await response.json();

            let newCslJsonObject;

            if (data?.DOI) {
                newCslJsonObject = await this.fromDOI(data.DOI);
            } else {
                newCslJsonObject = {
                    id: uid(),
                    URL: data?.URL,
                    ISSN: data?.ISSN,
                    "container-title": data?.["container-title"],
                    issue: data?.issue,
                    issued: data?.issued,
                    page: data?.page,
                    "publisher-place": data?.["publisher-place"],
                    source: data?.source,
                    title: data?.title,
                    type: data?.type,
                    volume: data?.volume,
                    accessed: this.#createDateObject(new Date()),
                    author: data?.author,
                };

                this.cslJson.push(newCslJsonObject);
            }

            return newCslJsonObject;
        });
    }

    async fromHTML(html, options) {
        return this.#retryWithDelay(async () => {
            const { prioritizeIdentifiers = [], url = undefined, citeAsArticle = false } = options;

            const parser = new DOMParser();
            const document = parser.parseFromString(String(html), "text/html");

            const extractContent = (selector, attr, firstElementOnly = true) => {
                const elements = document.querySelectorAll(selector);
                const valuesArray = Array.from(elements).map((element) =>
                    attr ? element.getAttribute(attr) || "" : element.textContent || ""
                );

                if (valuesArray.length === 0) return undefined;
                return firstElementOnly ? valuesArray[0] : valuesArray;
            };

            const getAvailableIdentifiers = () => {
                let pmidMatch;
                let pmcidMatch;
                let doiMatch;

                if (url.startsWith("https://pubmed.ncbi.nlm.nih.gov")) {
                    const keywords = extractContent('meta[name="keywords"]', "content");

                    pmidMatch = keywords.match(/pmid:\d+/);
                    pmcidMatch = keywords.match(/PMC\d+/);
                    doiMatch = keywords.match(/doi:[^,]+/);
                }

                const doiMetas = [
                    'meta[name="publication_doi"]',
                    'meta[name="citation_doi"]',
                    'meta[name="wkhealth_doi"]',
                ];

                const pmidMetas = ['meta[name="citation_pmid"]', 'meta[name="ncbi_uid"]'];

                const doi =
                    extractContent(doiMetas.join(", "), "content") ||
                    (doiMatch && doiMatch[0] ? doiMatch[0].replace("doi:", "") : undefined);

                const pmid =
                    extractContent(pmidMetas.join(", "), "content") ||
                    (pmidMatch && pmidMatch[0] ? pmidMatch[0].replace("pmid:", "") : undefined);

                const pmcid = pmcidMatch && pmcidMatch[0] ? pmcidMatch[0] : undefined;

                return { doi, pmid, pmcid };
            };

            if (prioritizeIdentifiers.length) {
                const { doi, pmid, pmcid } = getAvailableIdentifiers();

                for (let i = 0; i < prioritizeIdentifiers.length; i += 1) {
                    switch (prioritizeIdentifiers[i]) {
                        case "DOI":
                            if (doi) return await this.fromDOI(doi);
                            continue;
                        case "PMID":
                            if (pmid) return await this.fromPMID(pmid);
                            continue;
                        case "PMCID":
                            if (pmcid) return await this.fromPMCID(pmcid);
                            continue;
                        default:
                            continue;
                    }
                }
            }

            let newCslJsonObject;
            const contentType = extractContent(
                'meta[name="citation_article_type"], meta[property="og:type"], meta[name="dc.type"]',
                "content"
            );

            if (citeAsArticle || /(article|Article)/.test(contentType)) {
                const firstPage = parseInt(
                    extractContent(
                        'meta[name="citation_first_page"], meta[name="wkhealth_first_page"], meta[name="prism.startingPage"]',
                        "content"
                    )
                );
                const lastPage = parseInt(
                    extractContent(
                        'meta[name="citation_last_page"], meta[name="wkhealth_last_page"], meta[name="prism.endingPage"]',
                        "content"
                    )
                );
                const authorsArray =
                    extractContent('meta[name="citation_author"]', "content", false) ||
                    extractContent('meta[name="wkhealth_authors"]', "content").split(";") ||
                    extractContent('meta[name="dc.creator"]', "content", false);

                newCslJsonObject = {
                    id: uid(),
                    type: contentType || "article",
                    DOI: extractContent(
                        'meta[name="DOI"], meta[name="citation_doi"], meta[name="wkhealth_doi"], meta[name="prism.doi"]',
                        "content"
                    ).replace("doi:", ""),
                    URL:
                        extractContent(
                            'meta[name="citation_fulltext_html_url"], meta[name="wkhealth_fulltext_html_url"], meta[name="prism.url"]',
                            "content"
                        ) || url,
                    ISSN: extractContent('meta[name="citation_issn"], meta[name="wkhealth_issn"]', "content"),
                    "container-title": extractContent(
                        'meta[name="citation_journal_title"], meta[name="wkhealth_journal_title"], meta[name="prism.issn"]',
                        "content"
                    ),
                    "container-title-short": extractContent('meta[name="citation_journal_abbrev"]', "content"),
                    issue: extractContent(
                        'meta[name="citation_issue"], meta[name="wkhealth_issue"], meta[name="prism.number"]',
                        "content"
                    ),
                    issued: this.#createDateObject(
                        new Date(
                            extractContent(
                                'meta[name="citation_publication_date"], meta[name="citation_online_date"], meta[name="wkhealth_article_publication_date"], meta[name="wkhealth_date"], meta[name="dc.date"], meta[name="prism.publicationDate"]',
                                "content"
                            )
                        )
                    ),
                    page: firstPage && lastPage ? lastPage - firstPage : undefined,
                    publisher: extractContent(
                        'meta[name="citation_publisher"], meta[name="dc.publisher"], meta[name="prism.publicationName"]',
                        "content"
                    ),
                    title: extractContent('meta[name="citation_title"], meta[name="wkhealth_title"]', "content"),
                    volume: extractContent(
                        'meta[name="citation_volume"], meta[name="wkhealth_volume"], meta[name="prism.volume"]',
                        "content"
                    ),
                    accessed: this.#createDateObject(new Date()),
                    author: this.#createAuthorsArray(authorsArray),
                };
            } else {
                newCslJsonObject = {
                    id: uid(),
                    type: "webpage",
                    title: extractContent("title") || extractContent('meta[property="og:title"]', "content"),
                    author: extractContent('meta[name="author"], meta[name="article:author"]', "content"),
                    "container-title": this.#createAuthorsArray(
                        extractContent('meta[property="og:site_name"], meta[name="Title"]', "content")
                    ),
                    publisher: extractContent('meta[property="article:publisher"]', "content"),
                    accessed: this.#createDateObject(new Date()),
                    issued: this.#createDateObject(new Date(extractContent('meta[name="date"]', "content") || "")),
                    URL: extractContent('meta[property="og:url"]', "content") || url,
                };
            }

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
        });
    }

    async fromURL(url) {
        return this.#retryWithDelay(async () => {
            const response = await fetch(`${this.#CORS_PROXY}${url}`);
            const text = await response.text();

            const newCslJsonObject = await this.fromHTML(text, { url: url });

            return newCslJsonObject;
        });
    }

    async toBibliography(options) {
        return new Promise(async (resolve) => {
            try {
                const { style = "apa", locale = "en-US", format = "html" } = options;

                const citations = {};
                const itemIDs = [];
                for (let i = 0, length = this.cslJson.length; i < length; i += 1) {
                    const item = this.cslJson[i];
                    const id = item.id;
                    citations[id] = item;
                    itemIDs.push(id);
                }

                const processorFunctions = {
                    retrieveLocale: () => this.#getLocaleFile(locale),
                    retrieveItem: (id) => citations[id],
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

                const getFormattedCitations = async () => {
                    const cslFile = await this.#getCslFile(style);
                    const citeproc = new Citeproc.Engine(processorFunctions, cslFile);
                    citeproc.setOutputFormat(format.toLowerCase());
                    citeproc.updateItems(itemIDs);
                    const references = citeproc.makeBibliography();
                    const intext = citeproc.previewCitationCluster(intextConfig, [], [], "html");
                    return [references[1].join(format.toLowerCase() === "rtf" ? "\n" : ""), intext];
                };

                resolve(await getFormattedCitations());
            } catch (error) {
                console.error(error);
                resolve(null);
            }
        });
    }
}

module.exports = CSLJsonParser;
