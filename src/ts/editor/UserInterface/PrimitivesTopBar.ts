import { EventBus, EventType } from "../EventBus";

export class PrimitivesTopBar {

    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;

        this.initialize();
    }
    private initialize() {
        const cube = document.querySelector("#cube") as HTMLButtonElement;
        const sphere = document.querySelector("#sphere") as HTMLButtonElement;

        cube.addEventListener("click", () => {
            this.eventBus.postEvent(EventType.UI_PRIMITIVES_CREATE_CUBE_CLICKED);
        });

        sphere.addEventListener("click", () => {
            this.eventBus.postEvent(EventType.UI_PRIMITIVES_CREATE_SPHERE_CLICKED);
        });
    }

}