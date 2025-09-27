import * as THREE from "three";
import fragment from "./shaders/fragment.glsl";
import vertex from "./shaders/vertex.glsl";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GrainShader } from "./shaders/GrainShader.js";

// Define color palettes
const colors = [
    ["#2d55bd", "#f6ead2", "#f55809"],
    // ["#9359c7", "#b2ecc0", "#5069e3"],
    // ["#226798", "#43bd8f", "#dcfadf"],
];

// Main Sketch class for rendering a Three.js scene with custom shaders and postprocessing.
export class Sketch {
    constructor(options) {
        // Create the scene
        this.scene = new THREE.Scene();

        // Set up renderer and append to container
        this.container = options.dom;
        this.section = options.section;
        this.geometryWidth = options.geometryWidth;
        this.geometryHeight = options.geometryHeight;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance",
            stencil: false,
            depth: false,
            logarithmicDepthBuffer: false,
            precision: "mediump",
        });

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = false;
        this.renderer.sortObjects = false;
        this.renderer.info.autoReset = false;

        // Force WebGL canvas to render on pixel boundaries
        const canvas = this.renderer.domElement;
        Object.assign(canvas.style, {
            display: "block",
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            transform: "translateZ(0)",
            willChange: "transform",
            imageRendering: "-webkit-optimize-contrast",
        });

        this.container.appendChild(canvas);

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            this.width / this.height,
            0.1,
            10
        );
        this.camera.position.set(0, 0, 1.3);

        // Initialize clock and time tracking
        this.clock = new THREE.Clock();
        this.time = 0;

        this.isPlaying = true;

        // Select a random palette and convert to THREE.Color
        this.palette = colors[Math.floor(Math.random() * colors.length)].map(
            (color) => new THREE.Color(color)
        );

        // Performance monitoring and adaptive quality
        this.performanceMonitor = {
            frameTime: 0,
            lastTime: performance.now(),
            adaptiveQuality: true,
            targetFPS: 60,
            lowQualityThreshold: 30,
        };

        // Initialize scene objects, postprocessing, and event listeners
        this.addObjects();
        this.initPost();
        this.render();

        // Mouse movement event to update shader uniform
        this.mouseMoveThrottled = this.throttle((e) => {
            const rect = this.container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - (e.clientY - rect.top) / rect.height;
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            ) {
                this.material.uniforms.mouse.value.set(x, y);
            }
        }, 16); // ~60fps throttling

        document.addEventListener("mousemove", this.mouseMoveThrottled);

        this.setupCulling();
    }

    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
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

    // Add objects (geometry and material) to the scene.
    addObjects() {
        // Determine shader defines based on section
        const defines = {};
        if (this.section === "hero") defines.HERO_SECTION = "";
        if (this.section === "about") defines.ABOUT_SECTION = "";
        if (this.section === "exp") defines.EXP_SECTION = "";

        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.DoubleSide,
            defines: defines,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector4() },
                uColor: { value: this.palette },
                mouse: { value: new THREE.Vector2(0, 0) },
                opacity: { value: 0 },
                vw: { value: this.width },
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: false,
            depthWrite: false,
            depthTest: false,
            fog: false,
        });

        // Calculate geometry width based on screen width and camera parameters
        const distance = this.camera.position.z;
        const fov = this.camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * distance;
        const width = height * this.camera.aspect;

        // Use BufferGeometry directly instead of PlaneGeometry
        const vertices = new Float32Array([
            -width / 2,
            -this.geometryHeight / 2,
            0,
            width / 2,
            -this.geometryHeight / 2,
            0,
            width / 2,
            this.geometryHeight / 2,
            0,
            -width / 2,
            this.geometryHeight / 2,
            0,
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(vertices, 3)
        );
        this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    // Adjust opacity in the about section
    updateOpacity(opacityValue) {
        if (this.material && this.material.uniforms.opacity) {
            this.material.uniforms.opacity.value = opacityValue;
        }
    }

    // Visibility-based performance management
    setupCulling() {
        // Intersection Observer for visibility-based rendering
        this.visibilityObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target === this.container) {
                        if (entry.isIntersecting) {
                            this.isPlaying = true;
                            this.render(); // Resume rendering
                        } else {
                            this.isPlaying = false; // Pause when not visible
                        }
                    }
                });
            },
            {
                rootMargin: "50px", // Start rendering 50px before becoming visible
            }
        );

        this.visibilityObserver.observe(this.container);
    }

    // Main render loop. Updates uniforms and renders the scene.
    render() {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        let delta = this.clock.getDelta();
        delta = Math.min(delta, 1 / 30);

        // Performance monitoring
        this.performanceMonitor.frameTime =
            currentTime - this.performanceMonitor.lastTime;
        const currentFPS = 1000 / this.performanceMonitor.frameTime;

        // Adaptive quality based on performance
        if (this.performanceMonitor.adaptiveQuality) {
            if (currentFPS < this.performanceMonitor.lowQualityThreshold) {
                // Reduce quality
                this.renderer.setPixelRatio(
                    Math.min(window.devicePixelRatio * 0.5, 1)
                );
            } else if (currentFPS > this.performanceMonitor.targetFPS * 0.9) {
                // Restore quality
                this.renderer.setPixelRatio(
                    Math.min(window.devicePixelRatio, 2)
                );
            }
        }

        this.time += delta;
        this.material.uniforms.time.value = this.time;
        this.performanceMonitor.lastTime = currentTime;
        requestAnimationFrame(this.render.bind(this));
        this.composer.render(this.scene, this.camera);

        // Manual reset for performance info
        this.renderer.info.reset();
    }

    dispose() {
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
        }

        this.geometry.dispose();
        this.material.dispose();
        this.renderer.dispose();
        this.composer.dispose();

        document.removeEventListener("mousemove", this.mouseMoveThrottled);

        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
