import * as THREE from "three";
import fragment from "./shaders/fragment.glsl";
import vertex from "./shaders/vertex.glsl";

// Define color palettes
const colors = [
    ["#2d55bd", "#f6ead2", "#f55809"],
    // ["#9359c7", "#b2ecc0", "#5069e3"],
    // ["#226798", "#43bd8f", "#dcfadf"],
];

// Main Sketch class for rendering a Three.js scene with custom shaders and postprocessing.
export class Sketch {
    static instances = new Set();
    static activeSketch = null;

    constructor(options) {
        this.scene = new THREE.Scene();
        this.container = options.dom;
        this.section = options.section;
        this.geometryWidth = options.geometryWidth;
        this.geometryHeight = options.geometryHeight;
        this.pointerTarget =
            options.pointerTarget || this.container.parentElement || this.container;
        this.qualityProfile = this.getQualityProfile();
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.rafId = null;
        this.resizeTimeout = null;
        this.lastFrameTimestamp = 0;
        this.visibilityState = {
            isIntersecting: false,
            intersectionRatio: 0,
            distanceToViewportCenter: Number.POSITIVE_INFINITY,
        };
        this.render = this.render.bind(this);
        this.scheduleResize = this.scheduleResize.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.refreshVisibilityState = this.refreshVisibilityState.bind(this);

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

        this.basePixelRatio = this.getTargetPixelRatio();
        this.currentPixelRatio = this.basePixelRatio;
        this.renderer.setPixelRatio(this.currentPixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = false;
        this.renderer.sortObjects = false;

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

        this.camera = new THREE.PerspectiveCamera(
            70,
            this.width / this.height,
            0.1,
            10
        );
        this.camera.position.set(0, 0, 1.3);

        this.time = 0;
        this.isPlaying = false;

        this.palette = colors[Math.floor(Math.random() * colors.length)].map(
            (color) => new THREE.Color(color)
        );

        this.performanceMonitor = {
            frameTime: 0,
            lastTime: performance.now(),
            adaptiveQuality: true,
            targetFPS: this.qualityProfile.targetFPS,
            lowQualityThreshold: this.qualityProfile.lowQualityThreshold,
        };

        this.addObjects();
        this.updateResolutionUniform();
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

        // Listen on the surrounding section wrapper so text layered above the canvas
        // still drives the shader, while coordinates remain relative to the canvas.
        this.pointerTarget.addEventListener("pointermove", this.mouseMoveThrottled, {
            passive: true,
        });

        this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
        this.resizeObserver.observe(this.container);
        window.addEventListener("resize", this.scheduleResize, {
            passive: true,
        });

        Sketch.instances.add(this);
        this.setupCulling();
        Sketch.refreshActiveSketch();
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

    getQualityProfile() {
        const isMobile =
            window.matchMedia("(max-width: 768px)").matches ||
            /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent);

        const profiles = {
            hero: {
                maxPixelRatio: isMobile ? 0.9 : 1.1,
                maxRenderPixels: isMobile ? 850000 : 1800000,
                targetFPS: isMobile ? 30 : 45,
                lowQualityFactor: 0.8,
            },
            about: {
                maxPixelRatio: isMobile ? 0.75 : 0.9,
                maxRenderPixels: isMobile ? 650000 : 1200000,
                targetFPS: 30,
                lowQualityFactor: 0.75,
            },
            exp: {
                maxPixelRatio: isMobile ? 0.8 : 1.0,
                maxRenderPixels: isMobile ? 750000 : 1400000,
                targetFPS: isMobile ? 30 : 36,
                lowQualityFactor: 0.8,
            },
        };

        const profile = profiles[this.section] || {
            maxPixelRatio: isMobile ? 0.85 : 1.0,
            maxRenderPixels: isMobile ? 800000 : 1500000,
            targetFPS: isMobile ? 30 : 40,
            lowQualityFactor: 0.8,
        };

        return {
            ...profile,
            lowQualityThreshold: Math.max(18, profile.targetFPS * 0.65),
        };
    }

    getTargetPixelRatio(multiplier = 1) {
        const maxDeviceRatio = Math.min(
            window.devicePixelRatio,
            this.qualityProfile.maxPixelRatio
        );
        const desiredRatio = maxDeviceRatio * multiplier;
        const pixelBudgetRatio = Math.sqrt(
            this.qualityProfile.maxRenderPixels /
                Math.max(1, this.width * this.height)
        );

        return Math.max(0.5, Math.min(desiredRatio, pixelBudgetRatio));
    }

    updateResolutionUniform() {
        if (!this.material?.uniforms?.resolution) {
            return;
        }

        const renderWidth = Math.max(
            1,
            Math.round(this.width * this.currentPixelRatio)
        );
        const renderHeight = Math.max(
            1,
            Math.round(this.height * this.currentPixelRatio)
        );

        this.material.uniforms.resolution.value.set(
            renderWidth,
            renderHeight,
            this.currentPixelRatio,
            1
        );
    }

    refreshVisibilityState() {
        const rect = this.container.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

        const visibleWidth =
            Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight =
            Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = Math.max(1, rect.width * rect.height);
        const viewportCenter = viewportHeight / 2;
        const elementCenter = rect.top + rect.height / 2;

        this.visibilityState = {
            isIntersecting: visibleArea > 0,
            intersectionRatio: Math.min(1, visibleArea / totalArea),
            distanceToViewportCenter: Math.abs(elementCenter - viewportCenter),
        };
    }

    scheduleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
        }, 80);
    }

    addObjects() {
        const defines = {};
        if (this.section === "hero") defines.HERO_SECTION = "";
        if (this.section === "about") defines.ABOUT_SECTION = "";
        if (this.section === "exp") defines.EXP_SECTION = "";

        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.FrontSide,
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

        const vertices = new Float32Array(12);
        const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.geometry = new THREE.BufferGeometry();
        this.positionAttribute = new THREE.BufferAttribute(vertices, 3);
        this.geometry.setAttribute("position", this.positionAttribute);
        this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        this.updatePlaneGeometry();
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    updatePlaneGeometry() {
        const distance = this.camera.position.z;
        const fov = this.camera.fov * (Math.PI / 180);
        const visibleHeight = 2 * Math.tan(fov / 2) * distance;
        const visibleWidth = visibleHeight * this.camera.aspect;
        const halfWidth = visibleWidth / 2;
        const halfHeight = this.geometryHeight / 2;
        const positions = this.positionAttribute.array;

        positions[0] = -halfWidth;
        positions[1] = -halfHeight;
        positions[2] = 0;
        positions[3] = halfWidth;
        positions[4] = -halfHeight;
        positions[5] = 0;
        positions[6] = halfWidth;
        positions[7] = halfHeight;
        positions[8] = 0;
        positions[9] = -halfWidth;
        positions[10] = halfHeight;
        positions[11] = 0;

        this.positionAttribute.needsUpdate = true;
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }

    updateOpacity(opacityValue) {
        if (this.material && this.material.uniforms.opacity) {
            this.material.uniforms.opacity.value = opacityValue;
        }
    }

    updateRenderPixelRatio(nextPixelRatio) {
        if (Math.abs(nextPixelRatio - this.currentPixelRatio) < 0.01) {
            return;
        }

        // Resize the composer only when quality mode actually changes.
        this.currentPixelRatio = nextPixelRatio;
        this.renderer.setPixelRatio(nextPixelRatio);
        this.renderer.setSize(this.width, this.height, false);
        this.updateResolutionUniform();
    }

    handleResize() {
        const nextWidth = this.container.offsetWidth;
        const nextHeight = this.container.offsetHeight;

        if (!nextWidth || !nextHeight) {
            return;
        }

        this.width = nextWidth;
        this.height = nextHeight;
        this.qualityProfile = this.getQualityProfile();
        this.performanceMonitor.targetFPS = this.qualityProfile.targetFPS;
        this.performanceMonitor.lowQualityThreshold =
            this.qualityProfile.lowQualityThreshold;
        this.basePixelRatio = this.getTargetPixelRatio();

        // Keep the scene plane and post-processing buffers aligned with layout changes.
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height, false);
        this.material.uniforms.vw.value = this.width;
        this.updatePlaneGeometry();
        this.updateRenderPixelRatio(this.basePixelRatio);
        this.updateResolutionUniform();
        this.refreshVisibilityState();
        Sketch.refreshActiveSketch();
    }

    startRendering() {
        if (!this.isPlaying || this.rafId !== null) {
            return;
        }

        // Prime the frame timer so resuming from a paused tab does not cause a large time jump.
        this.performanceMonitor.lastTime = performance.now();
        this.lastFrameTimestamp = 0;
        this.rafId = requestAnimationFrame(this.render);
    }

    stopRendering() {
        this.isPlaying = false;

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    activate() {
        this.isPlaying = true;
        this.startRendering();
    }

    deactivate() {
        this.stopRendering();
    }

    getSelectionScore() {
        const sectionPriority = {
            hero: 3,
            about: 2,
            exp: 1,
        };

        return (
            this.visibilityState.intersectionRatio * 1000 -
            this.visibilityState.distanceToViewportCenter +
            (sectionPriority[this.section] || 0)
        );
    }

    static refreshActiveSketch() {
        let nextActiveSketch = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        this.instances.forEach((sketch) => {
            if (!sketch.visibilityState.isIntersecting) {
                sketch.deactivate();
                return;
            }

            const score = sketch.getSelectionScore();
            if (score > bestScore) {
                bestScore = score;
                nextActiveSketch = sketch;
            }
        });

        this.instances.forEach((sketch) => {
            if (sketch !== nextActiveSketch) {
                sketch.deactivate();
            }
        });

        this.activeSketch = nextActiveSketch;
        this.activeSketch?.activate();
    }

    setupCulling() {
        this.visibilityObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target === this.container) {
                        this.refreshVisibilityState();
                        Sketch.refreshActiveSketch();
                    }
                });
            },
            {
                rootMargin: "50px",
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
            }
        );

        this.visibilityObserver.observe(this.container);
        this.refreshVisibilityState();
    }

    render(timestamp) {
        if (!this.isPlaying) {
            this.rafId = null;
            return;
        }

        this.rafId = requestAnimationFrame(this.render);

        const frameInterval = 1000 / this.qualityProfile.targetFPS;
        if (
            this.lastFrameTimestamp &&
            timestamp - this.lastFrameTimestamp < frameInterval
        ) {
            return;
        }

        const elapsedMs = this.lastFrameTimestamp
            ? timestamp - this.lastFrameTimestamp
            : frameInterval;
        this.lastFrameTimestamp = timestamp;
        const currentTime = performance.now();
        const delta = Math.min(elapsedMs / 1000, 1 / 30);

        this.performanceMonitor.frameTime =
            currentTime - this.performanceMonitor.lastTime;
        const currentFPS = 1000 / this.performanceMonitor.frameTime;

        if (this.performanceMonitor.adaptiveQuality) {
            if (currentFPS < this.performanceMonitor.lowQualityThreshold) {
                this.updateRenderPixelRatio(
                    this.getTargetPixelRatio(
                        this.qualityProfile.lowQualityFactor
                    )
                );
            } else if (currentFPS > this.performanceMonitor.targetFPS * 0.9) {
                this.updateRenderPixelRatio(this.basePixelRatio);
            }
        }

        this.time += delta;
        this.material.uniforms.time.value = this.time;
        this.performanceMonitor.lastTime = currentTime;
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.stopRendering();
        Sketch.instances.delete(this);

        if (Sketch.activeSketch === this) {
            Sketch.activeSketch = null;
        }

        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        clearTimeout(this.resizeTimeout);

        this.geometry.dispose();
        this.material.dispose();
        this.renderer.dispose();

        this.pointerTarget.removeEventListener(
            "pointermove",
            this.mouseMoveThrottled
        );
        window.removeEventListener("resize", this.scheduleResize);

        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }

        Sketch.refreshActiveSketch();
    }
}
