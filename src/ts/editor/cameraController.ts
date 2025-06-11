import * as THREE from 'three';

const FORWARD_MOVEMENT_SPEED = 0.2;
const ROTATION_SPEED = 4.5;
const WHEEL_MOVEMENT_SPEED = 1.3;
const MOUSE_PAN_SPEED = 15;
const WM_FM_RATIO = WHEEL_MOVEMENT_SPEED / FORWARD_MOVEMENT_SPEED;
const MP_WM_RATIO = MOUSE_PAN_SPEED / WHEEL_MOVEMENT_SPEED;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export class CameraController {

    camera: THREE.PerspectiveCamera;
    keysPressed: { [key: string]: boolean } = {};
    rightMouseButtonPressed: boolean = false;
    middleMouseButtonPressed: boolean = false;
    mouseMovementX: number = 0;
    mouseMovementY: number = 0;
    scrollWheelDelta: number = 0;
    speedMultiplier: number = 1;
    phi: number = 0;
    theta: number = 0;
    rotation: THREE.Quaternion = new THREE.Quaternion();
    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.initialize();
    }
    private initialize() {
        this.initializeKeyboardEvents();
        this.initializeMouseEvents();
    }

    private initializeKeyboardEvents() {
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.ctrlKey == true) return;
            this.keysPressed[event.code] = true;
        });
        document.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.ctrlKey == true) return;
            this.keysPressed[event.code] = false;
        })
    }

    private initializeMouseEvents() {
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            //console.log('Right-click detected, context menu prevented');
        });
        document.addEventListener("mousedown", (event: MouseEvent) => {
            //event.preventDefault();
            if (event.button === 2) {

                this.rightMouseButtonPressed = true;
            }
            if (event.button == 1) {
                this.middleMouseButtonPressed = true;
            }
        })
        document.addEventListener("mouseup", (event: MouseEvent) => {
            //event.preventDefault();
            if (event.button === 2) {
                this.rightMouseButtonPressed = false;
            }
            if (event.button == 1) {
                this.middleMouseButtonPressed = false;
            }
        });
        document.addEventListener("mousemove", (event: MouseEvent) => {
            this.mouseMovementX = event.movementX;
            this.mouseMovementY = event.movementY;
        });
        document.addEventListener("wheel", (event: WheelEvent) => {
            if (this.rightMouseButtonPressed) {
                this.speedMultiplier += -event.deltaY / 500;
                this.speedMultiplier = Math.max(this.speedMultiplier, 0.1);
                this.speedMultiplier = Math.min(this.speedMultiplier, 20);
                this.updateSpeedMultiplierUI();
            } else {
                this.scrollWheelDelta = event.deltaY;
            }
            
        })
    }

    private keyboardMoveUpdate(deltaTime: number) {
        const speed = FORWARD_MOVEMENT_SPEED * this.speedMultiplier * deltaTime;

        // — WS (with pitch) —
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir).normalize();
        const forward3 = lookDir.clone();
        const back3 = lookDir.clone().negate();

        // — AD (yaw‐only) — 
        // build a yaw‑only quaternion
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        euler.x = 0;  // drop pitch
        euler.z = 0;  // drop roll
        const yawQuat = new THREE.Quaternion().setFromEuler(euler);

        // local right in X axis, rotated by yawQuat
        const right2d = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQuat).normalize();
        const left2d = right2d.clone().negate();

        // movement
        if (this.keysPressed["KeyW"]) {
            this.camera.position.add(forward3.multiplyScalar(speed));
        }
        if (this.keysPressed["KeyS"]) {
            this.camera.position.add(back3.multiplyScalar(speed));
        }
        if (this.keysPressed["KeyA"]) {
            this.camera.position.add(left2d.multiplyScalar(speed));
        }
        if (this.keysPressed["KeyD"]) {
            this.camera.position.add(right2d.multiplyScalar(speed));
        }
    }
    private wheelMovementUpdate(deltaTime: number) {


        const speed = FORWARD_MOVEMENT_SPEED * this.speedMultiplier * WM_FM_RATIO * deltaTime;

        // — WS (with pitch) —
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir).normalize();
        const forward3 = lookDir.clone();
        const back3 = lookDir.clone().negate();

        if (this.scrollWheelDelta < 0) {
            this.camera.position.add(forward3.multiplyScalar(speed));
        }
        if (this.scrollWheelDelta > 0) {
            this.camera.position.add(back3.multiplyScalar(speed));
        }

        this.scrollWheelDelta = 0;
    }
    private mouseRotateUpdate(deltaTime: number) {
        if (!this.rightMouseButtonPressed) return;

        const xh = this.mouseMovementX / innerWidth;
        const yh = this.mouseMovementY / innerHeight;

        this.phi += -xh * ROTATION_SPEED * deltaTime;
        this.theta = clamp(this.theta + -yh * ROTATION_SPEED * deltaTime, -Math.PI / 2, Math.PI / 2);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation.copy(q);
        this.camera.rotation.setFromQuaternion(q);


    }

    private updateSpeedMultiplierUI() {
        const a: HTMLSpanElement | null = document.querySelector("#speed");
        if (a) {
            a.innerText = `${(Math.round(this.speedMultiplier * 10) / 10).toString()}x`;
        }
    }

    private mousePanUpdate(deltaTime: number) {
        if (!this.middleMouseButtonPressed) {
            document.body.style.cursor = "default";
            return;
        }
        document.body.style.cursor = "move";

        const speed = FORWARD_MOVEMENT_SPEED * WM_FM_RATIO * MP_WM_RATIO * this.speedMultiplier * deltaTime;

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward).normalize();

        const worldUp = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        // Get distance from camera to target point (forward direction)
        const target = new THREE.Vector3();
        target.copy(this.camera.position).add(forward);
        const distance = this.camera.position.distanceTo(target);

        // Calculate vertical field of view in radians
        const fov = THREE.MathUtils.degToRad(this.camera.fov);

        // Calculate height of visible area at the distance of the target
        const viewportHeight = 2 * distance * Math.tan(fov / 2);

        // Convert mouse movement (pixels) to normalized device coordinates [-1,1]
        const ndcY = (this.mouseMovementY / window.innerHeight) * viewportHeight;
        const ndcX = (this.mouseMovementX / window.innerWidth) * viewportHeight * (window.innerWidth / window.innerHeight);

        // Multiply by -1 on X to match your original direction
        const offset = new THREE.Vector3()
            .addScaledVector(right, -ndcX)
            .addScaledVector(up, ndcY);

        this.camera.position.add(offset.multiplyScalar(speed));
        target.add(offset);
    }

    beforeRender(deltaTime: number) {
        this.keyboardMoveUpdate(deltaTime);
        this.wheelMovementUpdate(deltaTime);
        this.mousePanUpdate(deltaTime);
        this.mouseRotateUpdate(deltaTime);

        this.mouseMovementX = 0;
        this.mouseMovementY = 0;
    }
}