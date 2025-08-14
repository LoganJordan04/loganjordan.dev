import { DotLottie } from "@lottiefiles/dotlottie-web";

// Navigation management
export class NavManager {
    constructor() {
        this.sections = ["hero", "about", "work", "experience", "footer"];
        this.navLinks = {};
        this.navItems = {};
        this.lottieInstances = {}; // Store Lottie instances for each nav item
        this.currentActiveSection = "hero";
        this.observerTimeout = null;

        this.init();
    }

    init() {
        // Cache nav elements
        this.sections.forEach((sectionId) => {
            const navLink = document.querySelector(`a[href="#${sectionId}"]`);
            const navItem = navLink?.closest(".header-nav-item");

            if (navLink && navItem) {
                this.navLinks[sectionId] = navLink;
                this.navItems[sectionId] = navItem;
            }
        });

        // Initialize Lottie animations
        setTimeout(() => {
            this.initializeLottieAnimations();
        }, 100);

        // Set initial active state
        this.setActiveNav("hero");

        // Setup intersection observer
        this.setupIntersectionObserver();

        // Setup smooth scrolling
        this.setupSmoothScrolling();
    }

    initializeLottieAnimations() {
        // Initialize Lottie for each nav item (excluding hero)
        this.sections.forEach((sectionId) => {
            if (sectionId === "hero") return; // Hero doesn't have a nav arrow

            const navItem = this.navItems[sectionId];
            if (navItem) {
                const canvas = navItem.querySelector(".nav-arrow-canvas");
                if (canvas) {
                    try {
                        const lottieInstance = new DotLottie({
                            autoplay: false,
                            loop: false,
                            canvas: canvas,
                            // src: "animations/arrow-in.json",
                            src: "https://lottie.host/aa7309d5-cc2c-40ea-9519-37b273a48cc7/qWR4WpIIWr.lottie",
                        });

                        lottieInstance.addEventListener("load", () => {
                            // Set to last frame (inactive state)
                            lottieInstance.setFrame(
                                lottieInstance.totalFrames - 1
                            );
                        });

                        lottieInstance.addEventListener("error", (error) => {
                            console.error(
                                `Failed to load Lottie animation for ${sectionId}:`,
                                error
                            );
                        });

                        this.lottieInstances[sectionId] = lottieInstance;
                    } catch (error) {
                        console.error(
                            `Error initializing Lottie animation for ${sectionId}:`,
                            error
                        );
                    }
                }
            }
        });
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: "-20% 0px -60% 0px",
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            let mostVisibleSection = null;
            let maxRatio = 0;

            entries.forEach((entry) => {
                if (
                    entry.isIntersecting &&
                    entry.intersectionRatio > maxRatio
                ) {
                    maxRatio = entry.intersectionRatio;
                    mostVisibleSection = entry.target.id;
                }
            });

            const scrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop < 100) {
                mostVisibleSection = "hero";
            }

            if (
                mostVisibleSection &&
                mostVisibleSection !== this.currentActiveSection
            ) {
                this.setActiveNav(mostVisibleSection);
            }
        }, options);

        this.sections.forEach((sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                observer.observe(section);
            }
        });
    }

    setActiveNav(activeSection) {
        const previousActiveSection = this.currentActiveSection;

        // Remove active classes from all nav items
        Object.entries(this.navItems).forEach(([sectionId, navItem]) => {
            const navLink = this.navLinks[sectionId];
            const canvas = navItem.querySelector(".nav-arrow-canvas");

            if (navLink) {
                navLink.classList.remove("active-nav");
                navItem.classList.remove("active-nav-item");
            }

            if (canvas) {
                canvas.classList.remove("active-icon");
            }

            // Play reverse animation for previously active item
            if (
                sectionId === previousActiveSection &&
                sectionId !== "hero" &&
                this.lottieInstances[sectionId]
            ) {
                this.playLottieReverse(sectionId);
            }
        });

        // Set active state for current section
        if (activeSection !== "hero") {
            const activeNavLink = this.navLinks[activeSection];
            const activeNavItem = this.navItems[activeSection];

            if (activeNavLink && activeNavItem) {
                activeNavLink.classList.add("active-nav");
                activeNavItem.classList.add("active-nav-item");

                const activeCanvas =
                    activeNavItem.querySelector(".nav-arrow-canvas");
                if (activeCanvas) {
                    activeCanvas.classList.add("active-icon");
                }

                // Play forward animation for newly active item
                if (this.lottieInstances[activeSection]) {
                    this.playLottieForward(activeSection);
                }
            }
        }

        this.currentActiveSection = activeSection;
    }

    playLottieForward(sectionId) {
        const lottie = this.lottieInstances[sectionId];
        if (lottie && lottie.isLoaded) {
            lottie.setMode("forward");
            lottie.setFrame(0);
            lottie.play();
        }
    }

    playLottieReverse(sectionId) {
        const lottie = this.lottieInstances[sectionId];
        if (lottie && lottie.isLoaded) {
            lottie.setMode("reverse");
            lottie.setFrame(lottie.totalFrames);
            lottie.play();
        }
    }

    setupSmoothScrolling() {
        // Add click listeners to all nav links
        Object.entries(this.navLinks).forEach(([sectionId, navLink]) => {
            navLink.addEventListener("click", (e) => {
                e.preventDefault();
                this.scrollToSection(sectionId);
            });
        });

        // Add hover effects
        Object.entries(this.navItems).forEach(([sectionId, navItem]) => {
            if (sectionId === "hero") return;

            navItem.addEventListener("mouseenter", () => {
                this.handleNavHover(sectionId, true);
            });

            navItem.addEventListener("mouseleave", () => {
                this.handleNavHover(sectionId, false);
            });
        });
    }

    handleNavHover(sectionId, isEntering) {
        // Don't show hover effect if this is the currently active section
        if (sectionId === this.currentActiveSection) return;

        const lottie = this.lottieInstances[sectionId];
        if (!lottie || !lottie.isLoaded) return;

        if (isEntering) {
            this.playLottieForward(sectionId);
        } else {
            this.playLottieReverse(sectionId);
        }
    }

    scrollToSection(sectionId) {
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) return;

        // Add offset for about section, scroll to top for others
        let targetPosition = targetSection.offsetTop;
        if (sectionId === 'about') {
            targetPosition += 110;
        }

        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: "smooth",
        });

        this.temporarilyDisableObserver();
        this.setActiveNav(sectionId);
    }

    temporarilyDisableObserver() {
        clearTimeout(this.observerTimeout);
        this.observerTimeout = setTimeout(() => {
            // Observer will resume automatically
        }, 1000);
    }
}

// Header management
export class HeaderManager {
    constructor() {
        this.header = document.getElementById("header");
        this.lastScrollY = window.pageYOffset;
        this.scrollThreshold = 100; // Minimum scroll distance to trigger hide/show
        this.isHeaderVisible = true;
        this.isHovering = false;
        this.scrollDirection = "up";
        this.ticking = false;
        this.navClickHide = false; // Track if header was hidden by nav click

        this.init();
    }

    init() {
        if (!this.header) return;

        // Add CSS class for transitions
        this.header.classList.add("header-auto-hide");

        // Add hover listeners to the header
        this.header.addEventListener(
            "mouseenter",
            this.handleMouseEnter.bind(this)
        );
        this.header.addEventListener(
            "mouseleave",
            this.handleMouseLeave.bind(this)
        );

        // Setup scroll listener
        window.addEventListener("scroll", this.handleScroll.bind(this), {
            passive: true,
        });

        // Setup hover listeners for the header and hover zone
        this.header.addEventListener(
            "mouseenter",
            this.handleMouseEnter.bind(this)
        );
        this.header.addEventListener(
            "mouseleave",
            this.handleMouseLeave.bind(this)
        );

        // Setup nav click listeners
        this.setupNavClickListeners();
    }

    setupNavClickListeners() {
        // Find all nav links and add click listeners
        const navLinks = this.header.querySelectorAll(".header-nav-link");
        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                // Hide header when any nav item is clicked
                this.navClickHide = true;
                this.hideHeader();

                // Update when page is scrolling
                this.handleScroll();

                // Reset the flag after a delay to allow normal scroll behavior to resume
                setTimeout(() => {
                    this.navClickHide = false;
                }, 1500);
            });
        });

        // Also add click listener to the logo
        const logoLink = this.header.querySelector('a[href="#hero"]');
        if (logoLink) {
            logoLink.addEventListener("click", (e) => {
                e.preventDefault();

                // Hide header when logo is clicked
                this.navClickHide = true;
                this.hideHeader();

                // Trigger smooth scroll to hero section
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
                this.handleScroll();

                // Reset the flag after a delay
                setTimeout(() => {
                    this.navClickHide = false;
                }, 1500);
            });
        }
    }

    handleScroll() {
        if (!this.ticking) {
            requestAnimationFrame(this.updateHeader.bind(this));
            this.ticking = true;
        }
    }

    updateHeader() {
        const currentScrollY = window.pageYOffset;

        // Determine scroll direction
        if (currentScrollY > this.lastScrollY) {
            this.scrollDirection = "down";
        } else if (currentScrollY < this.lastScrollY) {
            this.scrollDirection = "up";
        }

        // Don't update header state if it was hidden by nav click and we're hovering
        if (this.navClickHide && this.isHovering) {
            this.lastScrollY = currentScrollY;
            this.ticking = false;
            return;
        }

        // Show/hide header based on scroll direction and position
        if (currentScrollY <= this.scrollThreshold) {
            // Always show header at the top
            this.showHeader();
            this.navClickHide = false; // Reset nav click hide when at top
        } else if (this.scrollDirection === "down" && !this.isHovering) {
            // Hide header when scrolling down (unless hovering)
            this.hideHeader();
        } else if (this.scrollDirection === "up" && !this.navClickHide) {
            // Show header when scrolling up (unless hidden by nav click)
            this.showHeader();
        }

        this.lastScrollY = currentScrollY;
        this.ticking = false;
    }

    handleMouseEnter() {
        this.isHovering = true;
        // Always show header when hovering, regardless of nav click state
        this.showHeader();
    }

    handleMouseLeave(e) {
        // Check if we're leaving both the header and hover zone
        const leavingHeader = !this.header.contains(e.relatedTarget);

        if (leavingHeader && e.relatedTarget !== this.header) {
            this.isHovering = false;

            // If header was hidden by nav click, hide it again
            if (this.navClickHide) {
                this.hideHeader();
                return;
            }

            // If we're past the threshold and scrolling down, hide the header
            if (
                window.pageYOffset > this.scrollThreshold &&
                this.scrollDirection === "down"
            ) {
                this.hideHeader();
            }
        }
    }

    showHeader() {
        if (!this.isHeaderVisible) {
            this.header.classList.remove("header-hidden");
            this.isHeaderVisible = true;
        }
    }

    hideHeader() {
        if (this.isHeaderVisible) {
            this.header.classList.add("header-hidden");
            this.isHeaderVisible = false;
        }
    }
}

// Header color switching when over white text
export class HeaderColorManager {
    constructor() {
        this.header = document.getElementById("header");
        this.headerRect = null;
        this.isBlendMode = false;
        this.ticking = false;

        if (!this.header) return;

        this.init();
    }

    init() {
        // Check color on scroll and resize
        window.addEventListener("scroll", this.handleScroll.bind(this), {
            passive: true,
        });
        window.addEventListener("resize", this.handleResize.bind(this), {
            passive: true,
        });

        // Initial check
        this.checkHeaderColor();
    }

    handleScroll() {
        if (!this.ticking) {
            requestAnimationFrame(() => {
                this.checkHeaderColor();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    handleResize() {
        this.headerRect = null; // Reset cached rect
        this.checkHeaderColor();
    }

    checkHeaderColor() {
        // Only apply blend mode on screens smaller than 1024px
        if (window.innerWidth >= 1024) {
            if (this.isBlendMode) {
                this.isBlendMode = false;
                this.updateHeaderBlendMode();
            }
            return;
        }

        // Get header bounds
        if (!this.headerRect) {
            this.headerRect = this.header.getBoundingClientRect();
        }

        // Check if header overlaps with white text elements
        const shouldUseBlendMode = this.isOverWhiteText();

        if (shouldUseBlendMode !== this.isBlendMode) {
            this.isBlendMode = shouldUseBlendMode;
            this.updateHeaderBlendMode();
        }
    }

    isOverWhiteText() {
        // Get all elements that might have white text
        const whiteTextSelectors = [
            ".hero-title",
            ".hero-subtitle",
            "h1, h2, h3, h4, h5, h6",
            "p",
            ".text-white",
            '[style*="color: white"]',
            '[style*="color: #fff"]',
            '[style*="color: #ffffff"]',
        ];

        const headerRect = this.header.getBoundingClientRect();

        for (const selector of whiteTextSelectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                const elementRect = element.getBoundingClientRect();

                // Check if element is visible and has white-ish text
                if (
                    this.isElementVisible(element, elementRect) &&
                    this.hasWhiteText(element) &&
                    this.rectsOverlap(headerRect, elementRect)
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    isElementVisible(element, rect) {
        // Check if element is in viewport and visible
        return (
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            rect.right > 0 &&
            rect.left < window.innerWidth &&
            window.getComputedStyle(element).opacity !== "0" &&
            window.getComputedStyle(element).visibility !== "hidden"
        );
    }

    hasWhiteText(element) {
        const styles = window.getComputedStyle(element);
        const color = styles.color;

        // Convert color to RGB values for comparison
        const rgb = this.colorToRgb(color);
        if (!rgb) return false;

        // Check if color is white-ish (high brightness)
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 200; // Threshold for "white" text
    }

    colorToRgb(color) {
        // Handle different color formats
        if (color.startsWith("rgb")) {
            const values = color.match(/\d+/g);
            return values
                ? {
                      r: parseInt(values[0]),
                      g: parseInt(values[1]),
                      b: parseInt(values[2]),
                  }
                : null;
        }

        // Handle hex colors (if any)
        if (color.startsWith("#")) {
            const hex = color.replace("#", "");
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16),
            };
        }

        // Handle named colors (basic cases)
        const colorMap = {
            white: { r: 255, g: 255, b: 255 },
            "rgb(250, 250, 250)": { r: 250, g: 250, b: 250 }, // var(--primary-white)
            "rgb(245, 245, 245)": { r: 245, g: 245, b: 245 }, // var(--secondary-white)
        };

        return colorMap[color] || null;
    }

    rectsOverlap(rect1, rect2) {
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }

    updateHeaderBlendMode() {
        if (this.isBlendMode) {
            this.header.classList.add("blend-mode");
        } else {
            this.header.classList.remove("blend-mode");
        }
    }
}
