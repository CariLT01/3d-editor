export enum EventType {
    UI_PRIMITIVES_CREATE_CUBE_CLICKED,
    UI_PRIMITIVES_CREATE_SPHERE_CLICKED,
    RENDERER_SCENE_ADD,
    RENDERER_SCENE_REMOVE,
    ECS_ENTITY_ADDED,
    ECS_ENTITY_REMOVED,
    RENDERER_ON_RENDER,
    RENDERER_SET_OUTLINED_OBJECTS
}


type EventCallback = (...args: any[] ) => any;

export class EventBus {
    private subscribedEvents: Map<EventType, EventCallback[]> = new Map();
    private uniqueSubscribers: Map<string, EventCallback> = new Map(); // Events where only one can subscribe

    constructor() {
        
        

    }

    subscribeEvent(eventType: EventType, callback: EventCallback) {
        if (this.subscribedEvents.get(eventType) == null) {
            this.subscribedEvents.set(eventType, []);
        }

        const eventSubscribed = this.subscribedEvents.get(eventType) as EventCallback[];
        eventSubscribed.push(callback);
    }


    subscribeUniqueEvent(eventId: string, callback: EventCallback) {
        if (this.uniqueSubscribers.get(eventId) != null) {
            throw new Error("Event ID already has a subscriber");
        }

        this.uniqueSubscribers.set(eventId, callback);
    }

    postEvent(eventType: EventType, ...args: any[]) {
        if (this.subscribedEvents.get(eventType) == null) {
            return;
        }
        const eventSubscribed = this.subscribedEvents.get(eventType) as EventCallback[];

        for (const callback of eventSubscribed) {
            callback(...args);
        }
    }

    inquireSubscriberUniqueEvent(eventId: string, ...args: any[]) {
        if (this.uniqueSubscribers.get(eventId) == null) {
            throw new Error("No subscriber");
        }
        const callback  =this.uniqueSubscribers.get(eventId);
        if (callback == null) throw new Error("No callback");
        return callback(...args);
    }

}