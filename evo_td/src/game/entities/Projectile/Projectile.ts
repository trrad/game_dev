/**
 * Projectile entity for visual representation of turret attacks
 * Uses standard ECS components for position and movement
 */
import { GameObject } from '../../../engine/core/GameObject';
import { PositionComponent } from '../../../engine/components/PositionComponent';
import { MovementComponent } from '../../../engine/components/MovementComponent';
import { MathUtils } from '../../../engine/utils/MathUtils';

export interface ProjectileConfig {
    id: string;
    startPosition: { x: number; y: number; z: number };
    targetPosition: { x: number; y: number; z: number };
    speed: number;
    projectileType: 'bullet' | 'laser' | 'plasma' | 'missile';
    
    // Visual properties
    color?: string;
    size?: number;
    trailEffect?: boolean;
    
    // Game logic data (carried with projectile but not affecting movement)
    attackData: {
        targetId: string;
        damage: number;
        weaponType: string;
        attachmentId: string;
        isHit: boolean; // Pre-calculated hit/miss
        visualOnly?: boolean; // If true, only visual effects, no game logic
    };
}

export class Projectile extends GameObject {
    private targetPosition: { x: number; y: number; z: number };
    private projectileType: ProjectileConfig['projectileType'];
    private attackData: ProjectileConfig['attackData'];
    private visualProperties: {
        color: string;
        size: number;
        trailEffect: boolean;
    };

    constructor(config: ProjectileConfig) {
        super(config.id);

        this.targetPosition = { ...config.targetPosition };
        this.projectileType = config.projectileType;
        this.attackData = { ...config.attackData };
        this.visualProperties = {
            color: config.color || '#ffff00',
            size: config.size || 0.1,
            trailEffect: config.trailEffect || false
        };

        // Add position component
        const positionComponent = new PositionComponent();
        positionComponent.setPosition(config.startPosition);
        this.addComponent(positionComponent);

        // Add movement component with calculated direction and speed
        const direction = this.calculateDirection(config.startPosition, config.targetPosition);
        const movementComponent = new MovementComponent(this, config.speed);
        movementComponent.setDirection(direction);
        this.addComponent(movementComponent);
    }

    /**
     * Calculate normalized direction vector from start to target
     */
    private calculateDirection(start: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) {
        return MathUtils.calculateNormalizedDirection(start, target);
    }

    /**
     * Check if projectile has reached its target
     */
    public hasReachedTarget(): boolean {
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (!positionComponent) return true;

        const currentPos = positionComponent.getPosition();
        const distance = MathUtils.calculateDistance(currentPos, this.targetPosition);

        return distance <= 0.5; // Within 0.5 units of target
    }

    /**
     * Get the attack data to be processed when projectile reaches target
     */
    public getAttackData(): ProjectileConfig['attackData'] {
        return { ...this.attackData };
    }

    /**
     * Get projectile type for renderer
     */
    public getProjectileType(): ProjectileConfig['projectileType'] {
        return this.projectileType;
    }

    /**
     * Get visual properties for renderer
     */
    public getVisualProperties() {
        return { ...this.visualProperties };
    }

    /**
     * Get target position for renderer effects
     */
    public getTargetPosition(): { x: number; y: number; z: number } {
        return { ...this.targetPosition };
    }

    /**
     * Update projectile position based on movement component
     */
    public updatePosition(deltaTime: number): void {
        const positionComponent = this.getComponent<PositionComponent>('position');
        const movementComponent = this.getComponent<MovementComponent>('movement');

        if (!positionComponent || !movementComponent) return;

        const currentPos = positionComponent.getPosition();
        const direction = movementComponent.getDirection();
        const speed = movementComponent.getSpeed();

        const newPos = {
            x: currentPos.x + direction.x * speed * deltaTime,
            y: currentPos.y + direction.y * speed * deltaTime,
            z: currentPos.z + direction.z * speed * deltaTime
        };

        positionComponent.setPosition(newPos);
    }

    /**
     * Get current position
     */
    public getPosition(): { x: number; y: number; z: number } {
        const positionComponent = this.getComponent<PositionComponent>('position');
        return positionComponent ? positionComponent.getPosition() : { x: 0, y: 0, z: 0 };
    }
}
