/**
 * ProjectileSystem - Manages projectile lifecycle and coordinates with combat system
 * Handles projectile movement, collision detection, and damage application timing
 */
import { Projectile, ProjectileConfig } from '../entities/Projectile';
import { ProjectileRenderer } from '../renderers/ProjectileRenderer';
import { TimeManager } from '../engine/core/TimeManager';
import { EventStack, EventCategory } from '../engine/core/EventStack';
import { SceneManager } from '../engine/scene/SceneManager';
import { Logger, LogCategory } from '../engine/utils/Logger';

export class ProjectileSystem {
    private projectiles: Map<string, Projectile> = new Map();
    private projectileRenderer: ProjectileRenderer;
    private timeManager: TimeManager | null = null;
    private eventStack: EventStack | null = null;
    private sceneManager: SceneManager | null = null;
    
    private nextProjectileId: number = 0;

    constructor(projectileRenderer: ProjectileRenderer) {
        this.projectileRenderer = projectileRenderer;
        
        Logger.log(LogCategory.SYSTEM, 'ProjectileSystem initialized');
    }

    /**
     * Set the TimeManager reference
     */
    public setTimeManager(timeManager: TimeManager): void {
        this.timeManager = timeManager;
    }

    /**
     * Set the EventStack reference and subscribe to turret events
     */
    public setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
        this.setupTurretEvents();
    }

    /**
     * Set the SceneManager reference
     */
    public setSceneManager(sceneManager: SceneManager): void {
        this.sceneManager = sceneManager;
    }

    /**
     * Set up event listeners for turret combat
     */
    private setupTurretEvents(): void {
        if (!this.eventStack) return;

        // Listen for turret attacks to create projectiles
        this.eventStack.subscribe('turret_fire_projectile', (event) => {
            if (event.payload) {
                this.createProjectile(event.payload);
            }
        });

        Logger.log(LogCategory.SYSTEM, 'ProjectileSystem: Turret events configured');
    }

    /**
     * Create a new projectile
     */
    public createProjectile(projectileData: {
        startPosition: { x: number; y: number; z: number };
        targetPosition: { x: number; y: number; z: number };
        projectileType?: 'bullet' | 'laser' | 'plasma' | 'missile';
        speed?: number;
        attackData: {
            targetId: string;
            damage: number;
            weaponType: string;
            attachmentId: string;
            isHit: boolean;
            visualOnly?: boolean;
        };
    }): void {
        const projectileConfig: ProjectileConfig = {
            id: `projectile_${this.nextProjectileId++}`,
            startPosition: projectileData.startPosition,
            targetPosition: projectileData.targetPosition,
            speed: projectileData.speed || 15, // Default speed: 15 units/second
            projectileType: projectileData.projectileType || 'bullet',
            attackData: projectileData.attackData
        };

        // Create projectile entity
        const projectile = new Projectile(projectileConfig);

        // Create visual representation
        const visualCreated = this.projectileRenderer.createProjectileVisual(projectile);
        
        if (!visualCreated) {
            Logger.log(LogCategory.ERROR, `Failed to create visual for projectile ${projectile.id}`);
            return;
        }

        // Register with scene manager (if available)
        if (this.sceneManager) {
            // Note: We don't have a mesh to register since it's managed by the renderer
            // but we could register the projectile entity itself for consistency
        }

        // Store projectile
        this.projectiles.set(projectile.id, projectile);

        // Log projectile creation
        this.eventStack?.info(EventCategory.ATTACHMENT, 'projectile_fired', 
            `Projectile fired from ${projectileData.attackData.attachmentId}`, {
                projectileId: projectile.id,
                projectileType: projectileConfig.projectileType,
                targetId: projectileData.attackData.targetId,
                speed: projectileConfig.speed
            }, 'ProjectileSystem');

        Logger.log(LogCategory.SYSTEM, `Created projectile: ${projectile.id}`, {
            type: projectileConfig.projectileType,
            targetId: projectileData.attackData.targetId,
            totalProjectiles: this.projectiles.size
        });
    }

    /**
     * Main update loop - called by the time manager
     */
    public update(deltaTime: number): void {
        // Update projectile positions
        this.updateProjectilePositions(deltaTime);

        // Check for projectiles that have reached their targets
        this.checkProjectileImpacts();

        // Update visuals
        this.updateVisuals();
    }

    /**
     * Update all projectile positions
     */
    private updateProjectilePositions(deltaTime: number): void {
        for (const projectile of this.projectiles.values()) {
            projectile.updatePosition(deltaTime);
        }
    }

    /**
     * Check for projectiles that have reached their targets and process impacts
     */
    private checkProjectileImpacts(): void {
        const impactedProjectiles: Projectile[] = [];

        for (const projectile of this.projectiles.values()) {
            if (projectile.hasReachedTarget()) {
                impactedProjectiles.push(projectile);
            }
        }

        // Process impacts
        for (const projectile of impactedProjectiles) {
            this.processProjectileImpact(projectile);
        }
    }

    /**
     * Process projectile impact - trigger visual effects only
     */
    private processProjectileImpact(projectile: Projectile): void {
        const attackData = projectile.getAttackData();

        // Only emit visual impact event (no game logic)
        if (attackData.visualOnly) {
            this.eventStack?.emit({
                type: 'projectile_impact_visual',
                payload: {
                    targetId: attackData.targetId,
                    projectileId: projectile.id,
                    isHit: attackData.isHit
                },
                source: 'projectile_system'
            });
        } else {
            // Legacy support: emit the turret_attack event for damage processing
            this.eventStack?.emit({
                type: 'turret_attack',
                payload: attackData,
                source: 'projectile_system'
            });
        }

        // Log the impact
        this.eventStack?.info(EventCategory.ATTACHMENT, 'projectile_impact', 
            `Projectile reached target ${attackData.targetId}`, {
                projectileId: projectile.id,
                targetId: attackData.targetId,
                damage: attackData.damage,
                isHit: attackData.isHit,
                visualOnly: attackData.visualOnly || false
            }, 'ProjectileSystem');

        Logger.log(LogCategory.SYSTEM, `Projectile impact: ${projectile.id}`, {
            targetId: attackData.targetId,
            damage: attackData.damage,
            isHit: attackData.isHit,
            visualOnly: attackData.visualOnly || false
        });

        // Remove the projectile
        this.removeProjectile(projectile.id);
    }

    /**
     * Remove a projectile from the system
     */
    public removeProjectile(projectileId: string): void {
        const projectile = this.projectiles.get(projectileId);
        if (!projectile) return;

        // Remove visual
        this.projectileRenderer.removeProjectileVisual(projectileId);

        // Remove from projectiles map
        this.projectiles.delete(projectileId);

        Logger.log(LogCategory.SYSTEM, `Removed projectile: ${projectileId}`, {
            remainingProjectiles: this.projectiles.size
        });
    }

    /**
     * Update visual representations
     */
    private updateVisuals(): void {
        const projectileArray = Array.from(this.projectiles.values());
        this.projectileRenderer.updateProjectileVisuals(projectileArray);
    }

    /**
     * Get all active projectiles
     */
    public getProjectiles(): Projectile[] {
        return Array.from(this.projectiles.values());
    }

    /**
     * Get projectile count
     */
    public getProjectileCount(): number {
        return this.projectiles.size;
    }

    /**
     * Get projectile by ID
     */
    public getProjectile(projectileId: string): Projectile | undefined {
        return this.projectiles.get(projectileId);
    }

    /**
     * Clear all projectiles
     */
    public clearAllProjectiles(): void {
        const projectileIds = Array.from(this.projectiles.keys());
        for (const projectileId of projectileIds) {
            this.removeProjectile(projectileId);
        }
    }

    /**
     * Get projectile system statistics
     */
    public getStats(): {
        activeProjectiles: number;
        projectilesByType: { [key: string]: number };
    } {
        const stats = {
            activeProjectiles: this.projectiles.size,
            projectilesByType: { bullet: 0, laser: 0, plasma: 0, missile: 0 }
        };

        for (const projectile of this.projectiles.values()) {
            const type = projectile.getProjectileType();
            if (type in stats.projectilesByType) {
                stats.projectilesByType[type]++;
            }
        }

        return stats;
    }

    /**
     * Dispose of the projectile system
     */
    public dispose(): void {
        this.clearAllProjectiles();
        this.projectileRenderer.dispose();

        Logger.log(LogCategory.SYSTEM, 'ProjectileSystem disposed');
    }
}
