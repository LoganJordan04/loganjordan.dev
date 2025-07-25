import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GrainShader } from './shaders/GrainShader.js';


// Define color palettes
const colors = [
    ["#24479e", "#ebe0ca", "#eb580e"]
];
// Select a random palette and convert to THREE.Color
const palette = colors[Math.floor(Math.random() * colors.length)].map(color => new THREE.Color(color));

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

        this.isPlaying = true;  // Animation state

        // Initialize scene objects, postprocessing, and event listeners
        this.addObjects();
        this.initPost();
        this.resize();
        this.render();
        this.setupResize();

        // FPS tracking variables
        this.fpsFrameCount = 0;
        this.fpsElapsed = 0;

        // Mouse movement event to update shader uniform
        const heroContainer = this.container.parentElement; // .hero-container
        heroContainer.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - (e.clientY - rect.top) / rect.height;
            this.material.uniforms.mouse.value.set(x, y);
        });
    }
    
    // Initialize postprocessing pipeline with EffectComposer and custom shader passes.
    initPost() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Add grain shader as a postprocessing effect
        const effect1 = new ShaderPass(GrainShader);
        effect1.uniforms['scale'].value = 4;
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
                derivatives: "#extension GL_OES_standard_derivatives : enable"
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector4() },
                uColor: { value: palette },
                mouse: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: vertex,
            fragmentShader: fragment
        });

        // Create a plane geometry and mesh
        this.geometry = new THREE.PlaneGeometry(4, 2, 1, 1);
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    // addLights() {
    //     const light1 = new THREE.AmbientLight(0xffffff, 0.5);
    //     this.scene.add(light1);
    //
    //     const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    //     light2.position.set(0.5, 0, 0.866);  // ~60º
    //     this.scene.add(light2);
    // }
    //
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
        this.fpsFrameCount++;
        this.fpsElapsed += delta;
        if (this.fpsElapsed >= 1) {
            const fps = this.fpsFrameCount / this.fpsElapsed;
            console.log('FPS:', fps.toFixed(1));
            this.fpsFrameCount = 0;
            this.fpsElapsed = 0;
        }

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
        this.scrollbarElement = document.createElement('div');
        this.scrollbarElement.className = 'custom-scrollbar';

        // Create scrollbar track
        this.trackElement = document.createElement('div');
        this.trackElement.className = 'custom-scrollbar-track';

        // Create scrollbar thumb
        this.thumbElement = document.createElement('div');
        this.thumbElement.className = 'custom-scrollbar-thumb';

        this.scrollbarElement.appendChild(this.trackElement);
        this.scrollbarElement.appendChild(this.thumbElement);
        document.body.appendChild(this.scrollbarElement);

        this.updateThumb();
        this.setupScrollbarEvents();
    }

    setupScrollbarEvents() {
        // Hover events for scrollbar visibility
        this.scrollbarElement.addEventListener('mouseenter', () => {
            this.showScrollbar();
            this.clearHideTimeout();
        });

        this.scrollbarElement.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                this.scheduleHide();
            }
        });

        // Click on track to jump
        this.trackElement.addEventListener('click', (e) => {
            if (e.target === this.trackElement) {
                const rect = this.trackElement.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = clickY / rect.height;
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                window.scrollTo({
                    top: percentage * maxScroll,
                    behavior: 'smooth'
                });
            }
        });

        // Thumb dragging
        this.thumbElement.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));

        // Prevent text selection while dragging
        this.thumbElement.addEventListener('selectstart', (e) => e.preventDefault());
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.dragStartScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        this.thumbElement.classList.add('dragging');
        document.body.style.userSelect = 'none';
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
        const newScrollTop = Math.max(0, Math.min(maxScroll, this.dragStartScrollTop + scrollDelta));

        window.scrollTo(0, newScrollTop);
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.thumbElement.classList.remove('dragging');
        document.body.style.userSelect = '';
        this.scheduleHide();
    }

    updateThumb() {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Only show scrollbar if content is scrollable
        if (documentHeight <= windowHeight) {
            this.hideScrollbar();
            return;
        }

        // Calculate thumb height and position
        this.trackHeight = windowHeight;
        this.thumbHeight = Math.max((windowHeight / documentHeight) * windowHeight, 30);
        const maxScrollTop = documentHeight - windowHeight;
        const scrollPercentage = scrollTop / maxScrollTop;
        const thumbTop = scrollPercentage * (this.trackHeight - this.thumbHeight);

        this.thumbElement.style.height = `${this.thumbHeight}px`;
        this.thumbElement.style.top = `${thumbTop}px`;
    }

    showScrollbar() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.scrollbarElement.classList.add('visible');
        }
    }

    hideScrollbar() {
        if (this.isVisible && !this.isDragging) {
            this.isVisible = false;
            this.scrollbarElement.classList.remove('visible');
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
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

        // Listen for wheel events (mouse wheel)
        window.addEventListener('wheel', this.handleScroll.bind(this), { passive: true });

        // Listen for touch events (mobile scrolling)
        window.addEventListener('touchstart', this.handleScroll.bind(this), { passive: true });
        window.addEventListener('touchmove', this.handleScroll.bind(this), { passive: true });

        // Listen for resize to update thumb
        window.addEventListener('resize', () => {
            this.updateThumb();
        }, { passive: true });

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
const loadingScreen = document.getElementById('loading-container');
const loadingImage = document.getElementById('loading-image');
let loadingComplete = false;

// Function to handle loading screen removal
function removeLoadingScreen() {
    if (loadingComplete) return;
    loadingComplete = true;

    // Start the fade-out sequence
    loadingImage.classList.add('loading-fade-out');

    setTimeout(() => {
        loadingScreen.classList.add('loading-fade-out');

        setTimeout(() => {
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.remove();
            }
            document.body.classList.remove('loading-active'); // Allow scrolling
        }, 500);
    }, 500);
}

// Prevent browser from restoring scroll position
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
// Scroll to top of page on reload
window.scrollTo(0, 0);

// When the window finishes loading, wait a bit then remove loading screen
window.addEventListener('load', () => {
    setTimeout(() => {
        removeLoadingScreen();
    }, 2000);
});

// Temp for testing
window.addEventListener('click', () => {
    if (!loadingComplete) {
        removeLoadingScreen();
    }
});

// Initialize the Three.js sketch and custom scrollbar after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) {
        new Sketch({
            dom: threeContainer
        });
    }

    // Initialize custom scrollbar
    new CustomScrollbar();
});
