import { Camera, Clock, Mesh, Object3D, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from "three";
import { EffectComposer, OutlinePass, RenderPass } from "three/examples/jsm/Addons.js";
import { EventBus, EventType } from "../EventBus";


export class EditorRenderer {

    private scene!: Scene;
    private camera!: PerspectiveCamera;
    private renderer!: WebGLRenderer;
    private clock!: Clock;
    private eventBus: EventBus;

    private composer!: EffectComposer;
    private renderPass!: RenderPass;
    private outlinePass!: OutlinePass;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initialize();
    }

    private _initialize() {
        this.clock = new Clock();
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(
            90,
            window.innerWidth / window.innerHeight,
            0.01, 1000
        );
        this.renderer = new WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.outlinePass = new OutlinePass(
            new Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera,
            []
        );
        this.composer.addPass(this.outlinePass);

        this._initializeEvents();
    }

    private _initializeEvents() {
        this.eventBus.subscribeEvent(EventType.RENDERER_SCENE_ADD, (object: Object3D) => {
            this.scene.add(object);
        });
        this.eventBus.subscribeEvent(EventType.RENDERER_SCENE_REMOVE, (object: Object3D) => {
            this.scene.remove(object);
        });
        this.eventBus.subscribeEvent(EventType.RENDERER_SET_OUTLINED_OBJECTS, (meshes: Object3D[]) => {
            this.outlinePass.selectedObjects = meshes;
        });
        this.eventBus.subscribeEvent(EventType.RENDERER_SCENE_ATTACH, (object: Object3D) => {
            this.scene.attach(object);
        })
        this.eventBus.subscribeUniqueEvent("getCamera", () => {
            return this.camera;
        });
    }

    render() {
        this.eventBus.postEvent(EventType.RENDERER_ON_RENDER);
        this.composer.render();
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getDeltaTime() {
        return this.clock.getDelta();
    }

    
}