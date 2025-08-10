import * as THREE from "three";
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from "./shaders/fragment.glsl";
import vertex from "./shaders/vertex.glsl";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GrainShader } from "./shaders/GrainShader.js";
import { DotLottie } from "@lottiefiles/dotlottie-web";

// Define color palettes
const colors = [
    ["#2d55bd", "#f6ead2", "#f55809"],
    // ["#9359c7", "#b2ecc0", "#5069e3"],
    // ["#226798", "#43bd8f", "#dcfadf"],
];
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

// Navigation management
class NavManager {
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
                            src: "animations/arrow-in.json",
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

        let offset;

        if (sectionId === "hero") {
            offset = 0;
        } else {
            const header = document.getElementById("header");
            offset = header ? header.offsetHeight : 80;
        }

        const targetPosition = targetSection.offsetTop - offset;

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
class HeaderManager {
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
class HeaderColorManager {
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

// Skip Link/Scroll Animation Manager
class SkipLinkManager {
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
                src: "animations/scroll-down.json",
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
