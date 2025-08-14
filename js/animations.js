import { DotLottie } from "@lottiefiles/dotlottie-web";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

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
        this.scrollTriggers = []; // Store ScrollTrigger instances for cleanup
        this.resizeTimeout = null;
        this.splitTexts = []; // Store SplitText instances for cleanup
        this.isConverging = false;
        this.init();
        this.setupResize();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.setupScrolling();
                this.setupConvergeAnimation();
            });
        } else {
            this.setupScrolling();
            this.setupConvergeAnimation();
        }
    }

    refresh() {
        // Kill all existing animations and triggers
        this.animations.forEach(tl => {
            if (tl) tl.kill();
        });
        this.scrollTriggers.forEach(trigger => {
            if (trigger) trigger.kill();
        });
        this.splitTexts.forEach(split => {
            if (split) split.revert();
        });

        // Clear arrays
        this.animations = [];
        this.scrollTriggers = [];
        this.splitTexts = [];
        this.isConverging = false;
        
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

        // Refresh ScrollTrigger to recalculate positions
        ScrollTrigger.refresh();

        // Small delay to ensure DOM is updated before reinitializing
        setTimeout(() => {
            this.setupScrolling();
            this.setupConvergeAnimation();
        }, 50);
    }

    setupResize() {
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                // Kill existing scroll triggers immediately on resize start
                this.scrollTriggers.forEach(trigger => {
                    if (trigger) trigger.kill();
                });
                this.scrollTriggers = [];

                // Refresh the entire component
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

    setupConvergeAnimation() {
        const aboutSection = document.getElementById("about");
        const wordsContainer = document.querySelector(".words-container");
        const aboutThreeContainer = document.getElementById("about-three-container");
        const words = document.querySelectorAll(".about-words");

        if (!aboutSection || !wordsContainer || !words.length || !aboutThreeContainer) return;

        // Initially hide the three container
        gsap.set(aboutThreeContainer, { opacity: 0 });

        // Create ScrollTrigger for the converge animation
        const convergeTrigger = ScrollTrigger.create({
            trigger: wordsContainer,
            start: "center center",
            end: "+=100%",
            pin: true,
            pinSpacing: false,
            scrub: 1,
            onUpdate: (self) => {
                this.updateConvergeAnimation(self.progress);
            },
            onEnter: () => {
                if (!this.isConverging) {
                    this.initConvergeAnimation();
                }
            },
            onLeaveBack: () => {
                this.resetConvergeAnimation();
            }
        });

        // Pin the about-three-container and handle shader rotation
        const threePinTrigger = ScrollTrigger.create({
            trigger: wordsContainer,
            start: "center center",
            end: "+=150%",
            pin: aboutThreeContainer,
            pinSpacing: false,
            scrub: 1,
            onUpdate: (self) => {
                // Update shader opacity for rotation animation based on threePinTrigger progress
                if (window.aboutSketch && window.aboutSketch.updateOpacity) {
                    window.aboutSketch.updateOpacity(self.progress);
                }
            }
        });

        this.scrollTriggers.push(convergeTrigger, threePinTrigger);
    }

    initConvergeAnimation() {
        this.isConverging = true;
        const words = document.querySelectorAll(".about-words");

        // Create SplitText instances and store fade-out words
        this.fadeOutWords = [];

        words.forEach((wordElement, index) => {
            const split = new SplitText(wordElement, { type: "words" });
            this.splitTexts.push(split);

            // Get all word elements
            const wordSpans = split.words;
            const totalWords = wordSpans.length;

            // Select words to fade out
            const fadeOutCount = Math.floor(totalWords);
            const wordsToFadeOut = this.getRandomElements(wordSpans, fadeOutCount);

            this.fadeOutWords.push(wordsToFadeOut);
        });
    }

    updateConvergeAnimation(progress) {
        if (!this.isConverging) return;

        const words = document.querySelectorAll(".about-words");
        const wordsContainer = document.querySelector(".words-container");
        const aboutThreeContainer = document.getElementById("about-three-container");

        if (!wordsContainer || !aboutThreeContainer) return;

        // Get the original gap (3rem from CSS)
        const originalGap = 48; // 3rem = 48px (assuming 16px base font size)
        const minimumGap = 0; // Minimum gap when fully converged

        // Calculate new gap based on scroll progress
        const currentGap = originalGap - ((originalGap - minimumGap) * progress);

        // Apply the gap reduction to the container
        gsap.set(wordsContainer, {
            gap: `${currentGap}px`
        });

        // Fade in the three container as words fade out (starts at 25% progress)
        const threeContainerFadeStart = 0.25;
        const threeContainerProgress = Math.max(0, (progress - threeContainerFadeStart) / (1 - threeContainerFadeStart));

        gsap.set(aboutThreeContainer, {
            opacity: threeContainerProgress
        });

        // Fade out words based on scroll progress
        words.forEach((wordElement, index) => {
            if (this.fadeOutWords[index]) {
                this.fadeOutWords[index].forEach((word, i) => {
                    // Start fading at 30% progress, stagger each word
                    const fadeStart = 0.3 + (i * 0.05);
                    const fadeProgress = Math.max(0, (progress - fadeStart) / (1 - fadeStart));

                    gsap.set(word, {
                        opacity: 1 - fadeProgress,
                    });
                });
            }
        });
    }

    resetConvergeAnimation() {
        this.isConverging = false;
        const aboutThreeContainer = document.getElementById("about-three-container");

        // Clear fade out words array
        this.fadeOutWords = [];

        // Revert all SplitText instances
        this.splitTexts.forEach(split => {
            if (split) split.revert();
        });
        this.splitTexts = [];

        // Reset word positions and opacity
        const words = document.querySelectorAll(".about-words");
        words.forEach(word => {
            gsap.set(word, { x: 0, y: 0, opacity: 1 });
        });

        // Reset gap to original value
        const wordsContainer = document.querySelector(".words-container");
        if (wordsContainer) {
            gsap.set(wordsContainer, { gap: "3rem" });
        }

        // Hide the three container again
        if (aboutThreeContainer) {
            gsap.set(aboutThreeContainer, { opacity: 0 });
        }

        // Resume infinite scroll animations
        this.animations.forEach(tl => {
            if (tl && tl.progress) {
                tl.resume();
            }
        });
    }

    // Utility function to get random elements from an array
    getRandomElements(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}
