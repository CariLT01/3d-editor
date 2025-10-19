import { Camera, Group, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { Entity } from "./EntityComponentSystem/EntityComponentSystemEntity";
import { EventBus, EventType } from "./EventBus";
import { SolidGeometryComponent } from "./EntityComponentSystem/EntityComponentSystemComponents";

export class SelectionManager {

    private trackedEntities: Entity[] = [];
    private selectedEntities: Entity[] = [];
    private eventBus: EventBus;
    private mousePosition: Vector2 = new Vector2(0, 0);
    private selectionChanged: boolean = false;
    // This group will serve to hold selected Object3Ds so they can be moved and transformed together by the transform controls.
    // Selected objects will temporarily be parented to the selectionGroup.
    // They will be reparented back to the scene after selection is complete.
    private selectionGroup!: Group;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initialize();
    }

    private _mouseCoordsToNDC(coord: Vector2) {
        const x = (coord.x / window.innerWidth) * 2 - 1;
        const y = -(coord.y / window.innerHeight) * 2 + 1;
        return new Vector2(x, y);
    }

    private _handleEntityAdded(entity: Entity) {
        console.log("A new entity has been added");
        this.trackedEntities.push(entity);
    }

    private _handleEntityRemoved(entity: Entity) {
        const index = this.selectedEntities.indexOf(entity);
        if (index == -1) return;
        this.selectedEntities.splice(index, 1);

        this._updateSelection();
    }

    private _getAllSelectableEntities() {

        const selectableEntities = [];

        for (const entity of this.trackedEntities) {
            if (entity.components.get(SolidGeometryComponent) != null) {
                selectableEntities.push(entity);
            }
        }

        return selectableEntities;

    }

    private _getObject3DListFromEntities(entitiesList: Entity[]) {
        const object3Dlist: Object3D[] = [];
        for (const entity of entitiesList) {
            const component = entity.getComponent(SolidGeometryComponent);
            if (!component) continue;
            object3Dlist.push(component.mesh);
        }

        return object3Dlist;
    }

    private _toggleSelection(target: Entity) {
        console.log("Toggling selection for target entity");

        const component = target.components.get(SolidGeometryComponent) as SolidGeometryComponent;
        const mesh = component.mesh;
        const index = this.selectedEntities.indexOf(target);
        if (index != -1) {
            console.log("Removing entity from select");
            this.selectedEntities.splice(index, 1);
            this.selectionChanged = true;

            this.eventBus.postEvent(EventType.RENDERER_SCENE_ATTACH, mesh);
            
            
            this.eventBus.postEvent(EventType.SELECTION_MANAGER_SELECTION_CHANGED, this.selectedEntities);

        } else {
            console.log("Adding entity to select");
            this.selectedEntities.push(target);
            this.selectionChanged = true;

            this.eventBus.postEvent(EventType.SELECTION_MANAGER_SELECTION_CHANGED, this.selectedEntities);
            this.eventBus.postEvent(EventType.RENDERER_SCENE_REMOVE, mesh);
            this.selectionGroup.attach(mesh);
            
        }
    }

    private _updateTransformControls() {
        if (this.selectedEntities.length > 0) {
            this.eventBus.postEvent(EventType.TRANSFORM_CONTROLS_ATTACH_GROUP, this.selectionGroup);
        } else {
            this.eventBus.postEvent(EventType.TRANSFORM_CONTROLS_DETACH_GROUP);
            //this.selectionGroup.position.set(0, 0, 0);
        }

        // Get avg
        console.log("There are: ", this.selectedEntities.length, " entities selected");
        if (this.selectedEntities.length <= 0) return;
        const averagePosition: Vector3 = new Vector3(0, 0, 0);
        for (const entity of this.selectedEntities) {
            const comp = entity.components.get(SolidGeometryComponent) as SolidGeometryComponent;
            if (!comp) continue;
            const w = new Vector3();
            comp.mesh.getWorldPosition(w);
            averagePosition.add(w);
        }
        averagePosition.divideScalar(this.selectedEntities.length);

        console.log("Average position: ", averagePosition);

            // 2. Calculate the offset between the group's old position and the new average
        const offset = averagePosition.clone().sub(this.selectionGroup.position);

        // 3. Apply the opposite of the offset to all children's local positions
        this.selectionGroup.children.forEach(child => {
            child.position.sub(offset);
        });

        this.selectionGroup.position.copy(averagePosition);
    }

    private _getEntityWithObject3D(entitiesList: Entity[], targetObject: Object3D) {
        for (const entity of entitiesList) {
            const component = entity.components.get(SolidGeometryComponent);
            if (!component) continue;
            if (component.mesh == targetObject) return entity;
        }
        return null;
    }

    private _convertEntityToObject3D(entitiesList: Entity[]) {
        const object3Ds: Object3D[] = [];
        for (const entity of entitiesList) {
            const component = entity.components.get(SolidGeometryComponent);
            if (!component) continue;
            object3Ds.push(component.mesh);
        }
        return object3Ds;
    }

    private _updateSelection() {

        // Process removed entities
        let removedEntities: boolean = false;
        for (const entity of this.selectedEntities) {
            const index = this.trackedEntities.indexOf(entity);
            if (index == -1) {
                this._toggleSelection(entity);
                removedEntities = true;
            }
        }

        if (removedEntities) {
            this._updateSelectedEntitiesOutline();
            this._updateTransformControls();
        }

        // Raycast

        const camera = this.eventBus.inquireSubscriberUniqueEvent("getCamera") as Camera;
        const raycaster = new Raycaster();
        const NDCCoordinates = this._mouseCoordsToNDC(this.mousePosition);

        console.log("Set mousePosition to: ", NDCCoordinates, " and camera is: ", camera);

        raycaster.setFromCamera(NDCCoordinates, camera);

        const selectableEntities = this._getAllSelectableEntities();
        console.log("There are ", selectableEntities.length, "selectable entities");

        const object3Dlist = this._getObject3DListFromEntities(selectableEntities);
        console.log("Converted to ", object3Dlist.length, " Object3D instances");
        const intersects = raycaster.intersectObjects(object3Dlist);

        if (intersects.length <= 0) {
            console.log("There are no intersections");
            return;
        };
        const intersection = intersects[0];

        const object = intersection.object;
        const targetEntity = this._getEntityWithObject3D(selectableEntities, object);
        if (!targetEntity) throw new Error("Entity with target object3D not found");
        this._toggleSelection(targetEntity);
        this._updateSelectedEntitiesOutline();
        this._updateTransformControls();
        
    }

    private _updateSelectedEntitiesOutline() {
        //EventType.RENDERER_SET_OUTLINED_OBJECTS

        const selectedEntitiesObject3D = this._convertEntityToObject3D(this.selectedEntities);
        
        this.eventBus.postEvent(EventType.RENDERER_SET_OUTLINED_OBJECTS, selectedEntitiesObject3D);
    }

    private _onRender() {

    }

    private _initialize() {
        this._initializeEvents();
        this._initializeGroup();
    }
    private _initializeGroup() {
        this.selectionGroup = new Group();
        this.eventBus.postEvent(EventType.RENDERER_SCENE_ADD, this.selectionGroup);
    }

    private _initializeEvents() {
        this.eventBus.subscribeEvent(EventType.ECS_ENTITY_ADDED, (entity: Entity) => {
            this._handleEntityAdded(entity);
        });
        this.eventBus.subscribeEvent(EventType.ECS_ENTITY_REMOVED, (entity: Entity) => {
            this._handleEntityRemoved(entity);
        });
        this.eventBus.subscribeEvent(EventType.RENDERER_ON_RENDER, () => {
            this._onRender();
        });

        window.addEventListener("mousemove", (event) => {
            console.log("Mouse moved!");
            this.mousePosition.set(event.pageX, event.pageY);
        });

        window.addEventListener("mousedown", (event) => {
            console.log("Mouse clicked!");
            this._updateSelection();
        });
    }

    getSelectedEntities() {
        return this.selectedEntities;
    }
}