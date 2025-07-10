// src/engine/networking/NetworkReactiveEntity.ts - Enhanced with State History

import { GameNodeObject } from '../core/GameNodeObject';
import { StateHistory } from '../core/StateHistory';
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
 * NetworkReactiveEntity with State History for lag compensation
 * 
 * Now includes:
 * - Automatic state recording (when enabled globally)
 * - Time-based state queries for lag compensation
 * - State snapshot/restore functionality
 */
export abstract class NetworkReactiveEntity extends GameNodeObject {
    protected properties: ReactivePropertiesComponent;
    private role: NetworkRole;
    private networkId: string;
    private networkSyncedProperties: Set<string> = new Set();
    private propertyAuthorities: Map<string, 'client' | 'server'> = new Map();
    private propertyChangeCleanup: (() => void)[] = [];
    private entityCleanup: (() => void)[] = [];
    
    // State History
    private stateHistory?: StateHistory;
    private stateRecordingObservers: Array<() => void> = [];
    
    // Global state history configuration
    private static globalStateHistoryEnabled: boolean = false;
    private static globalHistoryDuration: number = 1000; // 1 second default
    private static globalMaxHistoryEntries: number = 10000;

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
        
        // Initialize state history if globally enabled
        if (NetworkReactiveEntity.globalStateHistoryEnabled) {
            this.stateHistory = new StateHistory(
                NetworkReactiveEntity.globalHistoryDuration,
                NetworkReactiveEntity.globalMaxHistoryEntries
            );
        }
    }

    // ============================================================
    // STATE HISTORY CONFIGURATION
    // ============================================================

    /**
     * Enable state history globally for all entities
     * Should be called once during server initialization
     */
    static enableStateHistory(duration: number = 1000, maxEntries: number = 10000): void {
        this.globalStateHistoryEnabled = true;
        this.globalHistoryDuration = duration;
        this.globalMaxHistoryEntries = maxEntries;
        
        console.log(`📜 State History enabled globally: ${duration}ms buffer, max ${maxEntries} entries`);
    }

    /**
     * Disable state history globally
     */
    static disableStateHistory(): void {
        this.globalStateHistoryEnabled = false;
        console.log('📜 State History disabled globally');
    }

    /**
     * Check if state history is enabled
     */
    static isStateHistoryEnabled(): boolean {
        return this.globalStateHistoryEnabled;
    }

    // ============================================================
    // STATE HISTORY API
    // ============================================================

    /**
     * Get entity state at a specific timestamp
     * Returns current state if history is not enabled
     */
    getStateAt(timestamp: number): Map<string, any> {
        if (!this.stateHistory) {
            // Fallback: return current state
            return this.getCurrentState();
        }
        
        return this.stateHistory.getStateAt(timestamp);
    }

    /**
     * Get a specific property value at a timestamp
     */
    getPropertyAt(propertyName: string, timestamp: number): any {
        if (!this.stateHistory) {
            // Fallback: return current value
            const prop = this.properties.getProperty(propertyName);
            return prop?.getValue();
        }
        
        return this.stateHistory.getPropertyAt(propertyName, timestamp);
    }

    /**
     * Rewind entity to a specific timestamp
     */
    rewindToTime(timestamp: number): void {
        const historicalState = this.getStateAt(timestamp);
        this.applyStateSnapshot(historicalState);
        
        console.log(`⏪ ${this.networkId} rewound to ${new Date(timestamp).toISOString()}`);
    }

    /**
     * Apply a state snapshot to this entity
     */
    applyStateSnapshot(snapshot: Map<string, any>): void {
        // Temporarily disable recording to avoid recording the rewind itself
        const wasRecording = this.isRecordingEnabled();
        this.pauseStateRecording();
        
        snapshot.forEach((value, propertyName) => {
            const property = this.properties.getProperty(propertyName);
            if (property) {
                property.set(value, 'state_restore');
            }
        });
        
        if (wasRecording) {
            this.resumeStateRecording();
        }
    }

    /**
     * Get current state as a snapshot
     */
    getCurrentState(): Map<string, any> {
        const state = new Map<string, any>();
        
        this.properties.getAllProperties().forEach(property => {
            state.set(property.getName(), property.getValue());
        });
        
        return state;
    }

    /**
     * Get state history statistics
     */
    getStateHistoryStats(): any {
        return this.stateHistory?.getStats() || null;
    }

    // ============================================================
    // SCHEMA-BASED PROPERTY CREATION (Enhanced)
    // ============================================================

    /**
     * Create properties from schema with automatic state recording
     */
    protected createPropertiesFromSchema(schema: EntitySchema): void {
        schema.properties.forEach(propSchema => {
            const property = this.createPropertyFromSchema(propSchema);
            if (property) {
                this.properties.addProperty(property);
                
                // Store authority and network sync info
                if (propSchema.networkSync) {
                    this.networkSyncedProperties.add(propSchema.name);
                    this.propertyAuthorities.set(propSchema.name, propSchema.authority);
                }
                
                // Set up state recording for this property
                if (this.stateHistory) {
                    this.setupPropertyRecording(property);
                }
            }
        });
        
        console.log(`🏗️ ${this.networkId}: Created properties with state recording:`, {
            recording: this.isRecordingEnabled(),
            clientAuth: this.getClientAuthProperties(),
            serverAuth: this.getServerAuthProperties(),
            localOnly: this.getLocalOnlyProperties()
        });
    }

    /**
     * Set up state recording for a single property
     */
    private setupPropertyRecording(property: ReactiveProperty<any>): void {
        if (!this.stateHistory) return;
        
        const observer = property.onChange((event) => {
            // Only record if not from a state restore
            if (event.source !== 'state_restore') {
                this.stateHistory!.record(
                    property.getName(),
                    event.to,
                    event.timestamp || Date.now()
                );
            }
        });
        
        // Store observer for cleanup
        this.stateRecordingObservers.push(() => observer.remove());
    }

    /**
     * Check if state recording is enabled
     */
    private isRecordingEnabled(): boolean {
        return this.stateHistory !== undefined && this.stateRecordingObservers.length > 0;
    }

    /**
     * Temporarily pause state recording
     */
    private pauseStateRecording(): void {
        this.stateRecordingObservers.forEach(cleanup => cleanup());
        this.stateRecordingObservers = [];
    }

    /**
     * Resume state recording after pause
     */
    private resumeStateRecording(): void {
        if (!this.stateHistory) return;
        
        this.properties.getAllProperties().forEach(property => {
            this.setupPropertyRecording(property);
        });
    }

    // ============================================================
    // EXISTING METHODS (unchanged from original)
    // ============================================================

    public getClientAuthProperties(): string[] {
        return Array.from(this.propertyAuthorities.entries())
            .filter(([name, auth]) => auth === 'client')
            .map(([name]) => name);
    }

    public getServerAuthProperties(): string[] {
        return Array.from(this.propertyAuthorities.entries())
            .filter(([name, auth]) => auth === 'server')
            .map(([name]) => name);
    }

    public getLocalOnlyProperties(): string[] {
        return this.properties.getPropertyNames()
            .filter(name => !this.networkSyncedProperties.has(name));
    }

    public getPropertyAuthority(propertyName: string): 'client' | 'server' | 'local' {
        if (this.propertyAuthorities.has(propertyName)) {
            return this.propertyAuthorities.get(propertyName)!;
        }
        return 'local';
    }

    public shouldSendProperty(propertyName: string): boolean {
        const authority = this.getPropertyAuthority(propertyName);
        if (authority === 'local') return false;
        
        if (authority === 'client' && this.role.isClient) return true;
        if (authority === 'server' && this.role.isServer) return true;
        
        return false;
    }

    public shouldAcceptProperty(propertyName: string): boolean {
        const authority = this.getPropertyAuthority(propertyName);
        if (authority === 'local') return false;
        
        if (authority === 'server' && this.role.isClient) return true;
        if (authority === 'client' && this.role.isServer) return true;
        
        return false;
    }

    public getPropertiesToSend(): string[] {
        if (this.role.isClient) {
            return this.getClientAuthProperties();
        } else if (this.role.isServer) {
            return this.getServerAuthProperties();
        }
        return [];
    }

    public getPropertiesToReceive(): string[] {
        if (this.role.isClient) {
            return this.getServerAuthProperties();
        } else if (this.role.isServer) {
            return this.getClientAuthProperties();
        }
        return [];
    }

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

            if (authority && !this.shouldAcceptProperty(propertyName)) {
                console.warn(`🚫 ${this.networkId}: Rejected ${authority}-auth property ${propertyName} (role: ${this.role.isClient ? 'client' : 'server'})`);
                return;
            }

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

    getNetworkSnapshot(): NetworkSnapshot {
        const snapshot: Record<string, any> = {};
        const propertiesToSend = this.getPropertiesToSend();
        
        propertiesToSend.forEach(propName => {
            const property = this.properties.getProperty(propName);
            if (property) {
                const value = property.getValue();
                
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

    // Property access methods
    public getProperty<T>(name: string): ReactiveProperty<T> | undefined {
        return this.properties.getProperty<T>(name);
    }

    public getBooleanProperty(name: string) { return this.properties.getBooleanProperty(name); }
    public getNumericProperty(name: string) { return this.properties.getNumericProperty(name); }
    public getEnumProperty<T extends string>(name: string) { return this.properties.getEnumProperty<T>(name); }
    public getVectorProperty(name: string) { return this.properties.getVectorProperty(name); }
    public getCollectionProperty<T>(name: string) { return this.properties.getCollectionProperty<T>(name); }

    // Private helper methods
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

    // Legacy methods
    protected onPropertyChanged(propertyName: string, value: any, authority: 'client' | 'server'): void { }

    setPropertyChangeCallback(callback: (entityId: string, propertyName: string, value: any, authority: 'client' | 'server') => void): void {
        this.onPropertyChanged = (propertyName: string, value: any, authority: 'client' | 'server') => {
            callback(this.networkId, propertyName, value, authority);
        };
    }

    // Abstract methods
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

    protected setupServerBehaviors(): void { }
    protected setupClientBehaviors(): void { }
    protected setupInputHandling(): void { }

    protected addCleanupFunction(cleanup: () => void): void {
        this.entityCleanup.push(cleanup);
    }

    getNetworkId(): string { return this.networkId; }
    getRole(): NetworkRole { return this.role; }
    isOwnedByThisClient(): boolean { return this.role.ownedByThisClient || false; }

    dispose(): void {
        // Clean up state recording observers
        this.stateRecordingObservers.forEach(cleanup => cleanup());
        this.stateRecordingObservers = [];
        
        // Clear state history
        if (this.stateHistory) {
            this.stateHistory.clear();
        }
        
        // Existing cleanup
        this.propertyChangeCleanup.forEach(cleanup => cleanup());
        this.entityCleanup.forEach(cleanup => cleanup());
        this.propertyChangeCleanup = [];
        this.entityCleanup = [];
        
        super.dispose();
    }
}