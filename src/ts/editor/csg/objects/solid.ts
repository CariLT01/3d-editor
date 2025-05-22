import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
export class Solid {

    mesh?: THREE.Mesh;
    history: Solid[] = [];

    constructor(mesh?: THREE.Mesh) {

        this.mesh = mesh;

    }
    setHistory(history: Solid[]) {
        this.history = history;
    }

    fromGeometry(geometry: THREE.BufferGeometry, material: THREE.Material) {
        this.mesh = new THREE.Mesh(geometry, material);
    }

    CSG_subtract(b: Solid) {
        this.getMesh().updateMatrix();
        b.getMesh().updateMatrix();
        const n = new Solid(CSG.subtract(this.getMesh(), b.getMesh()));
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }
    CSG_union(b: Solid) {
        this.getMesh().updateMatrix();
        b.getMesh().updateMatrix();
        const n = new Solid(CSG.union(this.getMesh(), b.getMesh()));
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }
    CSG_intersect(b: Solid) {
        this.getMesh().updateMatrix();
        b.getMesh().updateMatrix();
        const n = new Solid(CSG.intersect(this.getMesh(), b.getMesh()));
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }
    getMesh() {
        if (this.mesh) {
            return this.mesh
        } else {
            throw new Error("Attempt to get mesh without mesh set");
        }
    }
    clone() {
        const n = new Solid(this.mesh);
        n.setHistory(this.history);

        return n;
    }
    fullClone() {
        const n = new Solid(this.getMesh().clone());
        n.setHistory(this.history);
        return n;
    }
    dispose() {
        //this.getMesh().geometry.dispose();
    }

}