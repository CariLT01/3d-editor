import { EventBus, EventType } from "../EventBus";

export class TransformControlsModeSwitcher {

    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this._initializeEvents();
    }

    private _initializeEvents() {
        window.addEventListener("keydown", (event) => {
            switch (event.key) {
                case "2":
                    this._setModePost("translate");
                    break;
                case "3":
                    this._setModePost("scale");
                    break;
                case "4":
                    this._setModePost("rotate");
                    break;
            }
        })
    }

    private _setModePost(mode: "translate" | "scale" | "rotate") {
        this.eventBus.postEvent(EventType.TRANSFORM_CONTROLS_SET_MODE, mode);
    }
}