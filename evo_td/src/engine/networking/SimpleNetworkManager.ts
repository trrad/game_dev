// src/engine/networking/SimpleNetworkManager.ts - Updated with authority-based routing

import { NetworkReactiveEntity } from './NetworkReactiveEntity';
import { NetworkRole, NetworkMessage } from './NetworkTypes';

export class SimpleNetworkManager {
    private entities: Map<string, NetworkReactiveEntity> = new Map();
    private sendCallback?: (message: NetworkMessage) => void;
    private role: NetworkRole;

    constructor(role: NetworkRole) {
        this.role = role;
        console.log(`🌐 NetworkManager initialized for ${role.isServer ? 'SERVER' : 'CLIENT'}`);
    }

    registerEntity(entity: NetworkReactiveEntity): void {
        this.entities.set(entity.getNetworkId(), entity);
        
        // Set up property change callback with authority from entity
        entity.setPropertyChangeCallback((entityId, propertyName, value, authority) => {
            this.sendPropertyUpdate(entityId, propertyName, value, authority);
        });
        
        console.log(`📝 Registered entity: ${entity.getNetworkId()} (${this.role.isServer ? 'SERVER' : 'CLIENT'})`);
    }

    /**
     * ✅ ENHANCED: Send property update with authority from entity
     */
    private sendPropertyUpdate(entityId: string, propertyName: string, value: any, authority: 'client' | 'server'): void {
        if (!this.sendCallback) return;

        // ✅ AUTHORITY COMES FROM ENTITY (schema): No need to guess
        
        // ✅ NEW: Only send if we have authority for this property
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

        console.log(`📤 Sending ${authority}-auth property: ${propertyName} from ${message.senderId}`);
        this.sendCallback(message);
    }

    /**
     * ✅ ENHANCED: Handle incoming message with authority validation
     */
    handleMessage(message: NetworkMessage): void {
        const entity = this.entities.get(message.entityId);
        if (!entity) {
            console.warn(`📥 No entity found for message: ${message.entityId}`);
            return;
        }

        // ✅ NEW: Validate message authority
        if (!this.shouldAcceptMessage(message)) {
            console.warn(`🚫 Rejected ${message.authority}-auth message from ${message.senderId}: ${message.propertyName}`);
            return;
        }

        switch (message.type) {
            case 'property_update':
                this.handlePropertyUpdate(entity, message);
                break;
                
            default:
                console.warn(`Unknown message type: ${message.type}`);
        }
    }

    /**
     * ✅ NEW: Handle property update with authority context
     */
    private handlePropertyUpdate(entity: NetworkReactiveEntity, message: NetworkMessage): void {
        const { propertyName, data, authority } = message;
        
        if (!propertyName || !data || data.value === undefined) {
            console.warn(`Invalid property update message:`, message);
            return;
        }

        console.log(`📥 Applying ${authority}-auth update: ${propertyName} = ${JSON.stringify(data.value)}`);
        
        // Apply with authority context for validation
        entity.applyNetworkUpdate(
            propertyName, 
            data.value, 
            `network_${authority}_${message.senderId}`,
            authority
        );
    }

    /**
     * ✅ NEW: Check if this role can send updates for properties with given authority
     */
    private canSendProperty(authority: 'client' | 'server'): boolean {
        if (authority === 'client') {
            return this.role.isClient; // Only clients can send client-auth properties
        } else {
            return this.role.isServer; // Only servers can send server-auth properties
        }
    }

    /**
     * ✅ NEW: Check if this role should accept messages with given authority
     */
    private shouldAcceptMessage(message: NetworkMessage): boolean {
        const { authority, senderId } = message;

        // ✅ BASIC AUTHORITY VALIDATION
        if (authority === 'client') {
            // Client-auth messages should come from clients and be received by servers
            return this.role.isServer && senderId !== 'server';
        } else if (authority === 'server') {
            // Server-auth messages should come from server and be received by clients
            return this.role.isClient && senderId === 'server';
        }

        return false;
    }

    /**
     * ✅ ENHANCED: Send input with automatic authority handling
     */
    sendInput(entityId: string, inputData: any): void {
        // In the new reactive system, input flows through property updates
        // This method is kept for legacy compatibility but may not be needed
        console.log(`📤 Legacy input send: ${entityId}`, inputData);
        
        if (!this.sendCallback || this.role.isServer) return;

        const message: NetworkMessage = {
            type: 'property_update', // Even input uses property updates now
            entityId,
            data: inputData,
            authority: 'client', // Input is always client-authoritative
            timestamp: Date.now(),
            senderId: 'client'
        };

        this.sendCallback(message);
    }

    /**
     * Set callback for outgoing messages
     */
    setSendCallback(callback: (message: NetworkMessage) => void): void {
        this.sendCallback = callback;
        console.log(`🔗 Send callback registered for ${this.role.isServer ? 'SERVER' : 'CLIENT'}`);
    }

    /**
     * ✅ NEW: Get authority statistics for monitoring
     */
    getAuthorityStats(): {
        role: string;
        canSendClientAuth: boolean;
        canSendServerAuth: boolean;
        canReceiveClientAuth: boolean;
        canReceiveServerAuth: boolean;
        entitiesRegistered: number;
    } {
        return {
            role: this.role.isServer ? 'server' : 'client',
            canSendClientAuth: this.role.isClient,
            canSendServerAuth: this.role.isServer,
            canReceiveClientAuth: this.role.isServer,
            canReceiveServerAuth: this.role.isClient,
            entitiesRegistered: this.entities.size
        };
    }

    /**
     * ✅ NEW: Debug method to log authority configuration
     */
    debugAuthority(): void {
        const stats = this.getAuthorityStats();
        console.log('🔍 NetworkManager Authority Configuration:', stats);
        
        console.log('📋 Registered Entities:');
        this.entities.forEach((entity, id) => {
            console.log(`  ${id}: ${entity.getRole().isClient ? 'CLIENT' : 'SERVER'} role`);
        });
    }
}

/*
AUTHORITY FLOW SUMMARY:

🔵 CLIENT ROLE:
- Sends: client-authoritative properties (input state)
- Receives: server-authoritative properties (game state + commands)
- Rejects: server-auth messages from other clients

🔴 SERVER ROLE:  
- Sends: server-authoritative properties (game state + commands)
- Receives: client-authoritative properties (input state)
- Rejects: client-auth messages from server

EXAMPLE FLOWS:

1. Input State (Client → Server):
   Client updates mouseWorldPosition → NetworkManager sends client-auth message → Server receives and processes

2. Game State (Server → Client):
   Server updates health → NetworkManager sends server-auth message → Client receives and applies

3. Client Prediction (Client → Server → Client):
   Client predicts targetPosition → Server validates and corrects → Client receives server-auth correction

SECURITY:
- Basic authority validation prevents role confusion
- TODO: Build system should enforce these restrictions at compile time
*/