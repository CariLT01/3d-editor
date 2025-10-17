import { BufferGeometry, Mesh, MeshBasicMaterial } from "three";
import { EntityComponentSystemScene } from "./EntityComponentSystem/EntityComponentSystemScene";
import { ComponentTypeMap, SolidGeometryComponent } from "./EntityComponentSystem/EntityComponentSystemComponents";
import { Entity } from "./EntityComponentSystem/EntityComponentSystemEntity";

export function createSolid(geometry: BufferGeometry, ecs: EntityComponentSystemScene<ComponentTypeMap>) {
    const newMesh = new Mesh(geometry);

    newMesh.material = new MeshBasicMaterial({color: 0xff00ff});

    const solidGeomComponent = new SolidGeometryComponent();
    solidGeomComponent.mesh = newMesh;

    const newEntity = ecs.createEntity();
    newEntity.addComponent(SolidGeometryComponent, solidGeomComponent);

    return newEntity;
    
}