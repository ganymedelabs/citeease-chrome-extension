# CiteEase Chrome Extension

![Code size](https://custom-icon-badges.demolab.com/github/languages/code-size/ganemedelabs/citeease-chrome-extension?logo=file-code&logoColor=white)
![JavaScript](https://custom-icon-badges.demolab.com/badge/JavaScript-Vanilla-F7DF1E.svg?logo=javascript&logoColor=white)
![License](https://custom-icon-badges.demolab.com/github/license/ganemedelabs/citeease-chrome-extension?logo=law)

CiteEase is a powerful, lightweight Chrome extension that simplifies the citation process for researchers, students, and professionals. It automatically highlights citation-worthy elements such as URLs, DOIs, PMIDs, PMCIDs, and ISBNs on the current webpage and provides an easy-to-use citation tool.

![Screenshot](static/images/screenshot.png)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Data Sources](#-data-sources)
- [License](#-license)
- [Contact](#-contact)
- [Credits](#-credits)

## ✨ Features

- **Automatic Detection**: Scans the current webpage and highlights URLs, DOIs, PMIDs, PMCIDs, and ISBNs.
- **Inline Citation Tool**: Displays a "Cite" button next to each highlighted element. Clicking this button opens a dialog with a reference list entry formatted in your preferred citation style with it's in-text citation.
- **Page-Level Citation**: Use the extension's popup to generate citations for the webpage itself, complete with reference list entry and in-text citation.

## 🔧 Installation

1. Clone the repository or download the zip file:  
   ```bash
   git clone https://github.com/ganemedelabs/citeease-chrome-extension.git
   ```
2. Navigate to the project directory and build the project by running:  
   ```bash
   npm run build
   ```
3. Open Chrome and go to `chrome://extensions/`.  
4. Enable **Developer Mode** using the toggle in the top-right corner.  
5. Click **Load Unpacked** and select the `dist` folder.  
6. CiteEase is now ready to use!  

## 🌐 Data Sources

CiteEase uses the following free APIs to retrieve citation data:

- [CrossRef](https://www.crossref.org/documentation/retrieve-metadata/rest-api/): For DOI-based data, e.g., `https://api.crossref.org/works/<DOI>`
- [Open Library](https://openlibrary.org/developers/api): For ISBN-based data, e.g., `https://openlibrary.org/search.json?q=isbn:<ISBN>&mode=everything&fields=*,editions`
- [NCBI](https://api.ncbi.nlm.nih.gov/lit/ctxp/): For data from PubMed and PubMed Central, e.g., `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=<PMID>` and `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=<PMCID>`

These APIs provide open-access data for research and citation.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganemedelabs@gmail.com](mailto:ganemedelabs@gmail.com).

## 🙏 Credits

1. CiteEase Chrome Extension utilizes CSL style files from [Citation Style Language Styles](https://github.com/citation-style-language/styles) and XML locales files from [Citation Style Language Locales](https://github.com/citation-style-language/locales), both of which are licensed under the [Creative Commons Attribution-ShareAlike 3.0 Unported License](https://creativecommons.org/licenses/by-sa/3.0/).
2. Icon used in this extension is by [Pikselan](https://www.freepik.com/icon/science_15060166) on Freepik.
