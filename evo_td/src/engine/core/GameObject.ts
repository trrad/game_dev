/**
 * Base class for all game entities in the ECS architecture.
 * Provides component management, observability, and disposal patterns.
 *
 * NOTE: If you see import errors for Logger or ObjectTracker, ensure:
 * 1. The files exist in src/utils/ and are named Logger.ts and ObjectTracker.ts (case-sensitive).
 * 2. Your editor/TypeScript server is refreshed.
 * 3. tsconfig.json includes 'src' (it does).
 */
import type { Component } from '../components/Component';
import { Logger, LogCategory } from '../utils/Logger';
import { ObjectTracker } from '../utils/ObjectTracker';
import type { EventStack } from './EventStack';
import { EventCategory } from './EventStack';
import type { Scene } from '@babylonjs/core';

// ============================================================
// Serialization Type Definitions
// ============================================================

/**
 * Complete GameObject serialization data for save/load and full state transfer
 */
export interface GameObjectData {
    id: string;
    type: string;
    components: Record<string, any>;
    metadata: {
        createdAt: number;
        version: string;
    };
}

/**
 * Lightweight network snapshot for efficient delta updates
 * Contains only frequently changing data
 */
export interface NetworkSnapshot {
    id: string;
    timestamp: number;
    position?: any;
    health?: any;
    state?: any;
}

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
    /** Scene reference for rendering */
    public readonly scene?: Scene;
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

    constructor(public readonly type: string, eventStack?: EventStack, scene?: Scene) {
        this.id = `${type}_${nextGameObjectId++}`;
        this.scene = scene;
        this.eventStack = eventStack;
        ObjectTracker?.register?.(this);
        Logger?.log?.(LogCategory.PERFORMANCE, `GameObject created: ${this.id}`, { type });
        
        // Log creation event to EventStack if available
        if (this.eventStack) {
            this.eventStack.info(EventCategory.SYSTEM, 'object_created', 
                `${this.type} ${this.id} created`, { objectId: this.id, type: this.type }, 'GameObject');
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
            
            // Map LogCategory to EventCategory
            const mappedCategory = this.mapToEventCategory(eventCategory);
            this.eventStack.info(mappedCategory, event, eventMessage, eventPayload, 'GameObject');
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
     * Map LogCategory to EventCategory for EventStack compatibility.
     */
    private mapToEventCategory(logCategory: LogCategory): EventCategory {
        switch (logCategory) {
            case LogCategory.TRAIN:
                return EventCategory.TRAIN;
            case LogCategory.ENEMY:
                return EventCategory.ENEMY;
            case LogCategory.UI:
                return EventCategory.UI;
            case LogCategory.ECONOMY:
                return EventCategory.ECONOMY;
            case LogCategory.ATTACHMENT:
                return EventCategory.ATTACHMENT;
            case LogCategory.RENDERING:
                return EventCategory.RENDERING;
            case LogCategory.ERROR:
                return EventCategory.ERROR;
            case LogCategory.GAME:
                return EventCategory.GAME;
            case LogCategory.STATION:
                return EventCategory.STATION;
            case LogCategory.COMBAT:
                return EventCategory.COMBAT;
            case LogCategory.SYSTEM:
            case LogCategory.NETWORK:
            case LogCategory.PERFORMANCE:
            case LogCategory.DEBUG:
            default:
                return EventCategory.SYSTEM;
        }
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
            this.eventStack.info(EventCategory.SYSTEM, 'object_disposed', 
                `${this.type} ${this.id} disposed`, { objectId: this.id, type: this.type }, 'GameObject');
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
    
    // ============================================================
    // Serialization for Network Communication
    // ============================================================
    
    /**
     * Serialize this GameObject and all its components to JSON-serializable data
     * This is essential for network synchronization and save/load functionality
     */
    serialize(): GameObjectData {
        const componentData: Record<string, any> = {};
        
        // Serialize all components
        for (const [componentType, component] of this._components.entries()) {
            try {
                componentData[componentType] = component.serialize();
            } catch (error) {
                console.warn(`Failed to serialize component ${componentType} on ${this.id}:`, error);
                // Continue serializing other components
            }
        }
        
        return {
            id: this.id,
            type: this.type,
            components: componentData,
            metadata: {
                createdAt: Date.now(),
                version: '1.0.0'
            }
        };
    }
    
    /**
     * Deserialize GameObject data and restore component states
     * @param data The serialized data to restore from
     */
    deserialize(data: GameObjectData): void {
        // Validate data structure
        if (!data.components) {
            console.warn(`Invalid serialization data for GameObject ${this.id}: missing components`);
            return;
        }
        
        // Restore component states
        for (const [componentType, componentData] of Object.entries(data.components)) {
            const component = this._components.get(componentType);
            if (component) {
                try {
                    component.deserialize(componentData);
                } catch (error) {
                    console.warn(`Failed to deserialize component ${componentType} on ${this.id}:`, error);
                    // Continue deserializing other components
                }
            } else {
                console.warn(`Component ${componentType} not found on GameObject ${this.id} during deserialization`);
            }
        }
        
        // Log successful deserialization
        Logger?.log?.(LogCategory.SYSTEM, `GameObject ${this.id} deserialized successfully`, { 
            componentCount: Object.keys(data.components).length,
            version: data.metadata?.version 
        });
    }
    
    /**
     * Create a deep copy of this GameObject with all component states
     * Useful for undo/redo functionality and state snapshots
     */
    clone(): GameObject {
        const clonedData = this.serialize();
        const cloned = new GameObject(this.type, this.eventStack, this.scene);
        
        // Add the same components (they'll be created with default values)
        for (const [componentType, component] of this._components.entries()) {
            // This is a simplified approach - in practice, you'd need component factories
            // For now, we assume components can be created with their constructors
            const ComponentClass = component.constructor as any;
            const newComponent = new ComponentClass();
            cloned.addComponent(newComponent);
        }
        
        // Restore the serialized state
        cloned.deserialize(clonedData);
        
        return cloned;
    }
    
    /**
     * Get a snapshot of current state for delta compression
     * Returns only data that commonly changes for efficient network updates
     */
    getNetworkSnapshot(): NetworkSnapshot {
        const snapshot: NetworkSnapshot = {
            id: this.id,
            timestamp: Date.now(),
            position: null,
            health: null,
            state: null
        };
        
        // Include commonly updated components for efficient networking
        const positionComp = this.getComponent('position') || this.getComponent('sceneNode');
        if (positionComp) {
            snapshot.position = positionComp.serialize();
        }
        
        const healthComp = this.getComponent('health');
        if (healthComp) {
            snapshot.health = healthComp.serialize();
        }
        
        // Entity-specific state (can be overridden by subclasses)
        snapshot.state = this.getEntityState();
        
        return snapshot;
    }
    
    /**
     * Apply a network snapshot (delta update)
     * @param snapshot The network snapshot to apply
     */
    applyNetworkSnapshot(snapshot: NetworkSnapshot): void {
        if (snapshot.position) {
            const positionComp = this.getComponent('position') || this.getComponent('sceneNode');
            positionComp?.deserialize(snapshot.position);
        }
        
        if (snapshot.health) {
            const healthComp = this.getComponent('health');
            healthComp?.deserialize(snapshot.health);
        }
        
        if (snapshot.state) {
            this.setEntityState(snapshot.state);
        }
    }
    
    /**
     * Get entity-specific state data (override in subclasses)
     * This should return data that changes frequently and needs network sync
     */
    protected getEntityState(): any {
        return null;
    }
    
    /**
     * Set entity-specific state data (override in subclasses)
     * @param _state The state data to apply
     */
    protected setEntityState(_state: any): void {
        // Override in subclasses
    }
}

