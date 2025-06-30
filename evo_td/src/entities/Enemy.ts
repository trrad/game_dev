/**
 * Enemy entity that uses ECS components for behavior, health, movement, and positioning
 */
import { GameObject } from '../core/GameObject';
import { PositionComponent } from '../components/PositionComponent';
import { MovementComponent } from '../components/MovementComponent';
import { HealthComponent } from '../components/HealthComponent';
import { AIBehaviorComponent, SocialBehavior, HuntingStrategy } from '../components/AIBehaviorComponent';

export interface EnemyConfig {
    id: string;
    spawnPosition: { x: number; y: number; z: number };
    
    // Health configuration
    maxHealth?: number;
    regenerationRate?: number;
    damageResistances?: Partial<{
        kinetic: number;
        explosive: number;
        energy: number;
        fire: number;
        cold: number;
        toxic: number;
        radiation: number;
    }>;
    
    // Movement configuration
    baseSpeed?: number;
    
    // AI configuration
    aggressionLevel?: number;
    intelligence?: number;
    sightRange?: number;
    attackRange?: number;
    fearThreshold?: number;
    socialBehavior?: SocialBehavior;
    huntingStrategy?: HuntingStrategy;
    wanderRadius?: number;
}

export class Enemy extends GameObject {
    constructor(config: EnemyConfig) {
        super(config.id);
        
        // Add position component
        const positionComponent = new PositionComponent();
        positionComponent.setPosition(config.spawnPosition);
        this.addComponent(positionComponent);
        
        // Add movement component
        const movementComponent = new MovementComponent(this, config.baseSpeed ?? 1.0);
        this.addComponent(movementComponent);
        
        // Add health component
        const healthComponent = new HealthComponent(
            config.maxHealth ?? 75,
            config.regenerationRate ?? 0,
            config.damageResistances
        );
        this.addComponent(healthComponent);
        
        // Add AI behavior component
        const aiBehaviorComponent = new AIBehaviorComponent({
            aggressionLevel: config.aggressionLevel,
            intelligence: config.intelligence,
            sightRange: config.sightRange,
            attackRange: config.attackRange,
            fearThreshold: config.fearThreshold,
            socialBehavior: config.socialBehavior,
            huntingStrategy: config.huntingStrategy,
            wanderRadius: config.wanderRadius
        });
        this.addComponent(aiBehaviorComponent);
    }
    
    /**
     * Get the enemy's current health percentage
     */
    public getHealthPercentage(): number {
        const healthComponent = this.getComponent<HealthComponent>('health');
        return healthComponent ? healthComponent.getHealthPercentage() : 0;
    }
    
    /**
     * Check if the enemy is dead
     */
    public isDead(): boolean {
        const healthComponent = this.getComponent<HealthComponent>('health');
        return healthComponent ? healthComponent.isDead() : true;
    }
    
    /**
     * Apply damage to the enemy
     */
    public takeDamage(amount: number, damageType: 'kinetic' | 'explosive' | 'energy' | 'fire' | 'cold' | 'toxic' | 'radiation' = 'kinetic'): number {
        const healthComponent = this.getComponent<HealthComponent>('health');
        return healthComponent ? healthComponent.takeDamage(amount, damageType) : 0;
    }
    
    /**
     * Get the enemy's current position
     */
    public getPosition(): { x: number; y: number; z: number } {
        const positionComponent = this.getComponent<PositionComponent>('position');
        return positionComponent ? positionComponent.getPosition() : { x: 0, y: 0, z: 0 };
    }
    
    /**
     * Set the enemy's position
     */
    public setPosition(x: number, y: number, z: number): void {
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent) {
            positionComponent.setPosition({ x, y, z });
        }
    }
    
    /**
     * Get the enemy's current AI state
     */
    public getAIState(): string {
        const aiComponent = this.getComponent<AIBehaviorComponent>('aiBehavior');
        return aiComponent ? aiComponent.getCurrentState() : 'unknown';
    }
    
    /**
     * Get the enemy's sight range
     */
    public getSightRange(): number {
        const aiComponent = this.getComponent<AIBehaviorComponent>('aiBehavior');
        return aiComponent ? aiComponent.getSightRange() : 0;
    }
}
