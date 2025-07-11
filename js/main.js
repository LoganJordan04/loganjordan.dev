import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GrainShader } from './shaders/GrainShader.js';


export default class Sketch {
    constructor(options) {
        this.scene = new THREE.Scene();

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

        this.camera = new THREE.PerspectiveCamera(
            70,
            this.width / this.height,
            0.001,
            1000
        );

        this.camera.position.set(0, 0, 1.3);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.time = 0;

        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/'); // use a full url path
        this.gltf = new GLTFLoader();
        this.gltf.setDRACOLoader(this.dracoLoader);

        this.isPlaying = true;

        this.addObjects();
        this.initPost();
        this.resize();
        this.render();
        this.setupResize();
    }
    
    initPost() {
        this.composer = new EffectComposer( this.renderer );
        this.composer.addPass( new RenderPass( this.scene, this.camera ) );

        const effect1 = new ShaderPass( GrainShader );
        effect1.uniforms[ 'scale' ].value = 4;
        this.composer.addPass( effect1 );
    }

    setupResize() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;

        // image cover
        this.imageAspect = 853/1280;
        let a1; let a2;
        if(this.height/this.width > this.imageAspect) {
            a1 = (this.width / this.height) * this.imageAspect;
            a2 = 1;
        } else {
            a1 = 1;
            a2 = (this.height / this.width) * this.imageAspect;
        }

        this.camera.updateProjectionMatrix();
    }

    addObjects() {
        let that = this;
        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable"
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: {value: 0},
                resolution: { value: new THREE.Vector4() },
            },
            // wireframe: true,
            // transparent: true,
            vertexShader: vertex,
            fragmentShader: fragment
        });

        this.geometry = new THREE.PlaneGeometry(4, 2, 1, 1);

        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    addLights() {
        const light1 = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
        light2.position.set(0.5, 0, 0.866); // ~60º
        this.scene.add(light2);
    }

    stop() {
        this.isPlaying = false;
    }

    play() {
        if(!this.isPlaying){
            this.isPlaying = true;
            this.render()
        }
    }

    render() {
        if (!this.isPlaying) return;
        this.time += 0.0003;
        this.material.uniforms.time.value = this.time;
        requestAnimationFrame(this.render.bind(this));
        // this.renderer.render(this.scene, this.camera);
        this.composer.render(this.scene, this.camera);
    }
}

new Sketch({
    dom: document.getElementById('container')
});
