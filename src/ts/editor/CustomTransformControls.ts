import { Box3, BoxGeometry, Camera, Group, Matrix3, Mesh, MeshBasicMaterial, Object3D, Plane, Raycaster, SphereGeometry, Vector2, Vector3 } from "three";
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

function haveSameMaterial(obj1: Mesh, obj2: Mesh) {
  if (!obj1.material || !obj2.material) return false;

  // If both have an array of materials
  if (Array.isArray(obj1.material) && Array.isArray(obj2.material)) {
    if (obj1.material.length !== obj2.material.length) return false;
    for (let i = 0; i < obj1.material.length; i++) {
      if (obj1.material[i] !== obj2.material[i]) return false;
    }
    return true;
  }

  // If both have single materials
  if (!Array.isArray(obj1.material) && !Array.isArray(obj2.material)) {
    return obj1.material === obj2.material;
  }

  // One is array, one is not – definitely not the same
  return false;
}

const TRANSFORM_CONTROLS_SPACING: number = 0.05;
const TRANSFORM_CONTROLS_SCALING_SPACING: number = 0.5;
const TRANSFORM_CONTROLS_DISTANCE_FACTOR: number = 0.7;
const TRANSFORM_CONTROLS_MOVEMENT_FACTOR: number = 0.001;
const TRNASFORM_CONTROLS_SCALING_FACTOR: number = 0.2;


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
    private mode: "translate" | "rotate" | "scale" = "scale";
    private camera: Camera;

    private xAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0xff0000, depthTest: false, depthWrite: false});
    private yAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0x0000ff, depthTest: false, depthWrite: false});
    private zAxisMaterial: MeshBasicMaterial = new MeshBasicMaterial({color: 0x00ff00, depthTest: false, depthWrite: false});
    private axisHeldDown: Vector3 = new Vector3(0, 0, 0);

    private dragStart: Vector2 = new Vector2(0, 0);
    private dragEnd: Vector2 = new Vector2(0, 0);
    private mousePos: Vector2 = new Vector2(0, 0);
    private originalPosition: Vector3 = new Vector3(0, 0, 0);

    private translateMeshes!: {
        posX: Mesh,
        posY: Mesh,
        posZ: Mesh,
        negX: Mesh,
        negY: Mesh,
        negZ: Mesh
    };
    private scalingMeshes!: {
        posX: Mesh,
        posY: Mesh,
        posZ: Mesh,
        negX: Mesh,
        negY: Mesh,
        negZ: Mesh
    };


    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initialize();

        this.eventBus.subscribeEvent(EventType.TRANSFORM_CONTROLS_ATTACH_GROUP, (group: Group) => {
            // Temporary fix
            this.attachGroup(group);
            this.detach();
            this.attachGroup(group);
        });
        this.eventBus.subscribeEvent(EventType.TRANSFORM_CONTROLS_DETACH_GROUP, () => {
            this.detach();
        });

        this.eventBus.subscribeEvent(EventType.RENDERER_ON_RENDER, () => {
            this._update();
        });

        this.eventBus.subscribeEvent(EventType.TRANSFORM_CONTROLS_SET_MODE, (mode: "translate" | "rotate" | "scale") => {
            this.setMode(mode);
        })

        this.camera = this.eventBus.inquireSubscriberUniqueEvent("getCamera") as Camera;

        window.addEventListener("mousedown", (event) => {
            if (!this.attachedGroup) return;
            this.dragStart.set(event.pageX, event.pageY);
            this.attachedGroup.getWorldPosition(this.originalPosition);

            // Perform a raycast

            const raycaster = new Raycaster();
            raycaster.setFromCamera(this._mouseCoordsToNDC(this.dragStart), this.camera);
            
            let groupToTest = this.translateGroup;
            if (this.mode == "rotate") {
                groupToTest = this.rotateGroup;
            }
            if (this.mode == "scale") {
                groupToTest = this.scaleGroup;
            }

            const intersects = raycaster.intersectObjects(groupToTest.children);
            if (intersects.length <= 0) {
                console.log("Custom transform controls found no intersections");
                return;
            };

            const first = intersects[0];
            const obj = first.object as Mesh;
            switch (obj) {
                case this.translateMeshes.posX: this.axisHeldDown = new Vector3(1, 0, 0); break;
                case this.translateMeshes.posY: this.axisHeldDown = new Vector3(0, 1, 0); break;
                case this.translateMeshes.posZ: this.axisHeldDown = new Vector3(0, 0, 1); break;
                case this.translateMeshes.negX: this.axisHeldDown = new Vector3(-1, 0, 0); break;
                case this.translateMeshes.negY: this.axisHeldDown = new Vector3(0, -1, 0); break;
                case this.translateMeshes.negZ: this.axisHeldDown = new Vector3(0, 0, -1); break;
                case this.scalingMeshes.negX: this.axisHeldDown = new Vector3(-1, 0, 0); break;
                case this.scalingMeshes.negY: this.axisHeldDown = new Vector3(0, -1, 0); break;
                case this.scalingMeshes.negZ: this.axisHeldDown = new Vector3(0, 0, -1); break;
                case this.scalingMeshes.posX: this.axisHeldDown = new Vector3(1, 0, 0); break;
                case this.scalingMeshes.posY: this.axisHeldDown = new Vector3(0, 1, 0); break;
                case this.scalingMeshes.posZ: this.axisHeldDown = new Vector3(0, 0, 1); break;
                default:
                    console.log("INvalid mesh clicked");
                    return;
            }

            if (this.attachedGroup) {
                this.attachedGroup.getWorldPosition(this.originalPosition);
            }
            


        });
        window.addEventListener("mouseup", (event) => {
            console.log("Released mouse button")
            this.dragEnd.set(event.pageX, event.pageY);
            this.axisHeldDown.set(0, 0, 0);
        });

        window.addEventListener("mousemove", (event) => {
            this.mousePos.set(event.pageX, event.pageY);
        })
    }

    private _mouseCoordsToNDC(coord: Vector2) {
        const x = (coord.x / window.innerWidth) * 2 - 1;
        const y = -(coord.y / window.innerHeight) * 2 + 1;
        return new Vector2(x, y);
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
        PositiveXMesh.material = this.xAxisMaterial;
        // Rotate from +Y to +X
        PositiveXMesh.position.set(TRANSFORM_CONTROLS_SPACING, 0, 0);
        PositiveXMesh.rotation.z = -Math.PI / 2; // -90 degrees around Z

        // Negative X arrow
        const NegativeXMesh = this.arrowModel.clone();
        NegativeXMesh.position.set(-TRANSFORM_CONTROLS_SPACING, 0, 0);
        NegativeXMesh.material = this.xAxisMaterial;
        // Rotate from +Y to -X
        NegativeXMesh.rotation.z = Math.PI / 2; // 90 degrees around Z

        // Positive Y arrow (default +Y, no rotation needed)
        const PositiveYMesh = this.arrowModel.clone();
        PositiveYMesh.position.set(0, TRANSFORM_CONTROLS_SPACING, 0);
        PositiveYMesh.material = this.yAxisMaterial;

        // Negative Y arrow
        const NegativeYMesh = this.arrowModel.clone();
        NegativeYMesh.position.set(0, -TRANSFORM_CONTROLS_SPACING, 0);
        NegativeYMesh.material = this.yAxisMaterial;
        NegativeYMesh.rotation.z = Math.PI; // flip 180 degrees around Z

        // Positive Z arrow
        const PositiveZMesh = this.arrowModel.clone();
        PositiveZMesh.position.set(0, 0, TRANSFORM_CONTROLS_SPACING);
        PositiveZMesh.material = this.zAxisMaterial;
        PositiveZMesh.rotation.x = Math.PI / 2; // rotate +Y to +Z

        // Negative Z arrow
        const NegativeZMesh = this.arrowModel.clone();
        NegativeZMesh.position.set(0, 0, -TRANSFORM_CONTROLS_SPACING);
        NegativeZMesh.material = this.zAxisMaterial;
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

        this.translateMeshes = {
            posX: PositiveXMesh,
            posY: PositiveYMesh,
            posZ: PositiveZMesh,
            negX: NegativeXMesh,
            negY: NegativeYMesh,
            negZ: NegativeZMesh
        };

        // Group for rotation arrows
        // TODO: rotating arrows
        this.rotateGroup = new Group();

        // Group for scaling arrows

        this.scaleGroup = new Group();

        // Positive X
        const PositiveXScale = this.scaleModel.clone();
        PositiveXScale.material = this.xAxisMaterial;
        PositiveXScale.position.set(TRANSFORM_CONTROLS_SCALING_SPACING, 0, 0);
        PositiveXScale.rotation.z = -Math.PI / 2; // rotate +Y to +X

        // Negative X
        const NegativeXScale = this.scaleModel.clone();
        NegativeXScale.material = this.xAxisMaterial;
        NegativeXScale.position.set(-TRANSFORM_CONTROLS_SCALING_SPACING, 0, 0);
        NegativeXScale.rotation.z = Math.PI / 2; // rotate +Y to -X

        // Positive Y
        const PositiveYScale = this.scaleModel.clone();
        PositiveYScale.material = this.yAxisMaterial;
        PositiveYScale.position.set(0, TRANSFORM_CONTROLS_SCALING_SPACING, 0); // +Y direction, default rotation

        // Negative Y
        const NegativeYScale = this.scaleModel.clone();
        NegativeYScale.material = this.yAxisMaterial;
        NegativeYScale.position.set(0, -TRANSFORM_CONTROLS_SCALING_SPACING, 0);
        NegativeYScale.rotation.z = Math.PI; // flip 180 degrees

        // Positive Z
        const PositiveZScale = this.scaleModel.clone();
        PositiveZScale.material = this.zAxisMaterial;
        PositiveZScale.position.set(0, 0, TRANSFORM_CONTROLS_SCALING_SPACING);
        PositiveZScale.rotation.x = Math.PI / 2; // rotate +Y to +Z

        // Negative Z
        const NegativeZScale = this.scaleModel.clone();
        NegativeZScale.material = this.zAxisMaterial;
        NegativeZScale.position.set(0, 0, -TRANSFORM_CONTROLS_SCALING_SPACING);
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

        this.scalingMeshes = {
            posX: PositiveXScale,
            posY: PositiveYScale,
            posZ: PositiveZScale,
            negX: NegativeXScale,
            negY: NegativeYScale,
            negZ: NegativeZScale
        };

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

        

        if (this.attachedGroup) {
            const attachedGroup = this.attachedGroup;
            this.detach();
            this.attachGroup(attachedGroup);
        }

        
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

        this.attachedGroup.getWorldPosition(this.translateGroup.position);
        this.attachedGroup.getWorldPosition(this.rotateGroup.position);
        this.attachedGroup.getWorldPosition(this.scaleGroup.position);


        console.log("Added transform controls to scene");
    }

    private _fixPosition() {
        if (!this.attachedGroup) return;
        this.attachedGroup.getWorldPosition(this.originalPosition);
        this.attachedGroup.position.copy(this.originalPosition);

        this.translateGroup.position.copy(this.attachedGroup.position);
        this.rotateGroup.position.copy(this.attachedGroup.position);
        this.scaleGroup.position.copy(this.attachedGroup.position);
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


        // Update translate
        if (this.mode == "translate" && this.axisHeldDown.lengthSq() > 0) {
            const axis = this.axisHeldDown.clone().normalize();
            const planeNormal = new Vector3().copy(axis).cross(this.camera.getWorldDirection(new Vector3())).normalize();
            const plane = new Plane().setFromNormalAndCoplanarPoint(planeNormal, this.originalPosition);

            const rayStart = new Raycaster();
            rayStart.setFromCamera(this._mouseCoordsToNDC(this.dragStart), this.camera)
            const rayCurrent = new Raycaster();
            rayCurrent.setFromCamera(this._mouseCoordsToNDC(this.mousePos), this.camera)

            const intersectStart = new Vector3();
            const intersectCurrent = new Vector3();

            rayStart.ray.intersectPlane(plane, intersectStart);
            rayCurrent.ray.intersectPlane(plane, intersectCurrent);

            const moveVec = intersectCurrent.clone().sub(intersectStart);
            const signedDistance = moveVec.dot(axis);

            this.attachedGroup.position.copy(this.originalPosition.clone().add(axis.multiplyScalar(signedDistance)));

        } else if (this.mode == "scale" && this.axisHeldDown.lengthSq() > 0) {
            const axis = this.axisHeldDown.clone().normalize();
            const planeNormal = new Vector3().copy(axis).cross(this.camera.getWorldDirection(new Vector3())).normalize();
            const plane = new Plane().setFromNormalAndCoplanarPoint(planeNormal, this.originalPosition);

            const rayStart = new Raycaster();
            rayStart.setFromCamera(this._mouseCoordsToNDC(this.dragStart), this.camera)
            const rayCurrent = new Raycaster();
            rayCurrent.setFromCamera(this._mouseCoordsToNDC(this.mousePos), this.camera)

            const intersectStart = new Vector3();
            const intersectCurrent = new Vector3();

            rayStart.ray.intersectPlane(plane, intersectStart);
            rayCurrent.ray.intersectPlane(plane, intersectCurrent);

            const moveVec = intersectCurrent.clone().sub(intersectStart);
            const signedDistance = moveVec.dot(axis) * TRNASFORM_CONTROLS_SCALING_FACTOR;

            // compute scale factor and clamp to avoid zero/negative scales
            const rawScaleFactor = 1 + signedDistance;
            const scaleFactor = Math.max(0.01, rawScaleFactor);

            // Determine which axis component of groupSize applies
            const size = this.groupSize.clone(); // groupSize is in world-units from _computeSize()
            // choose size component matching the axis (x/y/z). If axis is diagonal, this is approximate.
            const sizeAlongAxis = Math.abs(axis.x) > 0.5 ? size.x : (Math.abs(axis.y) > 0.5 ? size.y : size.z);

            // Determine anchor in world space: the side opposite the dragged handle should stay fixed.
            // If dragging positive handle (axis points +X), anchor should be at negative half; vice versa.
            const axisSign = Math.sign(this.axisHeldDown.x || this.axisHeldDown.y || this.axisHeldDown.z);
            const anchorOffsetWorld = axis.clone().multiplyScalar(-axisSign * sizeAlongAxis * 0.5);
            const anchorWorld = this.originalPosition.clone().add(anchorOffsetWorld);

            // Convert the anchor to the object's local space BEFORE scaling so we can find its new world pos after scale
            const anchorLocal = anchorWorld.clone();
            this.attachedGroup.worldToLocal(anchorLocal);

            // Apply scale only on the matching local axis components
            const newScale = this.attachedGroup.scale.clone();
            if (Math.abs(axis.x) > 0.5) newScale.x *= scaleFactor;
            if (Math.abs(axis.y) > 0.5) newScale.y *= scaleFactor;
            if (Math.abs(axis.z) > 0.5) newScale.z *= scaleFactor;

            // apply the scale
            this.attachedGroup.scale.copy(newScale);

            // update matrices so matrixWorld reflects the new scale
            this.attachedGroup.updateMatrixWorld(true);

            // compute where the same local anchor now sits in world space
            const newAnchorWorld = anchorLocal.clone().applyMatrix4(this.attachedGroup.matrixWorld);

            // compute delta to move object so anchorWorld remains fixed
            const delta = anchorWorld.clone().sub(newAnchorWorld);
            this.attachedGroup.position.add(delta);

            // update matrix world after moving
            this.attachedGroup.updateMatrixWorld(true);


        }

        this.translateGroup.position.copy(this.attachedGroup.position);
        this.rotateGroup.position.copy(this.attachedGroup.position);
        this.scaleGroup.position.copy(this.attachedGroup.position);
    }

    attachGroup(group: Group) {
        
        this.attachedGroup = group;
        this._rebuild();
        this._addToScene();
        this._fixPosition();
    }
    detach() {

        if (!this.attachedGroup) return;
        this.attachedGroup.traverse((obj) => {
            //const t = new Vector3();
            //obj.getWorldPosition(t);
            //obj.position.copy(t);

            //console.log("Copied ", t);
        })

        this.attachedGroup = undefined;
        this._clearMeshes();

        // Reparented to scene outside of detach() in SelectionManager
    }








}
