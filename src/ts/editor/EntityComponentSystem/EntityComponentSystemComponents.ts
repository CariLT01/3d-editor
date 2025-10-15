import * as THREE from 'three';


export class TransformComponent {
    position!: THREE.Vector3;
    rotation!: THREE.Vector3;
    scale!: THREE.Vector3;
}

export class SolidGeometryComponent {
    mesh!: THREE.Mesh;
}

export class SolidGeometryNegateComponent {

}

export class SolidGeometryIntersectionComponent {

}

export class RootNodeComponent {

}

export type ComponentTypeMap = {
    TransformComponent: TransformComponent,
    SolidGeometryComponent: SolidGeometryComponent,
    SolidGeometryNegateComponent: SolidGeometryNegateComponent,
    SolidGeometryIntersectionComponent: SolidGeometryIntersectionComponent,
    RootNodeComponent: RootNodeComponent
}