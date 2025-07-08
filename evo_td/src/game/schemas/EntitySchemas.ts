// FIXED: Import EntitySchema from correct location (NetworkTypes, not NetworkReactiveEntity)
import { EntitySchema } from '../../engine/networking/NetworkTypes';

export const GAME_ENTITY_SCHEMAS: Record<string, EntitySchema> = {
    wanderer: {
        entityType: 'wanderer',
        properties: [
            { name: 'health', type: 'number', defaultValue: 100, networkSync: true, constraints: { min: 0, max: 100 } },
            { name: 'isAlive', type: 'boolean', defaultValue: true, networkSync: true },
            { name: 'wanderState', type: 'enum', defaultValue: 'wandering', networkSync: true, 
              constraints: { validValues: ['wandering', 'paused', 'moving_to_target'] } },
            { name: 'position', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true },
            // Non-networked properties
            { name: 'wanderDirection', type: 'vector', defaultValue: { x: 1, y: 0, z: 0 }, networkSync: false },
            { name: 'wanderSpeed', type: 'number', defaultValue: 2.0, networkSync: false },
            { name: 'nearbyEntities', type: 'collection', defaultValue: new Map(), networkSync: false }
        ]
    },

    clickable_unit: {
        entityType: 'clickable_unit',
        properties: [
            { name: 'health', type: 'number', defaultValue: 80, networkSync: true, constraints: { min: 0, max: 100 } },
            { name: 'isAlive', type: 'boolean', defaultValue: true, networkSync: true },
            { name: 'unitState', type: 'enum', defaultValue: 'idle', networkSync: true,
              constraints: { validValues: ['idle', 'moving', 'paused', 'reached_destination'] } },
            { name: 'position', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true },
            { name: 'targetPosition', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true },
            { name: 'moveSpeed', type: 'number', defaultValue: 3.0, networkSync: false },
            { name: 'movementProgress', type: 'number', defaultValue: 0, networkSync: false, constraints: { min: 0, max: 1 } }
        ]
    }
};