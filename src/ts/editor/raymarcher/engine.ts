import * as THREE from 'three';
import { Box } from './objects/box';
import { Sphere } from './objects/sphere';

import frag from '../../../shaders/fragment.frag?raw';
import vert from '../../../shaders/vertex.vert?raw';

type Objects = {
    boxes: Box[],
    spheres: Sphere[]
}

export class RayMarcher {
    boxes: Box[];
    spheres: Sphere[];
    camera: THREE.PerspectiveCamera;
    material!: THREE.ShaderMaterial;
    
    constructor(camera: THREE.PerspectiveCamera, objects: Objects) {
        console.log("Constructing new instance of RayMarcher");
        this.boxes = objects.boxes;
        this.spheres = objects.spheres;
        this.camera = camera;


    }
    initialize() {
        this.createQuad();
        this.createTestCubes();
    }
    private createShader() {
        let mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
                uCamPos: { value: this.camera.position }
            },
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        mat.uniforms.uCamWorldMat = { value: new THREE.Matrix4() };
        mat.uniforms.uProjInv    = { value: new THREE.Matrix4() };
        this.material = mat;
        return mat;
    }
    
    private createQuad() {
        const mat = this.createShader();
        let geo = new THREE.PlaneGeometry(2, 2);
        let quad = new THREE.Mesh(geo, mat);
        // 1. make quad a child of the camera
        this.camera.add(quad);
        // 2. put it just in front of the near plane
        quad.position.set(0, 0, -1);
    }
    computeData() {
        const data = new Float32Array(this.boxes.length * 8);
        // PosX, PosY, PosZ, SizeX, SizeY, SizeZ, MorphFactor
        // R-----G-----B-----A||||||R------G------B----------A(Padding)
        
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            data[i + 0] = box.position.x;
            data[i + 1] = box.position.y;
            data[i + 2] = box.position.z;
            data[i + 3] = box.size.x;
            data[i + 4] = box.size.y;
            data[i + 5] = box.size.z;
        }
    }
    private createTestCubes() {
        const vec3 = new THREE.Vector3(1, 1, 1);
        const vec3_2 = new THREE.Vector3(0, 0, 0);
        const vec3_3 = new THREE.Vector3(2, 2, 2);
        this.material.uniforms.uBoxCenters = {value: [vec3, vec3_2]};
        this.material.uniforms.uBoxExtents = {value: [vec3_3, vec3_3]};
        this.material.uniforms.uBoxPairs = {value: [5, 5]};

    }
    onRender() {
        console.log("Raymarcher rendering at camera position = ", this.camera.position);
        this.material.uniforms.uCamPos.value.copy(this.camera.position);
        this.material.uniforms.uCamWorldMat.value.copy(this.camera.matrixWorld );
        this.material.uniforms.uProjInv.value.copy(this.camera.projectionMatrixInverse );
    }
    onResize() {
        this.material.uniforms.uResolution.value.set(innerWidth, innerHeight);
    }
}