import * as THREE from 'three';
import { RayMarcher } from './raymarcher/engine';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';

export class Editor3d {

    camera!: THREE.PerspectiveCamera;
    scene!: THREE.Scene;
    renderer!: THREE.WebGLRenderer;
    rayMarcher!: RayMarcher;

    // Controls
    orbitControls!: OrbitControls;
    // Other
    stats!: Stats;


    constructor() {
        console.log("Creating new instance of Editor3D");
    }
    initialize() {
        
        this.initializeBasics();
        this.initializeRaymarcher();
        this.initializeControls();
        this.initializeWindowEvents();
        this.initializeStatistics();

    }

    private initializeBasics() {
        this.renderer = new THREE.WebGLRenderer();
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setSize(innerWidth, innerHeight);

        this.camera = new THREE.PerspectiveCamera();
        this.camera.position.set(0, 1, 5);
        this.scene = new THREE.Scene();


        this.scene.add(this.camera);
    }
    private initializeRaymarcher() {
        this.rayMarcher = new RayMarcher(this.camera, {boxes: [], spheres: []});
        this.rayMarcher.initialize();
    }

    private initializeControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.update();
    }
    private initializeWindowEvents() {
        window.addEventListener('resize', () => {
            this.renderer.setSize(innerWidth, innerHeight);
            this.rayMarcher.onResize();
            
        });
    }
    private initializeStatistics() {
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
    }
    renderScene() {
        if (!this.rayMarcher) {
            throw new Error("Raymarcher == null, cannot render!");
        }
        this.stats.begin();
        this.rayMarcher.onRender();
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);
        this.stats.end();
    }
    renderLoop() {
        requestAnimationFrame(this.renderLoop);
    }
}