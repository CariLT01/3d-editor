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
    properties: {[key: string]: {values: any[], type: string}} = {
        position: {values: [0, 0, 0], type: "Vector3"},
        scale: {values: [1, 1, 1], type: "Vector3"}
    }

    constructor(mesh?: THREE.Mesh, name?: string) {
        if (name) { this.name = name }
        this.mesh = mesh;
        if (!mesh) return;
        this.group = new THREE.Group();

        const box = new THREE.Box3().setFromObject(this.mesh as THREE.Mesh);
        const size = new THREE.Vector3()
        box.getSize(size);

        // Set properties
        this.properties.position = {values: [mesh.position.x, mesh.position.y, mesh.position.z], type: "Vector3"}
        this.properties.scale = {values: [mesh.scale.x, mesh.scale.y, mesh.scale.z], type: "Vector3"}

        


        this.group.add(this.mesh as THREE.Mesh);

        

    }
    setHistory(history: Solid[]) {
        this.history = history;
    }
    setProperties(newProperties: {[key: string]: {values: any[], type: string}}) {
        if (!this.mesh) return;
        const position = newProperties.position;
        const x = position.values[0];
        const y = position.values[1];
        const z = position.values[2];
        this.mesh.position.set(x, y, z);
        const scale = newProperties.scale;
        const sx = scale.values[0];
        const sy = scale.values[1];
        const sz = scale.values[2];
        this.mesh.scale.set(sx, sy, sz);       
    }
    updateProperties() {
        if (!this.mesh) return;
        this.properties.position = {
            values: [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z],
            type: "Vector3"
        };
        this.properties.scale = {
            values: [this.mesh.scale.x, this.mesh.scale.y, this.mesh.scale.z],
            type: "Vector3"
        };
    }
    updatePropertyItem(key: string, values: any[]) {
        this.properties[key].values = values;
        // Special cases
        if (!this.mesh) return;
        if (key == "position") {
            this.mesh.position.set(values[0], values[1], values[2]);
        } else if (key == "scale") {
            this.mesh.scale.set(values[0], values[1], values[2]);
        }
    }

    fromGeometry(geometry: THREE.BufferGeometry, material: THREE.Material) {
        this.mesh = new THREE.Mesh(geometry, material);
        this.group = new THREE.Group();

        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3()
        box.getSize(size);

        // Set properties
        const mesh = this.mesh;
        this.properties.position = {values: [mesh.position.x, mesh.position.y, mesh.position.z], type: "Vector3"};
        this.properties.scale = {values: [mesh.scale.x, mesh.scale.y, mesh.scale.z], type: "Vector3"};

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