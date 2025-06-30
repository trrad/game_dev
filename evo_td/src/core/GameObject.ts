/**
 * Base class for all game entities in the ECS architecture.
 * Provides component management, observability, and disposal patterns.
 *
 * NOTE: If you see import errors for Logger or ObjectTracker, ensure:
 * 1. The files exist in src/utils/ and are named Logger.ts and ObjectTracker.ts (case-sensitive).
 * 2. Your editor/TypeScript server is refreshed.
 * 3. tsconfig.json includes 'src' (it does).
 */
import type { Component } from './Component';
import { Logger, LogCategory } from '../utils/Logger';
import { ObjectTracker } from '../utils/ObjectTracker';

let nextGameObjectId = 1;

/** Event listener function type */
type EventListener = (...args: any[]) => void;

/** Event emitter interface for game objects */
interface GameObjectEventEmitter {
    on(event: string, listener: EventListener): void;
    off(event: string, listener: EventListener): void;
    emit(event: string, ...args: any[]): void;
}

export class GameObject implements GameObjectEventEmitter {
    /** Unique identifier for this GameObject */
    public readonly id: string;
    /** Map of component type to component instance */
    private _components: Map<string, Component> = new Map();
    /** Event listeners map */
    private _eventListeners: Map<string, EventListener[]> = new Map();
    /** Event history for observability */
    protected eventHistory: any[] = [];
    /** Metrics for observability */
    protected metrics: Map<string, number> = new Map();
    /** Disposal state */
    private _disposed: boolean = false;

    constructor(public readonly type: string) {
        this.id = `${type}_${nextGameObjectId++}`;
        ObjectTracker?.register?.(this);
        Logger?.log?.(LogCategory.PERFORMANCE, `GameObject created: ${this.id}`, { type });
    }

    /**
     * Adds a component to this GameObject.
     * @param component The component instance to add
     */
    addComponent(component: Component): void {
        this._components.set(component.type, component);
        component.attachTo(this);
    }

    /**
     * Gets a component by type.
     * @param type The component type string
     */
    getComponent<T extends Component>(type: string): T | undefined {
        return this._components.get(type) as T | undefined;
    }

    /**
     * Removes a component by type.
     * @param type The component type string
     */
    removeComponent(type: string): void {
        const comp = this._components.get(type);
        if (comp) {
            comp.dispose();
            this._components.delete(type);
        }
    }

    /**
     * Calls update on all components.
     * @param deltaTime Time since last update
     */
    update(deltaTime: number): void {
        for (const comp of this._components.values()) {
            comp.update?.(deltaTime);
        }
    }

    /**
     * Emits an event for observability.
     * @param event The event object
     */
    protected emitEvent(event: any): void {
        this.eventHistory.push(event);
        Logger?.log?.(LogCategory.PERFORMANCE, `Event: ${event.type}`, { objectId: this.id, ...event });
    }

    /**
     * Logs a metric for observability.
     * @param metric The metric name
     * @param value The value to add
     */
    protected logMetric(metric: string, value: number): void {
        this.metrics.set(metric, (this.metrics.get(metric) ?? 0) + value);
    }

    /**
     * Add an event listener for a specific event type.
     */
    on(event: string, listener: EventListener): void {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event)!.push(listener);
    }

    /**
     * Remove an event listener for a specific event type.
     */
    off(event: string, listener: EventListener): void {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
            if (listeners.length === 0) {
                this._eventListeners.delete(event);
            }
        }
    }

    /**
     * Emit an event to all registered listeners.
     */
    emit(event: string, ...args: any[]): void {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            // Create a copy to avoid issues if listeners are removed during emission
            const listenersCopy = [...listeners];
            listenersCopy.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    Logger?.log?.(LogCategory.ERROR, `Error in event listener for ${event}:`, { error, objectId: this.id });
                }
            });
        }
        
        // Log event for observability
        this.emitEvent({ type: 'event_emitted', event, args, objectId: this.id });
    }

    /**
     * Disposes this GameObject and all its components.
     */
    dispose(): void {
        if (this._disposed) return;
        this.emitEvent({ type: 'object_disposing', objectId: this.id });
        
        // Clean up components
        for (const comp of this._components.values()) {
            comp.dispose();
        }
        this._components.clear();
        
        // Clean up event listeners
        this._eventListeners.clear();
        
        ObjectTracker?.unregister?.(this);
        Logger?.log?.(LogCategory.PERFORMANCE, `GameObject disposed: ${this.id}`);
        this._disposed = true;
    }

    /**
     * Gets all metrics collected for this object.
     */
    getMetrics(): Map<string, number> {
        return new Map(this.metrics);
    }

    /**
     * Returns true if this object has a component of the given type.
     */
    hasComponent(type: string): boolean {
        return this._components.has(type);
    }

    /**
     * Returns whether this object has been disposed.
     */
    isDisposed(): boolean {
        return this._disposed;
    }
}
