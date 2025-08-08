import * as THREE from "three";
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from "./shaders/fragment.glsl";
import vertex from "./shaders/vertex.glsl";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GrainShader } from "./shaders/GrainShader.js";

// Define color palettes
const colors = [["#24479e", "#ebe0ca", "#eb580e"]];
// Select a random palette and convert to THREE.Color
const palette = colors[Math.floor(Math.random() * colors.length)].map(
    (color) => new THREE.Color(color)
);

// Main Sketch class for rendering a Three.js scene with custom shaders and postprocessing.
export default class Sketch {
    /**
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.dom - The container DOM element for rendering
     */
    constructor(options) {
        // Create the scene
        this.scene = new THREE.Scene();

        // Set up renderer and append to container
        this.container = options.dom;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xeeeeee, 1);
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            this.width / this.height,
            0.001,
            1000
        );
        this.camera.position.set(0, 0, 1.3);

        // Add orbit controls for camera interaction
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Initialize clock and time tracking
        this.clock = new THREE.Clock();
        this.time = 0;

        this.isPlaying = true; // Animation state

        // Initialize scene objects, postprocessing, and event listeners
        this.addObjects();
        this.initPost();
        this.resize();
        this.render();
        this.setupResize();

        // FPS tracking variables
        // this.fpsFrameCount = 0;
        // this.fpsElapsed = 0;

        // Mouse movement event to update shader uniform
        document.addEventListener("mousemove", (e) => {
            const rect = this.container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - (e.clientY - rect.top) / rect.height;
            // Only update if mouse is within the sketch container bounds
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            ) {
                this.material.uniforms.mouse.value.set(x, y);
            }
        });
    }

    // Initialize postprocessing pipeline with EffectComposer and custom shader passes.
    initPost() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Add grain shader as a postprocessing effect
        const effect1 = new ShaderPass(GrainShader);
        effect1.uniforms["scale"].value = 4;
        this.composer.addPass(effect1);
    }

    // Set up window resize event listener.
    setupResize() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    // Handle resizing of renderer, composer, and camera.
    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
    }

    // Add objects (geometry and material) to the scene.
    addObjects() {
        // Create custom shader material
        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector4() },
                uColor: { value: palette },
                mouse: { value: new THREE.Vector2(0, 0) },
            },
            vertexShader: vertex,
            fragmentShader: fragment,
        });

        // Create a plane geometry and mesh
        this.geometry = new THREE.PlaneGeometry(4, 2, 1, 1);
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    // stop() {
    //     this.isPlaying = false;
    // }
    //
    // play() {
    //     if(!this.isPlaying){
    //         this.isPlaying = true;
    //         this.render()
    //     }
    // }

    // Main render loop. Updates uniforms, handles FPS, and renders the scene.
    render() {
        if (!this.isPlaying) return;

        let delta = this.clock.getDelta();
        delta = Math.min(delta, 1 / 60); // Clamp delta for stability

        this.time += delta;
        this.material.uniforms.time.value = this.time;

        // Debug FPS calculation and logging
        // this.fpsFrameCount++;
        // this.fpsElapsed += delta;
        // if (this.fpsElapsed >= 1) {
        //     const fps = this.fpsFrameCount / this.fpsElapsed;
        //     console.log("FPS:", fps.toFixed(1));
        //     this.fpsFrameCount = 0;
        //     this.fpsElapsed = 0;
        // }

        requestAnimationFrame(this.render.bind(this));
        // Use composer for postprocessing; comment out for raw render
        // this.renderer.render(this.scene, this.camera);
        this.composer.render(this.scene, this.camera);
    }
}

// Custom scrollbar functionality
class CustomScrollbar {
    constructor() {
        this.scrollTimeout = null;
        this.scrollbarElement = null;
        this.trackElement = null;
        this.thumbElement = null;
        this.isVisible = false;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartScrollTop = 0;
        this.thumbHeight = 0;
        this.trackHeight = 0;
        this.createScrollbar();
        this.init();
    }

    createScrollbar() {
        // Create scrollbar container
        this.scrollbarElement = document.createElement("div");
        this.scrollbarElement.className = "custom-scrollbar";

        // Create scrollbar track
        this.trackElement = document.createElement("div");
        this.trackElement.className = "custom-scrollbar-track";

        // Create scrollbar thumb
        this.thumbElement = document.createElement("div");
        this.thumbElement.className = "custom-scrollbar-thumb";

        this.scrollbarElement.appendChild(this.trackElement);
        this.scrollbarElement.appendChild(this.thumbElement);
        document.body.appendChild(this.scrollbarElement);

        this.updateThumb();
        this.setupScrollbarEvents();
    }

    setupScrollbarEvents() {
        // Hover events for scrollbar visibility
        this.scrollbarElement.addEventListener("mouseenter", () => {
            this.showScrollbar();
            this.clearHideTimeout();
        });

        this.scrollbarElement.addEventListener("mouseleave", () => {
            if (!this.isDragging) {
                this.scheduleHide();
            }
        });

        // Click on track to jump
        this.trackElement.addEventListener("click", (e) => {
            if (e.target === this.trackElement) {
                const rect = this.trackElement.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = clickY / rect.height;
                const maxScroll =
                    document.documentElement.scrollHeight - window.innerHeight;
                window.scrollTo({
                    top: percentage * maxScroll,
                    behavior: "smooth",
                });
            }
        });

        // Thumb dragging
        this.thumbElement.addEventListener(
            "mousedown",
            this.startDrag.bind(this)
        );
        document.addEventListener("mousemove", this.drag.bind(this));
        document.addEventListener("mouseup", this.endDrag.bind(this));

        // Prevent text selection while dragging
        this.thumbElement.addEventListener("selectstart", (e) =>
            e.preventDefault()
        );
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.dragStartScrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        this.thumbElement.classList.add("dragging");
        document.body.style.userSelect = "none";
        this.clearHideTimeout();
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        const deltaY = e.clientY - this.dragStartY;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const maxScroll = documentHeight - windowHeight;
        const scrollableTrackHeight = this.trackHeight - this.thumbHeight;

        const scrollDelta = (deltaY / scrollableTrackHeight) * maxScroll;
        const newScrollTop = Math.max(
            0,
            Math.min(maxScroll, this.dragStartScrollTop + scrollDelta)
        );

        window.scrollTo(0, newScrollTop);
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.thumbElement.classList.remove("dragging");
        document.body.style.userSelect = "";
        this.scheduleHide();
    }

    updateThumb() {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

        // Only show scrollbar if content is scrollable
        if (documentHeight <= windowHeight) {
            this.hideScrollbar();
            return;
        }

        // Calculate thumb height and position
        this.trackHeight = windowHeight;
        this.thumbHeight = Math.max(
            (windowHeight / documentHeight) * windowHeight,
            30
        );
        const maxScrollTop = documentHeight - windowHeight;
        const scrollPercentage = scrollTop / maxScrollTop;
        const thumbTop =
            scrollPercentage * (this.trackHeight - this.thumbHeight);

        this.thumbElement.style.height = `${this.thumbHeight}px`;
        this.thumbElement.style.top = `${thumbTop}px`;
    }

    showScrollbar() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.scrollbarElement.classList.add("visible");
        }
    }

    hideScrollbar() {
        if (this.isVisible && !this.isDragging) {
            this.isVisible = false;
            this.scrollbarElement.classList.remove("visible");
        }
    }

    clearHideTimeout() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }
    }

    scheduleHide() {
        this.clearHideTimeout();
        this.scrollTimeout = setTimeout(() => {
            this.hideScrollbar();
        }, 300);
    }

    init() {
        // Listen for scroll events
        window.addEventListener("scroll", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for wheel events (mouse wheel)
        window.addEventListener("wheel", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for touch events (mobile scrolling)
        window.addEventListener("touchstart", this.handleScroll.bind(this), {
            passive: true,
        });
        window.addEventListener("touchmove", this.handleScroll.bind(this), {
            passive: true,
        });

        // Listen for resize to update thumb
        window.addEventListener(
            "resize",
            () => {
                this.updateThumb();
            },
            { passive: true }
        );

        // Listen for content changes
        const observer = new MutationObserver(() => {
            setTimeout(() => this.updateThumb(), 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    handleScroll() {
        // Update thumb position
        this.updateThumb();

        // Show scrollbar when scrolling
        if (!this.isDragging) {
            this.showScrollbar();
            this.scheduleHide();
        }
    }
}

// Loading screen management
class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById("loading-container");
        this.loadingAnimation = document.getElementById("loading-animation");
        this.isComplete = false;
        this.hasStartedPlaying = false;
        this.loadingTimer = null;
        this.loadingDuration = 4000;

        this.init();
    }

    init() {
        this.playVideo();

        // Set timer to remove loading screen
        this.loadingTimer = setTimeout(() => {
            this.removeLoadingScreen();
        }, this.loadingDuration);

        // Dev: Click to skip loading screen
        this.setupSkipFeature();
    }

    setupSkipFeature() {
        if (!this.loadingScreen) return;

        const skipLoading = (e) => {
            // Prevent event from bubbling
            e.stopPropagation();
            e.preventDefault();

            // Clear the timer
            if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
            }

            // Skip directly to removal
            this.removeLoadingScreen(true);

            // Remove the event listener
            this.loadingScreen.removeEventListener("click", skipLoading);
        };

        // Add click listener to loading screen
        this.loadingScreen.addEventListener("click", skipLoading);
    }

    async playVideo() {
        if (!this.loadingAnimation) {
            console.log("signature-animation.webm not found!");
            return;
        }

        try {
            if (!this.hasStartedPlaying) {
                this.loadingAnimation.currentTime = 0;
            }
            this.loadingAnimation.muted = true;

            const playPromise = this.loadingAnimation.play();

            if (playPromise !== undefined) {
                await playPromise;
                this.hasStartedPlaying = true;

                // Add event listener to prevent restarting
                this.loadingAnimation.addEventListener(
                    "playing",
                    () => {
                        this.hasStartedPlaying = true;
                    },
                    { once: true }
                );
            }
        } catch (error) {
            console.log("Animation autoplay blocked:", error);

            if (!this.hasStartedPlaying) {
                // Try to play on first user interaction
                const playOnInteraction = async () => {
                    try {
                        // Don't reset currentTime on retry
                        await this.loadingAnimation.play();
                        this.hasStartedPlaying = true;
                        console.log("Animation started after user interaction");
                    } catch (e) {
                        console.log("Animation still cannot play:", e);
                    }
                    // Remove listeners after first attempt
                    document.removeEventListener("click", playOnInteraction);
                    document.removeEventListener(
                        "touchstart",
                        playOnInteraction
                    );
                    document.removeEventListener("keydown", playOnInteraction);
                };

                document.addEventListener("click", playOnInteraction);
                document.addEventListener("touchstart", playOnInteraction);
                document.addEventListener("keydown", playOnInteraction);
            }
        }
    }

    removeLoadingScreen(skipFading = false) {
        if (this.isComplete) {
            return;
        }

        this.isComplete = true;

        if (skipFading) {
            // Skip fading animation and remove immediately
            if (this.loadingScreen && this.loadingScreen.parentNode) {
                this.loadingScreen.remove();
            }
            document.body.classList.remove("loading-active");
            return;
        }

        // Fade out the animation first
        if (this.loadingAnimation) {
            this.loadingAnimation.classList.add("loading-fade-out");
        }

        // Then fade out the container
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.classList.add("loading-fade-out");
            }

            // After fade animation completes, remove from DOM
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.remove();
                }
                document.body.classList.remove("loading-active");
            }, 500); // Wait for CSS transition
        }, 300);
    }
}

class NavManager {
    constructor() {
        this.sections = ['hero', 'about', 'work', 'experience', 'footer'];
        this.navLinks = {};
        this.navItems = {};
        this.currentActiveSection = 'hero'; // Default to hero
        this.observerTimeout = null; // For managing observer during smooth scroll

        this.init();
    }

    init() {
        // Cache nav elements
        this.sections.forEach(sectionId => {
            const navLink = document.querySelector(`a[href="#${sectionId}"]`);
            const navItem = navLink?.closest('.header-nav-item');

            if (navLink && navItem) {
                this.navLinks[sectionId] = navLink;
                this.navItems[sectionId] = navItem;
            }
        });

        // Set initial active state
        this.setActiveNav('hero');

        // Setup intersection observer
        this.setupIntersectionObserver();

        // Setup smooth scrolling
        this.setupSmoothScrolling();
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '-20% 0px -60% 0px', // Trigger when section is 20% from top
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            // Find the section that's most visible
            let mostVisibleSection = null;
            let maxRatio = 0;

            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                    maxRatio = entry.intersectionRatio;
                    mostVisibleSection = entry.target.id;
                }
            });

            // Special handling for hero section when at top of page
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop < 100) {
                mostVisibleSection = 'hero';
            }

            if (mostVisibleSection && mostVisibleSection !== this.currentActiveSection) {
                this.setActiveNav(mostVisibleSection);
            }
        }, options);

        // Observe all sections
        this.sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                observer.observe(section);
            }
        });
    }

    setActiveNav(activeSection) {
        // Remove active class from all nav links and icons
        Object.values(this.navLinks).forEach(link => {
            link.classList.remove('active-nav');
        });

        // Hide all active nav icons by removing active class
        Object.values(this.navItems).forEach(item => {
            const icon = item.querySelector('.active-nav-icon');
            if (icon) {
                icon.classList.remove('active-icon');
            }
        });

        // Set active state for current section
        if (this.navLinks[activeSection] && this.navItems[activeSection]) {
            this.navLinks[activeSection].classList.add('active-nav');

            const activeIcon = this.navItems[activeSection].querySelector('.active-nav-icon');
            if (activeIcon) {
                activeIcon.classList.add('active-icon');
            }
        }

        this.currentActiveSection = activeSection;
    }

    setupSmoothScrolling() {
        // Add click listeners to all nav links
        Object.entries(this.navLinks).forEach(([sectionId, navLink]) => {
            navLink.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default anchor behavior
                this.scrollToSection(sectionId);
            });
        });
    }

    scrollToSection(sectionId) {
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) return;

        // Calculate offset for better positioning
        let offset;

        // Special offset for hero section (scroll to very top)
        if (sectionId === 'hero') {
            offset = 0;
        } else {
            // For other sections, account for header height
            const header = document.getElementById('header');
            offset = header ? header.offsetHeight : 80;
        }

        // Get target position
        const targetPosition = targetSection.offsetTop - offset;

        // Smooth scroll to target
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });

        // Temporarily disable intersection observer to prevent conflicts
        this.temporarilyDisableObserver();

        // Set active state immediately for better UX
        this.setActiveNav(sectionId);
    }

    temporarilyDisableObserver() {
        // Re-enable observer after scroll animation completes
        clearTimeout(this.observerTimeout);
        this.observerTimeout = setTimeout(() => {
            // Observer will resume automatically
        }, 1000); // Give time for smooth scroll to complete
    }
}

class HeaderManager {
    constructor() {
        this.header = document.getElementById('header');
        this.lastScrollY = window.pageYOffset;
        this.scrollThreshold = 100; // Minimum scroll distance to trigger hide/show
        this.isHeaderVisible = true;
        this.isHovering = false;
        this.scrollDirection = 'up';
        this.ticking = false;

        this.init();
    }

    init() {
        if (!this.header) return;

        // Add CSS class for transitions
        this.header.classList.add('header-auto-hide');

        // Setup scroll listener
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

        // Setup hover listeners
        this.header.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.header.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
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
            this.scrollDirection = 'down';
        } else if (currentScrollY < this.lastScrollY) {
            this.scrollDirection = 'up';
        }

        // Show/hide header based on scroll direction and position
        if (currentScrollY <= this.scrollThreshold) {
            // Always show header at the top
            this.showHeader();
        } else if (this.scrollDirection === 'down' && !this.isHovering) {
            // Hide header when scrolling down (unless hovering)
            this.hideHeader();
        } else if (this.scrollDirection === 'up') {
            // Show header when scrolling up
            this.showHeader();
        }

        this.lastScrollY = currentScrollY;
        this.ticking = false;
    }

    handleMouseEnter() {
        this.isHovering = true;
        this.showHeader();
    }

    handleMouseLeave() {
        this.isHovering = false;

        // If we're past the threshold and scrolling down, hide the header
        if (window.pageYOffset > this.scrollThreshold && this.scrollDirection === 'down') {
            this.hideHeader();
        }
    }

    showHeader() {
        if (!this.isHeaderVisible) {
            this.header.classList.remove('header-hidden');
            this.isHeaderVisible = true;
        }
    }

    hideHeader() {
        if (this.isHeaderVisible) {
            this.header.classList.add('header-hidden');
            this.isHeaderVisible = false;
        }
    }
}

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
