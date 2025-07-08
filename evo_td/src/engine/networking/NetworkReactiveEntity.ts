import { GameNodeObject } from '../core/GameNodeObject';
import { ReactivePropertiesComponent, ReactiveProperty } from '../components/ReactivePropertyComponent';
import { Scene } from '@babylonjs/core';
import { NetworkRole, PropertySchema, EntitySchema, NetworkSnapshot } from './NetworkTypes';

/**
 * FIXED: Generic network-enabled reactive entity with proper patterns
 */
export abstract class NetworkReactiveEntity extends GameNodeObject {
    protected properties: ReactivePropertiesComponent;
    private role: NetworkRole;
    private networkId: string;
    private networkSyncedProperties: Set<string> = new Set();
    private propertyChangeCleanup: (() => void)[] = [];
    private entityCleanup: (() => void)[] = []; // ✅ FIXED: Centralized cleanup

    constructor(
        entityType: string, 
        networkId: string, 
        scene: Scene | null,
        role: NetworkRole, 
        parentNode?: any
    ) {
        super(entityType, scene, parentNode);
        
        this.networkId = networkId;
        this.role = role;
        this.properties = new ReactivePropertiesComponent();
        this.addComponent(this.properties);
    }

    /**
     * FIXED: Schema-only property creation (no duplication)
     */
    protected createPropertiesFromSchema(schema: EntitySchema): void {
        schema.properties.forEach(propSchema => {
            const property = this.createPropertyFromSchema(propSchema);
            if (property) {
                this.properties.addProperty(property);
                
                if (propSchema.networkSync) {
                    this.networkSyncedProperties.add(propSchema.name);
                    this.setupNetworkSync(property);
                }
            }
        });
    }

    /**
     * ✅ HELPER: Get typed property access
     */
    protected getProperty<T>(name: string): ReactiveProperty<T> | undefined {
        return this.properties.getProperty<T>(name);
    }

    // ✅ FIXED: Specific property type helpers for convenience
    protected getBooleanProperty(name: string) { return this.properties.getBooleanProperty(name); }
    protected getNumericProperty(name: string) { return this.properties.getNumericProperty(name); }
    protected getEnumProperty<T extends string>(name: string) { return this.properties.getEnumProperty<T>(name); }
    protected getVectorProperty(name: string) { return this.properties.getVectorProperty(name); }
    protected getCollectionProperty<T>(name: string) { return this.properties.getCollectionProperty<T>(name); }

    private createPropertyFromSchema(schema: PropertySchema): ReactiveProperty<any> | null {
        const { 
            BooleanProperty, 
            NumericProperty, 
            EnumProperty, 
            VectorProperty, 
            CollectionProperty 
        } = require('../components/ReactivePropertyComponent');
        const { Vector3 } = require('@babylonjs/core');

        try {
            switch (schema.type) {
                case 'boolean':
                    return new BooleanProperty(schema.name, schema.defaultValue);
                    
                case 'number':
                    return new NumericProperty(
                        schema.name,
                        schema.defaultValue,
                        schema.constraints?.min,
                        schema.constraints?.max
                    );
                    
                case 'enum':
                    return new EnumProperty(
                        schema.name,
                        schema.defaultValue,
                        schema.constraints?.validValues || []
                    );
                    
                case 'vector':
                    const defaultVec = schema.defaultValue;
                    return new VectorProperty(
                        schema.name,
                        new Vector3(defaultVec.x, defaultVec.y, defaultVec.z)
                    );
                    
                case 'collection':
                    return new CollectionProperty(schema.name, schema.defaultValue);
                    
                default:
                    console.warn(`Unknown property type: ${schema.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`Failed to create property ${schema.name}:`, error);
            return null;
        }
    }

    private setupNetworkSync(property: ReactiveProperty<any>): void {
        const cleanup = property.onChange((event) => {
            if (!event.source.startsWith('network_')) {
                this.onPropertyChanged(property.getName(), event.to);
            }
        });
        
        this.propertyChangeCleanup.push(() => cleanup.remove());
    }

    // CORRECTED: Keep parameters - this is meant to be overridden by subclasses
    // The parameters provide essential context for network synchronization
    protected onPropertyChanged(propertyName: string, value: any): void {
        // Override in network manager
        // Parameters provide essential context for network synchronization
        if (false) { // Debug flag
            console.log(`Network property changed: ${propertyName}`, value);
        }
        
        // Validate parameters (useful for debugging)
        if (typeof propertyName !== 'string' || propertyName.length === 0) {
            console.warn('Invalid property name in network change:', propertyName);
        }
    }
    /**
     * ✅ FIXED: Better error handling for network updates
     */
    applyNetworkUpdate(propertyName: string, value: any, source: string = 'network_update'): void {
        try {
            const property = this.properties.getProperty(propertyName);
            if (!property || !this.networkSyncedProperties.has(propertyName)) {
                console.warn(`Network update for unknown/non-synced property: ${propertyName}`);
                return;
            }

            // FIXED: Add proper type checking for vector serialization
            if (property.getName() === 'position' && this.isVector3Object(value)) {
                const { Vector3 } = require('@babylonjs/core');
                property.set(new Vector3(value.x, value.y, value.z), source);
            } else {
                property.set(value, source);
            }
        } catch (error) {
            console.error(`Failed to apply network update for ${propertyName}:`, error);
        }
    }

    // FIXED: Type guard helper for Vector3-like objects
    private isVector3Object(value: any): value is { x: number; y: number; z: number } {
        return value && 
               typeof value === 'object' && 
               typeof value.x === 'number' && 
               typeof value.y === 'number' && 
               typeof value.z === 'number';
    }

    getNetworkSnapshot(): NetworkSnapshot {
        const snapshot: Record<string, any> = {};
        
        this.networkSyncedProperties.forEach(propName => {
            const property = this.properties.getProperty(propName);
            if (property) {
                const value = property.getValue();
                
                // FIXED: Use type guard for vector serialization
                if (propName === 'position' && this.isVector3Object(value)) {
                    snapshot[propName] = { x: value.x, y: value.y, z: value.z };
                } else {
                    snapshot[propName] = value;
                }
            }
        });

        // Add required NetworkSnapshot properties
        return {
            id: this.getNetworkId(),
            timestamp: Date.now(),
            ...snapshot
        };
    }

    protected abstract setupBehaviors(): void;

    protected setupRoleBehaviors(): void {
        if (this.role.isServer) {
            this.setupServerBehaviors();
        }
        if (this.role.isClient) {
            this.setupClientBehaviors();
        }
        if (this.role.ownedByThisClient) {
            this.setupInputHandling();
        }
    }

    protected setupServerBehaviors(): void { /* Override in subclasses */ }
    protected setupClientBehaviors(): void { /* Override in subclasses */ }
    protected setupInputHandling(): void { /* Override in subclasses */ }

    /**
     * ✅ FIXED: Centralized cleanup helper
     */
    protected addCleanupFunction(cleanup: () => void): void {
        this.entityCleanup.push(cleanup);
    }

    getNetworkId(): string { return this.networkId; }
    getRole(): NetworkRole { return this.role; }
    isOwnedByThisClient(): boolean { return this.role.ownedByThisClient || false; }

    setPropertyChangeCallback(callback: (entityId: string, propertyName: string, value: any) => void): void {
        this.onPropertyChanged = (propertyName: string, value: any) => {
            callback(this.networkId, propertyName, value);
        };
    }

    dispose(): void {
        // ✅ FIXED: Comprehensive cleanup
        this.propertyChangeCleanup.forEach(cleanup => cleanup());
        this.entityCleanup.forEach(cleanup => cleanup());
        this.propertyChangeCleanup = [];
        this.entityCleanup = [];
        super.dispose();
    }
}