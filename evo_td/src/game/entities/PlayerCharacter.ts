// src/game/entities/PlayerCharacter.ts - Fixed render sync + clean input pattern

import { NetworkReactiveEntity } from '../../engine/networking/NetworkReactiveEntity';
import { NetworkRole } from '../../engine/networking/NetworkTypes';
import { GAME_ENTITY_SCHEMAS } from '../schemas/EntitySchemas';
import { Vector3, Scene, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { ConfigurableTimers } from '../../engine/utils/ConfigurableTimers';
import { InputStateEntity } from '../../engine/inputs/InputStateEntity';
import { RenderComponent } from '../../engine/components/RenderComponent';

/**
 * Simple render component for PlayerCharacter visualization
 */
class PlayerCharacterRenderComponent extends RenderComponent {
    private color: Color3;
    private isClientSide: boolean;
    private debugId: string;

    constructor(scene: Scene, isClientSide: boolean = false, debugId: string = 'player') {
        super(scene, {
            autoParentToNode: true,
            visible: true
        });
        
        this.isClientSide = isClientSide;
        this.debugId = debugId;
        this.color = isClientSide ? Color3.Blue() : Color3.Green();
    }
    
    protected createVisual(): void {
        this.mesh = MeshBuilder.CreateSphere("player_sphere", { diameter: 1 }, this.scene);
        
        this.material = new StandardMaterial("player_mat", this.scene);
        this.material.diffuseColor = this.color;
        this.material.emissiveColor = this.color.scale(0.2);
        
        this.mesh.material = this.material;
        
        console.log(`🎨 [${this.debugId}] Created ${this.isClientSide ? 'CLIENT' : 'SERVER'} visual`);
    }
    
    protected updateVisual(): void {
        // Debug mesh position after transform sync
        if (this.mesh) {
            console.log(`🔄 [${this.debugId}] updateVisual - mesh at:`, this.mesh.position);
        }
    }
    
    updateHealthVisual(healthPercent: number): void {
        if (!this.material) return;
        
        if (healthPercent <= 0) {
            this.material.diffuseColor = Color3.Black();
        } else if (healthPercent < 0.25) {
            this.material.diffuseColor = Color3.Red();
        } else if (healthPercent < 0.5) {
            this.material.diffuseColor = Color3.Yellow();
        } else {
            this.material.diffuseColor = this.color;
        }
    }
    
    updateStateVisual(state: string): void {
        if (!this.material) return;
        
        switch (state) {
            case 'moving':
                this.material.emissiveColor = Color3.Blue().scale(0.3);
                break;
            case 'reached_destination':
                this.material.emissiveColor = Color3.Green().scale(0.5);
                break;
            default:
                this.material.emissiveColor = this.color.scale(0.2);
        }
        
        console.log(`✨ [${this.debugId}] State visual updated to: ${state}`);
    }
    
    flashColor(color: Color3, duration: number = 300): void {
        if (!this.material) return;
        
        const originalColor = this.material.diffuseColor.clone();
        this.material.diffuseColor = color;
        console.log(`⚡ [${this.debugId}] Flashing color:`, color);
        
        setTimeout(() => {
            if (this.material) {
                this.material.diffuseColor = originalColor;
                console.log(`⚡ [${this.debugId}] Flash ended, restored color`);
            }
        }, duration);
    }
}

export class PlayerCharacter extends NetworkReactiveEntity {
    private inputState: InputStateEntity;
    private movementTimerCleanup?: () => void;
    private inputObserverCleanup: (() => void)[] = [];
    private renderComponent?: PlayerCharacterRenderComponent;
    private debugId: string;

    constructor(
        networkId: string, 
        scene: Scene | null, 
        role: NetworkRole, 
        inputState: InputStateEntity,
        parentNode?: any
    ) {
        super('player_character', networkId, scene, role, parentNode);
        
        this.debugId = `${networkId}(${role.isClient ? 'CLIENT' : 'SERVER'})`;
        this.inputState = inputState;
        this.createPropertiesFromSchema(GAME_ENTITY_SCHEMAS.player_character);
        
        // Setup rendering
        this.setupRendering();
        
        // ✅ FIX: Setup debug position tracking AFTER NodeComponent is created
        this.setupTransformDebugTracking();
        
        this.setupBehaviors();
        this.setupRoleBehaviors();
        
        console.log(`🎮 [${this.debugId}] PlayerCharacter created`);
    }

    /**
     * ✅ DEBUG: Track NodeComponent TransformNode sync
     */
    private setupTransformDebugTracking(): void {
        const position = this.getVectorProperty('position');
        
        if (position) {
            position.onChange((event) => {
                // Check if NodeComponent TransformNode is updating
                const nodeComponent = this.getNodeComponent();
                const transformNode = nodeComponent?.getTransformNode();
                const meshComponent = this.renderComponent?.getMesh();
                
                console.log(`📍 [${this.debugId}] TRANSFORM SYNC DEBUG:`, {
                    reactiveProperty: `(${event.to.x.toFixed(2)}, ${event.to.y.toFixed(2)}, ${event.to.z.toFixed(2)})`,
                    transformNode: transformNode ? `(${transformNode.position.x.toFixed(2)}, ${transformNode.position.y.toFixed(2)}, ${transformNode.position.z.toFixed(2)})` : 'missing',
                    meshPosition: meshComponent ? `(${meshComponent.position.x.toFixed(2)}, ${meshComponent.position.y.toFixed(2)}, ${meshComponent.position.z.toFixed(2)})` : 'missing',
                    source: event.source,
                    changed: event.changed
                });

                // ✅ MANUAL FIX: Force TransformNode update if it's not happening automatically
                if (transformNode && !transformNode.position.equals(event.to)) {
                    console.log(`🔧 [${this.debugId}] MANUAL SYNC: Updating TransformNode position`);
                    transformNode.position.copyFrom(event.to);
                }
            });
        }
        
        console.log(`🔍 [${this.debugId}] Transform debug tracking enabled`);
    }

    private setupRendering(): void {
        if (!this.scene) {
            console.warn(`[${this.debugId}] No scene available for rendering`);
            return;
        }

        this.renderComponent = new PlayerCharacterRenderComponent(
            this.scene, 
            this.getRole().isClient,
            this.debugId
        );
        this.addComponent(this.renderComponent);
        
        console.log(`🎨 [${this.debugId}] Rendering setup complete`);
    }

    // ========================================================================
    // ✅ REVERTED: Clean mouseButtons pattern instead of recentClicks
    // ========================================================================

    /**
     * ✅ WORKING: Process recent clicks (proven to work)
     */
    private handleInputStateChange(source: string): void {
        const isAlive = this.getBooleanProperty('isAlive');
        if (!isAlive?.isTrue()) {
            console.log(`💀 [${this.debugId}] Ignoring input - not alive`);
            return;
        }

        console.log(`🎮 [${this.debugId}] Processing input state change from: ${source}`);

        // ✅ WORKING: Process recent clicks (this pattern works!)
        const recentClicks = this.inputState.getRecentClicks();
        if (recentClicks.length > 0) {
            console.log(`🖱️ [${this.debugId}] Found ${recentClicks.length} recent clicks to process`);
            
            recentClicks.forEach(clickEvent => {
                console.log(`🖱️ [${this.debugId}] Processing click at (${clickEvent.worldPosition.x.toFixed(2)}, ${clickEvent.worldPosition.z.toFixed(2)}), picked: ${clickEvent.pickedEntityId || 'none'}`);
                
                // Ground click → movement command
                if (!clickEvent.pickedEntityId) {
                    this.processMovementCommand(clickEvent.worldPosition, source);
                }
                // Entity click → interaction command  
                else {
                    this.processInteractionCommand(clickEvent.pickedEntityId, source);
                }
            });
        }

        // Process keyboard movement
        this.processKeyboardMovement(source);
    }

    private processMovementCommand(targetPos: Vector3, source: string): void {
        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        
        if (!position || !targetPosition) {
            console.error(`❌ [${this.debugId}] Missing position properties for movement`);
            return;
        }

        const currentPos = position.getValue();
        const distance = Vector3.Distance(currentPos, targetPos);
        const maxMoveDistance = 15;
        
        console.log(`🎯 [${this.debugId}] Movement command:`, {
            current: `(${currentPos.x.toFixed(2)}, ${currentPos.z.toFixed(2)})`,
            target: `(${targetPos.x.toFixed(2)}, ${targetPos.z.toFixed(2)})`,
            distance: distance.toFixed(2),
            maxDistance: maxMoveDistance,
            source
        });
        
        if (distance <= maxMoveDistance) {
            console.log(`✅ [${this.debugId}] VALIDATED move - setting target position`);
            targetPosition.set(targetPos, source);
            
            if (this.renderComponent) {
                this.renderComponent.flashColor(Color3.Yellow(), 200);
            }
        } else {
            console.log(`❌ [${this.debugId}] REJECTED move - distance too large`);
            
            if (source.includes('server')) {
                targetPosition.set(currentPos, 'server_validation_rejection');
            }
            
            if (this.renderComponent) {
                this.renderComponent.flashColor(Color3.Red(), 400);
            }
        }
    }

    private processInteractionCommand(entityId: string, source: string): void {
        console.log(`🎯 [${this.debugId}] Interaction with ${entityId} from ${source}`);
        
        const interactionTarget = this.getProperty<string>('interactionTarget');
        if (interactionTarget) {
            interactionTarget.set(entityId, source);
            
            if (this.renderComponent) {
                this.renderComponent.flashColor(Color3.Purple(), 300);
            }
        }
    }

    private processKeyboardMovement(source: string): void {
        const movementInput = this.getVectorProperty('movementInput');
        if (!movementInput) return;

        let movement = Vector3.Zero();
        let keysPressed: string[] = [];
        
        if (this.inputState.isKeyPressed('KeyW')) { movement.z += 1; keysPressed.push('W'); }
        if (this.inputState.isKeyPressed('KeyS')) { movement.z -= 1; keysPressed.push('S'); }
        if (this.inputState.isKeyPressed('KeyA')) { movement.x -= 1; keysPressed.push('A'); }
        if (this.inputState.isKeyPressed('KeyD')) { movement.x += 1; keysPressed.push('D'); }

        if (movement.length() > 0) {
            movement = movement.normalize();
            console.log(`⌨️ [${this.debugId}] Keyboard movement: ${keysPressed.join('+')} → (${movement.x.toFixed(2)}, ${movement.z.toFixed(2)}) from ${source}`);
        }

        movementInput.set(movement, source);
    }

    // ========================================================================
    // ✅ REACTIVE BEHAVIORS (unchanged, working perfectly)
    // ========================================================================

    protected setupBehaviors(): void {
        const health = this.getNumericProperty('health');
        const isAlive = this.getBooleanProperty('isAlive');
        const unitState = this.getEnumProperty<'idle' | 'moving' | 'paused' | 'reached_destination'>('unitState');
        const targetPosition = this.getVectorProperty('targetPosition');
        const movementProgress = this.getNumericProperty('movementProgress');

        if (!health || !isAlive || !unitState || !targetPosition || !movementProgress) {
            console.error(`❌ [${this.debugId}] Failed to get required properties`);
            return;
        }

        // Death handling
        health.onChange((event) => {
            if (this.renderComponent) {
                const healthPercent = health.getPercentage();
                this.renderComponent.updateHealthVisual(healthPercent);
            }
            
            if (event.to <= 0 && isAlive.isTrue()) {
                console.log(`💀 [${this.debugId}] Death triggered`);
                isAlive.setFalse('death');
                unitState.setTo('paused', 'death');
            }
        });

        // Target position changes trigger movement
        targetPosition.onChange((event) => {
            if (event.changed && isAlive.isTrue()) {
                console.log(`🎯 [${this.debugId}] Target changed - triggering movement state`);
                unitState.setTo('moving', 'target_changed');
                movementProgress.set(0, 'movement_reset');
            }
        });

        // Unit state changes trigger movement start/stop
        unitState.onChange((event) => {
            console.log(`🏃 [${this.debugId}] State change: ${event.from} → ${event.to} (${event.source})`);
            
            if (this.renderComponent) {
                this.renderComponent.updateStateVisual(event.to);
            }
            
            if (event.to === 'moving') {
                console.log(`🏃 [${this.debugId}] Starting movement`);
                this.startMovement();
            } else if (event.from === 'moving') {
                console.log(`🛑 [${this.debugId}] Stopping movement`);
                this.stopMovement();
            }
        });

        // Movement completion
        movementProgress.onChange((event) => {
            if (event.to >= 1.0 && unitState.getValue() === 'moving') {
                console.log(`🏁 [${this.debugId}] Movement completed`);
                unitState.setTo('reached_destination', 'movement_complete');
                
                if (this.scene) {
                    const cleanup = ConfigurableTimers.createOneShotTimer(this.scene, 1000, () => {
                        if (unitState.isValue('reached_destination')) {
                            console.log(`😴 [${this.debugId}] Auto-idle after reaching destination`);
                            unitState.setTo('idle', 'auto_idle');
                        }
                    });
                    this.addCleanupFunction(cleanup);
                }
            }
        });

        console.log(`✅ [${this.debugId}] All behaviors set up`);
    }

    // ========================================================================
    // ✅ REVERTED: Clean mouseButtons observers
    // ========================================================================

    protected setupClientBehaviors(): void {
        if (!this.getRole().isClient) return;
        
        console.log(`💻 [${this.debugId}] Setting up CLIENT input observers`);
        this.setupInputStateObservers('client_prediction');
    }

    protected setupServerBehaviors(): void {
        if (!this.getRole().isServer) return;
        
        console.log(`🖥️ [${this.debugId}] Setting up SERVER input observers`);
        this.setupInputStateObservers('server_authority');
    }

    protected setupInputHandling(): void {
        // Called for client-owned entities
    }

    /**
     * ✅ CLEAN: Observe mouseButtons collection changes (cleaner pattern)
     */
    private setupInputStateObservers(authority: string): void {
        // Observe mouse button state changes
        const mouseButtons = this.inputState.getCollectionProperty('mouseButtons');
        if (mouseButtons) {
            const cleanup1 = () => {
                const addObserver = mouseButtons.itemAddedObservable.add(() => {
                    console.log(`🖱️ [${this.debugId}] Mouse button pressed - processing input for ${authority}`);
                    this.handleInputStateChange(authority);
                });
                const removeObserver = mouseButtons.itemRemovedObservable.add(() => {
                    console.log(`🖱️ [${this.debugId}] Mouse button released - processing input for ${authority}`);
                    this.handleInputStateChange(authority);
                });
                return () => {
                    addObserver.remove();
                    removeObserver.remove();
                };
            };
            this.inputObserverCleanup.push(cleanup1());
            console.log(`✅ [${this.debugId}] Mouse button observers set up for ${authority}`);
        } else {
            console.error(`❌ [${this.debugId}] No mouseButtons collection found!`);
        }

        // Observe key state changes
        const keysPressed = this.inputState.getCollectionProperty('keysPressed');
        if (keysPressed) {
            const cleanup2 = () => {
                const addObserver = keysPressed.itemAddedObservable.add(() => {
                    console.log(`⌨️ [${this.debugId}] Key pressed - processing input for ${authority}`);
                    this.handleInputStateChange(authority);
                });
                const removeObserver = keysPressed.itemRemovedObservable.add(() => {
                    console.log(`⌨️ [${this.debugId}] Key released - processing input for ${authority}`);
                    this.handleInputStateChange(authority);
                });
                return () => {
                    addObserver.remove();
                    removeObserver.remove();
                };
            };
            this.inputObserverCleanup.push(cleanup2());
            console.log(`✅ [${this.debugId}] Keyboard observers set up for ${authority}`);
        }

        console.log(`✅ [${this.debugId}] Input observers set up for ${authority}`);
    }

    // ========================================================================
    // ✅ MOVEMENT MECHANICS (unchanged, working perfectly)
    // ========================================================================

    private startMovement(): void {
        if (this.movementTimerCleanup) {
            console.log(`🏃 [${this.debugId}] Movement already in progress - ignoring start request`);
            return;
        }

        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        
        if (!position || !targetPosition) {
            console.error(`❌ [${this.debugId}] Missing position properties for movement`);
            return;
        }

        const startPos = position.getValue();
        const targetPos = targetPosition.getValue();
        const totalDistance = Vector3.Distance(startPos, targetPos);
        
        console.log(`🏃 [${this.debugId}] Movement details:`, {
            start: `(${startPos.x.toFixed(2)}, ${startPos.z.toFixed(2)})`,
            target: `(${targetPos.x.toFixed(2)}, ${targetPos.z.toFixed(2)})`,
            distance: totalDistance.toFixed(2)
        });
        
        if (totalDistance < 0.1) {
            console.log(`🏁 [${this.debugId}] Already at target - setting progress to 100%`);
            const movementProgress = this.getNumericProperty('movementProgress');
            movementProgress?.set(1, 'already_at_target');
            return;
        }

        if (this.scene) {
            console.log(`⏰ [${this.debugId}] Starting movement timer`);
            this.movementTimerCleanup = ConfigurableTimers.createTimer(
                this.scene,
                'gameLogic',
                () => this.updateMovement(startPos, targetPos, totalDistance),
                `movement_${this.getNetworkId()}`
            );
        } else {
            console.error(`❌ [${this.debugId}] No scene available for movement timer`);
        }
    }

    private updateMovement(startPos: Vector3, targetPos: Vector3, totalDistance: number): void {
        const unitState = this.getEnumProperty('unitState');
        const movementProgress = this.getNumericProperty('movementProgress');
        const moveSpeed = this.getNumericProperty('moveSpeed');
        const position = this.getVectorProperty('position');
        
        if (!unitState?.getValue().startsWith('moving') || !movementProgress || !moveSpeed || !position) {
            console.log(`🛑 [${this.debugId}] Movement update failed - missing properties or not moving`);
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
        console.log(`📍 [${this.debugId}] Setting position to: (${newPos.x.toFixed(2)}, ${newPos.y.toFixed(2)}, ${newPos.z.toFixed(2)})`);
        position.set(newPos, 'movement_interpolation');
    }

    private stopMovement(): void {
        if (this.movementTimerCleanup) {
            console.log(`🛑 [${this.debugId}] Stopping movement timer`);
            this.movementTimerCleanup();
            this.movementTimerCleanup = undefined;
        }
    }

    // ========================================================================
    // ✅ CLEANUP
    // ========================================================================

    dispose(): void {
        console.log(`🧹 [${this.debugId}] Disposing PlayerCharacter`);
        this.stopMovement();
        this.inputObserverCleanup.forEach(cleanup => cleanup());
        this.inputObserverCleanup = [];
        super.dispose();
    }
}