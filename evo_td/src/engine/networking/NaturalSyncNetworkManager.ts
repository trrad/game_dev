// src/engine/networking/NaturalSyncNetworkManager.ts - Automatic property sync based on schema authority

import { SimpleNetworkManager } from './SimpleNetworkManager';
import { NetworkReactiveEntity } from './NetworkReactiveEntity';
import { NetworkRole, NetworkMessage } from './NetworkTypes';

/**
 * Enhanced NetworkManager that automatically sets up property synchronization
 * based on entity schema authority patterns. Eliminates manual registration
 * and callback setup.
 */
export class NaturalSyncNetworkManager extends SimpleNetworkManager {
    private autoSyncCleanup: Map<string, (() => void)[]> = new Map();
    private syncStats = {
        propertiesObserved: 0,
        messagesSent: 0,
        messagesReceived: 0,
        authoritySwitches: 0
    };

    constructor(role: NetworkRole) {
        super(role);
        console.log(`🌐 NaturalSyncNetworkManager initialized for ${role.isServer ? 'SERVER' : 'CLIENT'} with automatic property sync`);
    }

    /**
     * ✅ ENHANCED: Register entity with automatic property sync setup
     */
    registerEntity(entity: NetworkReactiveEntity): void {
        // Call parent registration for basic setup
        super.registerEntity(entity);
        
        // ✅ NEW: Set up automatic property sync based on role + authority
        this.setupAutomaticPropertySync(entity);
        
        console.log(`🏗️ ${entity.getNetworkId()}: Auto-sync configured for ${this.role.isServer ? 'SERVER' : 'CLIENT'}`);
    }

    /**
     * ✅ NEW: Automatic property sync setup based on entity authority patterns
     */
    private setupAutomaticPropertySync(entity: NetworkReactiveEntity): void {
        const cleanupFunctions: (() => void)[] = [];
        
        // Set up sync based on role
        if (this.role.isClient) {
            this.setupClientPropertySync(entity, cleanupFunctions);
        }
        
        if (this.role.isServer) {
            this.setupServerPropertySync(entity, cleanupFunctions);
        }
        
        // Store cleanup functions for disposal
        this.autoSyncCleanup.set(entity.getNetworkId(), cleanupFunctions);
        
        // Log sync configuration
        this.logSyncConfiguration(entity);
    }

    /**
     * ✅ CLIENT: Send client-authoritative properties, receive server-authoritative properties
     */
    private setupClientPropertySync(entity: NetworkReactiveEntity, cleanupFunctions: (() => void)[]): void {
        const clientAuthProperties = entity.getClientAuthProperties();
        
        // Set up outgoing sync for client-authoritative properties
        clientAuthProperties.forEach(propName => {
            const property = entity.getProperty(propName);
            if (property) {
                const cleanup = property.onChange((event) => {
                    // Only send if this change didn't come from the network
                    if (!event.source.startsWith('network_')) {
                        this.sendNetworkPropertyUpdate(entity.getNetworkId(), propName, event.to, 'client');
                        this.syncStats.messagesSent++;
                    }
                });
                cleanupFunctions.push(() => cleanup.remove());
                this.syncStats.propertiesObserved++;
            }
        });
        
        console.log(`📤 CLIENT ${entity.getNetworkId()}: Auto-sending properties [${clientAuthProperties.join(', ')}]`);
    }

    /**
     * ✅ SERVER: Receive client-authoritative properties, send server-authoritative properties
     */
    private setupServerPropertySync(entity: NetworkReactiveEntity, cleanupFunctions: (() => void)[]): void {
        const serverAuthProperties = entity.getServerAuthProperties();
        
        // Set up outgoing sync for server-authoritative properties
        serverAuthProperties.forEach(propName => {
            const property = entity.getProperty(propName);
            if (property) {
                const cleanup = property.onChange((event) => {
                    // Only send if this change didn't come from the network
                    if (!event.source.startsWith('network_')) {
                        this.sendNetworkPropertyUpdate(entity.getNetworkId(), propName, event.to, 'server');
                        this.syncStats.messagesSent++;
                    }
                });
                cleanupFunctions.push(() => cleanup.remove());
                this.syncStats.propertiesObserved++;
            }
        });
        
        console.log(`📤 SERVER ${entity.getNetworkId()}: Auto-sending properties [${serverAuthProperties.join(', ')}]`);
    }

    /**
     * ✅ ENHANCED: Message handling with automatic authority validation
     */
    handleMessage(message: NetworkMessage): void {
        const entity = this.entities.get(message.entityId);
        if (!entity) {
            console.warn(`📥 No entity found for message: ${message.entityId}`);
            return;
        }

        // ✅ AUTOMATIC: Use entity's authority configuration for validation
        if (message.propertyName && !entity.shouldAcceptProperty(message.propertyName)) {
            console.warn(`🚫 ${this.role.isServer ? 'SERVER' : 'CLIENT'}: Rejected ${message.authority}-auth property ${message.propertyName} from ${message.senderId}`);
            return;
        }

        // Process the message
        this.handlePropertyUpdate(entity, message);
        this.syncStats.messagesReceived++;
    }

    /**
     * ✅ ENHANCED: Property update handling with automatic authority routing
     */
    private handlePropertyUpdate(entity: NetworkReactiveEntity, message: NetworkMessage): void {
        const { propertyName, data, authority } = message;
        
        if (!propertyName || !data || data.value === undefined) {
            console.warn(`❌ Invalid property update message:`, message);
            return;
        }

        console.log(`📥 ${this.role.isServer ? 'SERVER' : 'CLIENT'} ${entity.getNetworkId()}: Applying ${authority}-auth update ${propertyName} = ${JSON.stringify(data.value)}`);
        
        // Apply with authority context
        entity.applyNetworkUpdate(
            propertyName, 
            data.value, 
            `network_${authority}_${message.senderId}`,
            authority
        );
    }

    /**
     * ✅ ENHANCED: Send property update using parent class method
     */
    private sendNetworkPropertyUpdate(entityId: string, propertyName: string, value: any, authority: 'client' | 'server'): void {
        if (!this.sendCallback) return;

        // Validate that we should be sending this authority type
        if (!this.canSendProperty(authority)) {
            console.warn(`🚫 ${this.role.isServer ? 'SERVER' : 'CLIENT'} cannot send ${authority}-authoritative property: ${propertyName}`);
            return;
        }

        const message: NetworkMessage = {
            type: 'property_update',
            entityId,
            propertyName,
            data: { value },
            authority,
            timestamp: Date.now(),
            senderId: this.role.isServer ? 'server' : 'client'
        };

        console.log(`📤 Sending ${authority}-auth property: ${propertyName} = ${JSON.stringify(value)} from ${message.senderId}`);
        this.sendCallback(message);
    }

    /**
     * ✅ ENHANCED: Authority validation for outgoing messages
     */
    private canSendProperty(authority: 'client' | 'server'): boolean {
        if (authority === 'client') {
            return this.role.isClient; // Only clients can send client-auth properties
        } else {
            return this.role.isServer; // Only servers can send server-auth properties
        }
    }

    /**
     * ✅ NEW: Log sync configuration for debugging
     */
    private logSyncConfiguration(entity: NetworkReactiveEntity): void {
        const config = {
            entityId: entity.getNetworkId(),
            role: this.role.isServer ? 'SERVER' : 'CLIENT',
            sending: entity.getPropertiesToSend(),
            receiving: entity.getPropertiesToReceive(),
            localOnly: entity.getLocalOnlyProperties()
        };
        
        console.log(`🔄 Auto-sync config for ${entity.getNetworkId()}:`, config);
    }

    /**
     * ✅ NEW: Get natural sync statistics
     */
    getNaturalSyncStats(): {
        role: string;
        entitiesRegistered: number;
        propertiesObserved: number;
        messagesSent: number;
        messagesReceived: number;
        authoritySwitches: number;
        cleanupFunctionsActive: number;
    } {
        const totalCleanupFunctions = Array.from(this.autoSyncCleanup.values())
            .reduce((total, cleanups) => total + cleanups.length, 0);

        return {
            role: this.role.isServer ? 'server' : 'client',
            entitiesRegistered: this.entities.size,
            propertiesObserved: this.syncStats.propertiesObserved,
            messagesSent: this.syncStats.messagesSent,
            messagesReceived: this.syncStats.messagesReceived,
            authoritySwitches: this.syncStats.authoritySwitches,
            cleanupFunctionsActive: totalCleanupFunctions
        };
    }

    /**
     * ✅ NEW: Debug method for natural sync status
     */
    debugNaturalSync(): void {
        const stats = this.getNaturalSyncStats();
        console.log('🔍 Natural Sync Status:', stats);
        
        console.log('📋 Registered Entities with Auto-Sync:');
        this.entities.forEach((entity, id) => {
            const config = {
                id,
                role: entity.getRole().isClient ? 'CLIENT' : 'SERVER',
                sending: entity.getPropertiesToSend(),
                receiving: entity.getPropertiesToReceive()
            };
            console.log(`  ${id}:`, config);
        });
    }

    /**
     * ✅ ENHANCED: Cleanup with automatic sync disposal
     */
    dispose(): void {
        // Clean up all automatic sync observers
        this.autoSyncCleanup.forEach((cleanupFunctions, entityId) => {
            cleanupFunctions.forEach(cleanup => cleanup());
            console.log(`🧹 Cleaned up auto-sync for entity: ${entityId}`);
        });
        
        this.autoSyncCleanup.clear();
        console.log(`🧹 NaturalSyncNetworkManager disposed with ${this.syncStats.messagesSent} messages sent, ${this.syncStats.messagesReceived} received`);
    }
}

/*
🎯 NATURAL SYNC FLOW SUMMARY:

🔵 CLIENT ROLE:
- Automatically observes client-auth properties → sends to server
- Automatically receives server-auth updates → applies to server-auth properties
- No manual registration, no manual callbacks

🔴 SERVER ROLE:  
- Automatically observes server-auth properties → sends to clients
- Automatically receives client-auth updates → applies to client-auth properties
- No manual registration, no manual callbacks

📊 EXAMPLE ENTITY FLOW:

Schema: position (server-auth), mouseWorldPosition (client-auth)

CLIENT ENTITY:
- Observes mouseWorldPosition changes → auto-sends to server
- Receives position updates from server → auto-applies locally

SERVER ENTITY:
- Observes position changes → auto-sends to clients  
- Receives mouseWorldPosition from clients → auto-applies locally

✅ ZERO MANUAL WIRING - Everything driven by schema authority flags!
*/