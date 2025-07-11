// src/game/entities/Ball/Ball.schema.ts

import { EntitySchema } from '../../../engine/networking/NetworkTypes';

/**
 * Ball Entity Schema
 * Defines all reactive properties for the Ball entity
 * 
 * Authority patterns:
 * - Movement properties: server-authoritative (prevent cheating)
 * - Visual state: server-authoritative (consistency across clients)
 * - Local rendering: client-only (performance optimization)
 */
export const BALL_SCHEMA: EntitySchema = {
    entityType: 'ball',
    properties: [
        // ============================================================
        // MOVEMENT PROPERTIES (Server Authority)
        // ============================================================
        
        // Current world position
        { 
            name: 'position', 
            type: 'vector', 
            defaultValue: { x: 0, y: 0, z: 0 }, 
            networkSync: true, 
            authority: 'server' 
        },
        
        // Target position for movement
        { 
            name: 'targetPosition', 
            type: 'vector', 
            defaultValue: { x: 0, y: 0, z: 0 }, 
            networkSync: true, 
            authority: 'server' 
        },
        
        // Movement state flag
        { 
            name: 'isMoving', 
            type: 'boolean', 
            defaultValue: false, 
            networkSync: true, 
            authority: 'server' 
        },
        
        // ============================================================
        // VISUAL STATE PROPERTIES (Server Authority)
        // ============================================================
        
        // Color state (0: default, 1: secondary, 2: tertiary)
        { 
            name: 'colorState', 
            type: 'number', 
            defaultValue: 0, 
            networkSync: true, 
            authority: 'server',
            constraints: {
                min: 0,
                max: 2
            }
        },
        
        // Hover state for visual feedback
        { 
            name: 'isHovered', 
            type: 'boolean', 
            defaultValue: false, 
            networkSync: true, 
            authority: 'server' 
        },
        
        // ============================================================
        // LOCAL PROPERTIES (No Network Sync)
        // ============================================================
        
        // Movement speed for interpolation
        { 
            name: 'moveSpeed', 
            type: 'number', 
            defaultValue: 3.0, 
            networkSync: false, 
            authority: 'client' 
        }
    ]
};