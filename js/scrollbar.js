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
        this.smoother = null;
        this.rafId = null;
        this.lastScrollTop = 0;

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

        // Wait for ScrollSmoother to be available
        this.waitForSmoother();
    }

    init() {
        // Listen for wheel events to show scrollbar
        window.addEventListener("wheel", this.handleInteraction.bind(this), {
            passive: true,
        });

        // Listen for touch events (mobile scrolling)
        window.addEventListener(
            "touchstart",
            this.handleInteraction.bind(this),
            { passive: true }
        );
        window.addEventListener(
            "touchmove",
            this.handleInteraction.bind(this),
            { passive: true }
        );

        // Listen for ScrollTrigger refresh
        if (window.ScrollTrigger) {
            window.ScrollTrigger.addEventListener("refresh", () => {
                setTimeout(() => this.updateThumb(), 100);
            });
        }
    }

    waitForSmoother() {
        const checkSmoother = () => {
            if (window.scrollSmoother) {
                this.smoother = window.scrollSmoother;
                this.setupScrollbarEvents();
                this.startScrollTracking();
                this.updateThumb();
            } else {
                setTimeout(checkSmoother, 100);
            }
        };
        checkSmoother();
    }

    startScrollTracking() {
        // Use requestAnimationFrame to continuously track scroll changes
        const trackScroll = () => {
            if (!this.smoother) return;

            const currentScrollTop = this.getCurrentScroll();

            // Only update if scroll position has changed
            if (currentScrollTop !== this.lastScrollTop) {
                this.lastScrollTop = currentScrollTop;
                this.updateThumb();

                // Show scrollbar when scrolling (but not when dragging)
                if (!this.isDragging) {
                    this.showScrollbar();
                    this.scheduleHide();
                }
            }

            this.rafId = requestAnimationFrame(trackScroll);
        };

        trackScroll();
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
            if (e.target === this.trackElement && this.smoother) {
                const rect = this.trackElement.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const maxScroll = this.getMaxScroll();
                const scrollPercentage = clickY / this.trackHeight;
                const newScrollTop = Math.max(
                    0,
                    Math.min(maxScroll, scrollPercentage * maxScroll)
                );

                this.smoother.scrollTo(newScrollTop, true);
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

    getMaxScroll() {
        const smoothContent = document.getElementById("smooth-content");
        if (!smoothContent) return 0;
        return Math.max(0, smoothContent.scrollHeight - window.innerHeight);
    }

    getCurrentScroll() {
        return this.smoother ? Math.max(0, this.smoother.scrollTop()) : 0;
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.dragStartScrollTop = this.getCurrentScroll();
        this.thumbElement.classList.add("dragging");
        document.body.style.userSelect = "none";
        this.clearHideTimeout();
        this.showScrollbar();
    }

    drag(e) {
        if (!this.isDragging || !this.smoother) return;

        e.preventDefault();
        const deltaY = e.clientY - this.dragStartY;
        const maxScroll = this.getMaxScroll();

        if (maxScroll <= 0) return;

        const scrollableTrackHeight = this.trackHeight - this.thumbHeight;

        if (scrollableTrackHeight <= 0) return;

        // Calculate the scroll delta based on thumb movement
        const scrollDelta = (deltaY / scrollableTrackHeight) * maxScroll;
        const newScrollTop = Math.max(
            0,
            Math.min(maxScroll, this.dragStartScrollTop + scrollDelta)
        );

        // Use scrollTo without smooth animation for immediate response
        this.smoother.scrollTo(newScrollTop, false);
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.thumbElement.classList.remove("dragging");
        document.body.style.userSelect = "";
        this.scheduleHide();
    }

    updateThumb() {
        const smoothContent = document.getElementById("smooth-content");
        if (!smoothContent) return;

        const documentHeight = smoothContent.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollTop = this.getCurrentScroll();

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
        const scrollPercentage =
            maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
        const thumbTop =
            scrollPercentage * (this.trackHeight - this.thumbHeight);

        // Apply the calculated values
        this.thumbElement.style.height = `${this.thumbHeight}px`;
        this.thumbElement.style.top = `${Math.max(0, thumbTop)}px`;
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
        }, 1000);
    }

    handleInteraction() {
        // This method is called on wheel/touch events
        // The actual scroll tracking happens in the RAF loop
        if (!this.isDragging) {
            this.showScrollbar();
            this.scheduleHide();
        }
    }
}
