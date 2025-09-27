import { Sketch } from "./sketch.js";
import { LoadingManager } from "./loading.js";
import { CustomScrollbar } from "./scrollbar.js";
import { NavManager, HeaderManager } from "./header.js";
import {
    SkipLinkManager,
    ScrollWords,
    GlassCardSnap,
    ExperienceCards,
} from "./animations.js";

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
        onUpdate: (self) => {
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
        setTimeout(() => new GlassCardSnap(), 100);
        setTimeout(() => new ExperienceCards(), 150);

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

        // Store sketch instances for cleanup
        const sketchInstances = new Map();

        // Performance monitoring for Three.js instances
        const performanceMonitor = {
            activeInstances: 0,
            maxInstances: isMobile ? 1 : 2, // Limit concurrent instances on mobile
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const { target } = entry;

                        // Check if we should limit instances for performance
                        if (
                            performanceMonitor.activeInstances >=
                                performanceMonitor.maxInstances &&
                            isMobile
                        ) {
                            console.log(
                                "Delaying Three.js initialization for performance"
                            );
                            return;
                        }

                        if (
                            target.id === "hero-three-container" &&
                            !target.dataset.initialized
                        ) {
                            try {
                                const sketch = new Sketch({
                                    dom: target,
                                    section: "hero",
                                    geometryWidth: 4,
                                    geometryHeight: 2,
                                });
                                sketchInstances.set(target.id, sketch);
                                target.dataset.initialized = "true";
                                performanceMonitor.activeInstances++;

                                // Add error handling for sketch initialization
                                if (!sketch.renderer) {
                                    throw new Error(
                                        "Failed to initialize WebGL renderer"
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "Failed to initialize hero sketch:",
                                    error
                                );
                                target.dataset.error = "true";
                            }
                        }

                        if (
                            target.id === "about-three-container" &&
                            !target.dataset.initialized
                        ) {
                            try {
                                window.aboutSketch = new Sketch({
                                    dom: target,
                                    section: "about",
                                    geometryWidth: 8,
                                    geometryHeight: 2,
                                });
                                sketchInstances.set(
                                    target.id,
                                    window.aboutSketch
                                );
                                target.dataset.initialized = "true";
                                performanceMonitor.activeInstances++;

                                if (!window.aboutSketch.renderer) {
                                    throw new Error(
                                        "Failed to initialize WebGL renderer"
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "Failed to initialize about sketch:",
                                    error
                                );
                                target.dataset.error = "true";
                            }
                        }

                        if (
                            target.id === "exp-three-container" &&
                            !target.dataset.initialized
                        ) {
                            try {
                                const sketch = new Sketch({
                                    dom: target,
                                    section: "exp",
                                    geometryWidth: 4,
                                    geometryHeight: 4,
                                });
                                sketchInstances.set(target.id, sketch);
                                target.dataset.initialized = "true";
                                performanceMonitor.activeInstances++;

                                if (!sketch.renderer) {
                                    throw new Error(
                                        "Failed to initialize WebGL renderer"
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "Failed to initialize exp sketch:",
                                    error
                                );
                                target.dataset.error = "true";
                            }
                        }

                        observer.unobserve(target);
                    }
                });
            },
            {
                rootMargin: "100px",
                threshold: 0.1,
            }
        );

        if (heroContainer) observer.observe(heroContainer);
        if (aboutContainer) observer.observe(aboutContainer);
        if (expContainer) observer.observe(expContainer);

        // Enhanced memory management with performance monitoring
        const cleanup = () => {
            sketchInstances.forEach((sketch, id) => {
                if (sketch && typeof sketch.dispose === "function") {
                    try {
                        sketch.dispose();
                        console.log(`Disposed sketch: ${id}`);
                    } catch (error) {
                        console.error(`Error disposing sketch ${id}:`, error);
                    }
                }
            });
            sketchInstances.clear();
            performanceMonitor.activeInstances = 0;
        };

        // Cleanup on page unload
        window.addEventListener("beforeunload", cleanup);

        // Cleanup on visibility change (when tab becomes hidden)
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                // Pause all sketches when tab is hidden
                sketchInstances.forEach((sketch) => {
                    if (sketch && sketch.isPlaying !== undefined) {
                        sketch.isPlaying = false;
                    }
                });
            } else {
                // Resume sketches when tab becomes visible
                sketchInstances.forEach((sketch) => {
                    if (sketch && sketch.isPlaying !== undefined) {
                        sketch.isPlaying = true;
                        if (sketch.render) {
                            sketch.render();
                        }
                    }
                });
            }
        });

        // Performance-based cleanup for mobile devices
        if (isMobile) {
            let memoryWarningCount = 0;
            const checkMemoryUsage = () => {
                // Check if performance.memory is available (Chrome)
                if (performance.memory) {
                    const memoryUsage =
                        performance.memory.usedJSHeapSize /
                        performance.memory.totalJSHeapSize;

                    if (memoryUsage > 0.8) {
                        // If using more than 80% of available memory
                        memoryWarningCount++;
                        console.warn(
                            `High memory usage detected: ${(memoryUsage * 100).toFixed(1)}%`
                        );

                        if (memoryWarningCount > 3) {
                            // Force cleanup of oldest sketches
                            console.log(
                                "Forcing cleanup due to memory constraints"
                            );
                            const oldestEntry = sketchInstances
                                .entries()
                                .next().value;
                            if (oldestEntry) {
                                const [id, sketch] = oldestEntry;
                                if (sketch.dispose) {
                                    sketch.dispose();
                                }
                                sketchInstances.delete(id);
                                performanceMonitor.activeInstances--;
                            }
                            memoryWarningCount = 0;
                        }
                    } else {
                        memoryWarningCount = Math.max(
                            0,
                            memoryWarningCount - 1
                        );
                    }
                }
            };

            // Check memory usage every 5 seconds on mobile
            setInterval(checkMemoryUsage, 5000);
        }

        // Make instances accessible for debugging
        window.sketchInstances = sketchInstances;
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
