import { Vector3 } from "three";
import { Entity } from "./EntityComponentSystem/EntityComponentSystemEntity";

export class PropertyTabManager {

    private eventListeners: (() => void)[] = [];
    private propertyTab: HTMLDivElement;

    constructor(propertyTab: HTMLDivElement) {
        this.propertyTab = propertyTab;
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
            const i = this._createRawInput();
            i.value = `<${type}>`;
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
            for (const [key, value] of Object.entries(componentTyped)) {
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