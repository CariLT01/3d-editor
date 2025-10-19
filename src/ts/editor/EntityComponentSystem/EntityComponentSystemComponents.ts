import * as THREE from 'three';


export class TransformComponent {
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    rotation: THREE.Quaternion = new THREE.Quaternion(0, 0, 0);
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
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

export class GroupedSelectionAttribute {

}

export class MeshMaterialComponent {
    color!: THREE.Color;
}
export class MeshPhysicalMaterialComponent extends MeshMaterialComponent {
    albedoTexture!: THREE.Texture;
    normalMapTexture!: THREE.Texture;
    // etc.
}

export class MeshPhongMaterialComponent extends MeshMaterialComponent {

}

export type ComponentTypeMap = {
    TransformComponent: TransformComponent,
    SolidGeometryComponent: SolidGeometryComponent,
    SolidGeometryNegateComponent: SolidGeometryNegateComponent,
    SolidGeometryIntersectionComponent: SolidGeometryIntersectionComponent,
    RootNodeComponent: RootNodeComponent,
    GroupedSelectionAttribute: GroupedSelectionAttribute
}