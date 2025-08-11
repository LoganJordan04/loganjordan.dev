import { DotLottie } from "@lottiefiles/dotlottie-web";

// Skip Link/Scroll Animation Manager
export class SkipLinkManager {
    constructor() {
        this.skipLink = document.getElementById("skip-link");
        this.canvas = this.skipLink?.querySelector(".hero-arrow-canvas");
        this.lottieInstance = null;
        this.isLoaded = false;

        if (this.skipLink && this.canvas) {
            this.init();
        }
    }

    init() {
        this.initializeLottieAnimation();
        this.setupEventListeners();
    }

    initializeLottieAnimation() {
        try {
            this.lottieInstance = new DotLottie({
                autoplay: false,
                loop: false,
                speed: 0.75,
                canvas: this.canvas,
                // src: "animations/scroll-down.json",
                src: "https://lottie.host/39905ce4-1156-4e75-af94-1daf6320cde3/z9UzMOacTZ.lottie",
            });

            this.lottieInstance.addEventListener("load", () => {
                this.isLoaded = true;

                this.lottieInstance.setLayout({
                    fit: "cover",
                });

                // Wait 10 seconds after loading, then start the interval
                setTimeout(() => {
                    this.startAnimationInterval();
                }, 10000);
            });

            this.lottieInstance.addEventListener("error", (error) => {
                console.error(
                    "Failed to load skip link Lottie animation:",
                    error
                );
            });
        } catch (error) {
            console.error(
                "Error initializing skip link Lottie animation:",
                error
            );
        }
    }

    startAnimationInterval() {
        // Play animation immediately
        this.playAnimation();

        // Then play every 6 seconds
        setInterval(() => {
            this.playAnimation();
        }, 6000);
    }

    playAnimation() {
        if (this.lottieInstance && this.isLoaded) {
            this.lottieInstance.setFrame(0);
            this.lottieInstance.play();
        }
    }

    setupEventListeners() {
        // Handle click to scroll to main content
        this.skipLink.addEventListener("click", (e) => {
            e.preventDefault();
            this.scrollToMainContent();
        });
    }

    scrollToMainContent() {
        const mainContent = document.getElementById("main-content");
        const aboutSection = document.getElementById("about");

        // Scroll to about section (first content section) or main content
        const targetElement = aboutSection || mainContent;

        if (targetElement) {
            const header = document.getElementById("header");
            const offset = header ? header.offsetHeight : 80;
            const targetPosition = targetElement.offsetTop - offset;

            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: "smooth",
            });

            // Focus the target element for screen readers
            targetElement.setAttribute("tabindex", "-1");
            targetElement.focus();

            // Remove tabindex after focus to avoid affecting normal tab order
            setTimeout(() => {
                targetElement.removeAttribute("tabindex");
            }, 1000);
        }
    }
}
