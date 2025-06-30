/**
 * EnemySystem - Manages enemy spawning, AI behavior, and lifecycle
 * Integrates with TimeManager, EventStack, and SceneManager
 */
import { GameObject } from '../core/GameObject';
import { Enemy, EnemyConfig } from '../entities/Enemy';
import { EnemyRenderer } from '../renderers/EnemyRenderer';
import { HealthComponent } from '../components/HealthComponent';
import { PositionComponent } from '../components/PositionComponent';
import { MovementComponent } from '../components/MovementComponent';
import { AIBehaviorComponent, AIState, HuntingStrategy, SocialBehavior } from '../components/AIBehaviorComponent';
import { TimeManager } from '../game/TimeManager';
import { EventStack } from '../game/EventStack';
import { SceneManager } from '../core/SceneManager';
import { Rail } from '../game/Rail';
import { Train } from '../entities/Train';
import { TrainSystem } from './TrainSystem';
import { Logger, LogCategory } from '../utils/Logger';
import { Vector3 } from '@babylonjs/core';

/**
 * Enemy spawn configuration
 */
export interface EnemySpawnConfig {
    spawnInterval: { min: number; max: number }; // Time between spawns in seconds
    maxEnemies: number;                         // Maximum enemies at once
    spawnRadius: number;                        // Distance from rails to spawn
    spawnOnlyWhenTrainMoving: boolean;         // Only spawn when train is in motion

    // Enemy type probabilities (should sum to 1.0)
    enemyTypes: {
        basic: number;      // Standard weak enemies
        fast: number;       // Fast but fragile
        tank: number;       // Slow but tough
        aggressive: number; // High damage, medium stats
    };
}

/**
 * Default spawn configuration
 */
const DEFAULT_SPAWN_CONFIG: EnemySpawnConfig = {
    spawnInterval: { min: 6, max: 10 },
    maxEnemies: 15,
    spawnRadius: 20,
    spawnOnlyWhenTrainMoving: false, // Changed to false for continuous background spawning
    enemyTypes: {
        basic: 0.5,      // 50% basic enemies
        fast: 0.25,      // 25% fast enemies
        tank: 0.15,      // 15% tank enemies
        aggressive: 0.1  // 10% aggressive enemies
    }
};

/**
 * Enemy type templates
 */
const ENEMY_TEMPLATES = {
    basic: {
        maxHealth: 75,
        baseSpeed: 1.0,
        aggressionLevel: 0.4,
        intelligence: 0.3,
        sightRange: 12,
        attackRange: 1.5,
        fearThreshold: 0.2,
        socialBehavior: SocialBehavior.SOLITARY,
        huntingStrategy: HuntingStrategy.PURSUIT
    },
    fast: {
        maxHealth: 50,
        baseSpeed: 1.8,
        aggressionLevel: 0.6,
        intelligence: 0.4,
        sightRange: 15,
        attackRange: 1.2,
        fearThreshold: 0.3,
        socialBehavior: SocialBehavior.PACK,
        huntingStrategy: HuntingStrategy.PURSUIT
    },
    tank: {
        maxHealth: 150,
        baseSpeed: 0.6,
        aggressionLevel: 0.3,
        intelligence: 0.2,
        sightRange: 10,
        attackRange: 2.0,
        fearThreshold: 0.1,
        socialBehavior: SocialBehavior.SOLITARY,
        huntingStrategy: HuntingStrategy.TERRITORIAL
    },
    aggressive: {
        maxHealth: 100,
        baseSpeed: 1.4,
        aggressionLevel: 0.9,
        intelligence: 0.5,
        sightRange: 18,
        attackRange: 1.8,
        fearThreshold: 0.05,
        socialBehavior: SocialBehavior.PACK,
        huntingStrategy: HuntingStrategy.PURSUIT
    }
};

export class EnemySystem {
    private enemies: Map<string, Enemy> = new Map();
    private enemyRenderer: EnemyRenderer;
    private timeManager: TimeManager | null = null;
    private eventStack: EventStack | null = null;
    private sceneManager: SceneManager | null = null;
    private trainSystem: TrainSystem | null = null;

    // Spawn management
    private spawnConfig: EnemySpawnConfig;
    private nextEnemyId: number = 0;
    private lastSpawnTime: number = 0;
    private nextSpawnDelay: number = 0;

    // World references for spawning
    private rails: Map<string, Rail> = new Map();

    constructor(enemyRenderer: EnemyRenderer, spawnConfig?: Partial<EnemySpawnConfig>) {
        this.enemyRenderer = enemyRenderer;
        this.spawnConfig = { ...DEFAULT_SPAWN_CONFIG, ...spawnConfig };
        this.calculateNextSpawnDelay();

        Logger.log(LogCategory.SYSTEM, "EnemySystem initialized", {
            maxEnemies: this.spawnConfig.maxEnemies,
            spawnInterval: this.spawnConfig.spawnInterval
        });
    }

    /**
     * Set the TimeManager reference
     */
    public setTimeManager(timeManager: TimeManager): void {
        this.timeManager = timeManager;
    }

    /**
     * Set the EventStack reference
     */
    public setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
    }

    /**
     * Set the SceneManager reference
     */
    public setSceneManager(sceneManager: SceneManager): void {
        this.sceneManager = sceneManager;
    }

    /**
     * Set the TrainSystem reference for querying active trains
     */
    public setTrainSystem(trainSystem: TrainSystem): void {
        this.trainSystem = trainSystem;
    }

    /**
     * Add a rail for enemy spawning calculations
     */
    public addRail(rail: Rail): void {
        this.rails.set(rail.id, rail);
    }

    /**
     * Main update loop - called by the time manager
     */
    public update(deltaTime: number): void {
        // Handle enemy spawning
        this.updateSpawning(deltaTime);

        // Update enemy AI and behavior
        this.updateEnemyBehavior(deltaTime);

        // Update enemy health regeneration and growth
        this.updateEnemyHealth(deltaTime);

        // Remove dead enemies
        this.cleanupDeadEnemies();

        // Update visuals
        this.updateVisuals();
    }

    /**
     * Handle enemy spawning logic
     */
    private updateSpawning(_deltaTime: number): void {
        const currentTime = this.timeManager?.getState().gameTime ?? 0;

        // Check if it's time to spawn
        if (currentTime - this.lastSpawnTime >= this.nextSpawnDelay) {
            // Check spawn conditions
            if (this.shouldSpawnEnemy()) {
                this.spawnRandomEnemy();
                this.lastSpawnTime = currentTime;
                this.calculateNextSpawnDelay();
            }
        }
    }

    /**
     * Check if conditions are right for spawning
     */
    private shouldSpawnEnemy(): boolean {
        // Don't exceed max enemies
        if (this.enemies.size >= this.spawnConfig.maxEnemies) {
            Logger.log(LogCategory.SYSTEM, `Cannot spawn enemy: at max capacity (${this.enemies.size}/${this.spawnConfig.maxEnemies})`);
            return false;
        }

        // Check if train is moving (if required)
        if (this.spawnConfig.spawnOnlyWhenTrainMoving && this.trainSystem) {
            const trains = this.trainSystem.getAllTrains();
            const isAnyTrainMoving = trains.some(train => {
                const movementComponent = train.getComponent<MovementComponent>('movement');
                return movementComponent?.isRailMoving() ?? false;
            });

            if (!isAnyTrainMoving) {
                return false;
            }
        }

        return true;
    }

    /**
     * Spawn a random enemy type
     */
    private spawnRandomEnemy(): void {
        // Choose enemy type based on probabilities
        const enemyType = this.selectEnemyType();
        const spawnPosition = this.getRandomSpawnPosition();

        if (!spawnPosition) {
            Logger.log(LogCategory.SYSTEM, "Failed to find spawn position for enemy");
            return;
        }

        // Create enemy config
        const template = ENEMY_TEMPLATES[enemyType];
        const enemyConfig: EnemyConfig = {
            id: `enemy_${this.nextEnemyId++}`,
            spawnPosition,
            ...template
        };

        // Create enemy entity
        const enemy = new Enemy(enemyConfig);

        // Create visual representation
        const enemyVisual = this.enemyRenderer.createEnemyVisual(enemy);

        // Register with scene manager
        if (this.sceneManager) {
            this.sceneManager.registerGameObject(enemy, enemyVisual);
        }

        // Store enemy
        this.enemies.set(enemy.id, enemy);

        // Log spawn event
        this.eventStack?.logEvent(LogCategory.ENEMY, 'enemy_spawned', `${enemyType} enemy spawned`, {
            enemyId: enemy.id,
            enemyType,
            position: spawnPosition,
            totalEnemies: this.enemies.size
        });

        Logger.log(LogCategory.SYSTEM, `Spawned ${enemyType} enemy: ${enemy.id} (${this.enemies.size}/${this.spawnConfig.maxEnemies})`, {
            position: spawnPosition,
            totalEnemies: this.enemies.size
        });
    }

    /**
     * Select enemy type based on spawn probabilities
     */
    private selectEnemyType(): keyof typeof ENEMY_TEMPLATES {
        const rand = Math.random();
        let cumulative = 0;

        for (const [type, probability] of Object.entries(this.spawnConfig.enemyTypes)) {
            cumulative += probability;
            if (rand <= cumulative) {
                return type as keyof typeof ENEMY_TEMPLATES;
            }
        }

        return 'basic'; // Fallback
    }

    /**
     * Get a random spawn position near rails
     */
    private getRandomSpawnPosition(): { x: number; y: number; z: number } | null {
        if (this.rails.size === 0) return null;

        // Pick a random rail
        const railArray = Array.from(this.rails.values());
        const randomRail = railArray[Math.floor(Math.random() * railArray.length)];

        // Pick a random point along the rail
        const randomProgress = Math.random();
        const railPosition = randomRail.getPositionAt(randomProgress);

        if (!railPosition) return null;

        // Add random offset within spawn radius
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * this.spawnConfig.spawnRadius;

        return {
            x: railPosition.x + Math.cos(angle) * distance,
            y: 0.3, // Slightly above ground
            z: railPosition.z + Math.sin(angle) * distance
        };
    }

    /**
     * Calculate delay until next spawn
     */
    private calculateNextSpawnDelay(): void {
        const min = this.spawnConfig.spawnInterval.min;
        const max = this.spawnConfig.spawnInterval.max;
        this.nextSpawnDelay = min + Math.random() * (max - min);
    }

    /**
     * Update enemy AI behavior
     */
    private updateEnemyBehavior(deltaTime: number): void {
        for (const enemy of this.enemies.values()) {
            if (enemy.isDead()) continue;

            this.updateIndividualEnemyAI(enemy, deltaTime);
        }
    }

    /**
     * Update AI for a single enemy
     */
    private updateIndividualEnemyAI(enemy: Enemy, deltaTime: number): void {
        const aiComponent = enemy.getComponent<AIBehaviorComponent>('aiBehavior');
        const positionComponent = enemy.getComponent<PositionComponent>('position');
        const movementComponent = enemy.getComponent<MovementComponent>('movement');

        if (!aiComponent || !positionComponent || !movementComponent) return;

        const enemyPos = positionComponent.getPosition();
        const currentState = aiComponent.getCurrentState();

        // Find nearest train
        const nearestTrain = this.findNearestTrain(enemyPos);
        let targetPosition: Vector3 | null = null;

        if (nearestTrain) {
            const trainPos = nearestTrain.getComponent<PositionComponent>('position')?.getPosition();
            if (trainPos) {
                const distance = this.calculateDistance(enemyPos, trainPos);

                // State transitions based on distance and AI characteristics
                if (distance <= aiComponent.getSightRange() && currentState === AIState.WANDERING) {
                    aiComponent.setState(AIState.PURSUING, new Vector3(trainPos.x, trainPos.y, trainPos.z));
                    targetPosition = new Vector3(trainPos.x, trainPos.y, trainPos.z);
                } else if (distance > aiComponent.getSightRange() * 1.5 && currentState === AIState.PURSUING) {
                    aiComponent.setState(AIState.WANDERING);
                } else if (distance <= aiComponent.getAttackRange() && currentState === AIState.PURSUING) {
                    aiComponent.setState(AIState.ATTACKING, new Vector3(trainPos.x, trainPos.y, trainPos.z));
                    targetPosition = new Vector3(trainPos.x, trainPos.y, trainPos.z);
                }
            }
        }

        // Execute behavior based on current state
        this.executeEnemyBehavior(enemy, aiComponent, positionComponent, movementComponent, deltaTime);
    }

    /**
     * Execute enemy behavior based on current AI state
     */
    private executeEnemyBehavior(
        _enemy: Enemy,
        aiComponent: AIBehaviorComponent,
        positionComponent: PositionComponent,
        movementComponent: MovementComponent,
        deltaTime: number
    ): void {
        const currentState = aiComponent.getCurrentState();

        switch (currentState) {
            case AIState.WANDERING:
                this.executeWanderingBehavior(aiComponent, positionComponent, movementComponent, deltaTime);
                break;

            case AIState.PURSUING:
            case AIState.ATTACKING:
                this.executePursuitBehavior(aiComponent, positionComponent, movementComponent, deltaTime);
                break;

            case AIState.RETREATING:
                this.executeRetreatBehavior(aiComponent, positionComponent, movementComponent, deltaTime);
                break;
        }
    }

    /**
     * Execute wandering behavior
     */
    private executeWanderingBehavior(
        aiComponent: AIBehaviorComponent,
        positionComponent: PositionComponent,
        movementComponent: MovementComponent,
        deltaTime: number
    ): void {
        const enemyPos = positionComponent.getPosition();
        let wanderTarget = aiComponent.getWanderTarget();

        // Set new wander target if needed
        if (!wanderTarget || this.calculateDistance(enemyPos, wanderTarget) < 2.0 || aiComponent.getTimeSinceWanderChange() > 10) { 
            wanderTarget = this.getRandomNearbyPosition(enemyPos, aiComponent.getWanderRadius());
            aiComponent.setWanderTarget(wanderTarget);
        }

        // Move towards wander target
        this.moveTowardsTarget(positionComponent, movementComponent, wanderTarget, 0.6, deltaTime); // Slower wandering
    }

    /**
     * Execute pursuit/attack behavior
     */
    private executePursuitBehavior(
        aiComponent: AIBehaviorComponent,
        positionComponent: PositionComponent,
        movementComponent: MovementComponent,
        deltaTime: number
    ): void {
        const targetPosition = aiComponent.getTargetPosition();
        if (!targetPosition) return;

        const enemyPos = positionComponent.getPosition();
        const distanceToTarget = this.calculateDistance(enemyPos, targetPosition);

        // Check if enemy has reached the train (close contact)
        if (distanceToTarget < 1.0) { // 1 unit = contact distance
            this.handleTrainContact(aiComponent, positionComponent);
            return;
        }

        // Move towards target at full speed
        this.moveTowardsTarget(positionComponent, movementComponent, targetPosition, 1.0, deltaTime);
    }

    /**
     * Execute retreat behavior
     */
    private executeRetreatBehavior(
        _aiComponent: AIBehaviorComponent,
        positionComponent: PositionComponent,
        movementComponent: MovementComponent,
        deltaTime: number
    ): void {
        // Move away from trains
        const enemyPos = positionComponent.getPosition();
        const nearestTrain = this.findNearestTrain(enemyPos);

        if (nearestTrain) {
            const trainPos = nearestTrain.getComponent<PositionComponent>('position')?.getPosition();
            if (trainPos) {
                // Calculate direction away from train
                const awayDirection = {
                    x: enemyPos.x - trainPos.x,
                    y: 0,
                    z: enemyPos.z - trainPos.z
                };

                // Normalize and move
                const length = Math.sqrt(awayDirection.x * awayDirection.x + awayDirection.z * awayDirection.z);
                if (length > 0) {
                    awayDirection.x /= length;
                    awayDirection.z /= length;

                    const retreatTarget = {
                        x: enemyPos.x + awayDirection.x * 10,
                        y: enemyPos.y,
                        z: enemyPos.z + awayDirection.z * 10
                    };

                    this.moveTowardsTarget(positionComponent, movementComponent, retreatTarget, 1.2, deltaTime); // Fast retreat    
                }
            }
        }
    }

    /**
     * Move towards a target position
     */
    private moveTowardsTarget(
        positionComponent: PositionComponent,
        movementComponent: MovementComponent,
        target: { x: number; y: number; z: number },
        speedMultiplier: number,
        deltaTime: number
    ): void {
        const currentPos = positionComponent.getPosition();
        const direction = {
            x: target.x - currentPos.x,
            y: 0, // Keep enemies on ground
            z: target.z - currentPos.z
        };

        // Normalize direction
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        if (length > 0.1) { // Avoid jittering when very close
            direction.x /= length;
            direction.z /= length;

            // Apply movement
            const speed = movementComponent.getSpeed() * speedMultiplier;
            const newPos = {
                x: currentPos.x + direction.x * speed * deltaTime,
                y: currentPos.y, // Keep on ground
                z: currentPos.z + direction.z * speed * deltaTime
            };

            positionComponent.setPosition(newPos);
        }
    }

    /**
     * Update enemy health and regeneration
     */
    private updateEnemyHealth(deltaTime: number): void {
        for (const enemy of this.enemies.values()) {
            const healthComponent = enemy.getComponent<HealthComponent>('health');
            if (healthComponent) {
                healthComponent.update(deltaTime);
            }
        }
    }

    /**
     * Remove dead enemies
     */
    private cleanupDeadEnemies(): void {
        const deadEnemies = Array.from(this.enemies.values()).filter(enemy => enemy.isDead());

        if (deadEnemies.length > 0) {
            Logger.log(LogCategory.SYSTEM, `Cleaning up ${deadEnemies.length} dead enemies`);
        }

        for (const enemy of deadEnemies) {
            this.removeEnemy(enemy.id);
        }
    }

    /**
     * Remove an enemy from the system
     */
    public removeEnemy(enemyId: string): void {
        const enemy = this.enemies.get(enemyId);
        if (!enemy) return;

        // Remove visual
        this.enemyRenderer.removeEnemyVisual(enemyId);

        // Unregister from scene manager
        if (this.sceneManager) {
            this.sceneManager.unregisterGameObject(enemyId, false); // Visual already disposed by renderer
        }

        // Remove from enemies map
        this.enemies.delete(enemyId);

        // Log removal event
        this.eventStack?.logEvent(LogCategory.ENEMY, 'enemy_removed', `Enemy destroyed`, {
            enemyId,
            remainingEnemies: this.enemies.size
        });

        Logger.log(LogCategory.SYSTEM, `Removed enemy: ${enemyId}`, {
            remainingEnemies: this.enemies.size
        });
    }

    /**
     * Update visual representations
     */
    private updateVisuals(): void {
        const enemyArray = Array.from(this.enemies.values());
        this.enemyRenderer.updateAllVisuals(enemyArray);
    }

    /**
     * Find the nearest train to a position
     */
    private findNearestTrain(position: { x: number; y: number; z: number }): Train | null {
        if (!this.trainSystem) return null;
        
        let nearestTrain: Train | null = null;
        let nearestDistance = Infinity;

        const trains = this.trainSystem.getAllTrains();
        for (const train of trains) {
            const trainPos = train.getComponent<PositionComponent>('position')?.getPosition();
            if (trainPos) {
                const distance = this.calculateDistance(position, trainPos);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestTrain = train;
                }
            }
        }

        return nearestTrain;
    }

    /**
     * Calculate distance between two positions
     */
    private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {       
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get a random position near a given position
     */
    private getRandomNearbyPosition(center: { x: number; y: number; z: number }, radius: number): Vector3 {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * radius;

        return new Vector3(
            center.x + Math.cos(angle) * distance,
            center.y,
            center.z + Math.sin(angle) * distance
        );
    }

    /**
     * Get all enemies
     */
    public getEnemies(): Enemy[] {
        return Array.from(this.enemies.values());
    }

    /**
     * Get enemy count
     */
    public getEnemyCount(): number {
        return this.enemies.size;
    }

    /**
     * Get enemy by ID
     */
    public getEnemy(enemyId: string): Enemy | undefined {
        return this.enemies.get(enemyId);
    }

    /**
     * Clear all enemies
     */
    public clearAllEnemies(): void {
        const enemyIds = Array.from(this.enemies.keys());
        for (const enemyId of enemyIds) {
            this.removeEnemy(enemyId);
        }
    }

    /**
     * Update spawn configuration
     */
    public updateSpawnConfig(newConfig: Partial<EnemySpawnConfig>): void {
        this.spawnConfig = { ...this.spawnConfig, ...newConfig };

        Logger.log(LogCategory.SYSTEM, "Enemy spawn config updated", this.spawnConfig);
    }

    /**
     * Dispose of the enemy system
     */
    public dispose(): void {
        this.clearAllEnemies();
        this.enemyRenderer.dispose();

        Logger.log(LogCategory.SYSTEM, "EnemySystem disposed");
    }

    /**
     * Handle enemy contact with train - deal damage and destroy enemy
     */
    private handleTrainContact(aiComponent: AIBehaviorComponent, positionComponent: PositionComponent): void {
        const enemyPos = positionComponent.getPosition();

        // Find the enemy that made contact
        const contactingEnemy = Array.from(this.enemies.values()).find(enemy => {
            const pos = enemy.getComponent<PositionComponent>('position')?.getPosition();
            return pos && this.calculateDistance(enemyPos, pos) < 0.1; // Very close match
        });

        if (!contactingEnemy) return;

        // Award evolution points for successful attack
        aiComponent.awardEvolutionPoints(5);

        // Deal damage to train (TODO: implement train damage system)
        const damage = 10; // Base damage
        Logger.log(LogCategory.ENEMY, `Enemy ${contactingEnemy.id} reached train! Dealing ${damage} damage`);

        // Log the contact event
        this.eventStack?.logEvent(LogCategory.ENEMY, 'enemy_train_contact',
            `Enemy reached train and dealt ${damage} damage`, {
                enemyId: contactingEnemy.id,
                damage,
                position: enemyPos
            });

        // Destroy the enemy (they sacrifice themselves in the attack)
        const healthComponent = contactingEnemy.getComponent<HealthComponent>('health');
        if (healthComponent) {
            healthComponent.takeDamage(999, 'kinetic'); // Ensure death
        }
    }
}
