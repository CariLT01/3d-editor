import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
interface ExportedData {
    mesh: any;          // Replace `any` with the actual type returned by toJSON()
    history: ExportedData[];
}

export class Solid {

    mesh?: THREE.Mesh;
    group?: THREE.Group;
    history: Solid[] = [];
    name: string = "Solid";

    constructor(mesh?: THREE.Mesh, name?: string) {

        this.mesh = mesh;

        this.group = new THREE.Group();

        const box = new THREE.Box3().setFromObject(this.mesh as THREE.Mesh);
        const size = new THREE.Vector3()
        box.getSize(size);



        this.group.add(this.mesh as THREE.Mesh);

        if (name) { this.name = name }

    }
    setHistory(history: Solid[]) {
        this.history = history;
    }

    fromGeometry(geometry: THREE.BufferGeometry, material: THREE.Material) {
        this.mesh = new THREE.Mesh(geometry, material);
        this.group = new THREE.Group();

        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3()
        box.getSize(size);



        this.group.add(this.mesh);
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
    getGroup() {
        return this.getMesh();
    }
    clone() {
        const n = new Solid(this.mesh);
        n.setHistory(this.history);

        return n;
    }
    fullClone() {
        // Deep clone: rebuild the mesh from its JSON representation
        const loader = new THREE.ObjectLoader();
        const meshClone = loader.parse(this.getMesh().toJSON()) as THREE.Mesh;
        meshClone.uuid = THREE.MathUtils.generateUUID();
        const n = new Solid(meshClone);
        n.setHistory(this.history.map(h => h.fullClone()));
        return n;
    }
    dispose() {
        //this.getMesh().geometry.dispose();
    }

    setHistoryAndParse(history: ExportedData[]) {
        const l = new THREE.ObjectLoader();
        this.history = [];
        for (const h of history) {
            const mesh = l.parse(h.mesh) as THREE.Mesh;
            const solid = new Solid(mesh);
            solid.setHistoryAndParse(h.history);
            this.history.push(solid);
        }
    }

    export(): ExportedData {

        const exportedHistory = [];

        for (const h of this.history) {
            exportedHistory.push(h.export())
        }

        return {
            mesh: this.getMesh().toJSON(),
            history: exportedHistory
        }

    }

}