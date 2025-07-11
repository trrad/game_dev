// src/game/systems/GameWorld.ts

import { NetworkReactiveEntity } from '../../engine/networking/NetworkReactiveEntity';
import { TickFrequencyConfig, DEFAULT_TICK_FREQUENCIES } from '../../engine/core/TickFrequency';
import { Scene } from '@babylonjs/core';

/**
 * Timestamped input from client
 */
export interface TimestampedInput {
    timestamp: number;        // When the input occurred on client
    sequenceId: number;       // For ordering and acknowledgment
    entityId: string;         // Entity being controlled
    action: string;           // Action type (e.g., 'moveTo', 'interact')
    parameters: any;          // Action-specific parameters
    clientId: string;         // Which client sent this
}

/**
 * Which tick frequencies participate in replay during lag compensation
 */
export const REPLAY_FREQUENCIES: Set<keyof TickFrequencyConfig> = new Set([
    'gameLogic',      // Core game mechanics
    'spatial',        // Collision detection
    'healthRegen'     // Gameplay-affecting timers
    // NOT: rendering, clientEffects, networkSync, cleanup
]);

/**
 * GameWorld - Server-side world management with lag compensation
 * 
 * Manages all server entities and handles lag compensation by:
 * 1. Recording state history for all entities
 * 2. Rewinding to client input time
 * 3. Applying input at historical moment
 * 4. Fast-forwarding simulation to present
 * 
 * @example
 * ```typescript
 * const world = new GameWorld(scene, tickConfig);
 * 
 * // Process client input with automatic lag compensation
 * world.processClientInput({
 *     timestamp: clientClickTime,
 *     entityId: 'player_1',
 *     action: 'moveTo',
 *     parameters: { target: clickPosition }
 * });
 * ```
 */
export class GameWorld {
    private entities: Map<string, NetworkReactiveEntity> = new Map();
    private tickAccumulators: Map<string, number> = new Map();
    private tickCallbacks: Map<string, () => void> = new Map();
    
    private scene: Scene | null;
    private isReplaying: boolean = false;
    private currentSimTime: number;
    
    // Performance tracking
    private stats = {
        entitiesProcessed: 0,
        inputsProcessed: 0,
        replayMs: 0,
        averageReplayTime: 0
    };

    constructor(
        scene: Scene | null,
        private tickConfig: TickFrequencyConfig = DEFAULT_TICK_FREQUENCIES
    ) {
        this.scene = scene;
        this.currentSimTime = Date.now();
        
        // Initialize tick accumulators
        Object.keys(tickConfig).forEach(key => {
            this.tickAccumulators.set(key, 0);
        });
        
        // Enable state history for server
        NetworkReactiveEntity.enableStateHistory(1000); // 1 second buffer
        
        console.log('🌍 GameWorld initialized with lag compensation support');
    }

    /**
     * Add an entity to the world
     */
    addEntity(entity: NetworkReactiveEntity): void {
        this.entities.set(entity.getNetworkId(), entity);
        this.stats.entitiesProcessed++;
        
        console.log(`🌍 Added entity ${entity.getNetworkId()} to world`);
    }

    /**
     * Remove an entity from the world
     */
    removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.dispose();
            this.entities.delete(entityId);
            console.log(`🌍 Removed entity ${entityId} from world`);
        }
    }

    /**
     * Get an entity by ID
     */
    getEntity(entityId: string): NetworkReactiveEntity | undefined {
        return this.entities.get(entityId);
    }

    /**
     * Register a system callback for a specific tick frequency
     */
    registerSystem(systemName: keyof TickFrequencyConfig, callback: () => void): void {
        this.tickCallbacks.set(systemName, callback);
        console.log(`🌍 Registered ${systemName} system`);
    }

    /**
     * Main update loop - called every frame
     */
    update(deltaTime: number): void {
        this.currentSimTime = Date.now();
        this.updateSystemsAtFrequency(deltaTime, this.isReplaying);
    }

    /**
     * Process client input with lag compensation
     */
    processClientInput(input: TimestampedInput): void {
        const startTime = performance.now();
        
        console.log(`🎮 Processing input from ${input.clientId}: ${input.action} at ${input.timestamp}`);
        
        const entity = this.entities.get(input.entityId);
        if (!entity) {
            console.warn(`Entity ${input.entityId} not found for input processing`);
            return;
        }

        const now = Date.now();
        const inputAge = now - input.timestamp;
        
        if (inputAge > 1000) {
            console.warn(`Input too old (${inputAge}ms), rejecting`);
            return;
        }

        // 1. Capture current world state
        const currentStates = this.captureWorldState();
        
        // 2. Rewind world to input time
        this.rewindWorldToTime(input.timestamp);
        
        // 3. Apply the input at historical time
        this.applyInput(entity, input);
        
        // 4. Fast-forward to present
        this.isReplaying = true;
        this.fastForward(inputAge);
        this.isReplaying = false;
        
        // Track performance
        const replayTime = performance.now() - startTime;
        this.stats.inputsProcessed++;
        this.stats.replayMs += inputAge;
        this.stats.averageReplayTime = (this.stats.averageReplayTime + replayTime) / 2;
        
        console.log(`⏩ Replayed ${inputAge}ms in ${replayTime.toFixed(1)}ms for ${input.action}`);
    }

    /**
     * Apply input to an entity
     */
    private applyInput(entity: NetworkReactiveEntity, input: TimestampedInput): void {
        // This is where you'd call entity-specific methods based on action type
        // For now, assuming entities have methods matching action names
        
        const entityAny = entity as any;
        if (typeof entityAny[input.action] === 'function') {
            entityAny[input.action](...Object.values(input.parameters), `input_${input.clientId}`);
        } else {
            console.warn(`Unknown action ${input.action} for entity ${input.entityId}`);
        }
    }

    /**
     * Capture current state of all entities
     */
    private captureWorldState(): Map<string, Map<string, any>> {
        const worldState = new Map<string, Map<string, any>>();
        
        this.entities.forEach((entity, id) => {
            worldState.set(id, entity.getCurrentState());
        });
        
        return worldState;
    }

    /**
     * Rewind all entities to a specific timestamp
     */
    private rewindWorldToTime(timestamp: number): void {
        console.log(`⏪ Rewinding world to ${new Date(timestamp).toISOString()}`);
        
        this.entities.forEach(entity => {
            entity.rewindToTime(timestamp);
        });
        
        this.currentSimTime = timestamp;
    }

    /**
     * Fast-forward simulation by running update loops
     */
    private fastForward(milliseconds: number): void {
        const REPLAY_TIMESTEP = 16; // 60Hz granularity
        const steps = Math.floor(milliseconds / REPLAY_TIMESTEP);
        const startTime = this.currentSimTime;
        
        console.log(`⏩ Fast-forwarding ${milliseconds}ms in ${steps} steps`);
        
        // Run simulation steps
        for (let i = 0; i < steps; i++) {
            this.update(REPLAY_TIMESTEP / 1000);
            this.currentSimTime += REPLAY_TIMESTEP;
        }
        
        // Handle remaining time
        const remaining = milliseconds % REPLAY_TIMESTEP;
        if (remaining > 0) {
            this.update(remaining / 1000);
            this.currentSimTime += remaining;
        }
        
        console.log(`⏩ Simulation time advanced from ${startTime} to ${this.currentSimTime}`);
    }

    /**
     * Update systems based on their configured frequencies
     */
    private updateSystemsAtFrequency(deltaTime: number, isReplaying: boolean): void {
        Object.entries(this.tickConfig).forEach(([system, frequency]) => {
            const systemKey = system as keyof TickFrequencyConfig;
            
            // Skip non-replay systems during replay
            if (isReplaying && !REPLAY_FREQUENCIES.has(systemKey)) {
                return;
            }
            
            // Accumulate time for this system
            const accumulator = this.tickAccumulators.get(system) || 0;
            const newAccumulator = accumulator + deltaTime;
            
            // Check if we should tick this system
            const tickInterval = 1 / frequency;
            if (newAccumulator >= tickInterval) {
                // Run the system
                this.runSystem(systemKey);
                
                // Reset accumulator (keeping remainder)
                this.tickAccumulators.set(system, newAccumulator % tickInterval);
            } else {
                this.tickAccumulators.set(system, newAccumulator);
            }
        });
    }

    /**
     * Run a specific system
     */
    private runSystem(system: keyof TickFrequencyConfig): void {
        // Run registered callback if exists
        const callback = this.tickCallbacks.get(system);
        if (callback) {
            callback();
            return;
        }
        
        // Default system implementations
        switch (system) {
            case 'gameLogic':
                this.updateGameLogic();
                break;
            case 'spatial':
                this.updateSpatialQueries();
                break;
            case 'healthRegen':
                this.updateHealthRegen();
                break;
        }
    }

    /**
     * Update core game logic
     */
    private updateGameLogic(): void {
        const deltaTime = 1 / this.tickConfig.gameLogic; // Use configured game logic tick rate
        
        // Update all entities' game logic
        this.entities.forEach(entity => {
            entity.updateGameLogic(deltaTime);
        });
    }

    /**
     * Update spatial queries (collision detection, etc.)
     */
    private updateSpatialQueries(): void {
        // Implement spatial partitioning, collision detection, etc.
        // For now, just a placeholder
    }

    /**
     * Update health regeneration and other timers
     */
    private updateHealthRegen(): void {
        // Update any entities with health regen
        // This would observe health-related reactive properties
    }

    /**
     * Get world statistics
     */
    getStats(): any {
        return {
            ...this.stats,
            entityCount: this.entities.size,
            currentSimTime: this.currentSimTime,
            isReplaying: this.isReplaying
        };
    }

    /**
     * Clean up the world
     */
    dispose(): void {
        this.entities.forEach(entity => entity.dispose());
        this.entities.clear();
        this.tickCallbacks.clear();
        this.tickAccumulators.clear();
        
        console.log('🌍 GameWorld disposed');
    }
}