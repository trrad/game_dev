// Ball.server.ts
import { Ball } from './Ball.base';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { InputStateEntity, ClickEvent } from '../../../engine/inputs/InputStateEntity';
import { GameWorld } from '../../../game/systems/GameWorld';

export class ServerBall extends Ball {
    private inputStateObservers: (() => void)[] = [];
    private gameWorld?: GameWorld;
    
    protected initializeServerBehavior(): void {
        console.log(`🖥️ SERVER: Initializing server behavior for ${this.id}`);
        
        // The reactive property system already handles server authority
        // We only need server-specific game logic here
    }

    /**
     * Set the game world for lag compensation
     */
    setGameWorld(gameWorld: GameWorld): void {
        this.gameWorld = gameWorld;
    }

    /**
     * Observe an input state entity for this ball
     * This creates the pure reactive input → game state flow
     */
    observeInputState(inputState: InputStateEntity): void {
        console.log(`📡 SERVER ${this.id}: Observing input state reactively`);
        
        // Observe click events in the input state
        const clickObserver = inputState.getCollectionProperty('recentClicks')
            ?.itemAddedObservable.add((event) => {
                const clickEvent = event.value as ClickEvent;
                
                // Only process ground clicks
                if (!clickEvent.pickedEntityId || clickEvent.pickedEntityId === '') {
                    console.log(`📥 SERVER ${this.id}: Click at (${clickEvent.worldPosition.x.toFixed(1)}, ${clickEvent.worldPosition.z.toFixed(1)})`);
                    
                    if (this.gameWorld) {
                        // Use lag compensation
                        this.gameWorld.processClientInput({
                            timestamp: clickEvent.timestamp,
                            sequenceId: clickEvent.sequenceId,
                            entityId: this.id,
                            action: 'moveTo',
                            parameters: { target: clickEvent.worldPosition, source: 'reactive_click' },
                            clientId: 'main_client'
                        });
                    } else {
                        // Direct update without lag compensation
                        this.moveTo(clickEvent.worldPosition, 'reactive_input');
                    }
                }
            });
            
        if (clickObserver) {
            this.inputStateObservers.push(() => clickObserver.remove());
        }
        
        // Observe keyboard state for WASD movement
        const keysObserver = inputState.getCollectionProperty('keysPressed')
            ?.itemAddedObservable.add((event) => {
                const keyCode = event.key;
                console.log(`📥 SERVER ${this.id}: Key pressed ${keyCode}`);
                
                // Calculate movement
                const moveDistance = 2.0;
                let offset = Vector3.Zero();
                
                switch (keyCode) {
                    case 'KeyW': offset.z = moveDistance; break;
                    case 'KeyS': offset.z = -moveDistance; break;
                    case 'KeyA': offset.x = -moveDistance; break;
                    case 'KeyD': offset.x = moveDistance; break;
                    default: return;
                }
                
                const currentPos = this.getVectorProperty('position')?.getValue() || Vector3.Zero();
                this.moveTo(currentPos.add(offset), `reactive_keyboard_${keyCode}`);
            });
            
        if (keysObserver) {
            this.inputStateObservers.push(() => keysObserver.remove());
        }
    }

    // Override update to add server-specific logic
    public update(deltaTime: number): void {
        super.update(deltaTime);
        
        // Add any server-only update logic here
        // For example: collision detection with server-only entities
        // or server-side physics calculations
    }

    dispose(): void {
        // Clean up input observers
        this.inputStateObservers.forEach(cleanup => cleanup());
        this.inputStateObservers = [];
        
        super.dispose();
    }

    // Remove all validation logic - the reactive system handles authority
    // The server's state IS the authoritative state by design
}