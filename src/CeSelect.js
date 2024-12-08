const styles = `
    /* css */
    :host {
        display: inline-block;
        position: relative;
        width: 200px;
    }
    .selected {
        display: block;
        padding: 10px;
        border: 1px solid #ccc;
        cursor: pointer;
        background: #fff;
    }
    .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        border: 1px solid #ccc;
        background: #fff;
        max-height: 200px;
        overflow: auto;
        display: none;
    }
    .dropdown.open {
        display: block;
    }
    .search-bar {
        padding: 10px;
        border-bottom: 1px solid #ccc;
    }
    .list {
        overflow: hidden;
    }
    .item {
        padding: 10px;
        cursor: pointer;
    }
    .item:hover {
        background: #f0f0f0;
    }
    .hidden {
        display: none;
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
                <div class="list" style="position: relative; height: 200px; overflow: auto;"></div>
            </div>
            <!--!html-->
        `;

        this.data = [];
        this.visibleData = [];
        this.selectedValue = null;
        this.itemHeight = 30; // Height for virtual scrolling
        this.buffer = 5;

        this.$selected = this.shadowRoot.querySelector(".selected");
        this.$dropdown = this.shadowRoot.querySelector(".dropdown");
        this.$searchBar = this.shadowRoot.querySelector(".search-bar");
        this.$list = this.shadowRoot.querySelector(".list");

        this.handleSelectClick = this.handleSelectClick.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleScroll = this.handleScroll.bind(this);

        // Event listeners
        this.$selected.addEventListener("click", this.handleSelectClick);
        this.$searchBar.addEventListener("input", this.handleSearch);
        document.addEventListener("click", this.handleOutsideClick);
    }

    connectedCallback() {
        this.$list.addEventListener("scroll", this.handleScroll);
    }

    disconnectedCallback() {
        document.removeEventListener("click", this.handleOutsideClick);
        this.$list.removeEventListener("scroll", this.handleScroll);
    }

    handleSelectClick(event) {
        event.stopPropagation(); // Prevent outside click handler from firing
        this.$dropdown.classList.toggle("open");
        if (this.$dropdown.classList.contains("open")) {
            // Render the initial set of items
            this.renderItems(0, this.getVisibleCount() + this.buffer * 2);
        }
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        this.visibleData = this.data.filter((item) => item.label.toLowerCase().includes(query));
        this.renderItems(0, this.getVisibleCount() + this.buffer * 2, true);
    }

    handleOutsideClick(event) {
        if (!this.contains(event.target)) {
            this.$dropdown.classList.remove("open");
        }
    }

    handleScroll() {
        const scrollTop = this.$list.scrollTop;
        const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        const end = Math.min(this.visibleData.length, start + this.getVisibleCount() + this.buffer * 2);
        this.renderItems(start, end);
    }

    populate(items) {
        this.data = items;
        this.visibleData = items;
        this.renderItems(0, this.getVisibleCount() + this.buffer * 2, true);
    }

    renderItems(start, end, reset = false) {
        if (reset) {
            this.$list.innerHTML = "";
        }

        const list = this.$list;

        // Remove out-of-view items
        Array.from(list.children).forEach((child) => {
            const index = parseInt(child.dataset.index, 10);
            if (index < start || index >= end) {
                child.remove();
            }
        });

        // Add new items
        for (let i = start; i < end; i++) {
            if (!list.querySelector(`.item[data-index="${i}"]`)) {
                const item = this.visibleData[i];
                const div = document.createElement("div");
                div.className = "item";
                div.textContent = item.label;
                div.dataset.index = i.toString();
                div.dataset.value = item.value;
                div.style.position = "absolute";
                div.style.top = `${i * this.itemHeight}px`;
                div.style.height = `${this.itemHeight}px`;
                div.style.lineHeight = `${this.itemHeight}px`;
                div.addEventListener("click", () => this.selectValue(item.value));
                list.appendChild(div);
            }
        }

        // Update container height to ensure proper scrolling
        list.style.height = `${this.visibleData.length * this.itemHeight}px`;
    }

    getVisibleCount() {
        const clientHeight = this.$list.clientHeight;
        return Math.ceil(clientHeight / this.itemHeight);
    }

    selectValue(value) {
        const selectedItem = this.data.find((item) => item.value === value);
        if (selectedItem) {
            this.selectedValue = value;
            this.$selected.textContent = selectedItem.label;
            this.$dropdown.classList.remove("open");
            this.dispatchEvent(new Event("change"));
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
