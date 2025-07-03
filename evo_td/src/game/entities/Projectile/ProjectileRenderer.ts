/**
 * ProjectileRenderer - Handles visual representation of projectiles with object pooling
 * Creates and manages projectile visuals using Babylon.js meshes
 */
import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, TrailMesh, TransformNode } from '@babylonjs/core';
import { Projectile } from './Projectile';
import { Logger, LogCategory } from '../../../engine/utils/Logger';

interface ProjectileVisual {
    mesh: Mesh;
    material: StandardMaterial;
    trail?: TrailMesh;
    isActive: boolean;
    projectileId?: string;
}

interface ProjectilePoolConfig {
    maxBullets: number;
    maxLasers: number;
    maxPlasma: number;
    maxMissiles: number;
}

const DEFAULT_POOL_CONFIG: ProjectilePoolConfig = {
    maxBullets: 50,
    maxLasers: 20,
    maxPlasma: 15,
    maxMissiles: 10
};

export class ProjectileRenderer {
    private scene: Scene;
    private poolConfig: ProjectilePoolConfig;
    
    // Object pools for different projectile types
    private bulletPool: ProjectileVisual[] = [];
    private laserPool: ProjectileVisual[] = [];
    private plasmaPool: ProjectileVisual[] = [];
    private missilePool: ProjectileVisual[] = [];
    
    // Active projectiles mapping
    private activeProjectiles: Map<string, ProjectileVisual> = new Map();
    
    // Container for organization
    private projectileContainer: TransformNode;

    constructor(scene: Scene, poolConfig?: Partial<ProjectilePoolConfig>) {
        this.scene = scene;
        this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...poolConfig };
        
        // Create container for projectiles
        this.projectileContainer = new TransformNode('projectiles', this.scene);
        
        // Initialize object pools
        this.initializePools();
        
        Logger.log(LogCategory.RENDERING, 'ProjectileRenderer initialized', {
            poolSizes: this.poolConfig
        });
    }

    /**
     * Initialize object pools for all projectile types
     */
    private initializePools(): void {
        // Initialize bullet pool
        for (let i = 0; i < this.poolConfig.maxBullets; i++) {
            this.bulletPool.push(this.createBulletVisual());
        }
        
        // Initialize laser pool
        for (let i = 0; i < this.poolConfig.maxLasers; i++) {
            this.laserPool.push(this.createLaserVisual());
        }
        
        // Initialize plasma pool
        for (let i = 0; i < this.poolConfig.maxPlasma; i++) {
            this.plasmaPool.push(this.createPlasmaVisual());
        }
        
        // Initialize missile pool
        for (let i = 0; i < this.poolConfig.maxMissiles; i++) {
            this.missilePool.push(this.createMissileVisual());
        }

        Logger.log(LogCategory.RENDERING, 'Projectile pools initialized', {
            totalProjectiles: this.bulletPool.length + this.laserPool.length + 
                            this.plasmaPool.length + this.missilePool.length
        });
    }

    /**
     * Create a bullet visual (small sphere)
     */
    private createBulletVisual(): ProjectileVisual {
        const mesh = MeshBuilder.CreateSphere('bullet', { diameter: 0.05 }, this.scene);
        const material = new StandardMaterial('bulletMat', this.scene);
        material.diffuseColor = new Color3(1, 1, 0); // Yellow
        material.emissiveColor = new Color3(0.2, 0.2, 0);
        
        mesh.material = material;
        mesh.setEnabled(false);
        mesh.parent = this.projectileContainer;

        return {
            mesh,
            material,
            isActive: false
        };
    }

    /**
     * Create a laser visual (cylinder beam)
     */
    private createLaserVisual(): ProjectileVisual {
        const mesh = MeshBuilder.CreateCylinder('laser', { 
            height: 0.8, 
            diameter: 0.02 
        }, this.scene);
        
        const material = new StandardMaterial('laserMat', this.scene);
        material.diffuseColor = new Color3(1, 0, 0); // Red
        material.emissiveColor = new Color3(0.5, 0, 0);
        
        mesh.material = material;
        mesh.setEnabled(false);
        mesh.parent = this.projectileContainer;

        return {
            mesh,
            material,
            isActive: false
        };
    }

    /**
     * Create a plasma visual (glowing sphere with trail)
     */
    private createPlasmaVisual(): ProjectileVisual {
        const mesh = MeshBuilder.CreateSphere('plasma', { diameter: 0.08 }, this.scene);
        const material = new StandardMaterial('plasmaMat', this.scene);
        material.diffuseColor = new Color3(0, 1, 1); // Cyan
        material.emissiveColor = new Color3(0, 0.3, 0.3);
        
        mesh.material = material;
        mesh.setEnabled(false);
        mesh.parent = this.projectileContainer;

        return {
            mesh,
            material,
            isActive: false
        };
    }

    /**
     * Create a missile visual (elongated shape)
     */
    private createMissileVisual(): ProjectileVisual {
        const mesh = MeshBuilder.CreateCylinder('missile', { 
            height: 0.15, 
            diameter: 0.03 
        }, this.scene);
        
        const material = new StandardMaterial('missileMat', this.scene);
        material.diffuseColor = new Color3(0.8, 0.8, 0.8); // Gray
        material.emissiveColor = new Color3(0.1, 0.1, 0.1);
        
        mesh.material = material;
        mesh.setEnabled(false);
        mesh.parent = this.projectileContainer;

        return {
            mesh,
            material,
            isActive: false
        };
    }

    /**
     * Get an available visual from the appropriate pool
     */
    private getAvailableVisual(projectileType: Projectile['projectileType']): ProjectileVisual | null {
        let pool: ProjectileVisual[];

        switch (projectileType) {
            case 'bullet':
                pool = this.bulletPool;
                break;
            case 'laser':
                pool = this.laserPool;
                break;
            case 'plasma':
                pool = this.plasmaPool;
                break;
            case 'missile':
                pool = this.missilePool;
                break;
            default:
                pool = this.bulletPool; // Fallback
        }

        return pool.find(visual => !visual.isActive) || null;
    }

    /**
     * Create visual representation for a projectile
     */
    public createProjectileVisual(projectile: Projectile): boolean {
        const visual = this.getAvailableVisual(projectile.getProjectileType());
        
        if (!visual) {
            Logger.log(LogCategory.ERROR, `No available visuals in pool for projectile type: ${projectile.getProjectileType()}`);
            return false;
        }

        // Activate the visual
        visual.isActive = true;
        visual.projectileId = projectile.id;
        visual.mesh.setEnabled(true);

        // Position the projectile at its starting location
        const position = projectile.getPosition();
        visual.mesh.position = new Vector3(position.x, position.y, position.z);

        // Apply visual properties
        const visualProps = projectile.getVisualProperties();
        if (visualProps.color && visual.material) {
            const color = this.parseColor(visualProps.color);
            visual.material.diffuseColor = color;
            visual.material.emissiveColor = color.scale(0.3);
        }

        // Scale based on size property
        if (visualProps.size !== undefined) {
            const scale = visualProps.size / 0.1; // Normalize to default size
            visual.mesh.scaling = new Vector3(scale, scale, scale);
        }

        // Store active projectile
        this.activeProjectiles.set(projectile.id, visual);

        Logger.log(LogCategory.RENDERING, `Created projectile visual: ${projectile.id}`, {
            type: projectile.getProjectileType(),
            position: position
        });

        return true;
    }

    /**
     * Update projectile visual positions
     */
    public updateProjectileVisuals(projectiles: Projectile[]): void {
        for (const projectile of projectiles) {
            const visual = this.activeProjectiles.get(projectile.id);
            if (!visual) continue;

            const position = projectile.getPosition();
            visual.mesh.position = new Vector3(position.x, position.y, position.z);

            // For lasers, orient towards target
            if (projectile.getProjectileType() === 'laser') {
                const targetPos = projectile.getTargetPosition();
                const direction = new Vector3(
                    targetPos.x - position.x,
                    targetPos.y - position.y,
                    targetPos.z - position.z
                ).normalize();
                
                visual.mesh.lookAt(visual.mesh.position.add(direction));
            }
        }
    }

    /**
     * Remove projectile visual and return to pool
     */
    public removeProjectileVisual(projectileId: string): void {
        const visual = this.activeProjectiles.get(projectileId);
        if (!visual) return;

        // Deactivate visual
        visual.isActive = false;
        visual.projectileId = undefined;
        visual.mesh.setEnabled(false);
        
        // Reset properties
        visual.mesh.position = Vector3.Zero();
        visual.mesh.scaling = Vector3.One();

        // Remove from active tracking
        this.activeProjectiles.delete(projectileId);

        Logger.log(LogCategory.RENDERING, `Removed projectile visual: ${projectileId}`);
    }

    /**
     * Parse color string to Color3
     */
    private parseColor(colorString: string): Color3 {
        if (colorString.startsWith('#')) {
            // Hex color
            const hex = colorString.substring(1);
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            return new Color3(r, g, b);
        }
        
        // Default to yellow if parsing fails
        return new Color3(1, 1, 0);
    }

    /**
     * Get active projectile count by type
     */
    public getActiveProjectileCount(): { [key: string]: number } {
        const counts = { bullet: 0, laser: 0, plasma: 0, missile: 0 };
        
        for (const visual of this.activeProjectiles.values()) {
            if (visual.projectileId) {
                // Would need projectile reference to get type, for now just count total
            }
        }
        
        return {
            ...counts,
            total: this.activeProjectiles.size
        };
    }

    /**
     * Dispose of all projectile visuals
     */
    public dispose(): void {
        // Clear active projectiles
        this.activeProjectiles.clear();

        // Dispose all pools
        [...this.bulletPool, ...this.laserPool, ...this.plasmaPool, ...this.missilePool].forEach(visual => {
            visual.mesh.dispose();
            visual.material.dispose();
            if (visual.trail) {
                visual.trail.dispose();
            }
        });

        // Clear pools
        this.bulletPool = [];
        this.laserPool = [];
        this.plasmaPool = [];
        this.missilePool = [];

        // Dispose container
        this.projectileContainer.dispose();

        Logger.log(LogCategory.RENDERING, 'ProjectileRenderer disposed');
    }
}
