/**
 * Base class for all components in the ECS architecture.
 * Components add functionality to GameObjects and support observability and disposal.
 * Now includes event handling capabilities for autonomous component communication.
 */
import type { GameObject } from './GameObject';

// Event system types for components
export interface ComponentEvent {
    type: string;
    payload?: any;
    timestamp?: number;
    source?: string; // Component type that emitted the event
    sourceId?: string; // Specific component instance ID
}

export type ComponentEventListener = (event: ComponentEvent) => void;

// Global event bus for component communication
class ComponentEventBus {
    private subscribers: Map<string, Set<ComponentEventListener>> = new Map();
    
    subscribe(eventType: string, listener: ComponentEventListener): () => void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        
        this.subscribers.get(eventType)!.add(listener);
        
        return () => {
            const subscribers = this.subscribers.get(eventType);
            if (subscribers) {
                subscribers.delete(listener);
                if (subscribers.size === 0) {
                    this.subscribers.delete(eventType);
                }
            }
        };
    }
    
    emit(event: ComponentEvent): void {
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }
        
        const subscribers = this.subscribers.get(event.type);
        if (subscribers) {
            subscribers.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in component event listener for ${event.type}:`, error);
                }
            });
        }
    }
    
    getSubscriberCount(eventType?: string): number {
        if (eventType) {
            return this.subscribers.get(eventType)?.size || 0;
        }
        let total = 0;
        this.subscribers.forEach(subscribers => total += subscribers.size);
        return total;
    }
}

// Global instance for component communication
export const ComponentEvents = new ComponentEventBus();

export abstract class Component<T = any> {
    /** The type string for this component */
    public abstract readonly type: string;
    /** Reference to the parent GameObject */
    protected _gameObject?: GameObject;
    /** Whether this component is enabled */
    private _enabled: boolean = true;
    /** Event subscriptions for cleanup */
    private _eventUnsubscribers: (() => void)[] = [];
    /** Unique identifier for this component instance */
    public readonly instanceId: string;

    constructor() {
        // Generate instance ID using timestamp and random string
        this.instanceId = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Attach this component to a GameObject.
     * @param gameObject The parent GameObject
     */
    attachTo(gameObject: GameObject): void {
        this._gameObject = gameObject;
    }

    /**
     * Called every update tick if enabled.
     * @param deltaTime Time since last update
     */
    update?(deltaTime: number): void;

    /**
     * Enable this component.
     */
    enable(): void {
        this._enabled = true;
    }

    /**
     * Disable this component.
     */
    disable(): void {
        this._enabled = false;
    }

    /**
     * Returns whether this component is enabled.
     */
    isEnabled(): boolean {
        return this._enabled;
    }

    /**
     * Dispose this component and clean up resources.
     */
    dispose(): void {
        // Unsubscribe from all event listeners
        this._eventUnsubscribers.forEach(unsubscribe => unsubscribe());
        this._eventUnsubscribers = [];

        this._gameObject = undefined;
    }

    /**
     * Serialize this component's state.
     */
    abstract serialize(): T;

    /**
     * Deserialize this component's state.
     * @param data The data to restore
     */
    abstract deserialize(data: T): void;

    /**
     * Subscribe to a component event.
     * @param eventType The type of event to subscribe to
     * @param listener The function to call when the event occurs
     */
    protected subscribeToEvent(eventType: string, listener: ComponentEventListener): void {
        const unsubscribe = ComponentEvents.subscribe(eventType, listener);
        this._eventUnsubscribers.push(unsubscribe);
    }

    /**
     * Emit a component event.
     * @param eventType The type of event to emit
     * @param payload The payload of the event
     */
    protected emitEvent(eventType: string, payload?: any): void {
        ComponentEvents.emit({ type: eventType, payload, source: this.type, sourceId: this.instanceId });
    }

    /**
     * Subscribe to a component event
     * @param eventType The type of event to listen for
     * @param listener The callback function
     * @returns Unsubscribe function
     */
    protected subscribe(eventType: string, listener: ComponentEventListener): () => void {
        const unsubscribe = ComponentEvents.subscribe(eventType, listener);
        this._eventUnsubscribers.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Emit a component event
     * @param eventType The type of event
     * @param payload Optional data to send with the event
     */
    protected emit(eventType: string, payload?: any): void {
        ComponentEvents.emit({
            type: eventType,
            payload,
            source: this.type,
            sourceId: this.instanceId
        });
    }

    /**
     * Subscribe to events from a specific component type
     * @param componentType The type of component to listen to
     * @param eventType The specific event type
     * @param listener The callback function
     */
    protected subscribeToComponent(componentType: string, eventType: string, listener: ComponentEventListener): () => void {
        const filteredListener = (event: ComponentEvent) => {
            if (event.source === componentType) {
                listener(event);
            }
        };
        return this.subscribe(eventType, filteredListener);
    }

    /**
     * Subscribe to events from the same GameObject (sibling components)
     * @param eventType The event type to listen for
     * @param listener The callback function
     */
    protected subscribeToSibling(eventType: string, listener: ComponentEventListener): () => void {
        const gameObjectId = this._gameObject?.id;
        if (!gameObjectId) {
            console.warn('Cannot subscribe to sibling events: component not attached to GameObject');
            return () => {};
        }

        const filteredListener = (event: ComponentEvent) => {
            // Check if event comes from a component on the same GameObject
            if (event.payload?.gameObjectId === gameObjectId) {
                listener(event);
            }
        };
        return this.subscribe(eventType, filteredListener);
    }

    /**
     * Emit an event that includes GameObject context for sibling communication
     * @param eventType The type of event
     * @param payload Optional data to send with the event
     */
    protected emitToSiblings(eventType: string, payload?: any): void {
        this.emit(eventType, {
            ...payload,
            gameObjectId: this._gameObject?.id
        });
    }
}
