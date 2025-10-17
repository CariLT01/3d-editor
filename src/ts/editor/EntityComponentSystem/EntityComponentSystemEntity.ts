
export class Entity {
    id: string;
    private parent?: string;
    children: string[] = [];
    components = new Map<new () => any, any>;
    name: string = "Entity";

    constructor(id: string) {
        this.id = id;
    }

    addComponent<T>(constructor_: new() => T, component: T) {
        this.components.set(constructor_, component);
    }
    getComponent<T>(ctor: new () => T): T | undefined {
        return this.components.get(ctor);
    }
    addChild(id: string) {
        this.children.push(id);
    }
    removeChild(id: string) {
        const index = this.children.indexOf(id);
        if (index == null) {
            throw new Error("Failed to remove child, index not found");
        }
        this.children.splice(index, 1);
    }

    setParent(parentEntity: Entity) {
        this.parent = parentEntity.id;
        parentEntity.children.push(this.id);
    }
}