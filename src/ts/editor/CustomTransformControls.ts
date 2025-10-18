import { Box3, BoxGeometry, Camera, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from "three";
import { EditorRenderer } from "./Core/Renderer";
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";
import { EventBus, EventType } from "./EventBus";

function loadGLB(url: string) {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            gltf => resolve(gltf),
            undefined, // optional progress callback
            error => reject(error)
        );
    });
}


function isMesh(object: Object3D): object is Mesh {
    return (object as Mesh).isMesh === true;
}

const TRANSFORM_CONTROLS_SPACING: number = 0.05;
const TRANSFORM_CONTROLS_DISTANCE_FACTOR: number = 0.5;

export class CustomTransformControls {
    private eventBus: EventBus;
    private translateGroup!: Group;
    private scaleGroup!: Group;
    private rotateGroup!: Group;

    private arrowModel!: Mesh;
    private scaleModel!: Mesh;

    private groupInScene: Group | undefined = undefined;
    private attachedGroup: Group | undefined = undefined;
    private groupSize: Vector3 = new Vector3(0, 0, 0);
    private mode: "translate" | "rotate" | "scale" = "translate";
    private camera: Camera;

    private xAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0xff0000, depthTest: false, depthWrite: false});
    private yAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0x0000ff, depthTest: false, depthWrite: false});
    private zAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0x00ff00, depthTest: false, depthWrite: false});


    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initialize();

        this.eventBus.subscribeEvent(EventType.TRANSFORM_CONTROLS_ATTACH_GROUP, (group: Group) => {
            this.attachGroup(group);
        });
        this.eventBus.subscribeEvent(EventType.TRANSFORM_CONTROLS_DETACH_GROUP, () => {
            this.detach();
        });

        this.eventBus.subscribeEvent(EventType.RENDERER_ON_RENDER, () => {
            this._update();
        });

        this.camera = this.eventBus.inquireSubscriberUniqueEvent("getCamera") as Camera;
    }

    private _clearGroup(group: Group) {
        console.log("Clearing group");
        while (group.children.length > 0) {
            group.remove(group.children[0]);
        }
    }

    private _groupAlwaysOnTop(group: Group) {
        console.log("Apply always on top");
        group.traverse((obj)=> {
            obj.renderOrder = 2**31 - 1;
            obj.onBeforeRender = function (renderer) { renderer.clearDepth(); };
        })
    }

    private _buildMeshes() {

        if (this.translateGroup && this.rotateGroup && this.scaleGroup) {
            this._clearGroup(this.translateGroup);
            this._clearGroup(this.rotateGroup);
            this._clearGroup(this.scaleGroup);

            this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.translateGroup);
            this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.rotateGroup);
            this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.scaleGroup);
        }

        // Group for translation arrows
        this.translateGroup = new Group();

        // Positive X arrow
        const PositiveXMesh = this.arrowModel.clone();
        PositiveXMesh.material = new MeshBasicMaterial({ color: 0xff0000 });
        // Rotate from +Y to +X
        PositiveXMesh.position.set(TRANSFORM_CONTROLS_SPACING, 0, 0);
        PositiveXMesh.rotation.z = -Math.PI / 2; // -90 degrees around Z

        // Negative X arrow
        const NegativeXMesh = this.arrowModel.clone();
        NegativeXMesh.position.set(-TRANSFORM_CONTROLS_SPACING, 0, 0);
        NegativeXMesh.material = new MeshBasicMaterial({ color: 0xff0000 });
        // Rotate from +Y to -X
        NegativeXMesh.rotation.z = Math.PI / 2; // 90 degrees around Z

        // Positive Y arrow (default +Y, no rotation needed)
        const PositiveYMesh = this.arrowModel.clone();
        PositiveYMesh.position.set(0, TRANSFORM_CONTROLS_SPACING, 0);
        PositiveYMesh.material = new MeshBasicMaterial({ color: 0x00ff00 });

        // Negative Y arrow
        const NegativeYMesh = this.arrowModel.clone();
        NegativeYMesh.position.set(0, -TRANSFORM_CONTROLS_SPACING, 0);
        NegativeYMesh.material = new MeshBasicMaterial({ color: 0x00ff00 });
        NegativeYMesh.rotation.z = Math.PI; // flip 180 degrees around Z

        // Positive Z arrow
        const PositiveZMesh = this.arrowModel.clone();
        PositiveZMesh.position.set(0, 0, TRANSFORM_CONTROLS_SPACING);
        PositiveZMesh.material = new MeshBasicMaterial({ color: 0x0000ff });
        PositiveZMesh.rotation.x = Math.PI / 2; // rotate +Y to +Z

        // Negative Z arrow
        const NegativeZMesh = this.arrowModel.clone();
        NegativeZMesh.position.set(0, 0, -TRANSFORM_CONTROLS_SPACING);
        NegativeZMesh.material = new MeshBasicMaterial({ color: 0x0000ff });
        NegativeZMesh.rotation.x = -Math.PI / 2; // rotate +Y to -Z

        // Add all arrows to the group
        this.translateGroup.add(
            PositiveXMesh,
            NegativeXMesh,
            PositiveYMesh,
            NegativeYMesh,
            PositiveZMesh,
            NegativeZMesh
        );

        // Group for rotation arrows
        // TODO: rotating arrows
        this.rotateGroup = new Group();

        // Group for scaling arrows

        this.scaleGroup = new Group();

        // Positive X
        const PositiveXScale = this.scaleModel.clone();
        PositiveXScale.material = this.xAxisMaterial;
        PositiveXScale.position.set(TRANSFORM_CONTROLS_SPACING, 0, 0);
        PositiveXScale.rotation.z = -Math.PI / 2; // rotate +Y to +X

        // Negative X
        const NegativeXScale = this.scaleModel.clone();
        NegativeXScale.material = this.xAxisMaterial;
        NegativeXScale.position.set(-TRANSFORM_CONTROLS_SPACING, 0, 0);
        NegativeXScale.rotation.z = Math.PI / 2; // rotate +Y to -X

        // Positive Y
        const PositiveYScale = this.scaleModel.clone();
        PositiveYScale.material = this.yAxisMaterial;
        PositiveYScale.position.set(0, TRANSFORM_CONTROLS_SPACING, 0); // +Y direction, default rotation

        // Negative Y
        const NegativeYScale = this.scaleModel.clone();
        NegativeYScale.material = this.yAxisMaterial;
        NegativeYScale.position.set(0, -TRANSFORM_CONTROLS_SPACING, 0);
        NegativeYScale.rotation.z = Math.PI; // flip 180 degrees

        // Positive Z
        const PositiveZScale = this.scaleModel.clone();
        PositiveZScale.material = this.zAxisMaterial;
        PositiveZScale.position.set(0, 0, TRANSFORM_CONTROLS_SPACING);
        PositiveZScale.rotation.x = Math.PI / 2; // rotate +Y to +Z

        // Negative Z
        const NegativeZScale = this.scaleModel.clone();
        NegativeZScale.material = this.zAxisMaterial;
        NegativeZScale.position.set(0, 0, -TRANSFORM_CONTROLS_SPACING);
        NegativeZScale.rotation.x = -Math.PI / 2; // rotate +Y to -Z

        // Add all arrows to the group
        this.scaleGroup.add(
            PositiveXScale,
            NegativeXScale,
            PositiveYScale,
            NegativeYScale,
            PositiveZScale,
            NegativeZScale
        );

        this._groupAlwaysOnTop(this.translateGroup);
        this._groupAlwaysOnTop(this.rotateGroup);
        this._groupAlwaysOnTop(this.scaleGroup);

        // Assume we add to the scene
        //this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.translateGroup);
        //this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.scaleGroup);
        //this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.rotateGroup);
    }

    private _initialize() {

        this._loadArrowModel();
        this._createScaleModel();
        this._computeSize();
        this._buildMeshes();



    }

    private _clearMeshes() {
        if (this.translateGroup && this.rotateGroup && this.scaleGroup) {
            this._clearGroup(this.translateGroup);
            this._clearGroup(this.rotateGroup);
            this._clearGroup(this.scaleGroup);
        }
    }

    private _rebuild() {
        if (!this.attachedGroup) return;
        this._computeSize();
        this._buildMeshes();
    }

    private _computeSize() {
        if (!this.attachedGroup) return;
        const box = new Box3().setFromObject(this.attachedGroup);
        box.getSize(this.groupSize);
    }

    private _loadArrowModel() {
        /*const gltf: GLTF = await loadGLB("MovementArrow.glb") as GLTF;

        let mesh: Mesh | undefined = undefined;
        gltf.scene.traverse((child) => {
            if (isMesh(child) && !mesh) {
                mesh = child;
            }
        });
        // Wow that was hard wasn't it
        if (mesh == undefined) {
            throw Error("No mesh found under movement arrow");
        }
        this.arrowModel = mesh;*/

        const geom = new BoxGeometry(0.01, 1, 0.01);
        const mesh = new Mesh(geom, new MeshBasicMaterial());
        this.arrowModel = mesh; // Totally a real arrow
    }

    private _createScaleModel() {
        const geom = new SphereGeometry(TRANSFORM_CONTROLS_SPACING);
        const mesh = new Mesh(geom, new MeshBasicMaterial());

        this.scaleModel = mesh;

    }

    setMode(mode: "translate" | "rotate" | "scale") {

        this.mode=mode;

        
    }

    private _addToScene() {
        this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.translateGroup);
        this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.rotateGroup);
        this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, this.scaleGroup);
        if (!this.attachedGroup) return;

        switch (this.mode) {
            case "translate":
                this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.translateGroup);
                break;
            case "rotate":
                this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.rotateGroup);
                break;
            case "scale":
                this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.scaleGroup);
                break;
            default:
                throw new Error("Unknown mode: " + this.mode);
        }

        this._groupAlwaysOnTop(this.translateGroup);
        this._groupAlwaysOnTop(this.rotateGroup);
        this._groupAlwaysOnTop(this.scaleGroup);

        console.log("Added transform controls to scene");
    }

    private _update() {
        // Update scale
        if (!this.attachedGroup) return;

        const camera = this.camera;
        const targetPosition = new Vector3();
        this.attachedGroup.getWorldPosition(targetPosition);

        const distance = targetPosition.distanceTo(camera.position);
        const scaleFactor = distance * TRANSFORM_CONTROLS_DISTANCE_FACTOR;
        
        this.translateGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.rotateGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.scaleGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    attachGroup(group: Group) {
        
        this.attachedGroup = group;
        this._rebuild();
        this._addToScene();
    }
    detach() {
        this.attachedGroup = undefined;
        this._clearMeshes();
    }








}
