import * as THREE from 'three';

const FORWARD_MOVEMENT_SPEED = 0.1;
const ROTATION_SPEED = 6;
const WHEEL_MOVEMENT_SPEED = 1.3;
const MOUSE_PAN_SPEED = 0.02;

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
            this.keysPressed[event.code] = true;
        });
        document.addEventListener("keyup", (event: KeyboardEvent) => {
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
            this.scrollWheelDelta = event.deltaY;
        })
    }

    private keyboardMoveUpdate() {
        const speed = FORWARD_MOVEMENT_SPEED;

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
    private wheelMovementUpdate() {

        const speed = WHEEL_MOVEMENT_SPEED;

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
    private mouseRotateUpdate() {
        if (!this.rightMouseButtonPressed) return;

        const xh = this.mouseMovementX / innerWidth;
        const yh = this.mouseMovementY / innerHeight;

        this.phi += -xh * ROTATION_SPEED;
        this.theta = clamp(this.theta + -yh * ROTATION_SPEED, -Math.PI / 2, Math.PI / 2);

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
    private mousePanUpdate() {
        if (this.middleMouseButtonPressed == false) {
            return;
        }

        // 1. get camera forward
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward).normalize();

        // 2. compute right = forward × worldUp
        const worldUp = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

        // 3. compute up = right × forward   ← this now lies in the view‑plane
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        // 4. build pan offset
        const offset = new THREE.Vector3()
            .addScaledVector(right, -this.mouseMovementX * MOUSE_PAN_SPEED)
            .addScaledVector(up, this.mouseMovementY * MOUSE_PAN_SPEED);

        // 5. apply to both position and target (so lookAt stays fixed)
        const target = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        target.copy(this.camera.position).add(forward);

        this.camera.position.add(offset);
        target.add(offset);
    }

    beforeRender() {
        this.keyboardMoveUpdate();
        this.wheelMovementUpdate();
        this.mousePanUpdate();
        this.mouseRotateUpdate();

        this.mouseMovementX = 0;
        this.mouseMovementY = 0;
    }
}