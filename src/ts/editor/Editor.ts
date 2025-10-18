import { AxesHelper, BoxGeometry, BufferGeometry, GridHelper, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { CameraController } from "./CameraController";
import { EditorRenderer } from "./Core/Renderer";
import { EntityComponentSystemScene } from "./EntityComponentSystem/EntityComponentSystemScene";
import { ComponentTypeMap, SolidGeometryComponent } from "./EntityComponentSystem/EntityComponentSystemComponents";
import { SolidGeometrySystem } from "./EntityComponentSystem/Systems/SolidGeometrySystem";
import { CustomTransformControls } from "./CustomTransformControls";
import { EventBus, EventType } from "./EventBus";
import { createSolid } from "./ShapeFactory";
import { PrimitivesTopBar } from "./UserInterface/PrimitivesTopBar";
import { SelectionManager } from "./SelectionManager";
import { TransformComponentSystem } from "./EntityComponentSystem/Systems/TransformComponentSystem";

export class Editor {

    renderer: EditorRenderer;
    cameraController: CameraController;
    tree: EntityComponentSystemScene<ComponentTypeMap>;
    transformControls: CustomTransformControls;

    // Systems

    solidGeometrySystem!: SolidGeometrySystem;
    transformComponentSystem!: TransformComponentSystem;
    eventBus: EventBus;

    // UI
    primitivesTopBar!: PrimitivesTopBar;

    // Other editor systems
    selectionManager!: SelectionManager;

    // Data

    constructor() {

        this.run = this.run.bind(this);

        this.eventBus = new EventBus();
        this.renderer = new EditorRenderer(this.eventBus);
        this.cameraController = new CameraController(this.renderer.getCamera());
        this.tree = new EntityComponentSystemScene(this.eventBus);
        this.transformControls = new CustomTransformControls(this.eventBus);
        this.primitivesTopBar = new PrimitivesTopBar(this.eventBus);

        

        this._initialize();
    }

    private _initialize() {
        const gridHelper = new GridHelper(10, 100);
        const axisHelper = new AxesHelper(1);

        this.renderer.getScene().add(gridHelper);
        this.renderer.getScene().add(axisHelper);


        this._initializeSystems();
        this._initializeUserInterface();
        this._initializeEvents();
    }

    private _initializeSystems() {

        this.solidGeometrySystem = new SolidGeometrySystem(this.renderer.getScene());
        this.transformComponentSystem = new TransformComponentSystem(this.eventBus);

        this.tree.addSystem(SolidGeometryComponent, this.solidGeometrySystem);
        this.tree.addSystem(TransformComponentSystem, this.transformComponentSystem);

        // Initialize root node

        this.tree.createRoot();

        this.transformControls.setMode("translate");

        // Editor components
        this.selectionManager = new SelectionManager(this.eventBus);
        
    }

    private _initializeEvents() {
        this.eventBus.subscribeEvent(EventType.SELECTION_MANAGER_SELECTION_CHANGED, (entityList) => {
            this._updateTree();
        })
    }

    private _initializeUserInterface() {
        this.eventBus.subscribeEvent(EventType.UI_PRIMITIVES_CREATE_CUBE_CLICKED, () => {
            // Create cube solid
            const geom = new BoxGeometry(1, 1, 1);
            const entity = createSolid(geom, this.tree);
            this.tree.addEntity(entity);
            entity.setParent(this.tree.getRoot());
            
            this._updateTree();
        });

        this.eventBus.subscribeEvent(EventType.UI_PRIMITIVES_CREATE_SPHERE_CLICKED, () => {
            // Create sphere solid
            const sphere = new SphereGeometry(1);
            const entity = createSolid(sphere, this.tree);
            this.tree.addEntity(entity);
            entity.setParent(this.tree.getRoot());
            
            this._updateTree();
        });
    }
    
    

    private _updateTree() {
        const treeElement = document.querySelector("#tree") as HTMLDivElement | null;
        if (!treeElement) return;

        this.tree.renderTree(treeElement, this.selectionManager.getSelectedEntities());
    }

    run() {
        this.cameraController.beforeRender(this.renderer.getDeltaTime());
        this.renderer.render();
        requestAnimationFrame(this.run);
    }

}