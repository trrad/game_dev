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

export class GameObject {
    /** Unique identifier for this GameObject */
    public readonly id: string;
    /** Scene reference for rendering */
    public readonly scene?: Scene;
    /** Map of component type to component instance */
    private _components: Map<string, Component> = new Map();
    /** Metrics for observability */
    protected metrics: Map<string, number> = new Map();
    /** Disposal state */
    private _disposed: boolean = false;

    constructor(public readonly type: string, scene?: Scene) {
        this.id = `${type}_${nextGameObjectId++}`;
        this.scene = scene;
        // Logger?.log?.(LogCategory.PERFORMANCE, `GameObject created: ${this.id}`, { type });
    }

    /**
     * Adds a component to this GameObject.
     */
    addComponent(component: Component): void {
        this._components.set(component.type, component);
    }

    /**
     * Gets a component by type.
     */
    getComponent<T extends Component>(type: string): T | undefined {
        return this._components.get(type) as T | undefined;
    }

    /**
     * Removes a component by type.
     */
    removeComponent(type: string): void {
        const comp = this._components.get(type);
        if (comp) comp.dispose();
        this._components.delete(type);
    }

    /**
     * Calls update on all components.
     */
    update(deltaTime: number): void {
        for (const comp of this._components.values()) {
            if (typeof comp.update === 'function') {
                comp.update(deltaTime);
            }
        }
    }

    /**
     * Logs a metric for observability.
     */
    protected logMetric(metric: string, value: number): void {
        this.metrics.set(metric, (this.metrics.get(metric) || 0) + value);
    }

    /**
     * Disposes this GameObject and all its components.
     */
    dispose(): void {
        if (this._disposed) return;
        // Clean up components
        for (const comp of this._components.values()) {
            comp.dispose();
        }
        this._components.clear();
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
     */
    serialize(): GameObjectData {
        const componentData: Record<string, any> = {};
        for (const [componentType, component] of this._components.entries()) {
            try {
                componentData[componentType] = component.serialize();
            } catch (error) {
                // Optionally log or handle serialization errors
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
     */
    clone(): GameObject {
        const clonedData = this.serialize();
        const cloned = new GameObject(this.type, this.scene);
        
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
     */
    protected getEntityState(): any {
        return null;
    }

    /**
     * Set entity-specific state data (override in subclasses)
     */
    protected setEntityState(_state: any): void {
        // Override in subclasses
    }
}
