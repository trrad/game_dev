import { NetworkReactiveEntity, NetworkRole } from '../../engine/networking/NetworkReactiveEntity';
import { ConfigurableTimers } from '../../engine/utils/ConfigurableTimers';
import { Vector3, Scene } from '@babylonjs/core';
import { GAME_ENTITY_SCHEMAS } from '../schemas/EntitySchemas';

export class ServerAuthoritativeWanderer extends NetworkReactiveEntity {
    // ✅ FIXED: No property duplication - access via this.getProperty('health')
    
    private timerCleanup?: () => void;
    private boundsMin = new Vector3(-5, 0, -5);
    private boundsMax = new Vector3(5, 0, 5);
    private lastBoundaryCheck = 0; // ✅ FIXED: Optimize boundary checking

    constructor(networkId: string, scene: Scene | null, role: NetworkRole, parentNode?: any) {
        super('wanderer', networkId, scene, role, parentNode);
        
        this.createPropertiesFromSchema(GAME_ENTITY_SCHEMAS.wanderer);
        this.setupBehaviors();
        this.setupRoleBehaviors();
    }

    protected setupBehaviors(): void {
        const health = this.getNumericProperty('health');
        const isAlive = this.getBooleanProperty('isAlive');
        const wanderState = this.getEnumProperty<'wandering' | 'paused' | 'moving_to_target'>('wanderState');
        const position = this.getVectorProperty('position');
        const nearbyEntities = this.getCollectionProperty('nearbyEntities');

        if (!health || !isAlive || !wanderState || !position || !nearbyEntities) {
            console.error(`Failed to get required properties for wanderer ${this.getNetworkId()}`);
            return;
        }

        // ✅ FIXED: Use property references instead of this.health
        health.onChange((event: any) => {
            if (event.to <= 0 && isAlive.isTrue()) {
                isAlive.setFalse('death');
                wanderState.setTo('paused', 'death');
                console.log(`💀 ${this.getNetworkId()} died from health loss`);
            }
        });

        wanderState.onChange((event: any) => {
            console.log(`🚶 ${this.getNetworkId()} wander state: ${event.from} → ${event.to} (${event.source})`);
            
            if (event.to === 'paused') {
                this.stopWandering();
            } else if (event.to === 'wandering' && event.from === 'paused') {
                this.startWandering();
            }
        });

        // ✅ FIXED: Optimized boundary checking
        position.onChange((event: any) => {
            if (event.changed) {
                const now = performance.now();
                if (now - this.lastBoundaryCheck > 100) { // Check max every 100ms
                    this.checkBoundaries(event.to);
                    this.lastBoundaryCheck = now;
                }
            }
        });

        nearbyEntities.itemAddedObservable.add((event: any) => {
            console.log(`👀 ${this.getNetworkId()} detected nearby entity: ${event.key}`);
            if (wanderState.isValue('wandering')) {
                wanderState.setTo('paused', 'proximity_detected');
            }
        });
    }

    protected setupServerBehaviors(): void {
        // ✅ FIXED: Use role-based check instead of scene check
        if (!this.getRole().isServer) return;
        
        console.log(`🖥️ Setting up server behaviors for wanderer ${this.getNetworkId()}`);
        
        this.startWandering();

        // ✅ FIXED: Register cleanup for health regeneration timer
        if (this.scene) {
            const healthRegenCleanup = ConfigurableTimers.createRepeatingTimer(this.scene, 3000, () => {
                const health = this.getNumericProperty('health');
                const isAlive = this.getBooleanProperty('isAlive');
                
                if (health && isAlive && isAlive.isTrue() && health.getValue() < health.getMax()!) {
                    health.addValue(5, 'server_regeneration');
                }
            });
            
            this.addCleanupFunction(healthRegenCleanup);
        }
    }

    protected setupClientBehaviors(): void {
        console.log(`💻 Setting up client behaviors for wanderer ${this.getNetworkId()}`);
    }

    private startWandering(): void {
        // ✅ FIXED: Role-based check instead of scene check
        if (!this.getRole().isServer || this.timerCleanup) return;

        console.log(`🚶 ${this.getNetworkId()} started wandering`);
        
        if (this.scene) {
            this.timerCleanup = ConfigurableTimers.createRepeatingTimer(this.scene, 16, () => {
                const wanderState = this.getEnumProperty('wanderState');
                const isAlive = this.getBooleanProperty('isAlive');
                
                if (wanderState?.isValue('wandering') && isAlive?.isTrue()) {
                    this.updateWanderMovement();
                }
            });
        }
    }

    private updateWanderMovement(): void {
        const position = this.getVectorProperty('position');
        const wanderDirection = this.getVectorProperty('wanderDirection');
        const wanderSpeed = this.getNumericProperty('wanderSpeed');
        
        if (!position || !wanderDirection || !wanderSpeed) return;

        const currentPos = position.getValue();
        const direction = wanderDirection.getValue();
        const speed = wanderSpeed.getValue();
        
        const deltaTime = 16 / 1000;
        const movement = direction.scale(speed * deltaTime);
        const newPos = currentPos.add(movement);
        
        position.set(newPos, 'wandering_movement');
    }

    private checkBoundaries(position: Vector3): void {
        const wanderDirection = this.getVectorProperty('wanderDirection');
        if (!wanderDirection) return;

        let newDirection = wanderDirection.getValue().clone();
        let changed = false;

        if (position.x <= this.boundsMin.x || position.x >= this.boundsMax.x) {
            newDirection.x *= -1;
            changed = true;
        }
        if (position.z <= this.boundsMin.z || position.z >= this.boundsMax.z) {
            newDirection.z *= -1;
            changed = true;
        }

        if (changed) {
            wanderDirection.set(newDirection, 'boundary_bounce');
            console.log(`🏀 ${this.getNetworkId()} bounced off boundary`);
            
            const positionProp = this.getVectorProperty('position');
            if (positionProp) {
                const clampedPos = new Vector3(
                    Math.max(this.boundsMin.x, Math.min(this.boundsMax.x, position.x)),
                    position.y,
                    Math.max(this.boundsMin.z, Math.min(this.boundsMax.z, position.z))
                );
                
                if (!clampedPos.equals(position)) {
                    positionProp.set(clampedPos, 'boundary_clamp');
                }
            }
        }
    }

    private stopWandering(): void {
        if (this.timerCleanup) {
            this.timerCleanup();
            this.timerCleanup = undefined;
        }
    }

    dispose(): void {
        this.stopWandering();
        super.dispose();
    }
}
