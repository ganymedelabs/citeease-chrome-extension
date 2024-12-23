/**
 * Recommended Extension for Visual Studio Code:
 * https://marketplace.visualstudio.com/items?itemName=iuyoy.highlight-string-code
 */

const styles = `
    /* css */
    :host {
        --color-primary: #364f6b;
        --color-secondary: #333;
        --color-background: #f9f9f9;
        --color-border: #ddd;
        --color-hover: #ededed;
        --color-focus: rgb(64, 194, 201);
        --color-dropdown-background: #f9f9f9;
        --color-caret: var(--color-primary);
        --color-shadow: #00000012;

        --size-small: 8px;
        --size-medium: 14px;
        --size-list-item-padding: 10px;
        --size-border-radius: 5px;
        --max-dropdown-height: 200px;

        --shadow-layer: 0 0 #0000, 0 0 #0000, 0 1px 2px var(--color-shadow), 0 2px 4px var(--color-shadow), 0 4px 8px var(--color-shadow), 0 8px 16px var(--color-shadow), 0 16px 32px var(--color-shadow), 0 32px 64px var(--color-shadow);

        --transition-fast: 0.2s ease;

        display: inline-block;
        position: relative;
        max-width: 100%;
    }

    * {
        box-sizing: border-box;
    }

    /* Display Styles */

    .selected {
        user-select: none;
        display: block;
        padding: var(--size-small);
        font-size: var(--size-medium);
        border: 1px solid var(--color-border);
        border-radius: var(--size-border-radius);
        cursor: pointer;
        color: var(--color-secondary);
        background: var(--color-background);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: background-color var(--transition-fast);
    }

    .selected:hover {
        background: var(--color-hover);
    }

    .selected:focus-visible {
        outline: 2px solid var(--color-primary);
    }

    :host:has(.dropdown.open) > .selected {
        background: var(--color-background);
        outline: 2px solid var(--color-primary);
    }

    /* Dropdown Styles */

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        border-radius: var(--size-border-radius);
        background: var(--color-dropdown-background);
        max-height: var(--max-dropdown-height);
        overflow: hidden;
        display: none;
        box-shadow: var(--shadow-layer)
    }

    .dropdown.open {
        display: block;
    }

    /* Search Bar Styles */

    .search-bar {
        caret-color: var(--color-caret);
        position: sticky;
        top: 0;
        padding: var(--size-small);
        width: 100%;
        border: 2px solid var(--color-border);
        border-radius: var(--size-border-radius);
        background: var(--color-background);
        z-index: 10;
    }

    .search-bar:focus {
        border: 2px solid var(--color-primary);
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
        font-size: calc(var(--size-medium) - 2px);
        position: relative;
        right: 0;
        padding-inline: var(--size-list-item-padding);
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: background-color var(--transition-fast);
    }

    .list-item:hover {
        background: var(--color-hover);
    }

    .list-item:focus {
        outline: 0 solid transparent;
        background: var(--color-focus);
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

        const shadow = this.shadowRoot as ShadowRoot;

        shadow.innerHTML = `
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
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    connectedCallback(): void {
        this.$selected.addEventListener("click", this.handleSelectClick);
        this.$selected.addEventListener("keydown", this.handleKeydown);
        this.$listHolder.addEventListener("scroll", this.handleScroll);
        this.$searchBar.addEventListener("input", this.handleSearch);
        this.$searchBar.addEventListener("keydown", this.handleKeydown);

        document.addEventListener("click", this.handleClickOutside);
    }

    disconnectedCallback(): void {
        this.$selected.removeEventListener("click", this.handleSelectClick);
        this.$selected.removeEventListener("keydown", this.handleKeydown);
        this.$listHolder.removeEventListener("scroll", this.handleScroll);
        this.$searchBar.removeEventListener("input", this.handleSearch);
        this.$searchBar.removeEventListener("keydown", this.handleKeydown);

        document.removeEventListener("click", this.handleClickOutside);
    }

    private handleClickOutside(event: Event) {
        const isInsideSelect = Array.from(event.composedPath()).some(
            (element) => element instanceof HTMLElement && this.contains(element)
        );

        if (!isInsideSelect) {
            this.close();
        }
    }

    private handleSelectClick(): void {
        if (this.$dropdown.classList.contains("open")) {
            this.close();
        } else {
            this.show();
        }
    }

    private close(): void {
        this.$dropdown.classList.remove("open");
        this.$searchBar.value = "";
        this.filteredData = this.data;
        this.refreshWindow();
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

    private handleKeydown(event: Event): void {
        const keyboardEvent = event as KeyboardEvent;

        if (keyboardEvent.key === "Enter") {
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
