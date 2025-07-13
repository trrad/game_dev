// src/game/entities/Ball/Ball.base.ts
import { ExtendableEntity } from '../../../engine/core/ExtendableEntity';
import { Vector3, StandardMaterial, Color3, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { EntitySchema } from '../../../engine/networking/NetworkTypes';
import { BALL_SCHEMA } from './Ball.schema';
import { InputStateEntity, ClickEvent } from '../../../engine/inputs/InputStateEntity';
import { GameWorld } from '../../../game/systems/GameWorld';

/**
 * Ball - Base class with ALL game logic including input handling
 * 
 * Both client and server run this exact same code:
 * - Client: Immediate response (prediction)
 * - Server: Delayed response with lag compensation (authority)
 */
export abstract class Ball extends ExtendableEntity {
    public material: StandardMaterial | null = null;
    private inputStateObservers: (() => void)[] = [];
    protected gameWorld?: GameWorld;
    protected inputState?: InputStateEntity;

    protected getSchema(): EntitySchema {
        return BALL_SCHEMA;
    }

    protected setupSharedBehaviors(): void {
        // Position changes update mesh (if present)
        this.observePosition();

        // Color state changes update visual
        this.observeProperty<number>('colorState', 
            (newState, oldState, source) => {
                this.updateColor();
                console.log(`🎨 ${this.getExtensionType()} color: ${oldState} → ${newState} [${source}]`);
            }
        );

        // Hover state changes update visual
        this.observeProperty<boolean>('isHovered',
            (isHovered, wasHovered, source) => {
                this.updateColor();
            }
        );

        // Target position changes trigger movement
        const targetPosition = this.getVectorProperty('targetPosition');
        targetPosition?.onChange((event) => {
            this.getBooleanProperty('isMoving')?.setTrue('movement_start');
            console.log(`🎯 ${this.getExtensionType()} target: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        });
    }

    /**
     * Set the game world for lag compensation (server only uses this)
     */
    public setGameWorld(gameWorld: GameWorld): void {
        this.gameWorld = gameWorld;
    }

    /**
     * Observe input state - CORE GAME LOGIC that runs on both client and server
     * Client: Processes immediately for prediction
     * Server: Processes with lag compensation for authority
     */
    public observeInputState(inputState: InputStateEntity): void {
        this.inputState = inputState;
        console.log(`🎮 ${this.getExtensionType()} ${this.getNetworkId()}: Observing input state`);
        
        // Observe click events (ground clicks move the ball)
        const clickObserver = inputState.getCollectionProperty('recentClicks')
            ?.itemAddedObservable.add((event) => {
                const clickEvent = event.value as ClickEvent;
                
                // Only process ground clicks (no entity picked)
                if (!clickEvent.pickedEntityId || clickEvent.pickedEntityId === '') {
                    console.log(`📍 ${this.getExtensionType()}: Processing ground click at (${clickEvent.worldPosition.x.toFixed(1)}, ${clickEvent.worldPosition.z.toFixed(1)})`);
                    
                    if (this.gameWorld && this.getRole().isServer) {
                        // Server: Use lag compensation
                        this.gameWorld.processClientInput({
                            timestamp: clickEvent.timestamp,
                            sequenceId: clickEvent.sequenceId,
                            entityId: this.getNetworkId(),
                            action: 'moveTo',
                            parameters: { target: clickEvent.worldPosition, source: 'input_click' },
                            clientId: 'main_client'
                        });
                    } else {
                        // Client: Direct update for prediction
                        this.moveTo(clickEvent.worldPosition, 'client_prediction_click');
                    }
                } 
                // Process entity clicks (color cycling)
                else if (clickEvent.pickedEntityId === this.getNetworkId()) {
                    console.log(`🎨 ${this.getExtensionType()}: Entity clicked for color cycle`);
                    this.cycleColor('input_entity_click');
                }
            });
            
        if (clickObserver) {
            this.inputStateObservers.push(() => clickObserver.remove());
        }
        
        // Observe keyboard state for WASD movement
        const keysObserver = inputState.getCollectionProperty('keysPressed')
            ?.itemAddedObservable.add((event) => {
                const keyCode = event.value as string;
                
                const moveDistance = 2.0;
                let offset = Vector3.Zero();
                
                switch (keyCode) {
                    case 'KeyW': offset.z = moveDistance; break;
                    case 'KeyS': offset.z = -moveDistance; break;
                    case 'KeyA': offset.x = -moveDistance; break;
                    case 'KeyD': offset.x = moveDistance; break;
                    default: return;
                }
                
                console.log(`⌨️ ${this.getExtensionType()}: Key ${keyCode} → move by (${offset.x}, ${offset.z})`);
                
                const currentPos = this.getVectorProperty('position')?.getValue() || Vector3.Zero();
                const newTarget = currentPos.add(offset);
                
                if (this.getRole().isServer && this.gameWorld) {
                    // Server: Use lag compensation for keyboard input too
                    this.gameWorld.processClientInput({
                        timestamp: Date.now(), // Could get from input event
                        sequenceId: Date.now(),
                        entityId: this.getNetworkId(),
                        action: 'moveTo',
                        parameters: { target: newTarget, source: 'input_keyboard' },
                        clientId: 'main_client'
                    });
                } else {
                    // Client: Direct update for prediction
                    this.moveTo(newTarget, `client_prediction_key_${keyCode}`);
                }
            });
            
        if (keysObserver) {
            this.inputStateObservers.push(() => keysObserver.remove());
        }

        // Observe hover state from enriched input
        const hoverObserver = inputState.getProperty('currentlyPickedEntity')
            ?.onChange((event) => {
                const isHovered = event.to === this.getNetworkId();
                this.getBooleanProperty('isHovered')?.set(isHovered, 'input_hover');
            });

        if (hoverObserver) {
            this.inputStateObservers.push(() => hoverObserver.remove());
        }
    }

    /**
     * Update game logic - runs on BOTH client and server at fixed tick rate
     */
    public updateGameLogic(deltaTime: number): void {
        this.updateMovement(deltaTime);
    }

    /**
     * Update only visual aspects - runs at render framerate on client only
     */
    public updateVisuals(deltaTime: number): void {
        // Override in client extension for smooth visual interpolation
        // Could include: particle effects, animation blending, etc.
    }

    private updateMovement(deltaTime: number): void {
        const isMoving = this.getBooleanProperty('isMoving');
        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        const moveSpeed = this.getNumericProperty('moveSpeed');

        if (!isMoving?.isTrue() || !position || !targetPosition || !moveSpeed) return;

        const currentPos = position.getValue();
        const targetPos = targetPosition.getValue();
        const speed = moveSpeed.getValue();

        const direction = targetPos.subtract(currentPos);
        const distance = direction.length();

        if (distance < 0.1) {
            // Reached target
            isMoving.setFalse('movement_complete');
            position.set(targetPos, 'movement_complete');
            console.log(`🏁 ${this.getExtensionType()} reached target`);
        } else {
            // Move towards target
            const movement = direction.normalize().scale(speed * deltaTime);
            const newPos = currentPos.add(movement);
            position.set(newPos, 'movement_interpolation');
        }
    }

    protected setupMeshActions(): void {
        if (!this.mesh || !this.scene) return;

        this.mesh.actionManager = new ActionManager(this.scene);
        
        // Mesh clicks are now handled through input state observation
        // No direct click handlers needed - Babylon pointer events update InputStateEntity
    }

    protected updateColor(): void {
        if (!this.material) return;

        const colorState = this.getNumericProperty('colorState')?.getValue() || 0;
        const isHovered = this.getBooleanProperty('isHovered')?.isTrue() || false;

        const baseColor = this.getColorForState(colorState);
        
        if (isHovered) {
            this.material.diffuseColor = baseColor.add(new Color3(0.3, 0.3, 0.3));
        } else {
            this.material.diffuseColor = baseColor;
        }
        
        this.material.emissiveColor = this.material.diffuseColor.scale(0.3);
    }

    // Abstract methods
    protected abstract getColorForState(state: number): Color3;
    protected abstract getExtensionType(): 'CLIENT' | 'SERVER';

    // Public API
    public moveTo(target: Vector3, source: string): void {
        this.getVectorProperty('targetPosition')?.set(target, source);
    }

    public cycleColor(source: string): void {
        const colorState = this.getNumericProperty('colorState');
        const currentState = colorState?.getValue() || 0;
        const newState = (currentState + 1) % 3;
        colorState?.set(newState, source);
    }

    public getPosition(): Vector3 {
        return this.getVectorProperty('position')?.getValue() || Vector3.Zero();
    }

    public isMoving(): boolean {
        return this.getBooleanProperty('isMoving')?.isTrue() || false;
    }

    dispose(): void {
        this.inputStateObservers.forEach(cleanup => cleanup());
        this.inputStateObservers = [];
        super.dispose();
    }
}