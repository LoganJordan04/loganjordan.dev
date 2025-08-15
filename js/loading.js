// Loading screen management
export class LoadingManager {
    constructor() {
        this.loadingContainer = document.getElementById("loading-container");
        this.loadingAnimation = document.getElementById("loading-animation");
        this.isLoaded = false;
        this.resizeTimeout = null;

        this.init();
        this.setupResize();
    }

    init() {
        if (!this.loadingContainer || !this.loadingAnimation) return;

        // Check if we should skip loading (page refresh scenario)
        const skipLoading = sessionStorage.getItem('skipLoading');

        if (skipLoading === 'true') {
            // Skip loading animation and remove immediately
            this.removeLoadingScreen();
            sessionStorage.removeItem('skipLoading');
            return;
        }

        // Set up loading animation end event
        this.loadingAnimation.addEventListener("ended", () => {
            this.completeLoading();
        });

        // Fallback timeout in case video doesn't load or end properly
        setTimeout(() => {
            if (!this.isLoaded) {
                this.completeLoading();
            }
        }, 5000);
    }

    setupResize() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleResize() {
        // Store current scroll position
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        sessionStorage.setItem('scrollPosition', scrollY.toString());
        sessionStorage.setItem('skipLoading', 'true');

        // Refresh the page
        window.location.reload();
    }

    completeLoading() {
        if (this.isLoaded) return;
        this.isLoaded = true;

        // Fade out loading screen
        this.loadingContainer.classList.add("loading-fade-out");
        this.loadingAnimation.classList.add("loading-fade-out");

        setTimeout(() => {
            this.removeLoadingScreen();
        }, 500);
    }

    removeLoadingScreen() {
        // Remove loading screen from DOM
        if (this.loadingContainer && this.loadingContainer.parentNode) {
            this.loadingContainer.parentNode.removeChild(this.loadingContainer);
        }

        // Remove loading class from body
        document.body.classList.remove("loading-active");

        // Restore scroll position if available
        const savedScrollPosition = sessionStorage.getItem('scrollPosition');
        if (savedScrollPosition) {
            const scrollY = parseInt(savedScrollPosition, 10);

            // Wait for page to be fully rendered before scrolling
            setTimeout(() => {
                window.scrollTo(0, scrollY);

                // Clean up
                sessionStorage.removeItem('scrollPosition');
            }, 100);
        }
    }
}
