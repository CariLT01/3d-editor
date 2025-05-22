import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import Stats from 'stats.js';
import { CameraController } from './cameraController';
import { Solid } from './csg/objects/solid';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

function degToRad(deg: number) {
    return deg * Math.PI / 180;
}

export class Editor3d {

    camera!: THREE.PerspectiveCamera;
    scene!: THREE.Scene;
    renderer!: THREE.WebGLRenderer;
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
    currentSolidFound: Solid | null = null;
    currentSolidsSelected: Solid[] = [];
    shiftHeldDown: boolean = false;
    solids: Solid[] = [];
    previousSize: THREE.Vector3 = new THREE.Vector3();

    previousRaycastedMesh: THREE.Mesh | null = null;


    constructor() {
        console.log("Creating new instance of Editor3D");
    }
    initialize() {

        this.initializeBasics();
        this.initializeLighting();
        this.initializeControls();
        this.initializeWindowEvents();
        this.initializeStatistics();
        this.initializeHelpers();
        this.initializeMouseEvents();
        this.initializeKeyboardEvents();
        this.initializeControlsEvents();
        this.initializeDebugObjects();
        this.initializeButtonEvents();

    }

    private initializeBasics() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setSize(innerWidth, innerHeight);

        this.composer = new EffectComposer(this.renderer);



        this.camera = new THREE.PerspectiveCamera();
        this.camera.position.set(0, 1, 5);

        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
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

        this.outlinePass.edgeStrength = 2.85;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 3;
        this.outlinePass.visibleEdgeColor.set('#00aaff');
        this.outlinePass.hiddenEdgeColor.set('#00aaff');

        this.outlinePass.renderToScreen = true;
        this.composer.addPass(this.outlinePass);


        this.scene.add(this.camera);

        this.scene.background = new THREE.Color(0x444444);
    }
    private initializeLighting() {
        // Ambient light for general soft lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        // Directional light for shadows and highlights
        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(5, 10, 7);
        directional.castShadow = true;
        this.scene.add(directional);

        // Optional: Hemisphere light for subtle sky/ground effect
        const hemi = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        this.scene.add(hemi);
    }

    private initializeControls() {
        this.controls = new CameraController(this.camera);

    }
    private initializeWindowEvents() {
        window.addEventListener('resize', () => {
            this.renderer.setSize(innerWidth, innerHeight);
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();

        });
    }
    private initializeHelpers() {
        const gridHelper = new THREE.GridHelper(100, 200, 0x666666, 0x666666);
        this.scene.add(gridHelper);

        const gridHelperMajorLines = new THREE.GridHelper(100, 200 / 10, 0xaaaaaa, 0xaaaaaa);
        this.scene.add(gridHelperMajorLines);

        const axisHelper = new THREE.AxesHelper(50);
        axisHelper.position.set(0, 0.01, 0);
        this.scene.add(axisHelper);

        this.arrowHelper = new TransformControls(this.camera, this.renderer.domElement);
        this.arrowHelper.setMode("translate");
        this.arrowHelper.setRotationSnap(degToRad(5));
        this.arrowHelper.setTranslationSnap(0.05);
        this.arrowHelper.setScaleSnap(0.05);
        this.scene.add(this.arrowHelper.getHelper());
    }
    private initializeStatistics() {
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
    }

    private updateOutlinePass() {
        const a: THREE.Mesh[] = [];
        for (const solid of this.currentSolidsSelected) {
            a.push(solid.getMesh());
        }
        console.log("OutlinePass: Updated total of ", this.currentSolidsSelected.length, " solids");
        this.outlinePass.selectedObjects = a;
    }
    private onClick(event: MouseEvent) {
        if (event.button != 0) return;
        if (this.currentSolidFound == null) {
            console.error("No box hit");
            return;
        };
        if (this.isMoving == true && this.shiftHeldDown == false) {
            console.error("Already moving")
            return;
        };
        if (this.shiftHeldDown == true && this.currentSolidsSelected.length > 0) {
            if (this.currentSolidsSelected.indexOf(this.currentSolidFound) != -1) return;
            this.currentSolidsSelected.push(this.currentSolidFound);
            console.log(this.currentSolidFound)
            this.arrowHelper.detach();
            this.isMoving = true;
            console.log("Detached: shift key held down");
            this.updateOutlinePass();
            return;
        }

        this.arrowHelper.attach(this.currentSolidFound.getMesh());
        this.currentSolidsSelected = [this.currentSolidFound];
        this.isMoving = true;
        this.updateOutlinePass();

        const a = new THREE.Box3().setFromObject(this.currentSolidFound.getMesh());
        const size = new THREE.Vector3();
        a.getSize(size);

        this.previousSize.copy(size);
        console.log("Attached TransformControls to Box");
    }
    private initializeMouseEvents() {
        document.addEventListener("mousemove", (event: MouseEvent) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        })
        document.addEventListener("mousedown", (event: MouseEvent) => {
            // Arrow hlper
            if (this.isMoving) {
                this.getTransformControlsAxis();
            }
            this.onClick(event);


        })
    }
    private initializeKeyboardEvents() {
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                // Your Ctrl + D logic here

                // Duplicate current solid
                console.log("Duplicating solids");
                const duplicated = [];

                for (const solid of this.currentSolidsSelected) {
                    const newSolid = solid.fullClone();
                    duplicated.push(newSolid);
                    this.scene.add(newSolid.getMesh())
                    this.solids.push(newSolid);
                }

                this.currentSolidsSelected = duplicated;

                this.updateOutlinePass();

                if (this.currentSolidsSelected.length === 1) {
                    this.arrowHelper.attach(this.currentSolidsSelected[0].getMesh());
                    this.isMoving = true;
                } else {
                    this.isMoving = false;
                    this.arrowHelper.detach();
                }

                return;

            }
            if (event.key === 'Escape') {
                if (this.isMoving == false) return;
                this.arrowHelper.detach();
                this.currentSolidsSelected = [];
                this.isMoving = false;
            }
            if (event.key === '2') {
                this.arrowHelper.setMode('translate');
            }
            if (event.key === '4') {
                this.arrowHelper.setMode('rotate');
            }
            if (event.key === '3') {
                this.arrowHelper.setMode("scale");
            }
            if (event.key === "Shift") {
                this.shiftHeldDown = true;
            }
            if (event.key === "Delete") {
                // de;ete
                this.arrowHelper.detach();
                for (const solid of this.currentSolidsSelected) {
                    const a = this.solids.indexOf(solid);
                    if (a != -1) {
                        this.solids.splice(a, 1);
                        this.scene.remove(solid.getMesh());
                        solid.dispose();
                    }
                }
                this.currentSolidsSelected = [];
                this.isMoving = false;
            }

        })

        document.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.key === "Shift") {
                this.shiftHeldDown = false;
            }
        })
    }
    private initializeControlsEvents() {
        this.arrowHelper.addEventListener("change", () => {
            if (this.currentSolidsSelected.length !== 1) return;
            if (this.arrowHelper.mode !== "scale") return;

            const mesh = this.currentSolidsSelected[0].getMesh();

            const box = new THREE.Box3().setFromObject(mesh);
            const currentSize = new THREE.Vector3();
            box.getSize(currentSize);

            // Initialize previous size if undefined
            if (!this.previousSize) {
                this.previousSize = currentSize.clone();
                return;
            }

            const sizeDifference = currentSize.clone().sub(this.previousSize);
            const offset = sizeDifference.multiplyScalar(0.5);

            //mesh.position.add(offset); // Apply the offset
            this.previousSize.copy(currentSize); // Update stored size

            //console.log("Offset applied:", offset);
        });
    }

    private CSG_operation(operation: "Union" | "Subtract" | "Intersect") {
        if (this.currentSolidsSelected.length != 2) {
            throw new Error("Invalid selected number of solids. Must be 2.");
        }

        const A = this.currentSolidsSelected[0];
        const B = this.currentSolidsSelected[1];

        const indexOfB = this.solids.indexOf(B);
        const indexOfA = this.solids.indexOf(A);
        if (indexOfB === -1 || indexOfA === -1) {
            throw new Error("Index of solid B or A could not be calculated");
        }
        let C!: Solid;
        if (operation == "Union") {
            C = A.CSG_union(B);
        } else if (operation == "Subtract") {
            C = A.CSG_subtract(B);
        } else if (operation == "Intersect") {
            C = A.CSG_intersect(B);
        }
        // Remove the solid with the higher index first. Don't know how that fixes it. (May or may not fix actually, I don't know when the bug happens)
        if (indexOfA > indexOfB) {
            this.solids.splice(indexOfA, 1);
            this.solids.splice(indexOfB, 1);
        } else {
            this.solids.splice(indexOfB, 1);
            this.solids.splice(indexOfA, 1);
        }
        this.arrowHelper.detach();
        this.scene.remove(A.getMesh());
        this.scene.remove(B.getMesh());
        this.solids.push(C);
        this.scene.add(C.getMesh());


        this.currentSolidsSelected = [];
        this.updateOutlinePass();
        this.isMoving = false;

        console.log("*** COMPLETED CSG OPERATION ***");
    }
    private attemptSeperate(solid: Solid) {
        const indexOfA = this.solids.indexOf(solid);
        if (indexOfA === -1) {
            throw new Error("Solid not found in solids array");
        }
        if (solid.history.length == 0) {
            throw new Error("Solid has no history");
        }

        const SolidA = solid.history[0].clone();
        const SolidB = solid.history[1].clone();

        this.solids.splice(indexOfA, 1);
        this.arrowHelper.detach();
        this.scene.remove(solid.getMesh());
        solid.dispose();

        this.solids.push(SolidA);
        this.solids.push(SolidB);
        this.scene.add(SolidA.getMesh());
        this.scene.add(SolidB.getMesh());


        this.currentSolidsSelected = [];
        this.updateOutlinePass();
        this.isMoving = false;

    }

    private initializeButtonEvents() {
        /* 
        Buttons: 
        <button id="union">Union</button>
        <button id="subtract">Subtract</button>
        <button id="intersect">Intersect</button>
        <button id="seperate">Seperate</button>
        */

        const unionButton: HTMLButtonElement | null = document.querySelector("#union");
        const subtractButton: HTMLButtonElement | null = document.querySelector("#subtract");
        const intersectButton: HTMLButtonElement | null = document.querySelector("#intersect");
        const seperateButton: HTMLButtonElement | null = document.querySelector("#seperate");

        if (unionButton == null || subtractButton == null || intersectButton == null || seperateButton == null) {
            throw new Error("One or many essential buttons for element could not be found");
        }

        unionButton.addEventListener("click", () => {
            this.CSG_operation("Union");
        })
        subtractButton.addEventListener("click", () => {
            this.CSG_operation("Subtract");
        })
        intersectButton.addEventListener("click", () => {
            this.CSG_operation("Intersect");
        })
        seperateButton.addEventListener("click", () => {
            if (this.currentSolidsSelected.length !== 1) {
                throw new Error("Selected solids not equal to 1");
            }
            this.attemptSeperate(this.currentSolidsSelected[0]);
        });

        // cube, sphere, cylinder, wedge

        const cubeButton: HTMLButtonElement | null = document.querySelector("#cube");
        const sphereButton: HTMLButtonElement | null = document.querySelector("#sphere");
        const CylinderButton: HTMLButtonElement | null = document.querySelector("#cylinder");
        const WedgeButton: HTMLButtonElement | null = document.querySelector("#wedge");

        if (cubeButton == null || sphereButton == null || CylinderButton == null || WedgeButton == null) return;

        const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

        cubeButton.addEventListener("click", () => {
            // New cube!

            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const mesh = new THREE.Mesh(geometry, material.clone());

            const solid = new Solid(mesh);
            this.scene.add(solid.getMesh());
            this.solids.push(solid);
        });

        sphereButton.addEventListener("click", () => {
            // New cube!

            const geometry = new THREE.SphereGeometry(2);
            const mesh = new THREE.Mesh(geometry, material.clone());

            const solid = new Solid(mesh);
            this.scene.add(solid.getMesh());
            this.solids.push(solid);
        });

        CylinderButton.addEventListener("click", () => {
            // New cube!

            const geometry = new THREE.CylinderGeometry(2, 2, 4);
            const mesh = new THREE.Mesh(geometry, material.clone());

            const solid = new Solid(mesh);
            this.scene.add(solid.getMesh());
            this.solids.push(solid);
        })

        WedgeButton.addEventListener("click", () => {
            // New cube!

            const geometry = new THREE.DodecahedronGeometry(2, 0);
            const mesh = new THREE.Mesh(geometry, material.clone());

            const solid = new Solid(mesh);
            this.scene.add(solid.getMesh());
            this.solids.push(solid);
        })
    }
    private initializeDebugObjects() {
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const meshA = new THREE.Mesh(boxGeometry, material);
        meshA.position.set(-0.5, -0.5, -0.5);

        const meshB = new THREE.Mesh(boxGeometry, material);
        meshB.position.set(0.5, 0.5, 0.5);

        const solidA = new Solid(meshA);
        const solidB = new Solid(meshB);

        const solidC = solidA.CSG_subtract(solidB);

        this.solids.push(solidC);
        this.scene.add(solidC.getMesh());

        const sphere = new THREE.SphereGeometry(3);
        const meshC = new THREE.Mesh(sphere, material);

        meshC.position.set(3, 3, 3);

        const solidD = new Solid(meshC);
        this.solids.push(solidD);
        this.scene.add(solidD.getMesh());

    }

    private getTransformControlsAxis() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.arrowHelper.getHelper().children, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const selectedAxis = hit.object.name; // "X", "Y", or "Z"

            const objPos = this.arrowHelper.getHelper().position;
            const point = hit.point;

            // Determine side (+ or -)
            //const axisDirection = Math.sign(point[selectedAxis.toLowerCase()] - objPos[selectedAxis.toLowerCase()]);
            const a = new THREE.Vector3()
            hit.object.getWorldDirection(a);
            console.log(`Direction:`, a);
            console.log(this.arrowHelper.getHelper().children)
        } else {
            console.warn("No selected axis");
        }
    }

    private performRaycast() {


        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.solids.map(box => box.getMesh()), true); // true = recursive

        if (intersects.length > 0) {
            let valid = false;
            let foundBox: Solid | null = null;
            // Check if it is a valid object
            for (const intersect of intersects) {
                //console.log(intersect.object);
                if (valid == true && foundBox != null) {
                    break;
                }
                const hit = intersect.object;
                for (const box of this.solids) {
                    if (box.getMesh() == hit) {
                        valid = true;
                        foundBox = box;
                        break;
                    }
                }
            }

            if (valid == false || foundBox == null) {
                //console.log("Hit objects, but none were valid");
                this.outlinePass.selectedObjects = [];
                this.currentSolidFound = null;
                return;
            };
            //console.log("Raycasted box; Outline override box")
            this.currentSolidFound = foundBox;
            //this.outlinePass.selectedObjects = [foundBox.getMesh()];
        } else {
            if (this.isMoving) return;
            this.outlinePass.selectedObjects = [];
            this.currentSolidFound = null;
            //console.error("No hit; Outline disconnected");
        }
    }
    renderScene() {
        this.stats.begin();
        this.controls.beforeRender();
        this.performRaycast();
        this.composer.render();
        this.stats.end();
    }
    renderLoop() {
        requestAnimationFrame(this.renderLoop);
    }
}