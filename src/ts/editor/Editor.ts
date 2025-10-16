import { BoxGeometry, GridHelper, Mesh, MeshBasicMaterial } from "three";
import { CameraController } from "./CameraController";
import { EditorRenderer } from "./Core/Renderer";
import { EntityComponentSystemScene } from "./EntityComponentSystem/EntityComponentSystemScene";
import { ComponentTypeMap, SolidGeometryComponent } from "./EntityComponentSystem/EntityComponentSystemComponents";
import { SolidGeometrySystem } from "./EntityComponentSystem/Systems/SolidGeometrySystem";
import { CustomTransformControls } from "./CustomTransformControls";

export class Editor {

    renderer: EditorRenderer;
    cameraController: CameraController;
    tree: EntityComponentSystemScene<ComponentTypeMap>;
    transformControls: CustomTransformControls;

    // Systems

    solidGeometrySystem!: SolidGeometrySystem;

    constructor() {

        this.run = this.run.bind(this);

        this.renderer = new EditorRenderer();
        this.cameraController = new CameraController(this.renderer.getCamera());
        this.tree = new EntityComponentSystemScene();
        this.transformControls = new CustomTransformControls(this.renderer);

        

        this._initialize();
    }

    private _initialize() {
        const gridHelper = new GridHelper(10, 100);

        this.renderer.getScene().add(gridHelper);


        this._initializeSystems();
    }

    private _initializeSystems() {

        this.solidGeometrySystem = new SolidGeometrySystem(this.renderer.getScene());

        this.tree.addSystem(SolidGeometryComponent, this.solidGeometrySystem);

        // Initialize root node

        this.tree.createRoot();

        this.transformControls.setMode("translate");
        
    }
    
    

    private _updateTree() {
        const treeElement = document.querySelector("#tree") as HTMLDivElement | null;
        if (!treeElement) return;

        this.tree.renderTree(treeElement);
    }

    run() {
        this.cameraController.beforeRender(this.renderer.getDeltaTime());
        this.renderer.render();
        requestAnimationFrame(this.run);
    }

}