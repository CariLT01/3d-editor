import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, ADDITION, Brush, Evaluator, CSGOperation } from 'three-bvh-csg';
import { CSG } from 'three-csg-ts';
interface ExportedData {
    mesh: any;          // Replace `any` with the actual type returned by toJSON()
    history: ExportedData[];
}

function ensureUVs(geom: THREE.BufferGeometry) {
  if (!geom.attributes.uv) {
    const count = geom.attributes.position.count;
    const array = new Float32Array(count * 2); // all zeros
    geom.setAttribute('uv', new THREE.BufferAttribute(array, 2));
  }
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

    private FastCSG_Operation(b: Solid, op: CSGOperation) {
        this.getMesh().updateMatrixWorld(true);
        b.getMesh().updateMatrixWorld(true);

        const clonedGeometry = this.getMesh().geometry.clone();
        ensureUVs(clonedGeometry);
        const clonedGeometry2 = b.getMesh().geometry.clone();
        ensureUVs(clonedGeometry2);

        const brush1 = new Brush(clonedGeometry);
        brush1.setRotationFromQuaternion(this.getMesh().quaternion);
        brush1.position.copy(this.getMesh().position);
        brush1.scale.copy(this.getMesh().scale);
        brush1.updateMatrixWorld();

        const brush2 = new Brush(clonedGeometry2);
        brush2.setRotationFromQuaternion(b.getMesh().quaternion);
        brush2.position.copy(b.getMesh().position);
        brush2.scale.copy(b.getMesh().scale);
        brush2.updateMatrixWorld();

        const evaluator = new Evaluator();
        const result = evaluator.evaluate(brush1, brush2, op);
        
        

        const n = new Solid();
        n.fromGeometry(result.geometry, this.getMesh().material as THREE.Material);
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }

    private StableCSG_Operation(b: Solid, op: "ADdition" | "Subtraction" | "Intersection") {
        this.getMesh().updateMatrix();
        b.getMesh().updateMatrix();
        let mesh;
        if (op == "ADdition") {
            mesh = CSG.union(this.getMesh(), b.getMesh());
        } else if (op == "Subtraction") {
            mesh = CSG.subtract(this.getMesh(), b.getMesh());
        } else if (op == "Intersection") {
            mesh = CSG.intersect(this.getMesh(), b.getMesh())
        }
        
        const n = new Solid(mesh);
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }

    private CSG_operation(b: Solid, op: CSGOperation, use_fast: boolean) {
        if (use_fast) {
            return this.FastCSG_Operation(b, op);
        } else {

            let mode: "ADdition" | "Subtraction" | "Intersection";
            if (op == ADDITION) {
                mode = "ADdition"
            } else if (op == SUBTRACTION) {
                mode = "Subtraction"
            } else if (op == INTERSECTION) {
                mode = "Intersection"
            } else {
                throw new Error(`Unknown operation: ${op}`);
            }

            return this.StableCSG_Operation(b, mode)
        }
    }

    CSG_subtract(b: Solid, use_fast: boolean) {
        return this.CSG_operation(b, SUBTRACTION, use_fast);
    }
    CSG_union(b: Solid, use_fast: boolean) {
        return this.CSG_operation(b, ADDITION, use_fast);
    }
    CSG_intersect(b: Solid, use_fast: boolean) {
        return this.CSG_operation(b, INTERSECTION, use_fast);
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