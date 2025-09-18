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
        this.wordSpacing = options.wordSpacing || "clamp(25px, 8vw, 50px)";
        this.animations = [];
        this.scrollTriggers = [];
        this.splitTexts = [];
        this.isConverging = false;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.setupScrolling();
                this.setupConvergeAnimation();
                this.setupResizeHandler();
            });
        } else {
            this.setupScrolling();
            this.setupConvergeAnimation();
            this.setupResizeHandler();
        }
    }

    setupResizeHandler() {
        window.addEventListener("resize", this.handleResize);
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.refreshScrollTriggers();
        }, 150);
    }

    refreshScrollTriggers() {
        ScrollTrigger.refresh();
    }

    setupScrolling() {
        const words = document.querySelectorAll(".about-words");

        if (!words.length) return;

        words.forEach((word, index) => {
            this.createInfiniteScroll(word, index);
        });
    }

    createInfiniteScroll(element, index) {
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
            clone.setAttribute("aria-hidden", "true");
            wrapper.appendChild(clone);
            clones.push(clone);
        }

        // All elements to animate (original + clones)
        const allElements = [element, ...clones];

        // Style all elements for horizontal positioning
        allElements.forEach((el) => {
            el.style.position = "absolute";
            el.style.top = "0";
            el.style.left = "0";
            el.style.whiteSpace = "nowrap";
        });

        // Calculate responsive word spacing
        const getResponsiveSpacing = () => {
            const vw = window.innerWidth / 100;
            return Math.max(25, Math.min(8 * vw, 50));
        };

        // Get the actual text width after positioning
        const textWidth = element.offsetWidth;
        const spacing = getResponsiveSpacing();
        const totalDistance = textWidth + spacing;

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
        tl.fromTo(
            allElements,
            {
                x: (i) => i * totalDistance,
            },
            {
                x: (i) => i * totalDistance - totalDistance,
                duration: duration,
                ease: "none",
            }
        );

        // Store animation for cleanup
        this.animations.push(tl);
    }

    setupConvergeAnimation() {
        const aboutSection = document.getElementById("about");
        const aboutThreeContainer = document.getElementById(
            "about-three-container"
        );
        const wordsContainer = document.querySelector(".words-container");
        const words = document.querySelectorAll(".about-words");
        const aboutContainer = document.getElementById("about-container");
        const aboutHeader = document.querySelector(".about-header");
        const aboutP = document.querySelector(".about-p");

        if (
            !aboutSection ||
            !wordsContainer ||
            !words.length ||
            !aboutThreeContainer ||
            !aboutContainer
        )
            return;

        // Initially hide the three container and about container
        gsap.set(aboutThreeContainer, { opacity: 0 });
        gsap.set(aboutContainer, { opacity: 0, y: 20 });

        // Initially make about content unselectable
        if (aboutHeader) {
            aboutHeader.style.userSelect = "none";
            aboutHeader.style.pointerEvents = "none";
        }
        if (aboutP) {
            aboutP.style.userSelect = "none";
            aboutP.style.pointerEvents = "none";
        }

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
            },
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
            },
        });

        // Pin the about container
        const aboutContainerPinTrigger = ScrollTrigger.create({
            trigger: wordsContainer,
            start: "center center",
            end: "+=150%",
            pin: aboutContainer,
            pinSpacing: false,
        });

        this.scrollTriggers.push(
            convergeTrigger,
            threePinTrigger,
            aboutContainerPinTrigger
        );

        // Separate trigger for three container and paragraph animation
        const threeAndParagraphTrigger = ScrollTrigger.create({
            trigger: wordsContainer,
            start: "center center",
            end: "+=150%", // Full pin duration
            scrub: 1,
            onUpdate: (self) => {
                this.updateThreeAndParagraphAnimation(self.progress);
            },
        });

        this.scrollTriggers.push(
            convergeTrigger,
            threePinTrigger,
            aboutContainerPinTrigger,
            threeAndParagraphTrigger
        );
    }

    initConvergeAnimation() {
        this.isConverging = true;
        const words = document.querySelectorAll(".about-words");
        const aboutP = document.querySelector(".about-p");

        // Create SplitText instances and store fade-out words
        this.fadeOutWords = [];

        words.forEach((wordElement) => {
            const split = new SplitText(wordElement, { type: "words" });
            this.splitTexts.push(split);

            // Get all word elements
            const wordSpans = split.words;
            const totalWords = wordSpans.length;

            // Select words to fade out
            const fadeOutCount = Math.floor(totalWords);
            const wordsToFadeOut = this.getRandomElements(
                wordSpans,
                fadeOutCount
            );

            this.fadeOutWords.push(wordsToFadeOut);
        });

        // Create SplitText for the about paragraph
        if (aboutP) {
            this.aboutPSplit = new SplitText(aboutP, {
                type: "words,chars", // Split into both words and chars
            });
            this.splitTexts.push(this.aboutPSplit);

            // Set initial state - don't use display: inline-block or whiteSpace
            gsap.set(this.aboutPSplit.chars, {
                opacity: 0,
                y: 20,
            });
        }
    }

    updateConvergeAnimation(progress) {
        if (!this.isConverging) return;

        // Cache DOM elements at init instead of querying every frame
        if (!this.cachedElements) {
            this.cachedElements = {
                words: document.querySelectorAll(".about-words"),
                wordsContainer: document.querySelector(".words-container"),
                aboutThreeContainer: document.getElementById(
                    "about-three-container"
                ),
                aboutContainer: document.getElementById("about-container"),
                aboutHeader: document.querySelector(".about-header"),
            };
        }

        const {
            words,
            wordsContainer,
            aboutThreeContainer,
            aboutContainer,
            aboutHeader,
        } = this.cachedElements;

        if (!wordsContainer || !aboutThreeContainer) return;

        // Cache computed values only once
        if (!this.computedValues) {
            const computedStyle = window.getComputedStyle(
                document.documentElement
            );
            const fontSize = parseFloat(computedStyle.fontSize) || 16;
            this.computedValues = {
                originalGap: 3 * fontSize,
                minimumGap: 0,
            };
        }

        const { originalGap, minimumGap } = this.computedValues;
        const currentGap = originalGap - (originalGap - minimumGap) * progress;

        // Keep the original gap animation
        gsap.set(wordsContainer, {
            gap: `${Math.max(0, currentGap)}px`,
        });

        // Three container fade in
        const threeContainerFadeStart = 0.25;
        const threeContainerProgress = Math.max(
            0,
            (progress - threeContainerFadeStart) / (1 - threeContainerFadeStart)
        );

        gsap.set(aboutThreeContainer, {
            opacity: threeContainerProgress * 0.85,
        });

        // Words fade out
        words.forEach((wordElement, index) => {
            if (this.fadeOutWords[index]) {
                this.fadeOutWords[index].forEach((word, i) => {
                    const fadeStart = 0.3 + i * 0.05;
                    const fadeProgress = Math.max(
                        0,
                        (progress - fadeStart) / (1 - fadeStart)
                    );

                    const opacity = 1 - fadeProgress;

                    gsap.set(word, {
                        opacity: opacity,
                    });

                    // Make words unselectable when they start fading out
                    if (fadeProgress > 0) {
                        if (!word.dataset.unselectable) {
                            word.style.userSelect = "none";
                            word.style.pointerEvents = "none";
                            word.dataset.unselectable = "true";
                        }
                    } else {
                        if (word.dataset.unselectable) {
                            word.style.userSelect = "";
                            word.style.pointerEvents = "";
                            delete word.dataset.unselectable;
                        }
                    }
                });
            }
        });

        // About container fade in after words fade out
        if (aboutContainer) {
            const aboutContainerFadeStart = 0.8;
            const aboutContainerProgress = Math.max(
                0,
                (progress - aboutContainerFadeStart) /
                    (1 - aboutContainerFadeStart)
            );

            gsap.set(aboutContainer, {
                opacity: aboutContainerProgress,
                y: 50 * (1 - aboutContainerProgress),
                ease: "power2.out",
            });

            // Header fades in first
            if (aboutHeader) {
                const headerFadeStart = 0.8;
                const headerProgress = Math.max(
                    0,
                    (progress - headerFadeStart) / (1 - headerFadeStart)
                );

                gsap.set(aboutHeader, {
                    opacity: headerProgress,
                    y: 30 * (1 - headerProgress),
                    ease: "power2.out",
                });

                // Make header unselectable until it starts fading in
                if (headerProgress > 0) {
                    if (aboutHeader.dataset.unselectable) {
                        aboutHeader.style.userSelect = "";
                        aboutHeader.style.pointerEvents = "";
                        delete aboutHeader.dataset.unselectable;
                    }
                } else {
                    if (!aboutHeader.dataset.unselectable) {
                        aboutHeader.style.userSelect = "none";
                        aboutHeader.style.pointerEvents = "none";
                        aboutHeader.dataset.unselectable = "true";
                    }
                }
            }
        }
    }

    updateThreeAndParagraphAnimation(progress) {
        const aboutP = document.querySelector(".about-p");

        // Paragraph animation using full 150% progress
        if (aboutP && this.aboutPSplit) {
            const pFadeStart = 0.5;
            const pProgress = Math.max(
                0,
                (progress - pFadeStart) / (1 - pFadeStart)
            );

            // Animate individual characters with stagger
            if (pProgress > 0) {
                const totalChars = this.aboutPSplit.chars.length;
                const maxDelay = 0.5;

                this.aboutPSplit.chars.forEach((char, index) => {
                    const charDelay = (index / totalChars) * maxDelay;
                    const charProgress = Math.max(
                        0,
                        (pProgress - charDelay) * 3
                    );
                    const clampedProgress = Math.min(1, charProgress);

                    gsap.set(char, {
                        opacity: clampedProgress,
                        y: 20 * (1 - clampedProgress),
                    });
                });
            }

            // Handle selectability
            if (pProgress > 0.3) {
                aboutP.style.userSelect = "";
                aboutP.style.pointerEvents = "";
            } else {
                aboutP.style.userSelect = "none";
                aboutP.style.pointerEvents = "none";
            }
        }
    }

    resetConvergeAnimation() {
        this.isConverging = false;
        const aboutThreeContainer = document.getElementById(
            "about-three-container"
        );
        const aboutContainer = document.getElementById("about-container");
        const aboutP = document.querySelector(".about-p");
        const aboutHeader = document.querySelector(".about-header");

        // Clear fade out words array
        this.fadeOutWords = [];

        // Revert all SplitText instances and restore selectability
        this.splitTexts.forEach((split) => {
            split.revert();
        });
        this.splitTexts = [];
        this.aboutPSplit = null;

        // Reset word positions and opacity
        const words = document.querySelectorAll(".about-words");
        words.forEach((word) => {
            gsap.set(word, { opacity: 1 });
            word.style.userSelect = "";
            word.style.pointerEvents = "";
        });

        // Reset paragraph
        if (aboutP) {
            gsap.set(aboutP, { opacity: 1, y: 0 });
            aboutP.style.userSelect = "none";
            aboutP.style.pointerEvents = "none";
            // Clear any character-level animations that might persist
            const chars = aboutP.querySelectorAll("div, span");
            chars.forEach((char) => {
                gsap.set(char, {
                    opacity: 1,
                    y: 0,
                    display: "",
                });
            });
        }

        // Reset header
        if (aboutHeader) {
            gsap.set(aboutHeader, { opacity: 0, y: 0 });
            aboutHeader.style.userSelect = "none";
            aboutHeader.style.pointerEvents = "none";
        }

        // Reset gap to original value
        const wordsContainer = document.querySelector(".words-container");
        if (wordsContainer) {
            gsap.set(wordsContainer, { gap: "3rem" });
        }

        // Hide the three container again
        if (aboutThreeContainer) {
            gsap.set(aboutThreeContainer, { opacity: 0 });
        }

        // Reset about container
        if (aboutContainer) {
            gsap.set(aboutContainer, { opacity: 0, y: 0 });
        }

        // Reset shader opacity
        if (window.aboutSketch && window.aboutSketch.updateOpacity) {
            window.aboutSketch.updateOpacity(0);
        }

        // Resume infinite scroll animations
        this.animations.forEach((tl) => {
            if (tl && tl.progress) {
                tl.play();
            }
        });
    }

    // Utility function to get random elements from an array
    getRandomElements(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

// Manages draggable glass card UI
export class GlassCardSnap {
    constructor() {
        this.glassCard = document.querySelector(".glass-card");
        this.skillItems = document.querySelectorAll(".skill-item");
        this.skillsContainer = document.getElementById("skills-container");

        this.isTouchDevice = "ontouchstart" in document.documentElement;

        // Cache DOM elements and rects
        this.cachedRects = new Map();
        this.lastCacheTime = 0;
        this.cacheValidDuration = 100; // 100ms cache validity

        // Get all skillset elements
        this.skillsets = {
            design: document.getElementById("design-skillset"),
            frontend: document.getElementById("frontend-skillset"),
            backend: document.getElementById("backend-skillset"),
        };

        // State management
        this.state = {
            isDragging: false,
            isSnapping: false,
            currentTargetIndex: 0,
            dragOffset: { x: 0, y: 0 },
            currentSkillset: "design",
        };

        // Animation frame tracking
        this.frames = {
            drag: null,
            blur: null,
        };

        // Throttle blur updates
        this.lastBlurUpdate = 0;
        this.blurUpdateThrottle = 16; // ~60fps

        this.scrollTrigger = null;

        if (this.glassCard && this.skillItems.length && this.skillsContainer) {
            this.init();
        }
    }

    init() {
        // Only setup drag events if not a touch device
        if (!this.isTouchDevice) {
            this.setupEventListeners();
            this.glassCard.style.cursor = "grab";
        } else {
            this.glassCard.style.cursor = "default";
            this.glassCard.style.pointerEvents = "none";
        }

        this.createScrollTrigger();
        this.updateBlurEffect();
        this.snapToSkill(0);
        this.switchSkillset(0);
    }

    setupEventListeners() {
        // Unified event handling
        const events = [
            { type: "mousedown", handler: this.handleStart },
            {
                type: "touchstart",
                handler: this.handleStart,
                options: { passive: false },
            },
            { type: "mousemove", handler: this.handleMove, target: document },
            {
                type: "touchmove",
                handler: this.handleMove,
                target: document,
                options: { passive: false },
            },
            { type: "mouseup", handler: this.handleEnd, target: document },
            { type: "touchend", handler: this.handleEnd, target: document },
        ];

        events.forEach(
            ({ type, handler, target = this.glassCard, options }) => {
                target.addEventListener(type, handler.bind(this), options);
            }
        );
    }

    handleStart(e) {
        e.preventDefault();
        this.state.isDragging = true;
        this.glassCard.style.cursor = "grabbing";

        this.cancelAnimations();
        this.scrollTrigger?.disable();

        const { clientX, clientY } = this.getEventCoords(e);
        const cardCenter = this.getCardCenter();

        this.state.dragOffset = {
            x: clientX - cardCenter.x,
            y: clientY - cardCenter.y,
        };
    }

    handleMove(e) {
        if (!this.state.isDragging) return;
        e.preventDefault();

        this.cancelFrame("drag");
        this.frames.drag = requestAnimationFrame(() => {
            const { clientX, clientY } = this.getEventCoords(e);
            const contentCenter = this.getContentCenter();

            const position = {
                x: clientX - this.state.dragOffset.x - contentCenter.x,
                y: clientY - this.state.dragOffset.y - contentCenter.y,
            };

            gsap.set(this.glassCard, position);
            this.scheduleBlurUpdate();

            // Check if card is outside container first
            if (this.isCardOutsideContainer()) {
                this.switchSkillset(null); // This will hide all skill sets
            } else {
                // Update skillset based on current position during drag
                const cardCenter = this.getCardCenter();
                const overlappingSkill = this.findOverlappingSkill(cardCenter);
                if (overlappingSkill !== null) {
                    this.switchSkillset(overlappingSkill);
                }
            }
        });
    }

    handleEnd() {
        if (!this.state.isDragging) return;

        this.state.isDragging = false;
        this.glassCard.style.cursor = "grab";
        this.cancelAnimations();
        this.findAndSnapToClosestSkill();
        this.scrollTrigger?.enable();
    }

    // Utility methods
    getCachedRect(element, key) {
        const now = performance.now();
        if (now - this.lastCacheTime > this.cacheValidDuration) {
            this.cachedRects.clear();
            this.lastCacheTime = now;
        }

        if (!this.cachedRects.has(key)) {
            this.cachedRects.set(key, element.getBoundingClientRect());
        }
        return this.cachedRects.get(key);
    }

    getEventCoords(e) {
        return {
            clientX: e.clientX || e.touches[0].clientX,
            clientY: e.clientY || e.touches[0].clientY,
        };
    }

    getCardCenter() {
        const rect = this.glassCard.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }

    getContentCenter() {
        const skillsContent = document.querySelector(".skills-content");
        const rect = skillsContent.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }

    cancelFrame(type) {
        if (this.frames[type]) {
            cancelAnimationFrame(this.frames[type]);
            this.frames[type] = null;
        }
    }

    cancelAnimations() {
        gsap.killTweensOf(this.glassCard);
        Object.keys(this.frames).forEach((type) => this.cancelFrame(type));
    }

    scheduleBlurUpdate() {
        const now = performance.now();
        if (now - this.lastBlurUpdate < this.blurUpdateThrottle) {
            return;
        }

        this.cancelFrame("blur");
        this.frames.blur = requestAnimationFrame(() => {
            this.updateBlurEffect();
            this.lastBlurUpdate = performance.now();
        });
    }

    createScrollTrigger() {
        this.scrollTrigger = ScrollTrigger.create({
            trigger: this.skillsContainer,
            start: "top 80%",
            end: "bottom 20%",
            onUpdate: () => {
                if (!this.state.isDragging) {
                    this.updateCardPosition();
                }
            },
        });
    }

    findAndSnapToClosestSkill() {
        const cardCenter = this.getCardCenter();
        let targetIndex =
            this.findOverlappingSkill(cardCenter) ??
            this.findClosestSkill(cardCenter);

        this.state.currentTargetIndex = targetIndex;
        this.snapToSkill(targetIndex);
        this.switchSkillset(targetIndex);
    }

    findOverlappingSkill(cardCenter) {
        for (let i = 0; i < this.skillItems.length; i++) {
            const rect = this.skillItems[i].getBoundingClientRect();

            if (
                cardCenter.x >= rect.left &&
                cardCenter.x <= rect.right &&
                cardCenter.y >= rect.top &&
                cardCenter.y <= rect.bottom
            ) {
                return i;
            }
        }
        return null;
    }

    findClosestSkill(cardCenter) {
        let closestIndex = 0;
        let closestDistance = Infinity;

        this.skillItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const itemCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };

            const distance = Math.sqrt(
                Math.pow(cardCenter.x - itemCenter.x, 2) +
                    Math.pow(cardCenter.y - itemCenter.y, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    updateCardPosition() {
        if (this.state.isDragging || this.state.isSnapping) return;

        const viewportCenter = window.innerHeight / 2;
        let targetIndex = null;

        // Find which skill is currently at the vertical center of the screen
        this.skillItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const itemTop = rect.top;
            const itemBottom = rect.bottom;

            // Check if the viewport center line intersects with this skill item
            if (viewportCenter >= itemTop && viewportCenter <= itemBottom) {
                targetIndex = index;
            }
        });

        // Only update if a skill is actually at the center
        if (
            targetIndex !== null &&
            targetIndex !== this.state.currentTargetIndex
        ) {
            this.state.currentTargetIndex = targetIndex;
            this.snapToSkill(targetIndex);
            this.switchSkillset(targetIndex);
        }
    }

    snapToSkill(index) {
        if (this.state.isDragging) return;
        this.state.isSnapping = true;

        const targetItem = this.skillItems[index];
        const contentCenter = this.getContentCenter();
        const targetRect = targetItem.getBoundingClientRect();

        const targetPosition = {
            x: targetRect.left + targetRect.width / 2 - contentCenter.x,
            y: targetRect.top + targetRect.height / 2 - contentCenter.y,
        };

        const distance = this.calculateSnapDistance(targetPosition);
        const duration = this.calculateSnapDuration(distance);

        gsap.to(this.glassCard, {
            ...targetPosition,
            duration,
            ease: "power1.out",
            onUpdate: () => this.updateBlurEffect(),
            onComplete: () => {
                this.state.isSnapping = false;
            },
        });
    }

    isCardOutsideContainer() {
        const cardCenter = this.getCardCenter();
        const containerRect = this.skillsContainer.getBoundingClientRect();
        const buffer = 50; // Add some buffer for smoother transitions

        return (
            cardCenter.x < containerRect.left - buffer ||
            cardCenter.x > containerRect.right + buffer ||
            cardCenter.y < containerRect.top - buffer ||
            cardCenter.y > containerRect.bottom + buffer
        );
    }

    switchSkillset(skillIndex) {
        const skillsetNames = ["design", "frontend", "backend"];

        // Check if card is outside container
        if (this.isCardOutsideContainer()) {
            // Hide all skill sets when outside container
            Object.values(this.skillsets).forEach((element) => {
                if (element) {
                    gsap.killTweensOf(element);
                    gsap.to(element, {
                        opacity: 0,
                        duration: 0.2,
                        ease: "power1.out",
                    });
                }
            });
            this.state.currentSkillset = null;
            return;
        }

        const targetSkillset = skillsetNames[skillIndex];

        // Don't animate if already showing the correct skillset
        if (this.state.currentSkillset === targetSkillset) return;

        const targetElement = this.skillsets[targetSkillset];
        if (!targetElement) return;

        // Kill any existing animations to prevent conflicts
        Object.values(this.skillsets).forEach((element) => {
            if (element) {
                gsap.killTweensOf(element);
            }
        });

        // Create timeline for smooth transition with overlap
        const timeline = gsap.timeline();

        // First, fade out all non-target skill sets simultaneously
        Object.entries(this.skillsets).forEach(([name, element]) => {
            if (element && name !== targetSkillset) {
                timeline.to(
                    element,
                    {
                        opacity: 0,
                        duration: 0.4,
                        ease: "power1.out",
                    },
                    0
                ); // All start at the same time
            }
        });

        // Then fade in target skillset with overlap for smooth transition
        timeline.to(
            targetElement,
            {
                opacity: 1,
                duration: 0.5,
                ease: "power1.out",
            },
            "-=0.2"
        ); // Start 0.2s before previous animations finish

        // Update state
        this.state.currentSkillset = targetSkillset;
    }

    calculateSnapDistance(targetPosition) {
        const currentTransform = gsap.getProperty(this.glassCard, "transform");
        const matrix = new DOMMatrix(currentTransform);
        const current = { x: matrix.e, y: matrix.f };

        return Math.sqrt(
            Math.pow(targetPosition.x - current.x, 2) +
                Math.pow(targetPosition.y - current.y, 2)
        );
    }

    calculateSnapDuration(distance) {
        const baseDuration = 0.6;
        const maxDuration = 1.5;
        const distanceScale = distance / 300;
        return Math.min(maxDuration, baseDuration + distanceScale * 0.4);
    }

    updateBlurEffect() {
        const cardCenter = this.getCardCenter();
        const padding = 20;

        // Use cached rects and batch style updates
        const styleUpdates = [];

        this.skillItems.forEach((item, index) => {
            const skillSub = item.querySelector(".skills-sub");
            if (!skillSub) return;

            const itemRect = this.getCachedRect(item, `skill-${index}`);
            const isOverlapping = this.isCardOverlappingItem(
                cardCenter,
                itemRect,
                padding
            );

            if (isOverlapping) {
                styleUpdates.push(() => (skillSub.style.filter = "blur(0px)"));
            } else {
                const blur = this.calculateBlurAmount(cardCenter, itemRect);
                styleUpdates.push(
                    () => (skillSub.style.filter = `blur(${blur}px)`)
                );
            }
        });

        // Batch apply style updates
        styleUpdates.forEach((update) => update());
    }

    isCardOverlappingItem(cardCenter, itemRect, padding) {
        return (
            cardCenter.x >= itemRect.left - padding &&
            cardCenter.x <= itemRect.right + padding &&
            cardCenter.y >= itemRect.top - padding &&
            cardCenter.y <= itemRect.bottom + padding
        );
    }

    calculateBlurAmount(cardCenter, itemRect) {
        const itemCenter = {
            x: itemRect.left + itemRect.width / 2,
            y: itemRect.top + itemRect.height / 2,
        };

        const distance = Math.sqrt(
            Math.pow(cardCenter.x - itemCenter.x, 2) +
                Math.pow(cardCenter.y - itemCenter.y, 2)
        );

        const normalizedDistance = Math.min(1, distance / 200);
        return normalizedDistance * 3; // maxBlur = 3
    }
}
