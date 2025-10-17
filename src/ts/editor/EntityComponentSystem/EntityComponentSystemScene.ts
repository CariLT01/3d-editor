import { ComponentTypeMap } from "./EntityComponentSystemComponents";
import { Entity } from "./EntityComponentSystemEntity";
import { RootNodeComponent } from "./EntityComponentSystemComponents";
import { EventBus } from "../EventBus";

function generateRandomID(length: number = 256): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

type TreeRenderNode = {
    entity: Entity;
    listElement: HTMLLIElement;
    parentUl: HTMLUListElement;
}


export class EntityComponentSystemScene<ComponentTypeMap extends Record<string, any>> {
    private storages = new Map<Function, Map<string, any>>;
    private entityIdMap = new Map<string, Entity>;
    private rootId!: string;
    private systemsMap = new Map<new () => any, any>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    createRoot() {
        const rootEntity = this.createEntity();
        rootEntity.name = "Scene";
        rootEntity.addComponent(RootNodeComponent, new RootNodeComponent());

        this.rootId = rootEntity.id;

        this.addEntity(rootEntity);
    }

    getRootId() {
        return this.rootId;
    }

    getRoot() {
        return this.entityIdMap.get(this.rootId) as Entity;
    }

    createEntity() {
        return new Entity(
            generateRandomID()
        );
    }

    addEntity(entity: Entity) {
        this.entityIdMap.set(entity.id, entity);
        for (const [constructor_, component] of entity.components.entries()) {

            if (constructor_ == null) {
                console.error("Constructor  is: ", constructor_, " component is: ", component);
                throw Error("Constructor is null / undefined");
            }

            if (!this.storages.get(constructor_)) {
                this.storages.set(constructor_, new Map());
            }
            const componentMap = this.storages.get(constructor_);
            if (componentMap == undefined) continue;
            componentMap.set(entity.id, component);

            const constructor = this.systemsMap.get(constructor_);
            if (!constructor) {
                console.warn("Missing system: ", constructor_);
                continue;
            }
            constructor.addEntity(entity);
        }

        
    }

    addSystem(componentType: new () => any, system: any) {
        this.systemsMap.set(componentType, system);
    }

    private removeEntityInternal(entity: Entity) {
        if (this.entityIdMap.get(entity.id) == undefined) {
            throw Error("Entity id not found");
        }
        // Delete ID entry
        this.entityIdMap.delete(entity.id);
        // Delete associated components
        for (const [constructor_, element] of entity.components.entries()) {
            if (!this.storages.get(constructor_)) continue;
            const componentMap = this.storages.get(constructor_);
            if (componentMap == undefined) continue;

            componentMap.delete(entity.id);

            this.systemsMap.get(constructor_).removeEntity(entity);

        }
        // Delete referenced in children

        for (const [id, otherEntity] of this.entityIdMap.entries()) {
            const toSplice: number[] = [];

            otherEntity.children.forEach((id: string, index: number) => {
                if (id == entity.id) {
                    toSplice.push(index);
                }
            })

            // Splice to splice

            toSplice.forEach((index: number) => {
                otherEntity.children.splice(index, 1);
            })
        }
    }

    removeEntity(root: Entity) {
        const stack: Entity[] = [root];
        const toDelete: Entity[] = [];


        // Collect all entities in the subtree
        while (stack.length > 0) {
            const current = stack.pop()!;
            toDelete.push(current);
            current.children.forEach(childId => {
                const child = this.entityIdMap.get(childId);
                if (child) stack.push(child);
            });
        }

        // Delete bottom-up
        toDelete.reverse().forEach(entity => {
            this.removeEntityInternal(entity);
        });
    }

    private _createListElement(entity: Entity) {
        const newListElement = document.createElement("li");

        newListElement.innerText = entity.name.length > 0 ? entity.name : entity.id;
        newListElement.classList.add("tree-item");

        return newListElement;
    }

    renderTree(targetRenderElement: HTMLDivElement) {
        targetRenderElement.innerHTML = "";

        // Recursively build the tree

        let stack: TreeRenderNode[] = [];

        // Initialize for root node

        const rootEntity = this.entityIdMap.get(this.rootId) as Entity;
        const rootLi = this._createListElement(rootEntity);
        const sceneUl = document.createElement("ul");

        sceneUl.appendChild(rootLi);

        stack.push(
            {
                entity: this.entityIdMap.get(this.rootId) as Entity,
                listElement: rootLi,
                parentUl: sceneUl
            }
        );
        
        console.log(stack);
        console.log(stack[0]);


        while (stack.length > 0) {
            console.log("Length of stack: ", stack.length);
            const node: TreeRenderNode = stack.pop() as TreeRenderNode;

            // Create new LI and UL for children

            const nodeUl = document.createElement("ul");
            

            console.log("Entity has ", node.entity.children.length, " children")
            for (const child of node.entity.children) {
                const childEntity = this.entityIdMap.get(child);
                if (childEntity) {
                    
                    const nodeLi = this._createListElement(childEntity);

                    nodeUl.appendChild(nodeLi);
                    

                    // Append to stack
                    console.log("Push child entity");
                    stack.push(
                        {
                            entity: childEntity,
                            listElement: nodeLi,
                            parentUl: nodeUl
                        }
                    );
                } else {
                    console.error("Child not found");
                }
            }

            node.listElement.appendChild(nodeUl);


        }

        targetRenderElement.appendChild(sceneUl);

    }




}