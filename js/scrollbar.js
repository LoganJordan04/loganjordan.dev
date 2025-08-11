// Custom scrollbar functionality
export class CustomScrollbar {
    constructor() {
        this.scrollTimeout = null;
        this.scrollbarElement = null;
        this.trackElement = null;
        this.thumbElement = null;
        this.isVisible = false;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartScrollTop = 0;
        this.thumbHeight = 0;
        this.trackHeight = 0;
        this.createScrollbar();
        this.init();
    }

    createScrollbar() {
        // Create scrollbar container
        this.scrollbarElement = document.createElement("div");
        this.scrollbarElement.className = "custom-scrollbar";

        // Create scrollbar track
        this.trackElement = document.createElement("div");
        this.trackElement.className = "custom-scrollbar-track";

        // Create scrollbar thumb
        this.thumbElement = document.createElement("div");
        this.thumbElement.className = "custom-scrollbar-thumb";

        this.scrollbarElement.appendChild(this.trackElement);
        this.scrollbarElement.appendChild(this.thumbElement);
        document.body.appendChild(this.scrollbarElement);

        this.updateThumb();
        this.setupScrollbarEvents();
    }

    setupScrollbarEvents() {
        // Hover events for scrollbar visibility
        this.scrollbarElement.addEventListener("mouseenter", () => {
            this.showScrollbar();
            this.clearHideTimeout();
        });

        this.scrollbarElement.addEventListener("mouseleave", () => {
            if (!this.isDragging) {
                this.scheduleHide();
            }
        });

        // Click on track to jump
        this.trackElement.addEventListener("click", (e) => {
            if (e.target === this.trackElement) {
                const rect = this.trackElement.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = clickY / rect.height;
                const maxScroll =
                    document.documentElement.scrollHeight - window.innerHeight;
                window.scrollTo({
                    top: percentage * maxScroll,
                    behavior: "smooth",
                });
            }
        });

        // Thumb dragging
        this.thumbElement.addEventListener(
            "mousedown",
            this.startDrag.bind(this)
        );
        document.addEventListener("mousemove", this.drag.bind(this));
        document.addEventListener("mouseup", this.endDrag.bind(this));

        // Prevent text selection while dragging
        this.thumbElement.addEventListener("selectstart", (e) =>
            e.preventDefault()
        );
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.dragStartScrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        this.thumbElement.classList.add("dragging");
        document.body.style.userSelect = "none";
        this.clearHideTimeout();
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        const deltaY = e.clientY - this.dragStartY;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const maxScroll = documentHeight - windowHeight;
        const scrollableTrackHeight = this.trackHeight - this.thumbHeight;

        const scrollDelta = (deltaY / scrollableTrackHeight) * maxScroll;
        const newScrollTop = Math.max(
            0,
            Math.min(maxScroll, this.dragStartScrollTop + scrollDelta)
        );

        window.scrollTo(0, newScrollTop);
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.thumbElement.classList.remove("dragging");
        document.body.style.userSelect = "";
        this.scheduleHide();
    }

    updateThumb() {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

        // Only show scrollbar if content is scrollable
        if (documentHeight <= windowHeight) {
            this.hideScrollbar();
            return;
        }

        // Calculate thumb height and position
        this.trackHeight = windowHeight;
        this.thumbHeight = Math.max(
            (windowHeight / documentHeight) * windowHeight,
            30
        );
        const maxScrollTop = documentHeight - windowHeight;
        const scrollPercentage = scrollTop / maxScrollTop;
        const thumbTop =
            scrollPercentage * (this.trackHeight - this.thumbHeight);

        this.thumbElement.style.height = `${this.thumbHeight}px`;
        this.thumbElement.style.top = `${thumbTop}px`;
    }

    showScrollbar() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.scrollbarElement.classList.add("visible");
        }
    }

    hideScrollbar() {
        if (this.isVisible && !this.isDragging) {
            this.isVisible = false;
            this.scrollbarElement.classList.remove("visible");
        }
    }

    clearHideTimeout() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }
    }

    scheduleHide() {
        this.clearHideTimeout();
        this.scrollTimeout = setTimeout(() => {
            this.hideScrollbar();
        }, 300);
    }

    init() {
        // Listen for scroll events
        window.addEventListener("scroll", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for wheel events (mouse wheel)
        window.addEventListener("wheel", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for touch events (mobile scrolling)
        window.addEventListener("touchstart", this.handleScroll.bind(this), {
            passive: true,
        });
        window.addEventListener("touchmove", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for resize to update thumb
        window.addEventListener(
            "resize",
            () => {
                this.updateThumb();
            },
            { passive: true }
        );

        // Listen for content changes
        const observer = new MutationObserver(() => {
            setTimeout(() => this.updateThumb(), 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    handleScroll() {
        // Update thumb position
        this.updateThumb();

        // Show scrollbar when scrolling
        if (!this.isDragging) {
            this.showScrollbar();
            this.scheduleHide();
        }
    }
}
