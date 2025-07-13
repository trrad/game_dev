// src/engine/inputs/InputStateEntity.ts - Simplified to use Babylon's picking

import { NetworkReactiveEntity } from '../networking/NetworkReactiveEntity';
import { NetworkRole, EntitySchema } from '../networking/NetworkTypes';
import { Scene, Vector3 } from '@babylonjs/core';

// Simplified input event types
export interface ClickEvent {
    timestamp: number;
    sequenceId: number;
    button: number;
    screenX: number;
    screenY: number;
    pickedNetworkId: string; // Empty string = ground/nothing
    pickedPoint: Vector3;    // World position of click
}

export interface KeyEvent {
    timestamp: number;
    sequenceId: number;
    keyCode: string;
    modifierKeys: string[];
}

// Simplified schema - let Babylon handle the picking
export const INPUT_STATE_SCHEMA: EntitySchema = {
    entityType: 'input_state',
    properties: [
        // =================================================================
        // CLIENT AUTHORITATIVE - Basic input state
        // =================================================================
        
        // Current state
        { 
            name: 'keysPressed', 
            type: 'collection', 
            defaultValue: new Map<string, string>(), 
            networkSync: true, 
            authority: 'client' 
        },
        { 
            name: 'mouseButtons', 
            type: 'collection', 
            defaultValue: new Map<string, number>(), 
            networkSync: true, 
            authority: 'client' 
        },
        
        // Currently picked/hovered entity (from Babylon's picking)
        { 
            name: 'hoveredEntityId', 
            type: 'string', 
            defaultValue: '', 
            networkSync: true, 
            authority: 'client' 
        },
        
        // Recent events
        { 
            name: 'recentClicks', 
            type: 'collection', 
            defaultValue: new Map<string, ClickEvent>(), 
            networkSync: true, 
            authority: 'client' 
        },
        { 
            name: 'recentKeyPresses', 
            type: 'collection', 
            defaultValue: new Map<string, KeyEvent>(), 
            networkSync: true, 
            authority: 'client' 
        },
        { 
            name: 'recentKeyReleases', 
            type: 'collection', 
            defaultValue: new Map<string, KeyEvent>(), 
            networkSync: true, 
            authority: 'client' 
        },
        
        // =================================================================
        // SERVER AUTHORITATIVE - Validation
        // =================================================================
        { 
            name: 'acknowledgedInputSequence', 
            type: 'number', 
            defaultValue: 0, 
            networkSync: true, 
            authority: 'server' 
        },
        
        // =================================================================
        // LOCAL ONLY - Performance
        // =================================================================
        { 
            name: 'inputRate', 
            type: 'number', 
            defaultValue: 0, 
            networkSync: false, 
            authority: 'client' 
        }
    ]
};

export class InputStateEntity extends NetworkReactiveEntity {
    private sequenceCounter: number = 0;
    private cleanupTimer?: number;
    
    constructor(networkId: string, scene: Scene | null, role: NetworkRole) {
        super('input_state', networkId, scene, role);
        
        this.createPropertiesFromSchema(INPUT_STATE_SCHEMA);
        this.setupBehaviors();
        this.setupRoleBehaviors();
        
        console.log(`🎮 InputStateEntity created: ${role.isClient ? 'CLIENT' : 'SERVER'}`);
    }
    
    protected setupBehaviors(): void {
        // Clean up old events periodically
        this.cleanupTimer = window.setInterval(() => {
            this.cleanupOldEvents();
        }, 5000);
    }
    
    protected setupClientBehaviors(): void {
        console.log('🎮 CLIENT: InputState ready for Babylon events');
    }
    
    protected setupServerBehaviors(): void {
        console.log('🎮 SERVER: InputState ready to process client input');
    }
    
    // =================================================================
    // CLIENT API - Called by ReactiveInputEnricher
    // =================================================================
    
    /**
     * Add a click event with Babylon's pick info
     */
    addClick(
        button: number, 
        screenX: number, 
        screenY: number,
        pickedNetworkId: string,
        pickedPoint: Vector3
    ): void {
        const clickEvent: ClickEvent = {
            timestamp: Date.now(),
            sequenceId: ++this.sequenceCounter,
            button,
            screenX,
            screenY,
            pickedNetworkId,
            pickedPoint: pickedPoint.clone()
        };
        
        const key = `click_${this.sequenceCounter}`;
        this.getCollectionProperty<ClickEvent>('recentClicks')
            ?.addItem(key, clickEvent, 'click');
            
        console.log(`🖱️ Click: ${pickedNetworkId || 'ground'} at ${pickedPoint}`);
    }
    
    /**
     * Update hovered entity
     */
    setHoveredEntity(networkId: string): void {
        this.getProperty<string>('hoveredEntityId')?.set(networkId, 'hover');
    }
    
    /**
     * Update key state
     */
    updateKeyPressed(keyCode: string, pressed: boolean, modifierKeys: string[] = []): void {
        const keysPressed = this.getCollectionProperty<string>('keysPressed');
        if (!keysPressed) return;
        
        if (pressed) {
            keysPressed.addItem(keyCode, keyCode, 'key_press');
            
            // Add to recent events
            const keyEvent: KeyEvent = {
                timestamp: Date.now(),
                sequenceId: ++this.sequenceCounter,
                keyCode,
                modifierKeys
            };
            
            this.getCollectionProperty<KeyEvent>('recentKeyPresses')
                ?.addItem(`key_${this.sequenceCounter}`, keyEvent, 'key_press');
        } else {
            keysPressed.removeItem(keyCode, 'key_release');
            
            // Add to recent releases
            const keyEvent: KeyEvent = {
                timestamp: Date.now(),
                sequenceId: ++this.sequenceCounter,
                keyCode,
                modifierKeys
            };
            
            this.getCollectionProperty<KeyEvent>('recentKeyReleases')
                ?.addItem(`key_${this.sequenceCounter}`, keyEvent, 'key_release');
        }
    }
    
    /**
     * Update mouse button state
     */
    updateMouseButton(button: number, pressed: boolean): void {
        const mouseButtons = this.getCollectionProperty<number>('mouseButtons');
        if (!mouseButtons) return;
        
        if (pressed) {
            mouseButtons.addItem(`btn_${button}`, button, 'mouse_down');
        } else {
            mouseButtons.removeItem(`btn_${button}`, 'mouse_up');
        }
    }
    
    // =================================================================
    // UTILITIES
    // =================================================================
    
    private cleanupOldEvents(): void {
        const maxAge = 10000; // 10 seconds
        const now = Date.now();
        
        // Clean up old clicks
        const recentClicks = this.getCollectionProperty<ClickEvent>('recentClicks');
        if (recentClicks) {
            const toRemove: string[] = [];
            recentClicks.getEntries().forEach(([key, event]) => {
                if (now - event.timestamp > maxAge) {
                    toRemove.push(key);
                }
            });
            toRemove.forEach(key => recentClicks.removeItem(key, 'cleanup'));
        }
        
        // Similar for key events...
    }
    
    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        super.dispose();
    }
}