import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { EditorRenderer } from "./Core/Renderer";
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

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

export class CustomTransformControls {
    private renderer: EditorRenderer;
    private translateGroup!: Group;
    private scaleGroup!: Group;
    private rotateGroup!: Group;

    private arrowModel!: Mesh;
    private scaleModel!: Mesh;

    private groupInScene: Group | undefined = undefined;
    private attachedGroup: Group | undefined = undefined;

    constructor(renderer: EditorRenderer) {
        this.renderer = renderer;

        this._initialize();
    }

    private _initialize() {

        this._loadArrowModel();
        this._createScaleModel();

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

        // Group for scaling arrows

        this.scaleGroup = new Group();

        // Positive X
        const PositiveXScale = this.scaleModel.clone();
        PositiveXScale.material = new MeshBasicMaterial({ color: 0xff0000 });
        PositiveXScale.position.set(TRANSFORM_CONTROLS_SPACING, 0, 0);
        PositiveXScale.rotation.z = -Math.PI / 2; // rotate +Y to +X

        // Negative X
        const NegativeXScale = this.scaleModel.clone();
        NegativeXScale.material = new MeshBasicMaterial({ color: 0xff0000 });
        NegativeXScale.position.set(-TRANSFORM_CONTROLS_SPACING, 0, 0);
        NegativeXScale.rotation.z = Math.PI / 2; // rotate +Y to -X

        // Positive Y
        const PositiveYScale = this.scaleModel.clone();
        PositiveYScale.material = new MeshBasicMaterial({ color: 0x00ff00 });
        PositiveYScale.position.set(0, TRANSFORM_CONTROLS_SPACING, 0); // +Y direction, default rotation

        // Negative Y
        const NegativeYScale = this.scaleModel.clone();
        NegativeYScale.material = new MeshBasicMaterial({ color: 0x00ff00 });
        NegativeYScale.position.set(0, -TRANSFORM_CONTROLS_SPACING, 0);
        NegativeYScale.rotation.z = Math.PI; // flip 180 degrees

        // Positive Z
        const PositiveZScale = this.scaleModel.clone();
        PositiveZScale.material = new MeshBasicMaterial({ color: 0x0000ff });
        PositiveZScale.position.set(0, 0, TRANSFORM_CONTROLS_SPACING);
        PositiveZScale.rotation.x = Math.PI / 2; // rotate +Y to +Z

        // Negative Z
        const NegativeZScale = this.scaleModel.clone();
        NegativeZScale.material = new MeshBasicMaterial({ color: 0x0000ff });
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

        const geom = new BoxGeometry(0.002, 0.05, 0.002);
        const mesh = new Mesh(geom, new MeshBasicMaterial());
        this.arrowModel = mesh; // Totally a real arrow
    }

    private _createScaleModel() {
        const geom = new SphereGeometry(TRANSFORM_CONTROLS_SPACING);
        const mesh = new Mesh(geom, new MeshBasicMaterial());

        this.scaleModel = mesh;

    }

    setMode(mode: "translate" | "rotate" | "scale") {
        if (this.groupInScene) {
            this.renderer.getScene().remove(this.groupInScene);
        }

        switch (mode) {
            case "translate":
                this.renderer.getScene().add(this.translateGroup);
                break;
            case "rotate":
                this.renderer.getScene().add(this.rotateGroup);
                break;
            case "scale":
                this.renderer.getScene().add(this.scaleGroup);
                break;
            default:
                throw new Error("Unknown mode: " + mode);
        }
        
    }

    attachGroup(group: Group) {
        this.attachedGroup = group;
    }
    detach() {
        this.attachedGroup = undefined;
    }






}
