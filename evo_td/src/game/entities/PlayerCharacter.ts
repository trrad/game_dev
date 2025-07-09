// src/game/entities/PredictiveTarget.ts - Updated to use reactive input system

import { NetworkReactiveEntity } from '../../engine/networking/NetworkReactiveEntity';
import { NetworkRole } from '../../engine/networking/NetworkTypes';
import { GAME_ENTITY_SCHEMAS } from '../schemas/EntitySchemas';
import { Vector3, Scene } from '@babylonjs/core';
import { ConfigurableTimers } from '../../engine/utils/ConfigurableTimers';
import { InputStateEntity, ClickEvent } from '../../engine/inputs/InputStateEntity';

export class PlayerCharacter extends NetworkReactiveEntity {
    private inputState: InputStateEntity;
    private movementTimerCleanup?: () => void;
    private inputObserverCleanup: (() => void)[] = [];

    constructor(
        networkId: string, 
        scene: Scene | null, 
        role: NetworkRole, 
        inputState: InputStateEntity, // ✅ NEW: Inject global input state
        parentNode?: any
    ) {
        super('player_character', networkId, scene, role, parentNode);
        
        this.inputState = inputState;
        this.createPropertiesFromSchema(GAME_ENTITY_SCHEMAS.player_character);
        this.setupBehaviors();
        this.setupRoleBehaviors();
    }

    protected setupBehaviors(): void {
        const health = this.getNumericProperty('health');
        const isAlive = this.getBooleanProperty('isAlive');
        const unitState = this.getEnumProperty<'idle' | 'moving' | 'paused' | 'reached_destination'>('unitState');
        const targetPosition = this.getVectorProperty('targetPosition');
        const movementProgress = this.getNumericProperty('movementProgress');

        if (!health || !isAlive || !unitState || !targetPosition || !movementProgress) {
            console.error(`Failed to get required properties for target ${this.getNetworkId()}`);
            return;
        }

        // ✅ EXISTING: Standard reactive behaviors (unchanged)
        targetPosition.onChange((event: any) => {
            if (event.changed && isAlive.isTrue()) {
                console.log(`🎯 ${this.getNetworkId()} new target: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) - ${event.source}`);
                
                if (event.source.includes('prediction')) {
                    unitState.setTo('moving', 'client_prediction');
                } else if (event.source.includes('server')) {
                    unitState.setTo('moving', 'server_authority');
                }
                
                movementProgress.set(0, 'movement_reset');
            }
        });

        unitState.onChange((event: any) => {
            console.log(`🎯 ${this.getNetworkId()} unit state: ${event.from} → ${event.to} (${event.source})`);
            
            if (event.to === 'moving') {
                this.startMovement();
            } else if (event.from === 'moving') {
                this.stopMovement();
            }
        });

        movementProgress.onChange((event: any) => {
            if (event.to >= 1.0 && unitState.getValue() === 'moving') {
                unitState.setTo('reached_destination', 'movement_complete');
                
                if (this.scene) {
                    const cleanup = ConfigurableTimers.createOneShotTimer(this.scene, 1000, () => {
                        if (unitState.isValue('reached_destination')) {
                            unitState.setTo('idle', 'auto_idle');
                        }
                    });
                    this.addCleanupFunction(cleanup);
                }
            }
        });
    }

    protected setupInputHandling(): void {
        // ✅ NEW: Reactive input handling instead of DOM events
        if (!this.getRole().ownedByThisClient) return;

        console.log(`🎮 Setting up REACTIVE input handling for ${this.getNetworkId()}`);
        
        // ✅ CLICK-TO-MOVE: Observe click events from global input state
        const cleanup1 = this.observeClickEvents();
        
        // ✅ HOVER FEEDBACK: Observe mouse hover state
        const cleanup2 = this.observeMouseHover();
        
        // Store cleanup functions
        this.inputObserverCleanup.push(cleanup1, cleanup2);
    }

    // ========================================================================
    // ✅ NEW: Reactive Input Observers (replaces DOM event handling)
    // ========================================================================

    private observeClickEvents(): () => void {
        const recentClicks = this.inputState.getCollectionProperty<ClickEvent>('recentClicks');
        if (!recentClicks) {
            console.warn('No recentClicks collection found on input state');
            return () => {};
        }

        const observer = recentClicks.itemAddedObservable.add((event) => {
            const clickEvent = event.value;
            const isAlive = this.getBooleanProperty('isAlive');
            
            // Only process clicks for living entities
            if (!isAlive?.isTrue()) return;
            
            // GROUND CLICKS: Move to location (same logic as before, but reactive)
            if (!clickEvent.pickedEntityId) {
                this.handleReactiveGroundClick(clickEvent);
            }
            
            // ENTITY CLICKS: Handle entity interactions
            else if (clickEvent.pickedEntityId === this.getNetworkId()) {
                this.handleReactiveSelfClick(clickEvent);
            }
        });

        return () => observer.remove();
    }

    private observeMouseHover(): () => void {
        const currentlyPickedEntity = this.inputState.getProperty<string>('currentlyPickedEntity');
        if (!currentlyPickedEntity) {
            console.warn('No currentlyPickedEntity property found on input state');
            return () => {};
        }

        const observer = currentlyPickedEntity.onChange((event) => {
            // Log hover changes for this entity
            if (event.to === this.getNetworkId()) {
                console.log(`👆 ${this.getNetworkId()} is being hovered`);
                // Could add visual feedback here
            } else if (event.from === this.getNetworkId()) {
                console.log(`👋 ${this.getNetworkId()} hover ended`);
                // Could remove visual feedback here
            }
        });

        return () => observer.remove();
    }

    // ========================================================================
    // ✅ NEW: Reactive Input Event Handlers
    // ========================================================================

    private handleReactiveGroundClick(clickEvent: ClickEvent): void {
        const targetPosition = this.getVectorProperty('targetPosition');
        if (!targetPosition) return;
        
        console.log(`🖱️ REACTIVE PREDICTION: Ground click at (${clickEvent.worldPosition.x.toFixed(1)}, ${clickEvent.worldPosition.z.toFixed(1)})`);
        
        // ✅ CLIENT PREDICTION: Immediately update server-authoritative property with prediction source
        targetPosition.set(clickEvent.worldPosition, 'client_prediction');
        
        // ✅ AUTOMATIC SYNC: Property system sends client prediction to server
        // Server will process input state and update targetPosition with 'server_authority'
        // Server authority will automatically overwrite client prediction via reactive property sync
        
        console.log(`📤 REACTIVE: Client prediction will sync to server, server authority will follow`);
    }

    private handleReactiveSelfClick(clickEvent: ClickEvent): void {
        console.log(`👆 REACTIVE: Self-click detected on ${this.getNetworkId()} at (${clickEvent.worldPosition.x.toFixed(1)}, ${clickEvent.worldPosition.z.toFixed(1)})`);
        
        // Example: Toggle selection state or show info panel
        // This could trigger UI behaviors, status display, etc.
    }

    // ========================================================================
    // ✅ ENHANCED: Server-side input processing through reactive properties
    // ========================================================================

    protected setupServerBehaviors(): void {
        if (!this.getRole().isServer) return;
        
        console.log(`🖥️ SERVER: Setting up reactive input processing for ${this.getNetworkId()}`);
        
        // ✅ SERVER: Observe property changes from client authority
        this.setupServerInputProcessing();
    }

    private setupServerInputProcessing(): void {
        // ✅ SERVER: Observe client-authoritative input state to generate server-authoritative commands
        const recentClicks = this.inputState.getCollectionProperty<ClickEvent>('recentClicks');
        
        if (recentClicks) {
            const cleanup = recentClicks.itemAddedObservable.add((event) => {
                const clickEvent = event.value;
                
                // Process ground clicks through shared game logic
                if (!clickEvent.pickedEntityId) {
                    this.processServerGroundClick(clickEvent);
                }
            });
            
            this.addCleanupFunction(cleanup);
        }
    }

    private processServerGroundClick(clickEvent: ClickEvent): void {
        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        const isAlive = this.getBooleanProperty('isAlive');
        
        if (!position || !targetPosition || !isAlive?.isTrue()) return;
        
        const currentPos = position.getValue();
        const clickPos = clickEvent.worldPosition;
        const distance = Vector3.Distance(currentPos, clickPos);
        const maxMoveDistance = 10;
        
        if (distance <= maxMoveDistance) {
            console.log(`✅ SERVER: VALIDATED ground click for ${this.getNetworkId()}`);
            
            // ✅ SERVER AUTHORITY: Set target position with server authority
            targetPosition.set(clickPos, 'server_authority');
            
        } else {
            console.log(`❌ SERVER: REJECTED ground click for ${this.getNetworkId()} (distance: ${distance.toFixed(2)})`);
            
            // ✅ SERVER CORRECTION: Keep current position as target
            targetPosition.set(currentPos, 'server_validation_rejection');
        }
    }

    /**
     * ✅ ENHANCED: Server input processing (same validation logic as before)
     */
    handleServerInput(inputData: any): void {
        try {
            if (inputData.action === 'move_to' && inputData.target) {
                const isAlive = this.getBooleanProperty('isAlive');
                if (!isAlive?.isTrue()) return;

                const target = inputData.target;
                const targetPos = new Vector3(target.x || 0, target.y || 0, target.z || 0);
                
                const position = this.getVectorProperty('position');
                const targetPosition = this.getVectorProperty('targetPosition');
                
                if (!position || !targetPosition) return;

                const currentPos = position.getValue();
                const distance = Vector3.Distance(currentPos, targetPos);
                const maxMoveDistance = 10;
                
                if (distance <= maxMoveDistance) {
                    console.log(`✅ SERVER VALIDATED reactive move for ${this.getNetworkId()}`);
                    // ✅ TARGET ALREADY SET: Property was already updated by client prediction
                    // Server authority will automatically correct if needed via reactive property sync
                } else {
                    console.log(`❌ SERVER REJECTED reactive move for ${this.getNetworkId()} (distance: ${distance.toFixed(2)})`);
                    
                    // ✅ SERVER CORRECTION: Reset to valid position
                    targetPosition.set(currentPos, 'server_validation_rejection');
                    // This will automatically sync back to client via reactive property system
                }
            }
        } catch (error) {
            console.error('Error handling server input:', error);
        }
    }

    // ========================================================================
    // ✅ UNCHANGED: Movement logic (same as before)
    // ========================================================================

    private startMovement(): void {
        if (this.movementTimerCleanup) return;

        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        
        if (!position || !targetPosition) return;

        const startPos = position.getValue();
        const targetPos = targetPosition.getValue();
        const totalDistance = Vector3.Distance(startPos, targetPos);
        
        if (totalDistance < 0.1) {
            const movementProgress = this.getNumericProperty('movementProgress');
            movementProgress?.set(1, 'already_at_target');
            return;
        }

        if (this.scene) {
            this.movementTimerCleanup = ConfigurableTimers.createTimer(
                this.scene,
                'gameLogic',
                () => this.updateMovement(startPos, targetPos, totalDistance),
                `movement_${this.getNetworkId()}`
            );
        }
    }

    private updateMovement(startPos: Vector3, targetPos: Vector3, totalDistance: number): void {
        const unitState = this.getEnumProperty('unitState');
        const movementProgress = this.getNumericProperty('movementProgress');
        const moveSpeed = this.getNumericProperty('moveSpeed');
        const position = this.getVectorProperty('position');
        
        if (!unitState?.getValue().startsWith('moving') || !movementProgress || !moveSpeed || !position) {
            this.stopMovement();
            return;
        }

        const currentProgress = movementProgress.getValue();
        const speed = moveSpeed.getValue();
        const deltaTime = ConfigurableTimers.getIntervalMs('gameLogic') / 1000;
        
        const progressIncrement = (speed * deltaTime) / totalDistance;
        const newProgress = Math.min(1, currentProgress + progressIncrement);
        
        movementProgress.set(newProgress, 'movement_update');
        
        const newPos = Vector3.Lerp(startPos, targetPos, newProgress);
        position.set(newPos, 'movement_interpolation');
    }

    private stopMovement(): void {
        if (this.movementTimerCleanup) {
            this.movementTimerCleanup();
            this.movementTimerCleanup = undefined;
        }
    }

    // ========================================================================
    // ✅ ENHANCED: Cleanup
    // ========================================================================

    dispose(): void {
        this.stopMovement();
        
        // ✅ NEW: Clean up reactive input observers
        this.inputObserverCleanup.forEach(cleanup => cleanup());
        this.inputObserverCleanup = [];
        
        super.dispose();
    }
}

// ============================================================================
// ✅ MIGRATION COMPARISON
// ============================================================================

/*
BEFORE (Event-based):
- DOM event listeners directly on canvas
- Manual input enrichment on click
- Manual sendInputToServer() calls
- Manual batching with InputEnricher
- Direct handlePlayerInput() calls

AFTER (Reactive):
- Global InputStateEntity captures all input state
- ReactiveInputEnricher continuously enriches mouse context
- Property system automatically handles network sync
- Same validation logic through reactive property observers
- Clean separation: input capture vs game logic

BENEFITS:
✅ Unified patterns - input uses same reactive system as health, position, etc.
✅ Automatic sync - no manual network calls needed
✅ Better testing - can set input properties directly
✅ Centralized communication - all sync through same property system
✅ Performance optimization - unified batching/throttling
*/