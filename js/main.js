import { Sketch } from "./sketch.js";
import { LoadingManager } from "./loading.js";
import { CustomScrollbar } from "./scrollbar.js";
import { NavManager, HeaderManager } from "./header.js";
import { SkipLinkManager, ScrollWords, GlassCardSnap } from "./animations.js";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// Initialize when DOM is ready
function initializeApp() {
    // Force scroll to top
    window.scrollTo(0, 0);

    const isMobile = /Mobi/i.test(window.navigator.userAgent);

    // Initialize ScrollSmoother
    const smoother = ScrollSmoother.create({
        smooth: 1.25,
        effects: true,
        smoothTouch: 0.1,
        normalizeScroll: isMobile,
        ignoreMobileResize: true,
        // Performance optimizations
        onUpdate: (self) => {
            // Throttle expensive operations during smooth scrolling
            if (self.getVelocity() > 100) {
                // Reduce quality during fast scrolling
                document.documentElement.style.setProperty(
                    "--scroll-quality",
                    "optimizeSpeed"
                );
            } else {
                document.documentElement.style.setProperty(
                    "--scroll-quality",
                    "optimizeQuality"
                );
            }
        },
    });

    // Initialize components with error handling
    try {
        new LoadingManager();

        // Initialize Three.js containers with intersection observer
        initThreeJsContainers();

        new CustomScrollbar();
        new NavManager();
        new HeaderManager();
        new SkipLinkManager();

        // Initialize animations with staggered loading
        setTimeout(() => new ScrollWords(), 50);
        setTimeout(() => new GlassCardSnap(), 150);

        // Make smoother globally accessible
        window.scrollSmoother = smoother;
    } catch (error) {
        console.error("Error during initialization:", error);
    }

    // Lazy load Three.js containers
    function initThreeJsContainers() {
        const heroContainer = document.getElementById("hero-three-container");
        const aboutContainer = document.getElementById("about-three-container");
        const expContainer = document.getElementById("exp-three-container");

        // Use Intersection Observer for lazy loading
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const { target } = entry;

                        if (
                            target.id === "hero-three-container" &&
                            !target.dataset.initialized
                        ) {
                            new Sketch({
                                dom: target,
                                section: "hero",
                                geometryWidth: 4,
                                geometryHeight: 2,
                            });
                            target.dataset.initialized = "true";
                        }

                        if (
                            target.id === "about-three-container" &&
                            !target.dataset.initialized
                        ) {
                            window.aboutSketch = new Sketch({
                                dom: target,
                                section: "about",
                                geometryWidth: 8,
                                geometryHeight: 2,
                            });
                            target.dataset.initialized = "true";
                        }

                        if (
                            target.id === "exp-three-container" &&
                            !target.dataset.initialized
                        ) {
                            window.aboutSketch = new Sketch({
                                dom: target,
                                section: "exp",
                                geometryWidth: 4,
                                geometryHeight: 2,
                            });
                            target.dataset.initialized = "true";
                        }

                        observer.unobserve(target);
                    }
                });
            },
            { rootMargin: "50px" }
        );

        if (heroContainer) observer.observe(heroContainer);
        if (aboutContainer) observer.observe(aboutContainer);
        if (expContainer) observer.observe(expContainer);
    }

    // Development popup functionality
    function closeDevPopup() {
        const popup = document.getElementById("devPopup");
        if (popup) {
            document.body.classList.remove("dev-popup-active");
            popup.classList.add("hidden");

            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }
    }

    // Make function globally accessible
    window.closeDevPopup = closeDevPopup;

    // Show popup on load
    document.body.classList.add("dev-popup-active");
}

// Prevent browser from restoring scroll position
if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}
