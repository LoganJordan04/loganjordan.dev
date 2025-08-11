import * as THREE from "three";
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
// Select a random palette and convert to THREE.Color
const palette = colors[Math.floor(Math.random() * colors.length)].map(
    (color) => new THREE.Color(color)
);

// Main Sketch class for rendering a Three.js scene with custom shaders and postprocessing.
export class Sketch {
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
