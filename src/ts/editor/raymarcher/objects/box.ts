import * as THREE from 'three'

export class Box {
    size: THREE.Vector3;
    position: THREE.Vector3;
    constructor(size: THREE.Vector3, position: THREE.Vector3) {
        this.size = size;
        this.position = position;
    }
}