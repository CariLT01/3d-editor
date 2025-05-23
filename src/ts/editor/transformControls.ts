import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import MovementArrowMeshURL from "../../../assets/meshes/MovementArrow.glb";

type AxisName =
    | "positiveX"
    | "negativeX"
    | "positiveY"
    | "negativeY"
    | "positiveZ"
    | "negativeZ";

const AXIS_AND_MOUSE_COORDS = {};

export class CustomTransformControls {
    axisMeshes!: Record<AxisName, THREE.Mesh>;
    finishedLoading: boolean = false;
    selectedObject: THREE.Mesh | null = null;

    scene: THREE.Scene;
    startMouseX: number = 0;
    startMouseY: number = 0;
    mouseDown: boolean = false;
    axisClicked:
        | "positiveX"
        | "positiveY"
        | "positiveZ"
        | "negativeX"
        | "negativeY"
        | "negativeZ"
        | "none" = "none";
    camera: THREE.Camera;
    mode: "translate" | "scale" | "rotate" = "translate";

    dragPlane: THREE.Plane = new THREE.Plane();
    planeNormal: THREE.Vector3 = new THREE.Vector3();
    raycaster: THREE.Raycaster = new THREE.Raycaster();
    dragStart: THREE.Vector3 = new THREE.Vector3();
    dragOffset: THREE.Vector3 = new THREE.Vector3();
    dragAxis: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

    translationSnap: number = 0;
    rotationSnap: number = 0;
    scaleSnap: number = 0;

    axisZ_Material = new THREE.MeshBasicMaterial({
        color: 0x5eb7ff,
        depthTest: false,
        depthWrite: false,
    });
    axisX_Material = new THREE.MeshBasicMaterial({
        color: 0xff5e69,
        depthTest: false,
        depthWrite: false,
    });
    axisY_Material = new THREE.MeshBasicMaterial({
        color: 0x5eff81,
        depthTest: false,
        depthWrite: false,
    });
    glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        depthTest: false,
        depthWrite: false,
    });

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;

        this.constructAxisMeshes().then(() => {
            this.initializeMouseEvents();
        });
    }

    attach(object: THREE.Mesh) {
        if (this.selectedObject == null) {
            this.makeVisible();
        }
        this.selectedObject = object;
    }
    detach() {
        if (this.selectedObject == null) return;
        this.selectedObject = null;
        this.makeInvisible();
    }
    setMode(mode: "translate" | "scale" | "rotate") {
        this.mode = mode;
    }
    setTranslationSnap(snap: number) {
        this.translationSnap = snap;
    }
    setRotationSnap(snap: number) {
        this.rotationSnap = snap;
    }
    setScaleSnap(snap: number) {
        this.scaleSnap = snap;
    }

    private async constructAxisMeshes() {
        const meshLoader = new GLTFLoader();

        const gltf = await meshLoader.loadAsync(MovementArrowMeshURL);
        const mesh: THREE.Mesh = gltf.scene.children[0] as THREE.Mesh;

        // Clone for each axis

        this.axisMeshes = {
            positiveX: mesh.clone(),
            positiveY: mesh.clone(),
            positiveZ: mesh.clone(),
            negativeX: mesh.clone(),
            negativeY: mesh.clone(),
            negativeZ: mesh.clone(),
        };

        // Set materials

        this.axisMeshes.positiveX.material = this.axisX_Material;
        this.axisMeshes.negativeX.material = this.axisX_Material;

        this.axisMeshes.positiveY.material = this.axisY_Material;
        this.axisMeshes.negativeY.material = this.axisY_Material;

        this.axisMeshes.positiveZ.material = this.axisZ_Material;
        this.axisMeshes.negativeZ.material = this.axisZ_Material;

        // Scale them down!!

        // Make them face in the correct direction

        // Make them face in the correct direction (default arrow points up - positive Y)
        // Positive X: rotate -90° about Z (Y becomes X)
        this.axisMeshes.positiveX.rotation.z = -Math.PI / 2;
        // Negative X: rotate 90° about Z (Y becomes -X)
        this.axisMeshes.negativeX.rotation.z = Math.PI / 2;
        // Positive Z: rotate 90° about X (Y becomes Z)
        this.axisMeshes.positiveZ.rotation.x = Math.PI / 2;
        // Negative Z: rotate -90° about X (Y becomes -Z)
        this.axisMeshes.negativeZ.rotation.x = -Math.PI / 2;
        // Negative Y: rotate 180° (flip it)
        this.axisMeshes.negativeY.rotation.x = Math.PI;

        this.finishedLoading = true;

        for (const name of Object.keys(this.axisMeshes) as AxisName[]) {
            this.axisMeshes[name].renderOrder = Infinity;
        }
    }

    private makeVisible() {
        this.scene.add(this.axisMeshes.positiveX);
        this.scene.add(this.axisMeshes.negativeX);
        this.scene.add(this.axisMeshes.positiveY);
        this.scene.add(this.axisMeshes.negativeY);
        this.scene.add(this.axisMeshes.positiveZ);
        this.scene.add(this.axisMeshes.negativeZ);
    }

    private makeInvisible() {
        this.scene.remove(this.axisMeshes.positiveX);
        this.scene.remove(this.axisMeshes.negativeX);
        this.scene.remove(this.axisMeshes.positiveY);
        this.scene.remove(this.axisMeshes.negativeY);
        this.scene.remove(this.axisMeshes.positiveZ);
        this.scene.remove(this.axisMeshes.negativeZ);
    }
    private translateScaleMouseDown(event: MouseEvent) {
        if (this.selectedObject == null) return;
        if (this.mode != "translate" && this.mode != "scale") return;
        const mousex = (event.clientX / window.innerWidth) * 2 - 1;
        const mousey = -(event.clientY / window.innerHeight) * 2 + 1;

        //const raycaster = new THREE.Raycaster();
        this.raycaster.setFromCamera(
            new THREE.Vector2(mousex, mousey),
            this.camera
        );

        const hits = this.raycaster.intersectObjects([
            this.axisMeshes.positiveX,
            this.axisMeshes.negativeX,
            this.axisMeshes.positiveY,
            this.axisMeshes.negativeY,
            this.axisMeshes.positiveZ,
            this.axisMeshes.negativeZ,
        ]);
        if (hits.length <= 0) return;
        const first = hits[0].object;

        // Find which axis the hit belongs to
        for (const name of Object.keys(this.axisMeshes) as AxisName[]) {
            const arrow = this.axisMeshes[name];
            if (arrow == first) {
                this.axisClicked = name;
            }
        }

        if (this.axisClicked == "negativeX" || this.axisClicked == "positiveX") {
            this.dragAxis.set(1, 0, 0);
        }
        if (this.axisClicked == "negativeY" || this.axisClicked == "positiveY") {
            this.dragAxis.set(0, 1, 0);
        }
        if (this.axisClicked == "negativeZ" || this.axisClicked == "positiveZ") {
            this.dragAxis.set(0, 0, 1);
        }

        this.startMouseX = mousex;
        this.startMouseY = mousey;

        console.log("Holding down mouse!");

        const camDir = this.camera.getWorldDirection(new THREE.Vector3());
        this.planeNormal = new THREE.Vector3()
            .copy(camDir)
            .cross(this.dragAxis)
            .cross(this.dragAxis)
            .normalize();
        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.planeNormal,
            this.selectedObject.position
        );

        //const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragStart)) {
            this.dragOffset.subVectors(this.selectedObject.position, this.dragStart);
            this.mouseDown = true;
        }
    }
    private translateScaleMouseMove(event: MouseEvent) {
        if (this.selectedObject == null) return;
        if (this.mode != "translate" && this.mode != "scale") return;
        if (this.mouseDown == false) {
            const mousex = (event.clientX / window.innerWidth) * 2 - 1;
            const mousey = -(event.clientY / window.innerHeight) * 2 + 1;

            //const raycaster = new THREE.Raycaster();
            this.raycaster.setFromCamera(
                new THREE.Vector2(mousex, mousey),
                this.camera
            );

            const hits = this.raycaster.intersectObjects([
                this.axisMeshes.positiveX,
                this.axisMeshes.negativeX,
                this.axisMeshes.positiveY,
                this.axisMeshes.negativeY,
                this.axisMeshes.positiveZ,
                this.axisMeshes.negativeZ,
            ]);
            let first;
            if (hits.length > 0) {
                //document.body.style.cursor = "grab";
                first = hits[0].object as THREE.Mesh;
            } else {
                //document.body.style.cursor = "default";

                first = null;
            }

            for (const name of Object.keys(this.axisMeshes) as AxisName[]) {
                const arrow = this.axisMeshes[name];
                if (arrow == first) {
                    arrow.material = this.glowMaterial;
                } else {
                    if (name == "positiveX" || name == "negativeX") {
                        arrow.material = this.axisX_Material;
                    }
                    if (name == "positiveY" || name == "negativeY") {
                        arrow.material = this.axisY_Material;
                    }
                    if (name == "positiveZ" || name == "negativeZ") {
                        arrow.material = this.axisZ_Material;
                    }
                }
            }

            // Find which axis the hit belongs to

            return;
        }
        const mousex = (event.clientX / window.innerWidth) * 2 - 1;
        const mousey = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(
            new THREE.Vector2(mousex, mousey),
            this.camera
        );
        const dragPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, dragPoint)) {
            const worldDelta = dragPoint
                .clone()
                .add(this.dragOffset)
                .sub(this.selectedObject.position);

            // Project onto drag axis
            const moveDelta = this.dragAxis
                .clone()
                .multiplyScalar(worldDelta.dot(this.dragAxis));

            // Determine snap step
            let snapToUse = 1;
            if (this.mode === "translate") snapToUse = this.translationSnap;
            else if (this.mode === "scale") snapToUse = this.scaleSnap;

            // Snap moveDelta (individually per axis)
            const snappedMoveDelta = new THREE.Vector3(
                Math.round(moveDelta.x / snapToUse) * snapToUse,
                Math.round(moveDelta.y / snapToUse) * snapToUse,
                Math.round(moveDelta.z / snapToUse) * snapToUse
            );

            if (this.mode === "translate") {
                this.selectedObject.position.add(snappedMoveDelta);
            } else if (this.mode === "scale") {



                let scaleAmount = moveDelta.dot(this.dragAxis);

                // Reverse if dragging negative axis
                if (
                    this.axisClicked === "negativeX" ||
                    this.axisClicked === "negativeY" ||
                    this.axisClicked === "negativeZ"
                ) {
                    scaleAmount *= -1;
                }

                const snappedScale = Math.round(scaleAmount / snapToUse) * snapToUse;
                const scaleDelta = this.dragAxis.clone().multiplyScalar(snappedScale);
                this.selectedObject.scale.add(scaleDelta);

                this.selectedObject.position.add(
                    scaleDelta.clone().multiplyScalar(0.5)
                ); // Centered scale
            }
        }
    }
    private initializeMouseEvents() {
        document.body.addEventListener("mousedown", (event: MouseEvent) => {
            if (event.button != 0) return;
            if (this.selectedObject == null) return;

            this.translateScaleMouseDown(event);
        });

        document.body.addEventListener("mousemove", (event: MouseEvent) => {
            if (this.selectedObject == null) return;

            this.translateScaleMouseMove(event);
        });
        document.body.addEventListener("mouseup", (event: MouseEvent) => {
            this.mouseDown = false;
            this.axisClicked = "none";
        });
    }

    update() {
        if (this.finishedLoading == false) return;
        if (this.selectedObject == null) return;
        const distance = this.selectedObject.position.distanceTo(
            this.camera.position
        );

        for (const name of Object.keys(this.axisMeshes) as AxisName[]) {
            const arrow = this.axisMeshes[name];
            arrow.scale.set(distance / 200, distance / 200, distance / 200);
            arrow.position.copy(this.selectedObject.position);
        }

        // Update mouse movement
    }
}
