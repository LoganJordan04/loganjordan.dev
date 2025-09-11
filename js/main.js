import { Sketch } from "./sketch.js";
import { LoadingManager } from "./loading.js";
import { CustomScrollbar } from "./scrollbar.js";
import { NavManager, HeaderManager, HeaderColorManager } from "./header.js";
import { SkipLinkManager, ScrollWords, GlassCardSnap } from "./animations.js";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// Initialize when DOM is ready
function initializeApp() {
    // Force scroll to top
    window.scrollTo(0, 0);

    // Initialize ScrollSmoother
    const smoother = ScrollSmoother.create({
        smooth: 1.25,
        effects: true,
        smoothTouch: 0.1,
        normalizeScroll: true,
        ignoreMobileResize: true,
    });

    new LoadingManager();

    // Initialize Hero Three.js container
    const heroThreeContainer = document.getElementById("hero-three-container");
    if (heroThreeContainer) {
        new Sketch({
            dom: heroThreeContainer,
            section: "hero",
            geometryWidth: 4,
            geometryHeight: 2,
        });
    }

    // Initialize About Three.js container
    const aboutThreeContainer = document.getElementById(
        "about-three-container"
    );
    if (aboutThreeContainer) {
        window.aboutSketch = new Sketch({
            dom: aboutThreeContainer,
            section: "about",
            geometryWidth: 8,
            geometryHeight: 2,
        });
    }

    new CustomScrollbar();
    new NavManager();
    new HeaderManager();
    new HeaderColorManager();
    new SkipLinkManager();

    new ScrollWords();
    
    // Add delay to ensure DOM is fully ready
    setTimeout(() => {
        new GlassCardSnap();
    }, 100);

    // Make smoother globally accessible for other components
    window.scrollSmoother = smoother;
}

// Prevent browser from restoring scroll position
if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

// Force scroll to top on page unload
window.addEventListener("beforeunload", () => {
    window.scrollTo(0, 0);
});

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}
