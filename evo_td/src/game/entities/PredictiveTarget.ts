import { NetworkReactiveEntity } from '../../engine/networking/NetworkReactiveEntity';
import { NetworkRole } from '../../engine/networking/NetworkTypes';
import { GAME_ENTITY_SCHEMAS } from '../game/schemas/EntitySchemas';

export class PredictiveTarget extends NetworkReactiveEntity {
    private movementTimerCleanup?: () => void;
    private clickHandler?: (event: PointerEvent) => void;

    constructor(networkId: string, scene: Scene | null, role: NetworkRole, parentNode?: any) {
        super('clickable_unit', networkId, scene, role, parentNode);
        
        this.createPropertiesFromSchema(GAME_ENTITY_SCHEMAS.clickable_unit);
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
        // ✅ FIXED: Check role instead of scene existence
        if (!this.getRole().ownedByThisClient) return;

        console.log(`🖱️ Setting up PREDICTIVE click handling for ${this.getNetworkId()}`);
        
        this.clickHandler = (event: PointerEvent) => {
            const isAlive = this.getBooleanProperty('isAlive');
            if (!isAlive?.isTrue()) return;

            const canvas = this.scene?.getEngine().getRenderingCanvas();
            if (!canvas) return;

            try {
                const rect = canvas.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const z = ((event.clientY - rect.top) / rect.height) * 2 - 1;
                const worldX = x * 5;
                const worldZ = z * 5;
                const targetPos = new Vector3(worldX, 0, worldZ);
                
                console.log(`🖱️ PREDICTION: ${this.getNetworkId()} click-to-move: (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`);
                
                const targetPosition = this.getVectorProperty('targetPosition');
                if (targetPosition) {
                    targetPosition.set(targetPos, 'client_click_prediction');
                    
                    this.sendInputToServer({ 
                        action: 'move_to', 
                        target: { x: worldX, y: 0, z: worldZ },
                        predictionId: Date.now()
                    });
                }
            } catch (error) {
                console.error('Error handling click input:', error);
            }
        };

        if (this.scene) {
            const canvas = this.scene.getEngine().getRenderingCanvas();
            if (canvas) {
                canvas.addEventListener('click', this.clickHandler);
                this.addCleanupFunction(() => {
                    if (this.clickHandler && canvas) {
                        canvas.removeEventListener('click', this.clickHandler);
                    }
                });
            }
        }
    }

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

    /**
     * ✅ FIXED: Better input validation
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
                    console.log(`✅ Server VALIDATED move for ${this.getNetworkId()}`);
                    targetPosition.set(targetPos, 'server_validated_move');
                } else {
                    console.log(`❌ Server REJECTED move for ${this.getNetworkId()} (distance: ${distance.toFixed(2)})`);
                }
            }
        } catch (error) {
            console.error('Error handling server input:', error);
        }
    }

    private sendInputToServer(inputData: any): void {
        console.log(`📤 PREDICTION: Sending input to server:`, inputData);
        // Handled by NetworkManager
    }

    private stopMovement(): void {
        if (this.movementTimerCleanup) {
            this.movementTimerCleanup();
            this.movementTimerCleanup = undefined;
        }
    }

    dispose(): void {
        this.stopMovement();
        super.dispose();
    }
}