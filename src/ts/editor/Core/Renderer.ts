import { Camera, Clock, PerspectiveCamera, Scene, WebGLRenderer } from "three";


export class EditorRenderer {

    private scene!: Scene;
    private camera!: PerspectiveCamera;
    private renderer!: WebGLRenderer;
    private clock!: Clock;

    constructor() {

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
    }

    render() {
        this.renderer.render(this.scene, this.camera);
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