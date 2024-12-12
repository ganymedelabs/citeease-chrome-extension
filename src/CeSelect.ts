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
        outline: 0 solid transparent;
        background: rgb(64, 194, 201);
    }
    /* !css */
`;

type SelectOption = {
    label: string;
    value: string;
};

declare global {
    interface HTMLElementTagNameMap {
        "ce-select": CeSelect;
    }
}

class CeSelect extends HTMLElement {
    private data: SelectOption[] = [];
    private filteredData: SelectOption[] = [];
    private dropdownHeight: number = 200;
    private itemHeight: number = 35;
    private buffer: number = 5;
    private selectedValue: string | null = null;
    private $selected: HTMLElement;
    private $dropdown: HTMLElement;
    private $searchBar: HTMLInputElement;
    private $listHolder: HTMLElement;
    private $heightForcer: HTMLElement;
    private view: HTMLElement | null = null;
    private scrollTimeout: number | undefined;

    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.shadowRoot!.innerHTML = `
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

        this.$selected = this.shadowRoot!.querySelector<HTMLElement>(".selected")!;
        this.$dropdown = this.shadowRoot!.querySelector<HTMLElement>(".dropdown")!;
        this.$searchBar = this.shadowRoot!.querySelector<HTMLInputElement>(".search-bar")!;
        this.$listHolder = this.shadowRoot!.querySelector<HTMLElement>(".list-holder")!;
        this.$heightForcer = this.shadowRoot!.querySelector<HTMLElement>(".heightForcer")!;

        this.handleSelectClick = this.handleSelectClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
    }

    connectedCallback(): void {
        this.$selected.addEventListener("click", this.handleSelectClick);
        this.$selected.addEventListener("keydown", this.handleKeydown);
        this.$listHolder.addEventListener("scroll", this.handleScroll);
        this.$searchBar.addEventListener("input", this.handleSearch);
        this.$searchBar.addEventListener("keydown", this.handleKeydown);
    }

    disconnectedCallback(): void {
        this.$selected.removeEventListener("click", this.handleSelectClick);
        this.$selected.removeEventListener("keydown", this.handleKeydown);
        this.$listHolder.removeEventListener("scroll", this.handleScroll);
        this.$searchBar.removeEventListener("input", this.handleSearch);
        this.$searchBar.removeEventListener("keydown", this.handleKeydown);
    }

    private handleSelectClick(): void {
        if (this.$dropdown.classList.contains("open")) {
            this.close();
        } else {
            this.show();
        }
    }

    private show(): void {
        this.$dropdown.classList.add("open");
        this.refreshWindow();

        const selectedStyles = window.getComputedStyle(this.$selected);
        const selectedWidth = parseInt(selectedStyles.width);
        const selectedHeight = parseInt(selectedStyles.height);
        const searchBarHeight = this.$searchBar.getBoundingClientRect().height;

        this.$listHolder.style.height = `${this.dropdownHeight - searchBarHeight}px`;
        this.$dropdown.style.height = `${this.dropdownHeight}px`;
        this.$dropdown.style.width = `${selectedWidth}px`;
        this.$dropdown.style.transform = `translateY(-${this.dropdownHeight + selectedHeight}px)`;
    }

    private close(): void {
        this.$dropdown.classList.remove("open");
        this.$searchBar.value = "";
        this.filteredData = this.data;
        this.refreshWindow();
    }

    private handleKeydown(event: Event): void {
        const keyboardEvent = event as KeyboardEvent;

        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            this.handleSelectClick();
        } else if (this.$dropdown.classList.contains("open")) {
            if (/^[\p{L}\p{N}]$/u.test(keyboardEvent.key)) {
                this.$searchBar.focus();
                this.handleSearch(event);
            } else if (keyboardEvent.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                this.close();
            }
        }
    }

    private handleScroll(): void {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = window.setTimeout(() => this.refreshWindow(), 10);
    }

    private handleSearch(event: Event): void {
        const query = (event.target as HTMLInputElement).value?.toLowerCase();

        this.filteredData = this.data.filter(({ label, value }) => {
            const testStrings = () => {
                const stringsArray = [label, value];
                return stringsArray.some((str) => {
                    if (!str) return false;
                    return (
                        str.toLowerCase().includes(query) ||
                        str
                            .toLowerCase()
                            .split(/\s+|-/)
                            .map((sect) => (/\d/.test(sect) ? sect.replace(/\D/g, "") : sect[0]))
                            .join("")
                            .includes(query.replace(/\s+/g, "")) ||
                        str
                            .toLowerCase()
                            .split(/\s+/)
                            .map((word) => word[0])
                            .join("")
                            .includes(query)
                    );
                });
            };
            return query ? testStrings() : true;
        });

        this.$heightForcer.style.height = `${this.filteredData.length * this.itemHeight}px`;
        this.refreshWindow();
    }

    public populate(items: SelectOption[]): void {
        this.data = items;
        this.filteredData = items;
        this.$heightForcer.style.height = `${this.data.length * this.itemHeight}px`;
        this.refreshWindow();
    }

    private refreshWindow(): void {
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
            div.setAttribute("role", "button");
            div.style.height = `${this.itemHeight}px`;
            div.style.lineHeight = `${this.itemHeight}px`;
            div.onclick = () => this.selectValue(item.value);
            div.onkeydown = (event) => {
                if (event.key === "Enter") div.onclick!(new MouseEvent("click"));
            };
            this.view.appendChild(div);
        }

        this.$listHolder.appendChild(this.view);
    }

    private selectValue(value: string): void {
        const selectedItem = this.data.find((item) => item.value === value);
        if (selectedItem) {
            this.selectedValue = value;
            this.$selected.textContent = selectedItem.label;
            this.$dropdown.classList.remove("open");
            this.dispatchEvent(new CustomEvent("change", { detail: { value } }));
        }
    }

    set value(newValue: string | null) {
        if (newValue !== null) this.selectValue(newValue);
    }

    get value(): string | null {
        return this.selectedValue;
    }
}

customElements.define("ce-select", CeSelect);
