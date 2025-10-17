import { Camera, Raycaster, Vector2 } from "three";
import { Entity } from "./EntityComponentSystem/EntityComponentSystemEntity";
import { EventBus, EventType } from "./EventBus";

class SelectionManager {

    private trackedEntities: Entity[] = [];
    private selectedEntities: Entity[] = [];
    private eventBus: EventBus;
    private mousePosition: Vector2 = new Vector2(0, 0);

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    private _handleEntityAdded(entity: Entity) {
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

        

    }

    private _updateSelection() {

        const camera = this.eventBus.inquireSubscriberUniqueEvent("getCamera") as Camera;
        const raycaster = new Raycaster();
        raycaster.setFromCamera(this.mousePosition, camera);

        const intersects = raycaster.intersectObjects()
    }

    private _onRender() {

    }

    private _initialize() {
        this._initializeEvents();
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
            this.mousePosition.set(event.pageX, event.pageY);
        });
    }
}