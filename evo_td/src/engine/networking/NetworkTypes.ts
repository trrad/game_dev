// src/engine/networking/NetworkTypes.ts - Minimal authority direction update

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

// ✅ ENHANCED: PropertySchema with authority direction
export interface PropertySchema {
    name: string;
    type: 'boolean' | 'number' | 'enum' | 'vector' | 'collection' | 'string';
    defaultValue: any;
    networkSync: boolean;
    authority: 'server' | 'client'; // ✅ NEW: Simple authority direction
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

// ✅ SIMPLIFIED: NetworkMessage - just property updates
export interface NetworkMessage {
    type: 'property_update';
    entityId: string;
    data: any;
    timestamp: number;
    senderId?: string;
    authority: 'client' | 'server';
    propertyName?: string;
    // 🔒 TODO: Validate authority matches sender role (build system + network layer)
    // Need to be careful there's no possibility of client sending updates to server-owned properties
}