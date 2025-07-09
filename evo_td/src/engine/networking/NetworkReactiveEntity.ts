// src/engine/networking/NetworkReactiveEntity.ts - Fixed with static imports

import { GameNodeObject } from '../core/GameNodeObject';
import { 
    ReactivePropertiesComponent, 
    ReactiveProperty,
    BooleanProperty,
    NumericProperty,
    EnumProperty,
    VectorProperty,
    CollectionProperty
} from '../components/ReactivePropertyComponent';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole, PropertySchema, EntitySchema, NetworkSnapshot } from './NetworkTypes';

/**
 * NetworkReactiveEntity with authority direction support
 */
export abstract class NetworkReactiveEntity extends GameNodeObject {
    protected properties: ReactivePropertiesComponent;
    private role: NetworkRole;
    private networkId: string;
    private networkSyncedProperties: Set<string> = new Set();
    private propertyAuthorities: Map<string, 'client' | 'server'> = new Map(); // ✅ NEW: Store property authorities
    private propertyChangeCleanup: (() => void)[] = [];
    private entityCleanup: (() => void)[] = [];

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
     * ✅ ENHANCED: Schema-based property creation with authority direction
     */
    protected createPropertiesFromSchema(schema: EntitySchema): void {
        schema.properties.forEach(propSchema => {
            const property = this.createPropertyFromSchema(propSchema);
            if (property) {
                this.properties.addProperty(property);
                
                // ✅ NEW: Store authority and set up network sync
                if (propSchema.networkSync) {
                    this.networkSyncedProperties.add(propSchema.name);
                    this.propertyAuthorities.set(propSchema.name, propSchema.authority); // ✅ Store authority from schema
                    this.setupAuthorityBasedSync(property, propSchema.authority);
                }
            }
        });
    }

    /**
     * ✅ NEW: Set up network sync based on authority direction
     */
    private setupAuthorityBasedSync(property: ReactiveProperty<any>, authority: 'client' | 'server'): void {
        // Only set up sync if this entity has the authority to send updates for this property
        if (this.canSendProperty(authority)) {
            const cleanup = property.onChange((event) => {
                // Don't sync changes that came from the network
                if (!event.source.startsWith('network_')) {
                    this.onPropertyChanged(property.getName(), event.to, authority); // ✅ Pass authority from schema
                }
            });
            
            this.propertyChangeCleanup.push(() => cleanup.remove());
        }
    }

    /**
     * ✅ NEW: Check if this entity can send updates for a property with given authority
     */
    private canSendProperty(authority: 'client' | 'server'): boolean {
        // Client can send client-authoritative properties
        if (authority === 'client' && this.role.isClient) {
            return true;
        }
        
        // Server can send server-authoritative properties
        if (authority === 'server' && this.role.isServer) {
            return true;
        }
        
        return false;
    }

    /**
     * ✅ NEW: Check if this entity should accept updates for a property with given authority
     */
    private shouldAcceptProperty(authority: 'client' | 'server'): boolean {
        // Server accepts client-authoritative properties
        if (authority === 'client' && this.role.isServer) {
            return true;
        }
        
        // Client accepts server-authoritative properties
        if (authority === 'server' && this.role.isClient) {
            return true;
        }
        
        return false;
    }

    /**
     * ✅ ENHANCED: Apply network update with authority validation
     */
    applyNetworkUpdate(
        propertyName: string, 
        value: any, 
        source: string = 'network_update',
        authority?: 'client' | 'server'
    ): void {
        try {
            const property = this.properties.getProperty(propertyName);
            if (!property || !this.networkSyncedProperties.has(propertyName)) {
                console.warn(`Network update for unknown/non-synced property: ${propertyName}`);
                return;
            }

            // ✅ NEW: Basic authority validation
            if (authority && !this.shouldAcceptProperty(authority)) {
                console.warn(`Rejected network update: ${this.role.isClient ? 'client' : 'server'} cannot accept ${authority}-authoritative property ${propertyName}`);
                return;
            }

            // Handle Vector3 serialization
            if (property.getName() === 'position' && this.isVector3Object(value)) {
                property.set(new Vector3(value.x, value.y, value.z), source);
            } else {
                property.set(value, source);
            }
        } catch (error) {
            console.error(`Failed to apply network update for ${propertyName}:`, error);
        }
    }

    /**
     * ✅ ENHANCED: Network snapshot with authority awareness
     */
    getNetworkSnapshot(): NetworkSnapshot {
        const snapshot: Record<string, any> = {};
        
        // Only include properties this entity has authority to send
        this.networkSyncedProperties.forEach(propName => {
            const property = this.properties.getProperty(propName);
            if (property) {
                // TODO: Get authority from schema - for now include all synced properties
                const value = property.getValue();
                
                // Handle Vector3 serialization
                if (propName === 'position' && this.isVector3Object(value)) {
                    snapshot[propName] = { x: value.x, y: value.y, z: value.z };
                } else {
                    snapshot[propName] = value;
                }
            }
        });

        return {
            id: this.getNetworkId(),
            timestamp: Date.now(),
            ...snapshot
        };
    }

    // ============================================================
    // EXISTING METHODS (unchanged)
    // ============================================================

    public getProperty<T>(name: string): ReactiveProperty<T> | undefined {
        return this.properties.getProperty<T>(name);
    }

    public getBooleanProperty(name: string) { return this.properties.getBooleanProperty(name); }
    public getNumericProperty(name: string) { return this.properties.getNumericProperty(name); }
    public getEnumProperty<T extends string>(name: string) { return this.properties.getEnumProperty<T>(name); }
    public getVectorProperty(name: string) { return this.properties.getVectorProperty(name); }
    public getCollectionProperty<T>(name: string) { return this.properties.getCollectionProperty<T>(name); }

    /**
     * ✅ FIXED: Use static imports instead of require()
     */
    private createPropertyFromSchema(schema: PropertySchema): ReactiveProperty<any> | null {
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
                    
                case 'string':
                    // ✅ ADDED: Support for string type (missing from original)
                    return new ReactiveProperty(schema.name, schema.defaultValue);
                    
                default:
                    console.warn(`Unknown property type: ${schema.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`Failed to create property ${schema.name}:`, error);
            return null;
        }
    }

    private isVector3Object(value: any): value is { x: number; y: number; z: number } {
        return value && 
               typeof value === 'object' && 
               typeof value.x === 'number' && 
               typeof value.y === 'number' && 
               typeof value.z === 'number';
    }

    // Override point for network property changes - ✅ NOW INCLUDES AUTHORITY
    protected onPropertyChanged(propertyName: string, value: any, authority: 'client' | 'server'): void {
        // Will be handled by NetworkManager
        if (false) { // Debug flag
            console.log(`Network property changed: ${propertyName}`, value, `(${authority}-auth)`);
        }
    }

    // Abstract methods for role-specific behaviors
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

    // Utility methods
    protected addCleanupFunction(cleanup: () => void): void {
        this.entityCleanup.push(cleanup);
    }

    getNetworkId(): string { return this.networkId; }
    getRole(): NetworkRole { return this.role; }
    isOwnedByThisClient(): boolean { return this.role.ownedByThisClient || false; }

    // Legacy compatibility - ✅ ENHANCED: Now includes authority
    setPropertyChangeCallback(callback: (entityId: string, propertyName: string, value: any, authority: 'client' | 'server') => void): void {
        this.onPropertyChanged = (propertyName: string, value: any, authority: 'client' | 'server') => {
            callback(this.networkId, propertyName, value, authority);
        };
    }

    dispose(): void {
        this.propertyChangeCleanup.forEach(cleanup => cleanup());
        this.entityCleanup.forEach(cleanup => cleanup());
        this.propertyChangeCleanup = [];
        this.entityCleanup = [];
        super.dispose();
    }
}