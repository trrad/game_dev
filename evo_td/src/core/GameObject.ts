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
import type { EventStack } from './EventStack';

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
    /** Central event system for unified logging and communication */
    protected eventStack?: EventStack;

    constructor(public readonly type: string, eventStack?: EventStack) {
        this.id = `${type}_${nextGameObjectId++}`;
        this.eventStack = eventStack;
        ObjectTracker?.register?.(this);
        Logger?.log?.(LogCategory.PERFORMANCE, `GameObject created: ${this.id}`, { type });
        
        // Log creation event to EventStack if available
        if (this.eventStack) {
            this.eventStack.logEvent(LogCategory.SYSTEM, 'object_created', 
                `${this.type} ${this.id} created`, { objectId: this.id, type: this.type });
        }
    }

    /**
     * Set the EventStack for unified event communication.
     * Can be called after object creation if EventStack wasn't available during construction.
     */
    setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
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
     * Also routes the event through EventStack for unified logging.
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
        
        // Route event through EventStack for unified event communication
        if (this.eventStack) {
            const eventCategory = this.getEventCategory(event);
            const eventMessage = this.formatEventMessage(event, args);
            const eventPayload = {
                objectId: this.id,
                objectType: this.type,
                event,
                args,
                timestamp: Date.now()
            };
            
            this.eventStack.logEvent(eventCategory, event, eventMessage, eventPayload);
        }
        
        // Log event for observability (local)
        this.emitEvent({ type: 'event_emitted', event, args, objectId: this.id });
    }

    /**
     * Determine the appropriate log category for an event.
     */
    private getEventCategory(event: string): LogCategory {
        // Map event types to appropriate log categories
        if (event.includes('journey') || event.includes('train')) return LogCategory.TRAIN;
        if (event.includes('enemy') || event.includes('combat')) return LogCategory.ENEMY;
        if (event.includes('ui') || event.includes('click')) return LogCategory.UI;
        if (event.includes('network') || event.includes('connection')) return LogCategory.NETWORK;
        if (event.includes('economy') || event.includes('trade')) return LogCategory.ECONOMY;
        if (event.includes('attachment') || event.includes('weapon')) return LogCategory.ATTACHMENT;
        if (event.includes('render') || event.includes('draw')) return LogCategory.RENDERING;
        if (event.includes('performance') || event.includes('metric')) return LogCategory.PERFORMANCE;
        if (event.includes('error') || event.includes('failed')) return LogCategory.ERROR;
        
        // Default to SYSTEM for general game object events
        return LogCategory.SYSTEM;
    }

    /**
     * Format a human-readable message for the event.
     */
    private formatEventMessage(event: string, args: any[]): string {
        const baseMessage = `${this.type} ${this.id}: ${event}`;
        
        // Add context from args if available
        if (args.length > 0) {
            const firstArg = args[0];
            if (typeof firstArg === 'object' && firstArg !== null) {
                // Extract meaningful info from event data objects
                const details = [];
                if (firstArg.stationId) details.push(`station: ${firstArg.stationId}`);
                if (firstArg.targetId) details.push(`target: ${firstArg.targetId}`);
                if (firstArg.playerId) details.push(`player: ${firstArg.playerId}`);
                if (firstArg.amount !== undefined) details.push(`amount: ${firstArg.amount}`);
                
                if (details.length > 0) {
                    return `${baseMessage} (${details.join(', ')})`;
                }
            } else if (typeof firstArg === 'string' || typeof firstArg === 'number') {
                return `${baseMessage} (${firstArg})`;
            }
        }
        
        return baseMessage;
    }

    /**
     * Disposes this GameObject and all its components.
     */
    dispose(): void {
        if (this._disposed) return;
        
        // Log disposal to EventStack before cleanup
        if (this.eventStack) {
            this.eventStack.logEvent(LogCategory.SYSTEM, 'object_disposed', 
                `${this.type} ${this.id} disposed`, { objectId: this.id, type: this.type });
        }
        
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
