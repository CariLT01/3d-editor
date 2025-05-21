import * as THREE from 'three'

export class Box {
    size: THREE.Vector3;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    morph: number;
    threeJSobject: THREE.Mesh;
    constructor(scene: THREE.Scene,size: THREE.Vector3, position: THREE.Vector3, quaternion: THREE.Quaternion, morph: number) {
        this.size = size.clone();
        this.position = position.clone();
        this.quaternion = quaternion.clone();
        this.morph = morph;

        this.threeJSobject = new THREE.Mesh(new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z), new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0
        }))
        this.threeJSobject.position.copy(position);
        this.threeJSobject.quaternion.copy(quaternion);
        scene.add(this.threeJSobject);
    }
}