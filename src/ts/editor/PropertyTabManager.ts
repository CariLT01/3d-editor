import { Vector3 } from "three";
import { Entity } from "./EntityComponentSystem/EntityComponentSystemEntity";
import { EventBus, EventType } from "./EventBus";

export class PropertyTabManager {

    private eventListeners: (() => void)[] = [];
    private propertyTab: HTMLDivElement;
    private eventBus: EventBus;

    constructor(propertyTab: HTMLDivElement, eventBus: EventBus) {
        this.propertyTab = propertyTab;
        this.eventBus = eventBus;

        this._initializeEvents();
    }

    private _initializeEvents() {
        this.eventBus.subscribeEvent(EventType.SELECTION_MANAGER_SELECTION_CHANGED, (entities: Entity[]) => {
            if (entities.length <= 0 || entities.length > 1) {
                this.propertyTab.innerHTML = '';
                return;
            };
            this.updatePropertyTab(entities[0]);
        });
        this.eventBus.subscribeEvent(EventType.PROPERTY_TAB_MANAGER_UPDATE_PROPERTIES, (entity: Entity) => {
            this.updatePropertyTab(entity);    
        });
    }

    private _createPropertyItem() {
        const propertyItemDiv = document.createElement("div");
        propertyItemDiv.classList.add("property-item");

        return propertyItemDiv;
    }

    private _createLabel(text: string) {
        const propertyLabelElement = document.createElement("label");
        propertyLabelElement.innerText = text;
        return propertyLabelElement
    }


    private _createRawInput() {
        const inputElement = document.createElement("input");
        return inputElement;
    }

    private _parseInputContent(inputElement: HTMLInputElement, type: string) {
        // TODO: Parse input content
        console.log("Todo: parse it");
    }

    private _createInputEventListenerFunction(type: string, i: HTMLInputElement) {
        return () => this._parseInputContent(i, type);
    }

    private _createInput(type: string, defaultValue: string) {
        const i = this._createRawInput();
        i.value = defaultValue;
        if (type == Vector3.constructor.name) {
            const f = this._createInputEventListenerFunction("Vector3", i);
            this.eventListeners.push(f);
            i.addEventListener("input", f);
        } else {
            i.value = `<${type}>`
        }
        return i;
    }

    updatePropertyTab(entity: Entity) {
        
        this.propertyTab.innerHTML = '';

        
        for (const [componentType, component] of entity.components) {

            const propItem = this._createPropertyItem();
            const sectionLabel = this._createLabel(`-- ${componentType.name} --`);
            propItem.appendChild(sectionLabel);
            this.propertyTab.appendChild(propItem);

            const componentTyped: object = component;
            // Hmm.. Is this going to work?

            const l = Object.keys(componentTyped);
            if (l.length == 0) {
                console.log("Component has no properties (is an attr)");
            }
            console.log(componentTyped);
            console.log(Object.entries(componentTyped));

            for (const [key, value] of Object.entries(componentTyped)) {
                console.log("Create item for: ", key);
                const item = this._createPropertyItem();
                
                const label = this._createLabel(key);
                item.appendChild(label);
                const input = this._createInput(value.constructor.name, value);
                item.appendChild(input);
                this.propertyTab.appendChild(item);
            }

            
        
        }
    }
    
    clearPropertyTab() {
        this.propertyTab.innerHTML = '';
    }
}