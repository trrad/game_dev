import { NetworkReactiveEntity } from './NetworkReactiveEntity';
import { NetworkRole, NetworkMessage } from './NetworkTypes';

export class SimpleNetworkManager {
    private entities: Map<string, NetworkReactiveEntity> = new Map();
    private sendCallback?: (message: NetworkMessage) => void;
    private role: NetworkRole;

    constructor(role: NetworkRole) {
        this.role = role;
    }

    registerEntity(entity: NetworkReactiveEntity): void {
        this.entities.set(entity.getNetworkId(), entity);
        
        // Set up property change callback
        entity.setPropertyChangeCallback((entityId, propertyName, value) => {
            this.sendPropertyUpdate(entityId, propertyName, value);
        });
    }

    private sendPropertyUpdate(entityId: string, propertyName: string, value: any): void {
        if (!this.sendCallback) return;

        const message: NetworkMessage = {
            type: 'property_update',
            entityId,
            data: { propertyName, value },
            timestamp: Date.now(),
            senderId: this.role.isServer ? 'server' : 'client'
        };

        this.sendCallback(message);
    }

    handleMessage(message: NetworkMessage): void {
        const entity = this.entities.get(message.entityId);
        if (!entity) return;

        switch (message.type) {
            case 'property_update':
                const { propertyName, value } = message.data;
                const isAuthoritative = message.senderId === 'server';
                const source = isAuthoritative ? 'network_authoritative' : 'network_update';
                entity.applyNetworkUpdate(propertyName, value, source);
                break;
                
            case 'input':
                if (this.role.isServer) {
                    this.handleInput(entity, message.data);
                }
                break;
        }
    }

    private handleInput(entity: NetworkReactiveEntity, inputData: any): void {
        // Call the entity's input handler
        if (typeof (entity as any).handleServerInput === 'function') {
            (entity as any).handleServerInput(inputData);
        }
    }

    sendInput(entityId: string, inputData: any): void {
        if (!this.sendCallback || this.role.isServer) return;

        const message: NetworkMessage = {
            type: 'input',
            entityId,
            data: inputData,
            timestamp: Date.now(),
            senderId: 'client'
        };

        this.sendCallback(message);
    }

    setSendCallback(callback: (message: NetworkMessage) => void): void {
        this.sendCallback = callback;
    }
}
