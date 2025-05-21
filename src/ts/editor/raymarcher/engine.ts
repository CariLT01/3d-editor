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
    scene: THREE.Scene;
    
    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, objects: Objects) {
        console.log("Constructing new instance of RayMarcher");
        this.boxes = objects.boxes;
        this.spheres = objects.spheres;
        this.camera = camera;
        this.scene = scene;


    }
    initialize() {
        this.createQuad();
        this.createTestCubes();
        this.computeData();
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
        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
        -1, -1, 0,
        3, -1, 0,
        -1,  3, 0
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        let quad = new THREE.Mesh(geo, mat);
        // 1. make quad a child of the camera
        this.camera.add(quad);
        // 2. put it just in front of the near plane
        //quad.position.set(0, 0, - (this.camera.near + 0.0001));
        quad.frustumCulled = false;
    }
    computeData() {
        const data = new Float32Array(this.boxes.length * 12);
        // PosX, PosY, PosZ, SizeX, SizeY, SizeZ, QX, QY, QZ, QW           MorphFactor
        // R-----G-----B-----A||||||R------G------B---A|||R---G------------B-----------A(Padding)
        
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            const base = i * 12;
            data[base + 0] = box.position.x;
            data[base + 1] = box.position.y;
            data[base + 2] = box.position.z;
            data[base + 3] = box.size.x / 2;
            data[base + 4] = box.size.y / 2;
            data[base + 5] = box.size.z / 2;
            data[base + 6] = box.quaternion.x;
            data[base + 7] = box.quaternion.y;
            data[base + 8] = box.quaternion.z;
            data[base + 9] = box.quaternion.w;
            data[base + 10] = box.morph;
            data[base + 11] = 0;

            console.log(`
            [R] ${base}+0: Position X: ${box.position.x},
            [G] ${base}+1: Position Y: ${box.position.y},
            [B] ${base}+2: Position Z: ${box.position.z},
            [A] ${base}+3: Size X: ${box.size.x},
            --- Next pixel ---
            [R] ${base}+4: Size Y: ${box.size.y},
            [G] ${base}+5: Size Z: ${box.size.z},
            [B] ${base}+6: QX: ${box.quaternion.x},
            [A] ${base}+7: QY: ${box.quaternion.y},
            --- Next pixel ---
            [R] ${base}+8: QZ: ${box.quaternion.z},
            [G] ${base}+9: QW: ${box.quaternion.w},
            [B]: ${base}+10: Morph: ${box.morph},
            [A]: ${base}+11: Padding: 0   
                `)
        }
        const width = this.boxes.length * 3;
        const height = 1;
        // Expected amount of data = 
        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
        texture.needsUpdate = true;

        this.material.uniforms.uBoxData = {value: texture};
        this.material.uniforms.uBoxCount = {value: this.boxes.length};

        console.log("Uploaded ", this.boxes.length, " boxes to GPU for ray marching");
    }
    private createTestCubes() {
        const vec3 = new THREE.Vector3(1, 1, 1);
        const vec3_2 = new THREE.Vector3(0, 0, 0);
        const vec3_3 = new THREE.Vector3(2, 2, 2);
        const b1 = new Box(this.scene, vec3_3, vec3, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0.5, 0.5)), -0.5);
        const b2 = new Box(this.scene, vec3_3, vec3_3,new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),  -0.5);

        this.boxes.push(b1);
        this.boxes.push(b2);

    }
    onRender() {
        //console.log("Raymarcher rendering at camera position = ", this.camera.position);
        this.material.uniforms.uCamPos.value.copy(this.camera.position);
        this.material.uniforms.uCamWorldMat.value.copy(this.camera.matrixWorld );
        this.material.uniforms.uProjInv.value.copy(this.camera.projectionMatrixInverse );
    }
    onResize() {
        this.material.uniforms.uResolution.value.set(innerWidth, innerHeight);
    }
}