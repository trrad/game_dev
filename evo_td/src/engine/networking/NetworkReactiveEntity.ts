// src/engine/networking/NetworkReactiveEntity.ts - Enhanced with authority tracking

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
 * NetworkReactiveEntity with enhanced authority direction support and automatic sync capabilities
 */
export abstract class NetworkReactiveEntity extends GameNodeObject {
    protected properties: ReactivePropertiesComponent;
    private role: NetworkRole;
    private networkId: string;
    private networkSyncedProperties: Set<string> = new Set();
    private propertyAuthorities: Map<string, 'client' | 'server'> = new Map();
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
     * ✅ ENHANCED: Schema-based property creation with authority tracking
     */
    protected createPropertiesFromSchema(schema: EntitySchema): void {
        schema.properties.forEach(propSchema => {
            const property = this.createPropertyFromSchema(propSchema);
            if (property) {
                this.properties.addProperty(property);
                
                // ✅ ENHANCED: Store authority and network sync info
                if (propSchema.networkSync) {
                    this.networkSyncedProperties.add(propSchema.name);
                    this.propertyAuthorities.set(propSchema.name, propSchema.authority);
                }
            }
        });
        
        console.log(`🏗️ ${this.networkId}: Created properties with authorities:`, {
            clientAuth: this.getClientAuthProperties(),
            serverAuth: this.getServerAuthProperties(),
            localOnly: this.getLocalOnlyProperties()
        });
    }

    // ============================================================
    // ✅ NEW: Authority Query Methods for Natural Sync
    // ============================================================

    /**
     * Get properties that this entity has client authority over
     */
    public getClientAuthProperties(): string[] {
        return Array.from(this.propertyAuthorities.entries())
            .filter(([name, auth]) => auth === 'client')
            .map(([name]) => name);
    }

    /**
     * Get properties that this entity has server authority over
     */
    public getServerAuthProperties(): string[] {
        return Array.from(this.propertyAuthorities.entries())
            .filter(([name, auth]) => auth === 'server')
            .map(([name]) => name);
    }

    /**
     * Get properties that don't sync over network (local only)
     */
    public getLocalOnlyProperties(): string[] {
        return this.properties.getPropertyNames()
            .filter(name => !this.networkSyncedProperties.has(name));
    }

    /**
     * Get the authority for a specific property
     */
    public getPropertyAuthority(propertyName: string): 'client' | 'server' | 'local' {
        if (this.propertyAuthorities.has(propertyName)) {
            return this.propertyAuthorities.get(propertyName)!;
        }
        return 'local'; // Not networked
    }

    /**
     * Check if this entity should send updates for a property (has authority)
     */
    public shouldSendProperty(propertyName: string): boolean {
        const authority = this.getPropertyAuthority(propertyName);
        if (authority === 'local') return false;
        
        // Send if we have authority for this property
        if (authority === 'client' && this.role.isClient) return true;
        if (authority === 'server' && this.role.isServer) return true;
        
        return false;
    }

    /**
     * Check if this entity should accept updates for a property (lacks authority)
     */
    public shouldAcceptProperty(propertyName: string): boolean {
        const authority = this.getPropertyAuthority(propertyName);
        if (authority === 'local') return false;
        
        // Accept if we DON'T have authority for this property
        if (authority === 'server' && this.role.isClient) return true;
        if (authority === 'client' && this.role.isServer) return true;
        
        return false;
    }

    /**
     * Get all properties this entity should send (based on role + authority)
     */
    public getPropertiesToSend(): string[] {
        if (this.role.isClient) {
            return this.getClientAuthProperties();
        } else if (this.role.isServer) {
            return this.getServerAuthProperties();
        }
        return [];
    }

    /**
     * Get all properties this entity should receive (based on role + authority)
     */
    public getPropertiesToReceive(): string[] {
        if (this.role.isClient) {
            return this.getServerAuthProperties();
        } else if (this.role.isServer) {
            return this.getClientAuthProperties();
        }
        return [];
    }

    // ============================================================
    // EXISTING METHODS (unchanged but enhanced for debugging)
    // ============================================================

    /**
     * ✅ ENHANCED: Apply network update with enhanced authority validation
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
                console.warn(`❌ Network update for unknown/non-synced property: ${propertyName} on ${this.networkId}`);
                return;
            }

            // ✅ ENHANCED: Authority validation with better logging
            if (authority && !this.shouldAcceptProperty(propertyName)) {
                console.warn(`🚫 ${this.networkId}: Rejected ${authority}-auth property ${propertyName} (role: ${this.role.isClient ? 'client' : 'server'})`);
                return;
            }

            // Handle Vector3 serialization
            if (property.getName() === 'position' && this.isVector3Object(value)) {
                property.set(new Vector3(value.x, value.y, value.z), source);
            } else {
                property.set(value, source);
            }

            console.log(`✅ ${this.networkId}: Applied ${authority}-auth update ${propertyName} = ${JSON.stringify(value)} [${source}]`);
        } catch (error) {
            console.error(`💥 Failed to apply network update for ${propertyName} on ${this.networkId}:`, error);
        }
    }

    /**
     * ✅ ENHANCED: Network snapshot with role-based filtering
     */
    getNetworkSnapshot(): NetworkSnapshot {
        const snapshot: Record<string, any> = {};
        
        // Only include properties this entity should send
        const propertiesToSend = this.getPropertiesToSend();
        
        propertiesToSend.forEach(propName => {
            const property = this.properties.getProperty(propName);
            if (property) {
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
    // EXISTING PROPERTY ACCESS METHODS (unchanged)
    // ============================================================

    public getProperty<T>(name: string): ReactiveProperty<T> | undefined {
        return this.properties.getProperty<T>(name);
    }

    public getBooleanProperty(name: string) { return this.properties.getBooleanProperty(name); }
    public getNumericProperty(name: string) { return this.properties.getNumericProperty(name); }
    public getEnumProperty<T extends string>(name: string) { return this.properties.getEnumProperty<T>(name); }
    public getVectorProperty(name: string) { return this.properties.getVectorProperty(name); }
    public getCollectionProperty<T>(name: string) { return this.properties.getCollectionProperty<T>(name); }

    // ============================================================
    // EXISTING PRIVATE METHODS (unchanged)
    // ============================================================

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

    // ============================================================
    // LEGACY COMPATIBILITY (will be removed in natural sync)
    // ============================================================

    protected onPropertyChanged(propertyName: string, value: any, authority: 'client' | 'server'): void {
        // Legacy method - will be replaced by automatic sync
        if (false) { // Debug flag
            console.log(`Legacy property changed: ${propertyName}`, value, `(${authority}-auth)`);
        }
    }

    setPropertyChangeCallback(callback: (entityId: string, propertyName: string, value: any, authority: 'client' | 'server') => void): void {
        this.onPropertyChanged = (propertyName: string, value: any, authority: 'client' | 'server') => {
            callback(this.networkId, propertyName, value, authority);
        };
    }

    // ============================================================
    // ABSTRACT METHODS AND LIFECYCLE (unchanged)
    // ============================================================

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

    protected addCleanupFunction(cleanup: () => void): void {
        this.entityCleanup.push(cleanup);
    }

    getNetworkId(): string { return this.networkId; }
    getRole(): NetworkRole { return this.role; }
    isOwnedByThisClient(): boolean { return this.role.ownedByThisClient || false; }

    dispose(): void {
        this.propertyChangeCleanup.forEach(cleanup => cleanup());
        this.entityCleanup.forEach(cleanup => cleanup());
        this.propertyChangeCleanup = [];
        this.entityCleanup = [];
        super.dispose();
    }
}