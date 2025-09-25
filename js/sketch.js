import * as THREE from "three";
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from "./shaders/fragment.glsl";
import aboutfragment from "./shaders/aboutfragment.glsl";
import expfragment from "./shaders/expfragment.glsl";
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

// Fragment shader mapping
const fragmentShaders = {
    hero: fragment,
    about: aboutfragment,
    exp: expfragment,
    // Add more sections as needed
};

// Main Sketch class for rendering a Three.js scene with custom shaders and postprocessing.
export class Sketch {
    /**
     * @param {{dom: Element, section: string, geometryWidth: number, geometryHeight: number}} options - Configuration options
     * @param {HTMLElement} options.dom - The container DOM element for rendering
     * @param {string} options.section - The section name to determine which fragment shader to use
     * @param {number} options.geometryWidth - The width of the plane geometry
     * @param {number} options.geometryHeight - The height of the plane geometry
     */
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

        // Select a random palette and convert to THREE.Color
        this.palette = colors[Math.floor(Math.random() * colors.length)].map(
            (color) => new THREE.Color(color)
        );

        // Initialize scene objects, postprocessing, and event listeners
        this.addObjects();
        this.initPost();
        this.render();

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

        window.addEventListener("resize", () => this.onWindowResize());
    }

    onWindowResize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);

        // Update geometry to match new screen width
        const distance = this.camera.position.z;
        const fov = this.camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * distance;
        const width = height * this.camera.aspect;

        this.geometry.dispose();
        this.geometry = new THREE.PlaneGeometry(
            width,
            this.geometryHeight,
            1,
            1
        );
        this.plane.geometry = this.geometry;

        this.material.uniforms.vw.value = this.width;
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
        // Get the appropriate fragment shader for this section
        const selectedFragment = fragmentShaders[this.section] || fragment;

        // Create custom shader material
        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector4() },
                uColor: { value: this.palette },
                mouse: { value: new THREE.Vector2(0, 0) },
                opacity: { value: 0 },
                vw: { value: this.width },
            },
            vertexShader: vertex,
            fragmentShader: selectedFragment,
        });

        // Calculate geometry width based on screen width and camera parameters
        const distance = this.camera.position.z;
        const fov = this.camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * distance;
        const width = height * this.camera.aspect;

        // Use calculated width instead of geometryWidth parameter
        this.geometry = new THREE.PlaneGeometry(
            width,
            this.geometryHeight,
            1,
            1
        );
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    // Adjust opacity in the about section
    updateOpacity(opacityValue) {
        if (this.material && this.material.uniforms.opacity) {
            this.material.uniforms.opacity.value = opacityValue;
        }
    }

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
