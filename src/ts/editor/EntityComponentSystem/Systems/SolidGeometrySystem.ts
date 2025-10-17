import { Mesh, Scene } from "three";
import { Entity } from "../EntityComponentSystemEntity";
import { SolidGeometryComponent } from "../EntityComponentSystemComponents";

export class SolidGeometrySystem {

    private trackedEntities: Entity[] = [];
    private trackedMeshes: Map<Entity, Mesh> = new Map();
    private scene: Scene;
    private selectEntities: Set<Entity> = new Set();
    

    constructor(scene: Scene) {
        this.scene = scene;
    }

    

    trackNewMesh(entity: Entity) {
        if (entity.components.get(SolidGeometryComponent) == undefined) {
            throw new Error("Attempt to track new mesh where entity has no solid geometry component");
        }
        const comp = entity.components.get(SolidGeometryComponent) as SolidGeometryComponent;

        // Add it to the scene

        this.scene.add(comp.mesh);

        this.trackedMeshes.set(entity, comp.mesh);
    }

    untrackMesh(entity: Entity) {
        if (entity.components.get(SolidGeometryComponent) == undefined) {
            throw new Error("Attempt to track new mesh where entity has no solid geometry component");
        }

        const comp = entity.components.get(SolidGeometryComponent) as SolidGeometryComponent;
        
        // Remove it from the scene

        this.scene.remove(comp.mesh);

        this.trackedMeshes.delete(entity);
    }

    addEntity(entity: Entity) {

        if (entity.components.get(SolidGeometryComponent) == undefined) {
            throw Error("Attempt to give SolidGeometrySystem an entity without SolidGeometryComponent");
        }

        console.log("Tracking new entity!");

        this.trackedEntities.push(entity);

        // Track mesh

        this.trackNewMesh(entity);
    }

    removeEntity(entity: Entity) {
        const index = this.trackedEntities.indexOf(entity);
        if (index == -1) throw Error("Failed to remove, no index");
        this.trackedEntities.splice(index, 1); 
        // Untrack mesh

        this.untrackMesh(entity);
    }

    // Callback for when component changed
    changedEntity(entity: Entity) {
        // Untrack the old mesh (if it exists)

        this.trackedMeshes.delete(entity);

        // Track the new mesh
        const component: SolidGeometryComponent = entity.components.get(SolidGeometryComponent);
        this.trackedMeshes.set(entity, component.mesh);
    }

    selectEntity(entity: Entity) {
        this.selectEntities.add(entity);
    }
    deselectEntity(entity: Entity) {
        this.selectEntities.delete(entity);
    }

    toggleSelectionEntity(entity: Entity) {
        if (this.selectEntities.has(entity)) {
            this.selectEntities.delete(entity);
        } else {
            this.selectEntities.add(entity);
        }
    }


}