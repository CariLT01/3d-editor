import * as THREE from 'three'

export class Sphere {
    radius: number;
    position: THREE.Vector3;
    constructor(radius: number, position: THREE.Vector3) {
        this.radius = radius;
        this.position = position;
    }
}