// src/game/entities/PlayerCharacter.ts - Clean reactive design following our philosophy

import { NetworkReactiveEntity } from '../../engine/networking/NetworkReactiveEntity';
import { NetworkRole } from '../../engine/networking/NetworkTypes';
import { GAME_ENTITY_SCHEMAS } from '../schemas/EntitySchemas';
import { Vector3, Scene } from '@babylonjs/core';
import { ConfigurableTimers } from '../../engine/utils/ConfigurableTimers';
import { InputStateEntity } from '../../engine/inputs/InputStateEntity';

export class PlayerCharacter extends NetworkReactiveEntity {
    private inputState: InputStateEntity;
    private movementTimerCleanup?: () => void;
    private inputObserverCleanup: (() => void)[] = [];

    constructor(
        networkId: string, 
        scene: Scene | null, 
        role: NetworkRole, 
        inputState: InputStateEntity,
        parentNode?: any
    ) {
        super('player_character', networkId, scene, role, parentNode);
        
        this.inputState = inputState;
        this.createPropertiesFromSchema(GAME_ENTITY_SCHEMAS.player_character);
        this.setupBehaviors();
        this.setupRoleBehaviors();
    }

    // ========================================================================
    // ✅ SHARED GAME LOGIC: Same logic runs on both client and server
    // ========================================================================

    /**
     * ✅ CORE SHARED LOGIC: Process input state into game commands
     * This runs identically on client (prediction) and server (authority)
     */
    private handleInputStateChange(source: string): void {
        const isAlive = this.getBooleanProperty('isAlive');
        if (!isAlive?.isTrue()) return;

        // ✅ MOVEMENT COMMAND: Check if left mouse button was just pressed
        if (this.inputState.isMouseButtonPressed(0)) {
            const worldPos = this.inputState.getCurrentMouseWorldPosition();
            const pickedEntity = this.inputState.getCurrentlyPickedEntity();
            
            // Ground click → movement command
            if (!pickedEntity && worldPos) {
                this.processMovementCommand(worldPos, source);
            }
            
            // Entity click → interaction command  
            else if (pickedEntity) {
                this.processInteractionCommand(pickedEntity, source);
            }
        }

        // ✅ KEYBOARD MOVEMENT: Process continuous key state
        this.processKeyboardMovement(source);
    }

    /**
     * ✅ SHARED LOGIC: Process movement command with validation
     */
    private processMovementCommand(targetPos: Vector3, source: string): void {
        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        
        if (!position || !targetPosition) return;

        // ✅ SAME VALIDATION: Distance check (same on client and server)
        const currentPos = position.getValue();
        const distance = Vector3.Distance(currentPos, targetPos);
        const maxMoveDistance = 10;
        
        if (distance <= maxMoveDistance) {
            console.log(`✅ ${source}: VALIDATED move to (${targetPos.x.toFixed(1)}, ${targetPos.z.toFixed(1)})`);
            targetPosition.set(targetPos, source);
        } else {
            console.log(`❌ ${source}: REJECTED move (distance: ${distance.toFixed(2)})`);
            // Keep current target or reset to current position
            if (source.includes('server')) {
                targetPosition.set(currentPos, 'server_validation_rejection');
            }
        }
    }

    /**
     * ✅ SHARED LOGIC: Process interaction command
     */
    private processInteractionCommand(entityId: string, source: string): void {
        const interactionTarget = this.getProperty<string>('interactionTarget');
        if (interactionTarget) {
            interactionTarget.set(entityId, source);
            console.log(`🎯 ${source}: Interaction with ${entityId}`);
        }
    }

    /**
     * ✅ SHARED LOGIC: Process keyboard movement
     */
    private processKeyboardMovement(source: string): void {
        const movementInput = this.getVectorProperty('movementInput');
        if (!movementInput) return;

        let movement = Vector3.Zero();
        
        // ✅ SAME LOGIC: Check current key state (not events)
        if (this.inputState.isKeyPressed('KeyW')) movement.z += 1;
        if (this.inputState.isKeyPressed('KeyS')) movement.z -= 1;
        if (this.inputState.isKeyPressed('KeyA')) movement.x -= 1;
        if (this.inputState.isKeyPressed('KeyD')) movement.x += 1;

        // Normalize diagonal movement
        if (movement.length() > 0) {
            movement = movement.normalize();
        }

        movementInput.set(movement, source);
    }

    // ========================================================================
    // ✅ REACTIVE BEHAVIORS: Standard game mechanics
    // ========================================================================

    protected setupBehaviors(): void {
        const health = this.getNumericProperty('health');
        const isAlive = this.getBooleanProperty('isAlive');
        const unitState = this.getEnumProperty<'idle' | 'moving' | 'paused' | 'reached_destination'>('unitState');
        const targetPosition = this.getVectorProperty('targetPosition');
        const movementProgress = this.getNumericProperty('movementProgress');

        if (!health || !isAlive || !unitState || !targetPosition || !movementProgress) {
            console.error(`Failed to get required properties for ${this.getNetworkId()}`);
            return;
        }

        // ✅ DEATH HANDLING
        health.onChange((event) => {
            if (event.to <= 0 && isAlive.isTrue()) {
                isAlive.setFalse('death');
                unitState.setTo('paused', 'death');
                console.log(`💀 ${this.getNetworkId()} died`);
            }
        });

        // ✅ MOVEMENT STATE MANAGEMENT
        targetPosition.onChange((event) => {
            if (event.changed && isAlive.isTrue()) {
                console.log(`🎯 ${this.getNetworkId()} new target from ${event.source}`);
                unitState.setTo('moving', 'target_changed');
                movementProgress.set(0, 'movement_reset');
            }
        });

        unitState.onChange((event) => {
            if (event.to === 'moving') {
                this.startMovement();
            } else if (event.from === 'moving') {
                this.stopMovement();
            }
        });

        movementProgress.onChange((event) => {
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

    // ========================================================================
    // ✅ ROLE-SPECIFIC INPUT OBSERVERS: Different triggers, same logic
    // ========================================================================

    protected setupClientBehaviors(): void {
        if (!this.getRole().isClient) return;
        
        console.log(`💻 CLIENT: Setting up input state observers for ${this.getNetworkId()}`);
        this.setupInputStateObservers('client_prediction');
    }

    protected setupServerBehaviors(): void {
        if (!this.getRole().isServer) return;
        
        console.log(`🖥️ SERVER: Setting up input state observers for ${this.getNetworkId()}`);
        this.setupInputStateObservers('server_authority');
    }

    protected setupInputHandling(): void {
        // This is called for client-owned entities
        // Client behavior already handles this
    }

    /**
     * ✅ CLEAN PATTERN: Both client and server observe same input state
     * Only difference is the authority context passed to shared logic
     */
    private setupInputStateObservers(authority: string): void {
        // ✅ OBSERVE MOUSE BUTTON CHANGES: Trigger shared game logic
        const mouseButtons = this.inputState.getCollectionProperty('mouseButtons');
        if (mouseButtons) {
            const cleanup1 = () => {
                const observer = mouseButtons.itemAddedObservable.add(() => {
                    // Mouse button pressed → process through shared logic
                    this.handleInputStateChange(authority);
                });
                return () => observer.remove();
            };
            this.inputObserverCleanup.push(cleanup1());
        }

        // ✅ OBSERVE KEY STATE CHANGES: Trigger shared game logic  
        const keysPressed = this.inputState.getCollectionProperty('keysPressed');
        if (keysPressed) {
            const cleanup2 = () => {
                const addObserver = keysPressed.itemAddedObservable.add(() => {
                    this.handleInputStateChange(authority);
                });
                const removeObserver = keysPressed.itemRemovedObservable.add(() => {
                    this.handleInputStateChange(authority);
                });
                return () => {
                    addObserver.remove();
                    removeObserver.remove();
                };
            };
            this.inputObserverCleanup.push(cleanup2());
        }

        // ✅ OBSERVE MOUSE POSITION: For hover effects, spatial commands
        const mouseWorldPos = this.inputState.getVectorProperty('mouseWorldPosition');
        if (mouseWorldPos) {
            const cleanup3 = () => {
                const observer = mouseWorldPos.onChange((event) => {
                    // Could update hover state, spatial UI, etc.
                    if (Math.random() < 0.01) { // Occasional logging to avoid spam
                        console.log(`🖱️ ${authority}: Mouse at (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)})`);
                    }
                });
                return () => observer.remove();
            };
            this.inputObserverCleanup.push(cleanup3());
        }
    }

    // ========================================================================
    // ✅ MOVEMENT MECHANICS: Same as before
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
    // ✅ CLEANUP
    // ========================================================================

    dispose(): void {
        this.stopMovement();
        this.inputObserverCleanup.forEach(cleanup => cleanup());
        this.inputObserverCleanup = [];
        super.dispose();
    }
}

/*
✅ CLEAN REACTIVE DESIGN PRINCIPLES DEMONSTRATED:

1. **SHARED GAME LOGIC**: 
   - Same handleInputStateChange() runs on client and server
   - Only difference is authority context ('client_prediction' vs 'server_authority')

2. **PURE REACTIVE PATTERNS**:
   - No DOM event handling in game logic
   - All behavior triggered by reactive property observations
   - Input state changes trigger same shared logic

3. **CLEAN AUTHORITY SEPARATION**:
   - Client observes input state → predicts server-auth properties
   - Server observes same input state → authoritative server-auth properties
   - Same validation logic, different authority context

4. **NO EVENT-BASED THINKING**:
   - No "click events" or "key events"
   - Just reactive state changes: mouse button pressed, key state changed
   - Game logic processes current input state, not discrete events

5. **ROLE-BASED BEHAVIOR**:
   - Client and server set up same observers with different authority
   - Shared logic ensures consistency
   - Authority context controls prediction vs final authority

FLOW EXAMPLE:
1. User clicks → InputStateEntity.mouseButtons changes (client-auth)
2. Client observes change → handleInputStateChange('client_prediction')
3. Server receives input state → observes change → handleInputStateChange('server_authority')
4. Same logic runs both times, different authority = consistent game behavior
*/