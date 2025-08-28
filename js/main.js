import { Sketch } from "./sketch.js";
import { LoadingManager } from "./loading.js";
import { CustomScrollbar } from "./scrollbar.js";
import { NavManager, HeaderManager, HeaderColorManager } from "./header.js";
import { SkipLinkManager, ScrollWords } from "./animations.js";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// Temp for testing
class DraggableManager {
    constructor() {
        this.initializeDraggables();
    }

    initializeDraggables() {
        const draggables = document.querySelectorAll('.draggable');

        draggables.forEach(element => {
            this.makeDraggable(element);
        });
    }

    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const handleStart = (e) => {
            isDragging = true;
            element.classList.add('dragging');

            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            startX = clientX;
            startY = clientY;

            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        };

        const handleEnd = () => {
            isDragging = false;
            element.classList.remove('dragging');
        };

        // Mouse events
        element.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);

        // Touch events
        element.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    }
}

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
    new DraggableManager();

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
