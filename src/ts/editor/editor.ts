import * as THREE from 'three';
import { RayMarcher } from './raymarcher/engine';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import Stats from 'stats.js';
import { CameraController } from './cameraController';
import { Box } from './raymarcher/objects/box';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

export class Editor3d {

    camera!: THREE.PerspectiveCamera;
    scene!: THREE.Scene;
    renderer!: THREE.WebGLRenderer;
    rayMarcher!: RayMarcher;
    raycaster: THREE.Raycaster = new THREE.Raycaster();
    mouse: THREE.Vector2 = new THREE.Vector2();
    outlinePass!: OutlinePass;
    composer!: EffectComposer;

    // Controls
    controls!: CameraController;
    arrowHelper!: TransformControls;
    isMoving: boolean = false;
    // Other
    stats!: Stats;
    currentBoxFound: Box | null = null;


    constructor() {
        console.log("Creating new instance of Editor3D");
    }
    initialize() {

        this.initializeBasics();
        this.initializeRaymarcher();
        this.initializeControls();
        this.initializeWindowEvents();
        this.initializeStatistics();
        this.initializeHelpers();
        this.initializeMouseEvents();
        this.initializeKeyboardEvents();
        this.initializeControlsEvents();

    }

    private initializeBasics() {
        this.renderer = new THREE.WebGLRenderer();
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setSize(innerWidth, innerHeight);

        this.composer = new EffectComposer(this.renderer);



        this.camera = new THREE.PerspectiveCamera();
        this.camera.position.set(0, 1, 5);
        this.scene = new THREE.Scene();

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(
                innerWidth, innerHeight
            ),
            this.scene,
            this.camera
        );

        this.outlinePass.edgeStrength = 5;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 1;
        this.outlinePass.visibleEdgeColor.set('#ffffff');
        this.outlinePass.hiddenEdgeColor.set('#ffffff');

        this.outlinePass.renderToScreen = true;
        this.composer.addPass(this.outlinePass);


        this.scene.add(this.camera);
    }
    private initializeRaymarcher() {
        this.rayMarcher = new RayMarcher(this.camera, this.scene, { boxes: [], spheres: [] });
        this.rayMarcher.initialize();
    }

    private initializeControls() {
        this.controls = new CameraController(this.camera);

    }
    private initializeWindowEvents() {
        window.addEventListener('resize', () => {
            this.renderer.setSize(innerWidth, innerHeight);
            this.rayMarcher.onResize();

        });
    }
    private initializeHelpers() {
        const gridHelper = new THREE.GridHelper(1000, 100);
        this.scene.add(gridHelper);

        const axisHelper = new THREE.AxesHelper(10);
        axisHelper.position.set(0, 0.01, 0);
        this.scene.add(axisHelper);

        this.arrowHelper = new TransformControls(this.camera, this.renderer.domElement);
        this.arrowHelper.setMode("translate");
        this.scene.add(this.arrowHelper.getHelper());
    }
    private initializeStatistics() {
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
    }
    private onClick(event: MouseEvent) {
        if (this.isMoving == true) {
            console.error("Already moving")
            return;
        };
        if (this.currentBoxFound == null) {
            console.error("No box hit");
            return;
        };
        this.arrowHelper.attach(this.currentBoxFound.threeJSobject);
        this.isMoving = true;
        console.log("Attached TransformControls to Box");
    }
    private initializeMouseEvents() {
        document.addEventListener("mousemove", (event: MouseEvent) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        })
        document.addEventListener("mousedown", (event: MouseEvent) => {
            this.onClick(event)
        })
    }
    private initializeKeyboardEvents() {
        document.addEventListener("keydown", (event: KeyboardEvent) => {


            if (event.key === 'Escape') {
                if (this.isMoving == false) return;
                this.arrowHelper.detach();
                this.isMoving = false;
            }
            if (event.key === 't' || event.key === 'T') {
                this.arrowHelper.setMode('translate');
            }
            if (event.key === 'r' || event.key === 'R') {
                this.arrowHelper.setMode('rotate');
            }

            // Test keys
            if (event.key === '1') {
                for (const box of this.rayMarcher.boxes) {
                    box.morph = 0;
                }
                this.rayMarcher.computeData();
            }
            if (event.key === '2') {
                for (const box of this.rayMarcher.boxes) {
                    box.morph = 1;
                }
                this.rayMarcher.computeData();
            }
            if (event.key === '3') {
                for (const box of this.rayMarcher.boxes) {
                    box.morph = -0.5;
                }
                this.rayMarcher.computeData();
            }
            if (event.key === '4') {
                for (const box of this.rayMarcher.boxes) {
                    box.morph = -1;
                }
                this.rayMarcher.computeData();
            }
        })
    }
    private initializeControlsEvents() {
        this.arrowHelper.addEventListener("change", () => {

            if (!this.currentBoxFound) return;
            this.currentBoxFound.position.copy(this.currentBoxFound.threeJSobject.position);
            this.currentBoxFound.quaternion.copy(this.currentBoxFound.threeJSobject.quaternion);


            console.log("[] Bake & upload raymarching data");
            this.rayMarcher.computeData();
        })
    }
    private performRaycast() {
        if (this.isMoving) return;


        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.rayMarcher.boxes.map(box => box.threeJSobject), true); // true = recursive

        if (intersects.length > 0) {
            let valid = false;
            let foundBox: Box | null = null;
            // Check if it is a valid object
            for (const intersect of intersects) {
                //console.log(intersect.object);
                if (valid == true && foundBox != null) {
                    break;
                }
                const hit = intersect.object;
                for (const box of this.rayMarcher.boxes) {
                    if (box.threeJSobject == hit) {
                        valid = true;
                        foundBox = box;
                        break;
                    }
                }
            }

            if (valid == false || foundBox == null) {
                //console.log("Hit objects, but none were valid");
                this.outlinePass.selectedObjects = [];
                this.currentBoxFound = null;
                return;
            };
            console.log("Raycasted box")
            this.currentBoxFound = foundBox;
            this.outlinePass.selectedObjects = [foundBox.threeJSobject];
        } else {
            this.outlinePass.selectedObjects = [];
            this.currentBoxFound = null;
        }
    }
    renderScene() {
        if (!this.rayMarcher) {
            throw new Error("Raymarcher == null, cannot render!");
        }
        this.stats.begin();
        this.controls.beforeRender();
        this.rayMarcher.onRender();
        this.performRaycast();
        this.composer.render();
        this.stats.end();
    }
    renderLoop() {
        requestAnimationFrame(this.renderLoop);
    }
}