/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

const styles = `
    /* css */
    * {
        box-sizing: border-box;
    }

    :host {
        display: inline-block;
        position: relative;
        max-width: 100%;
    }

    /* Display Styles */

    .selected {
        user-select: none;
        display: block;
        padding: 8px;
        font-size: 14px;
        border: 1px solid #ddd;
        border-radius: 5px;
        cursor: pointer;
        color: #333;
        background: #f9f9f9;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: background-color 0.2s ease;
    }

    .selected:hover {
        background: #ededed;
    }

    .selected:focus-visible {
        outline: 2px solid #364f6b;
    }

    :host:has(.dropdown.open) > .selected {
        background: #f9f9f9;
        outline: 2px solid #364f6b;
    }

    /* Dropdown Styles */

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        border-radius: 5px;
        background: #f9f9f9;
        max-height: 200px;
        overflow: hidden;
        display: none;
        box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 2px #00000012, 0 2px 4px #00000012, 0 4px 8px #00000012,
            0 8px 16px #00000012, 0 16px 32px #00000012, 0 32px 64px #00000012;
    }

    .dropdown.open {
        display: block;
    }

    /* Search Bar Styles */

    .search-bar {
        caret-color: #364f6b;
        position: sticky;
        top: 0;
        padding: 10px;
        width: 100%;
        border: 2px solid #ddd;
        border-radius: 5px;
        background: #f9f9f9;
        z-index: 10;
    }

    .search-bar:focus {
        border: 2px solid #364f6b;
        outline: none;
    }

    /* List Styles */

    .list {
        position: absolute;
        top: 0;
        right: 0;
        width: 100%;
    }

    .list-item {
        user-select: none;
        font-size: 12px;
        position: relative;
        right: 0;
        padding-inline: 10px;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: background-color 0.2s ease;
    }

    .list-item:hover {
        background: #ededed;
    }

    .list-item:focus {
        outline: 2px solid #364f6b;
    }
    /* !css */
`;

class CeSelect extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <!--html-->
            <style>${styles}</style>
            <div class="selected" tabindex="0">Select an option</div>
            <div class="dropdown">
                <input type="text" class="search-bar" placeholder="Search..." />
                <div class="list-holder" style="position: relative; overflow-y: auto;">
                    <div class="heightForcer"></div>
                </div>
            </div>
            <!--!html-->
        `;

        this.data = [];
        this.filteredData = [];
        this.dropdownHeight = 200;
        this.itemHeight = 35;
        this.buffer = 5;
        this.selectedValue = null;
        this.$selected = this.shadowRoot.querySelector(".selected");
        this.$dropdown = this.shadowRoot.querySelector(".dropdown");
        this.$searchBar = this.shadowRoot.querySelector(".search-bar");
        this.$listHolder = this.shadowRoot.querySelector(".list-holder");
        this.$heightForcer = this.shadowRoot.querySelector(".heightForcer");
        this.view = null;

        this.handleSelectClick = this.handleSelectClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
    }

    connectedCallback() {
        this.$selected.addEventListener("click", () => this.handleSelectClick());
        this.$selected.addEventListener("keydown", this.handleKeydown);
        this.$listHolder.addEventListener("scroll", this.handleScroll);
        this.$searchBar.addEventListener("input", this.handleSearch);
    }

    disconnectedCallback() {
        this.$selected.removeEventListener("click", () => this.handleSelectClick());
        this.$selected.removeEventListener("keydown", this.handleKeydown);
        this.$listHolder.removeEventListener("scroll", this.handleScroll);
        this.$searchBar.removeEventListener("input", this.handleSearch);
    }

    handleSelectClick() {
        if (this.$dropdown.classList.contains("open")) {
            this.close();
        } else {
            this.show();
        }
    }

    show() {
        this.$dropdown.classList.add("open");

        this.refreshWindow();

        const selectedWidth = window.getComputedStyle(this.$selected).width;
        const searchBarHeight = this.$searchBar.getBoundingClientRect().height;

        this.$listHolder.style.height = `${this.dropdownHeight - searchBarHeight}px`;
        this.$dropdown.style.height = `${this.dropdownHeight}px`;
        this.$dropdown.style.width = selectedWidth;
    }

    close() {
        this.$dropdown.classList.remove("open");

        this.$searchBar.value = "";
        this.filteredData = this.data;

        this.refreshWindow();
    }

    handleKeydown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            this.handleSelectClick();
        } else if (this.$dropdown.classList.contains("open")) {
            if (/^[\p{L}\p{N}]$/u.test(event.key)) {
                this.$searchBar.focus();
                this.handleSearch({ target: this.$searchBar });
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                this.close();
            }
        }
    }

    handleScroll() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.refreshWindow(), 10);
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();

        this.filteredData = this.data?.filter(({ label, value }) => {
            function testStrings() {
                let found = false;
                for (let i = 0, stringsArray = [label, value]; i < stringsArray.length; i += 1) {
                    if (
                        // eg., "chicago manual of style 17th edition" => Chicago Manual of Style 17th edition
                        stringsArray[i]?.toLowerCase().includes(query) ||
                        // eg., "cmos17e" || "c m o s 1 7 e" => Chicago Manual of Style 17th edition
                        stringsArray[i]
                            ?.toLowerCase()
                            .split(/\s+|-/)
                            .map((sect) => {
                                if (/\d/.test(sect)) return sect.replace(/\D/g, "");
                                return sect[0];
                            })
                            .join("")
                            .includes(query.replace(/\s+/g, "")) ||
                        // eg., "cms17e" || "c m s 1 7 e" => Chicago Manual of Style 17th edition
                        stringsArray[i]
                            ?.toLowerCase()
                            .replace(/\b(of|and|in|on|at|the|from|to|with|by|for|\(|\))\b/gi, "")
                            .split(/\s+|-/)
                            .map((sect) => {
                                if (/\d/.test(sect)) return sect.replace(/\D/g, "");
                                return sect[0];
                            })
                            .join("")
                            .includes(query.replace(/\s+/g, ""))
                    ) {
                        found = true;
                        break;
                    }
                }
                return found;
            }

            if (query) return testStrings();
            return true;
        });

        this.$heightForcer.style.height = `${this.filteredData.length * this.itemHeight}px`;
        this.refreshWindow();
    }

    populate(items) {
        this.data = items;
        this.filteredData = items;
        this.$heightForcer.style.height = `${this.data.length * this.itemHeight}px`;
        this.refreshWindow();
    }

    refreshWindow() {
        if (this.view) this.$listHolder.removeChild(this.view);

        this.view = document.createElement("div");
        this.view.className = "list";

        const scrollTop = this.$listHolder.scrollTop;
        const firstItem = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        const visibleCount = Math.ceil(this.$listHolder.offsetHeight / this.itemHeight);
        const lastItem = Math.min(this.filteredData.length - 1, firstItem + visibleCount + this.buffer);

        this.view.style.top = `${firstItem * this.itemHeight}px`;

        for (let i = firstItem; i <= lastItem; i++) {
            const item = this.filteredData[i];
            if (!item) continue;

            const div = document.createElement("div");
            div.className = "list-item";
            div.textContent = item.label;
            div.title = item.label;
            div.tabIndex = 0;
            div.role = "button";
            div.style.height = `${this.itemHeight}px`;
            div.style.lineHeight = `${this.itemHeight}px`;
            div.onclick = () => this.selectValue(item.value);
            div.onkeydown = (event) => {
                if (event.key === "Enter") div.onclick(event);
            };
            this.view.appendChild(div);
        }

        this.$listHolder.appendChild(this.view);
    }

    selectValue(value) {
        const selectedItem = this.data.find((item) => item.value === value);
        if (selectedItem) {
            this.selectedValue = value;
            this.$selected.textContent = selectedItem.label;
            this.$dropdown.classList.remove("open");
            this.dispatchEvent(new CustomEvent("change", { detail: { value } }));
        }
    }

    set value(newValue) {
        this.selectValue(newValue);
    }

    get value() {
        return this.selectedValue;
    }
}

customElements.define("ce-select", CeSelect);
