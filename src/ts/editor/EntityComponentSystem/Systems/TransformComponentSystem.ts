import { Quaternion } from "three";
import { EventBus, EventType } from "../../EventBus";
import { SolidGeometryComponent, TransformComponent } from "../EntityComponentSystemComponents";
import { Entity } from "../EntityComponentSystemEntity";

export class TransformComponentSystem {
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initialize();
    }

    private _initialize() {
        this.eventBus.subscribeEvent(EventType.TRANSFORM_SYSTEM_TRANSFORM_UPDATED, (entity: Entity) => {
            const component = entity.components.get(SolidGeometryComponent) as SolidGeometryComponent;
            if (!component) {
                throw new Error("No solid geom comp");
            }
            const transformComp = entity.components.get(TransformComponent) as TransformComponent;
            if (!transformComp) {
                throw new Error("No transform component");
            }

            /*component.mesh.position.copy(transformComp.position);
            component.mesh.rotation.copy(transformComp.rotation);
            component.mesh.scale.copy(transformComp.scale);*/

            // Do the reverse, copy mesh position/rotation/scale into component

            component.mesh.getWorldPosition(transformComp.position);

            const quat = new Quaternion();

            component.mesh.getWorldQuaternion(quat);
            transformComp.rotation.setFromQuaternion(quat);

            component.mesh.getWorldScale(transformComp.scale);
        })
    }

    // Mandatory fields
    addEntity(entity: Entity) { 

    }
    removeEntity(entity: Entity) {
        
    }


}