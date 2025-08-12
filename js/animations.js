import { DotLottie } from "@lottiefiles/dotlottie-web";
import { gsap } from "gsap";

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

// Word scrolling animation in about section
export class ScrollWords {
    constructor(options = {}) {
        this.wordSpacing = options.wordSpacing || 50; // Default 50px spacing between word groups
        this.animations = []; // Store all animations for cleanup
        this.resizeTimeout = null;
        this.init();
        this.setupResize();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () =>
                this.setupScrolling()
            );
        } else {
            this.setupScrolling();
        }
    }

    refresh() {
        // Kill all existing animations
        this.animations.forEach(tl => {
            if (tl) tl.kill();
        });
        this.animations = [];

        // Clean up existing clones and wrappers
        const existingWrappers = document.querySelectorAll('.words-line-wrapper');
        existingWrappers.forEach(wrapper => {
            const originalElement = wrapper.querySelector('.about-words:not([aria-hidden])');
            if (originalElement && wrapper.parentNode) {
                // Move original element back to container
                wrapper.parentNode.insertBefore(originalElement, wrapper);
                // Remove wrapper and clones
                wrapper.remove();
            }
        });

        // Reinitialize
        this.setupScrolling();
    }

    setupResize() {
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.refresh();
            }, 250);
        });
    }

    setupScrolling() {
        const words = document.querySelectorAll(".about-words");

        if (!words.length) return;

        words.forEach((word, index) => {
            this.createInfiniteScroll(word, index);
        });
    }

    createInfiniteScroll(element, index) {
        // Get the container and text dimensions
        const container = element.parentNode;
        const containerWidth = container.offsetWidth;
        const isWideScreen = window.innerWidth > 1024;

        // Create wrapper for this line to handle positioning
        const wrapper = document.createElement("div");
        wrapper.className = "words-line-wrapper";

        // Insert wrapper and move original element into it
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);

        // Create clones - 1 for normal screens, 2 for wide screens
        const clones = [];
        const numClones = isWideScreen ? 2 : 1;

        for (let i = 0; i < numClones; i++) {
            const clone = element.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            wrapper.appendChild(clone);
            clones.push(clone);
        }

        // All elements to animate (original + clones)
        const allElements = [element, ...clones];

        // Style all elements for horizontal positioning
        allElements.forEach(el => {
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.whiteSpace = 'nowrap';
        });

        // Get the actual text width after positioning
        const textWidth = element.offsetWidth;
        const totalDistance = textWidth + this.wordSpacing;

        // Position all elements initially
        allElements.forEach((el, i) => {
            gsap.set(el, { x: i * totalDistance });
        });

        // Different speeds for visual interest
        const speeds = [30, 35, 25, 40, 20]; // pixels per second
        const speed = speeds[index] || 30;
        const duration = totalDistance / speed;

        // Create seamless infinite loop with spacing
        const tl = gsap.timeline({ repeat: -1 });
        tl.fromTo(allElements,
            {
                x: (i) => i * totalDistance
            },
            {
                x: (i) => (i * totalDistance) - totalDistance,
                duration: duration,
                ease: "none"
            }
        );

        // Store animation for cleanup
        this.animations.push(tl);
    }
}
