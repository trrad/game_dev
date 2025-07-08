// src/engine/networking/NetworkTypes.ts - Missing Network Interfaces

export interface NetworkSnapshot {
    id: string;
    timestamp: number;
    position?: any;
    health?: any;
    state?: any;
    [key: string]: any; // Allow additional properties
}

export interface NetworkRole {
    isServer: boolean;
    isClient: boolean;
    ownedByThisClient?: boolean;
}

export interface PropertySchema {
    name: string;
    type: 'boolean' | 'number' | 'enum' | 'vector' | 'collection';
    defaultValue: any;
    networkSync: boolean;
    constraints?: {
        min?: number;
        max?: number;
        validValues?: string[];
    };
}

export interface EntitySchema {
    entityType: string;
    properties: PropertySchema[];
}

export interface NetworkMessage {
    type: 'property_update' | 'input';
    entityId: string;
    data: any;
    timestamp: number;
    senderId?: string;
}

export interface ClientControlConfig {
    controlId: string;
    propertyName: string;
    enabled: boolean;
    clientAuthoritative: boolean;
    validation?: (value: any) => boolean;
}

export interface ClientControlDefinition {
    id: string;
    type: 'button' | 'slider' | 'toggle' | 'input';
    targetProperty: string;
    label: string;
    defaultValue?: any;
    constraints?: {
        min?: number;
        max?: number;
        step?: number;
        options?: string[];
    };
}