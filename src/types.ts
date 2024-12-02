export type DateObject = { "date-parts": Array<number[]> };

export type AuthorsArray = Array<{ given: string; family: string }>;

export type CSLJson = {
    id: string;
    DOI?: string;
    URL?: string;
    ISSN?: string[];
    ISBN?: string;
    PMID?: string;
    PMCID?: string;
    "container-title"?: string;
    "container-title-short"?: string;
    issue?: string;
    issued?: DateObject;
    page?: string;
    "number-of-pages"?: number;
    "publisher-place"?: string;
    source?: string;
    title?: string;
    volume?: string;
    type?: string;
    accessed?: DateObject;
    publisher?: string;
    author?: AuthorsArray;
    locator?: string;
    label?: string;
};
