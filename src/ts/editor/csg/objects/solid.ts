import * as THREE from 'three';
import { SUBTRACTION, INTERSECTION, ADDITION, Brush, Evaluator, CSGOperation } from 'three-bvh-csg';
import { CSG } from 'three-csg-ts';
interface ExportedData {
    mesh: any;          // Replace `any` with the actual type returned by toJSON()
    history: ExportedData[];
    properties: { [key: string]: { values: any[], type: string } };
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
    properties: { [key: string]: { values: any[], type: string } } = {
        position: { values: [0, 0, 0], type: "Vector3" },
        scale: { values: [1, 1, 1], type: "Vector3" },
        rotation: { values: [0, 0, 0], type: "Vector3" },
        color: { values: [255, 255, 255], type: "Color" },
        opacity: { values: [1], type: "Number" },
        lightDistance: { values: [0], type: "Number" },
        lightColor: { values: [255, 255, 255], type: "Color" },
        lightIntensity: { values: [0], type: "Number" },
        lightDecay: { values: [1], type: "Number" },
        
    }
    light!: THREE.PointLight;

    constructor(mesh?: THREE.Mesh, name?: string) {
        if (name) { this.name = name }
        this.mesh = mesh;
        if (!mesh) return;
        this.group = new THREE.Group();

        const box = new THREE.Box3().setFromObject(this.mesh as THREE.Mesh);
        const size = new THREE.Vector3()
        box.getSize(size);

        // Set properties
        this.properties.position = { values: [mesh.position.x, mesh.position.y, mesh.position.z], type: "Vector3" }
        this.properties.scale = { values: [mesh.scale.x, mesh.scale.y, mesh.scale.z], type: "Vector3" }
        const color = ((this.mesh as THREE.Mesh).material as THREE.MeshPhysicalMaterial).color;
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);

        if (!this.mesh) return; // <-- Looks like TypeScript needs a reminder
        const euler = this.mesh.rotation; // THREE.Euler in radians

        const xDeg = THREE.MathUtils.radToDeg(euler.x);
        const yDeg = THREE.MathUtils.radToDeg(euler.y);
        const zDeg = THREE.MathUtils.radToDeg(euler.z);

        this.properties.color = { values: [r, g, b], type: "Color" };
        this.properties.rotation = { values: [xDeg, yDeg, zDeg], type: "Vector3" };
        this.properties.opacity = { values: [(this.mesh.material as THREE.MeshPhysicalMaterial).opacity], type: "Number" };


        this.group.add(this.mesh as THREE.Mesh);
        this.light = new THREE.PointLight(0xffffff, 1, 10, 2);
        //this.mesh.add(this.light);



    }
    setHistory(history: Solid[]) {
        this.history = history;
    }
    setProperties(newProperties: { [key: string]: { values: any[], type: string } }) {
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

        const color = (this.mesh.material as THREE.MeshPhysicalMaterial).color;
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);

        this.properties.color = {
            values: [r, g, b],
            type: "Color"
        }

        if (!this.mesh) return; // <-- Looks like TypeScript needs a reminder
        const euler = this.mesh.rotation; // THREE.Euler in radians

        const xDeg = THREE.MathUtils.radToDeg(euler.x);
        const yDeg = THREE.MathUtils.radToDeg(euler.y);
        const zDeg = THREE.MathUtils.radToDeg(euler.z);

        this.properties.rotation = {
            values: [xDeg, yDeg, zDeg],
            type: "Vector3"
        };

        this.light.color.set(this.properties.lightColor.values[0] / 255, this.properties.lightColor.values[1] / 255, this.properties.lightColor.values[2] / 255);
        this.light.distance = this.properties.lightDistance.values[0];
        this.light.intensity = this.properties.lightIntensity.values[0];
        this.light.decay = this.properties.lightDecay.values[0];
        const m = this.mesh.material as THREE.MeshPhysicalMaterial;
        if (this.properties.opacity.values[0] < 1) {
            console.log("Setting transparent = true");
            m.transparent = true;
            m.depthWrite = true;
        } else {
            console.log("Setting transparent = false");
            m.transparent = false;
        }
        m.opacity = this.properties.opacity.values[0];
        m.needsUpdate = true;
        this.determineLightState();
    }
    private checkLightExistence(shouldExist: boolean) {
        if (!this.mesh) return;
        if (shouldExist) {
            if (this.mesh.children.indexOf(this.light) == -1) {
                console.log("Adding light to mesh");
                this.mesh.add(this.light);
            } else {
                console.warn("Not adding light, as it already exists");
            }
        } else {
            if (this.mesh.children.indexOf(this.light) != -1) {
                console.log("Removing light from mesh");
                this.mesh.remove(this.light);
            } else {
                console.warn("Not removing light, as it does not exist");
            }
        }
    }
    private determineLightState() {
        if (this.properties.lightIntensity.values[0] > 0 && this.properties.lightDistance.values[0] > 0) {
            console.log("Light should exist, adding to mesh");
            this.checkLightExistence(true);

        } else {
            console.log("Light should not exist: ", this.properties.lightIntensity.values[0], this.properties.lightDistance.values[0])
            this.checkLightExistence(false);
        }
    }
    updatePropertyItem(key: string, values: any[]) {
        console.log("Update key: ", key, " to: ", values);
        this.properties[key].values = values;
        // Special cases
        if (!this.mesh) return;
        if (key == "position") {
            this.mesh.position.set(values[0], values[1], values[2]);
        } else if (key == "scale") {
            this.mesh.scale.set(values[0], values[1], values[2]);
        }
        if (key == "color") {
            (this.mesh.material as THREE.MeshPhysicalMaterial).color.setRGB(
                values[0] / 255,
                values[1] / 255,
                values[2] / 255
            );
        }
        if (key == "rotation") {
            const [xDeg, yDeg, zDeg] = [this.properties.rotation.values[0], this.properties.rotation.values[1], this.properties.rotation.values[2]]; // example degrees

            const euler = new THREE.Euler(
                THREE.MathUtils.degToRad(xDeg),
                THREE.MathUtils.degToRad(yDeg),
                THREE.MathUtils.degToRad(zDeg)
            );

            this.mesh.rotation.copy(euler);
        }
        if (key == "lightIntensity") {
            this.light.intensity = this.properties.lightIntensity.values[0];
            this.determineLightState();
        }
        if (key == "lightDistance") {
            this.light.distance = this.properties.lightDistance.values[0];
            this.determineLightState();
        }
        if (key == "lightColor") {
            this.light.color.set(this.properties.lightColor.values[0] / 255, this.properties.lightColor.values[1] / 255, this.properties.lightColor.values[2] / 255);
            this.determineLightState();
        }
        if (key == "lightDecay") {
            this.light.decay = this.properties.lightDecay.values[0];
        }
        if (key == "opacity") {
            const m = this.mesh.material as THREE.MeshPhysicalMaterial;
            if (this.properties.opacity.values[0] < 1) {
                console.log("Set transparent = true");
                m.depthWrite = true;
                m.transparent = true;
            } else {
                console.log("Set transparent = false");
                m.transparent = false;
            }
            m.opacity = this.properties.opacity.values[0];
            m.needsUpdate = true;
        }
    }

    fromGeometry(geometry: THREE.BufferGeometry, material: THREE.Material) {
        this.mesh = new THREE.Mesh(geometry, material);
        this.group = new THREE.Group();

        // reset any transforms
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);

        // record identity in properties
        this.properties.position = { values: [0, 0, 0], type: "Vector3" };
        this.properties.scale = { values: [1, 1, 1], type: "Vector3" };

        this.group.add(this.mesh);

        this.light = new THREE.PointLight(0xffffff, 1, 60, 2);
        //this.mesh.add(this.light);
    }

    private FastCSG_Operation(b: Solid, op: CSGOperation) {
        // make sure world transforms are up to date
        this.getMesh().updateMatrixWorld(true);
        b.getMesh().updateMatrixWorld(true);

        // 1) clone & bake transforms into geometry
        const geomA = this.getMesh().geometry.clone();
        ensureUVs(geomA);
        geomA.applyMatrix4(this.getMesh().matrixWorld);

        const geomB = b.getMesh().geometry.clone();
        ensureUVs(geomB);
        geomB.applyMatrix4(b.getMesh().matrixWorld);

        // create brushes in *local* (already world) space
        const brush1 = new Brush(geomA);
        const brush2 = new Brush(geomB);

        const resultBrush = new Evaluator().evaluate(brush1, brush2, op);

        // 2) build the new Solid without any extra transform
        const resultGeom = resultBrush.geometry;
        resultGeom.computeVertexNormals();  // optional, but often useful
        const n = new Solid();
        n.fromGeometry(resultGeom, this.getMesh().material as THREE.Material);

        // copy history, etc.
        n.setHistory([this.clone(), b.clone()]);
        return n;
    }


    private StableCSG_Operation(b: Solid, op: "ADdition" | "Subtraction" | "Intersection") {
        // 1) ensure world matrices are up to date
        this.getMesh().updateMatrixWorld(true);
        b.getMesh().updateMatrixWorld(true);

        // 2) clone & bake transforms
        const geomA = (this.getMesh().geometry as THREE.BufferGeometry).clone();
        ensureUVs(geomA);
        geomA.applyMatrix4(this.getMesh().matrixWorld);

        const geomB = (b.getMesh().geometry as THREE.BufferGeometry).clone();
        ensureUVs(geomB);
        geomB.applyMatrix4(b.getMesh().matrixWorld);

        // 3) build temporary meshes in world‐space
        const meshA = new THREE.Mesh(geomA, this.getMesh().material);
        const meshB = new THREE.Mesh(geomB, b.getMesh().material);

        // 4) perform CSG
        let resultMesh: THREE.Mesh;
        if (op === "ADdition") {
            resultMesh = CSG.union(meshA, meshB);
        } else if (op === "Subtraction") {
            resultMesh = CSG.subtract(meshA, meshB);
        } else {
            resultMesh = CSG.intersect(meshA, meshB);
        }

        // 5) reset result’s transform (all baked into geometry)
        resultMesh.position.set(0, 0, 0);
        resultMesh.rotation.set(0, 0, 0);
        resultMesh.scale.set(1, 1, 1);

        // 6) wrap in Solid, preserve history
        const n = new Solid(resultMesh);
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
        const clonedProperties = JSON.parse(JSON.stringify(this.properties));
        n.properties = clonedProperties;
        n.updateProperties();

        return n;
    }
    fullClone() {
        // Deep clone: rebuild the mesh from its JSON representation
        const loader = new THREE.ObjectLoader();
        const meshClone = loader.parse(this.getMesh().toJSON()) as THREE.Mesh;
        meshClone.uuid = THREE.MathUtils.generateUUID();
        const n = new Solid(meshClone);
        n.setHistory(this.history.map(h => h.fullClone()));
        const clonedProperties = JSON.parse(JSON.stringify(this.properties));
        n.properties = clonedProperties;
        n.updateProperties();
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
            history: exportedHistory,
            properties: this.properties
        }

    }

}