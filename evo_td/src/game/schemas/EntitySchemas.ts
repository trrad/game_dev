// src/game/schemas/EntitySchemas.ts - Updated with authority direction

import { EntitySchema } from '../../engine/networking/NetworkTypes';

export const GAME_ENTITY_SCHEMAS: Record<string, EntitySchema> = {
    wanderer: {
        entityType: 'wanderer',
        properties: [
            // ✅ SERVER AUTHORITATIVE: Game state managed by server
            { name: 'health', type: 'number', defaultValue: 100, networkSync: true, authority: 'server', constraints: { min: 0, max: 100 } },
            { name: 'isAlive', type: 'boolean', defaultValue: true, networkSync: true, authority: 'server' },
            { name: 'wanderState', type: 'enum', defaultValue: 'wandering', networkSync: true, authority: 'server',
              constraints: { validValues: ['wandering', 'paused', 'moving_to_target'] } },
            { name: 'position', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'server' },
            
            // ✅ LOCAL ONLY: Internal AI state, no network sync needed
            { name: 'wanderDirection', type: 'vector', defaultValue: { x: 1, y: 0, z: 0 }, networkSync: false, authority: 'server' },
            { name: 'wanderSpeed', type: 'number', defaultValue: 2.0, networkSync: false, authority: 'server' },
            { name: 'nearbyEntities', type: 'collection', defaultValue: new Map(), networkSync: false, authority: 'server' }
        ]
    },

    player_character: {
        entityType: 'player_character',
        properties: [
            // ✅ SERVER AUTHORITATIVE: Core game state
            { name: 'health', type: 'number', defaultValue: 80, networkSync: true, authority: 'server', constraints: { min: 0, max: 100 } },
            { name: 'isAlive', type: 'boolean', defaultValue: true, networkSync: true, authority: 'server' },
            { name: 'unitState', type: 'enum', defaultValue: 'idle', networkSync: true, authority: 'server',
              constraints: { validValues: ['idle', 'moving', 'paused', 'reached_destination'] } },
            { name: 'position', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'server' },
            
            // ✅ SERVER AUTHORITATIVE: Game commands (targetPosition is a command, not raw input)
            { name: 'targetPosition', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'server' },
            
            // ✅ LOCAL ONLY: Movement mechanics, no sync needed
            { name: 'moveSpeed', type: 'number', defaultValue: 3.0, networkSync: false, authority: 'server' },
            { name: 'movementProgress', type: 'number', defaultValue: 0, networkSync: false, authority: 'server', constraints: { min: 0, max: 1 } },
            
            // ✅ CLIENT LOCAL: UI state, visual feedback
            { name: 'hoveredEntity', type: 'string', defaultValue: '', networkSync: false, authority: 'client' },
            { name: 'interactionTarget', type: 'string', defaultValue: '', networkSync: false, authority: 'client' },
            { name: 'isSelected', type: 'boolean', defaultValue: false, networkSync: false, authority: 'client' }
        ]
    },

    // ✅ NEW: Input state entity schema (from InputStateEntity.ts)
    input_state: {
        entityType: 'input_state',
        properties: [
            // =================================================================
            // CLIENT AUTHORITATIVE - Client enriches and sends to server
            // =================================================================
            
            // Current input state (continuous)
            { name: 'keysPressed', type: 'collection', defaultValue: new Map<string, string>(), networkSync: true, authority: 'client' },
            { name: 'mouseButtons', type: 'collection', defaultValue: new Map<string, number>(), networkSync: true, authority: 'client' },
            { name: 'mouseScreenPosition', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'client' },
            
            // Client-enriched context (continuously updated by 3D picking)
            { name: 'mouseWorldPosition', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'client' },
            { name: 'currentlyPickedEntity', type: 'string', defaultValue: '', networkSync: true, authority: 'client' },
            { name: 'currentlyPickedUIElement', type: 'string', defaultValue: '', networkSync: true, authority: 'client' },
            { name: 'currentSurfaceNormal', type: 'vector', defaultValue: { x: 0, y: 1, z: 0 }, networkSync: true, authority: 'client' },
            { name: 'currentRaycastDistance', type: 'number', defaultValue: 0, networkSync: true, authority: 'client' },
            
            // Recent input events (with auto-expiry)
            { name: 'recentClicks', type: 'collection', defaultValue: new Map(), networkSync: false, authority: 'client' },
            { name: 'recentKeyPresses', type: 'collection', defaultValue: new Map(), networkSync: false, authority: 'client' },
            { name: 'recentKeyReleases', type: 'collection', defaultValue: new Map(), networkSync: false, authority: 'client' },

            // =================================================================
            // SERVER AUTHORITATIVE - Server validation results and acknowledgments
            // =================================================================
            
            { name: 'inputValidationErrors', type: 'number', defaultValue: 0, networkSync: true, authority: 'server' },
            { name: 'acknowledgedClickSequence', type: 'number', defaultValue: 0, networkSync: true, authority: 'server' },
            { name: 'serverInputRate', type: 'number', defaultValue: 0, networkSync: true, authority: 'server' },
            
            // =================================================================
            // LOCAL ONLY - Performance and debug info
            // =================================================================
            
            { name: 'clientInputRate', type: 'number', defaultValue: 0, networkSync: false, authority: 'client' },
            { name: 'pickingPerformance', type: 'number', defaultValue: 0, networkSync: false, authority: 'client' }
        ]
    }
};

// ============================================================================
// ✅ AUTHORITY PATTERNS SUMMARY
// ============================================================================

/*
AUTHORITY PATTERNS DEMONSTRATED:

🔴 SERVER AUTHORITATIVE (Game State + Commands):
- health, isAlive, unitState, position, targetPosition
- Core game mechanics and all game commands that require consistency
- Server has final say, syncs to all clients
- Client can predict with 'client_prediction' source, server overwrites with 'server_authority'

🔵 CLIENT AUTHORITATIVE (Pure Input State Only):
- keysPressed, mouseWorldPosition, recentClicks, currentlyPickedEntity
- Raw and enriched input state from DOM events and 3D picking
- Client updates immediately, syncs to server for processing
- Server observes input state to generate game commands

⚪ LOCAL ONLY (No Sync):
- moveSpeed, movementProgress, wanderDirection
- Internal state, performance metrics, UI feedback
- Each side maintains independently

BENEFITS:
✅ Clean separation - input intent vs game state authority
✅ Responsive feel - client updates input properties immediately  
✅ Server consistency - game state changes only from server
✅ Network efficiency - only sync what needs to be shared
✅ Build optimization - client/server can exclude non-relevant properties

NETWORK FLOW:
Client → Server: Input state properties (mouseWorldPosition, recentClicks, keysPressed)
Server → Client: Game state + command properties (health, position, targetPosition)

CLIENT PREDICTION FLOW:
1. Client click → input state updates (client authority)
2. Client predicts → targetPosition.set(pos, 'client_prediction') (server authority, prediction)
3. Server observes input state → processes through shared logic
4. Server authority → targetPosition.set(validatedPos, 'server_authority') (overwrites prediction)
5. Automatic sync → client receives server-authoritative targetPosition

BUILD SYSTEM INTEGRATION:
- Client build: Sends client-auth properties, receives server-auth properties
- Server build: Receives client-auth properties, sends server-auth properties  
- Shared logic: Same handlePlayerInput() processes both sides
*/