import { Sketch } from "./sketch.js";
import { LoadingManager } from "./loading.js";
import { CustomScrollbar } from "./scrollbar.js";
import { NavManager, HeaderManager, HeaderColorManager } from "./header.js";
import { SkipLinkManager, ScrollWords } from "./animations.js";

// Initialize when DOM is ready
function initializeApp() {
    // Force scroll to top
    window.scrollTo(0, 0);

    new LoadingManager();

    const threeContainer = document.getElementById("three-container");
    if (threeContainer) {
        new Sketch({
            dom: threeContainer,
        });
    }

    new CustomScrollbar();
    new NavManager();
    new HeaderManager();
    new HeaderColorManager();
    new SkipLinkManager();
    new ScrollWords();

    // Drag functionality
    // (function() {
    //     const overlay = document.getElementById("draggable-card");
    //     if (!overlay) return;
    //
    //     let isDragging = false;
    //     let offsetX = 0, offsetY = 0;
    //
    //     function getEventPosition(e) {
    //         if (e.touches && e.touches.length > 0) {
    //             return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    //         }
    //         return { x: e.clientX, y: e.clientY };
    //     }
    //
    //     function startDrag(e) {
    //         isDragging = true;
    //         overlay.classList.add("dragging");
    //         const rect = overlay.getBoundingClientRect();
    //         const pos = getEventPosition(e);
    //         offsetX = pos.x - rect.left;
    //         offsetY = pos.y - rect.top;
    //         document.body.style.userSelect = "none";
    //         e.preventDefault();
    //     }
    //
    //     function onDrag(e) {
    //         if (!isDragging) return;
    //         const pos = getEventPosition(e);
    //         const hero = document.querySelector(".hero");
    //         const heroRect = hero.getBoundingClientRect();
    //         let x = pos.x - heroRect.left - offsetX;
    //         let y = pos.y - heroRect.top - offsetY;
    //         overlay.style.left = `${x + overlay.offsetWidth / 2}px`;
    //         overlay.style.top = `${y + overlay.offsetHeight / 2}px`;
    //         overlay.style.transform = "translate(-50%, -50%)";
    //         e.preventDefault();
    //     }
    //
    //     function endDrag() {
    //         if (isDragging) {
    //             isDragging = false;
    //             overlay.classList.remove("dragging");
    //             document.body.style.userSelect = "";
    //         }
    //     }
    //
    //     overlay.addEventListener("mousedown", startDrag);
    //     document.addEventListener("mousemove", onDrag);
    //     document.addEventListener("mouseup", endDrag);
    //
    //     overlay.addEventListener("touchstart", startDrag, { passive: false });
    //     document.addEventListener("touchmove", onDrag, { passive: false });
    //     document.addEventListener("touchend", endDrag);
    // })();
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
