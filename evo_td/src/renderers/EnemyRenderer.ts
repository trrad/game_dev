/**
 * EnemyRenderer - Responsible for creating and managing visual representations of enemies
 * Follows the established renderer pattern and supports the complex attachment/hybrid system
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, TransformNode, Texture } from "@babylonjs/core";
import { Enemy } from "../entities/Enemy";
import { HealthComponent } from "../components/HealthComponent";
import { PositionComponent } from "../components/PositionComponent";
import { AIBehaviorComponent, AIState } from "../components/AIBehaviorComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Visual configuration for enemies
 */
export interface EnemyVisualConfig {
    baseSize: number;           // Base diameter for enemy mesh
    maxSize: number;            // Maximum size when fully grown
    materialColors: {
        base: Color3;           // Default enemy color
        damaged: Color3;        // Color when heavily damaged
        aggressive: Color3;     // Color when attacking
        dead: Color3;          // Color when dead
    };
    showHealthBar: boolean;     // Whether to show health bars above enemies
    showStateIndicator: boolean; // Whether to show AI state indicators
}

/**
 * Default visual configuration for enemies
 */
const DEFAULT_ENEMY_VISUAL: EnemyVisualConfig = {
    baseSize: 0.6,
    maxSize: 1.8,
    materialColors: {
        base: new Color3(0.8, 0.1, 0.1),        // Red
        damaged: new Color3(0.6, 0.3, 0.1),     // Orange-red
        aggressive: new Color3(1.0, 0.0, 0.0),  // Bright red
        dead: new Color3(0.3, 0.3, 0.3)         // Gray
    },
    showHealthBar: true,
    showStateIndicator: false
};

/**
 * Individual enemy visual representation
 */
export interface EnemyVisual {
    parentNode: TransformNode;
    mesh: Mesh;
    material: StandardMaterial;
    healthBar?: Mesh;
    stateIndicator?: Mesh;
    enemyId: string;
    lastUpdateTime: number;
}

/**
 * Handles the rendering aspects of Enemy entities
 */
export class EnemyRenderer {
    private scene: Scene;
    private visualConfig: EnemyVisualConfig;
    private enemyVisuals: Map<string, EnemyVisual> = new Map();

    constructor(scene: Scene, config?: Partial<EnemyVisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_ENEMY_VISUAL, ...config };
        
        Logger.log(LogCategory.RENDERING, "EnemyRenderer initialized");
    }

    /**
     * Create a visual representation for an enemy
     */
    public createEnemyVisual(enemy: Enemy): TransformNode {
        const enemyId = enemy.id;
        
        Logger.log(LogCategory.RENDERING, `Creating enemy visual: ${enemyId}`);
        
        // Create parent node
        const parentNode = new TransformNode(`enemy_${enemyId}`, this.scene);
        
        // Create the main enemy mesh
        const mesh = MeshBuilder.CreateSphere(
            `enemy_mesh_${enemyId}`,
            { diameter: this.visualConfig.baseSize },
            this.scene
        );
        
        // Create material
        const material = new StandardMaterial(`enemy_material_${enemyId}`, this.scene);
        material.diffuseColor = this.visualConfig.materialColors.base.clone();
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        mesh.material = material;
        
        // Parent the mesh to the node
        mesh.parent = parentNode;
        
        // Create health bar if enabled
        let healthBar: Mesh | undefined;
        if (this.visualConfig.showHealthBar) {
            healthBar = this.createHealthBar(enemyId);
            healthBar.parent = parentNode;
        }
        
        // Create state indicator if enabled
        let stateIndicator: Mesh | undefined;
        if (this.visualConfig.showStateIndicator) {
            stateIndicator = this.createStateIndicator(enemyId);
            stateIndicator.parent = parentNode;
        }
        
        // Set initial position
        const positionComponent = enemy.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const pos = positionComponent.getPosition();
            parentNode.position = new Vector3(pos.x, pos.y, pos.z);
        }
        
        // Store the visual
        const enemyVisual: EnemyVisual = {
            parentNode,
            mesh,
            material,
            healthBar,
            stateIndicator,
            enemyId,
            lastUpdateTime: performance.now()
        };
        
        this.enemyVisuals.set(enemyId, enemyVisual);
        
        Logger.log(LogCategory.RENDERING, `Enemy visual created: ${enemyId}`, {
            position: parentNode.position.toString(),
            size: this.visualConfig.baseSize
        });
        
        return parentNode;
    }

    /**
     * Update enemy visual based on current state
     */
    public updateEnemyVisual(enemy: Enemy): void {
        const visual = this.enemyVisuals.get(enemy.id);
        if (!visual) return;

        const currentTime = performance.now();
        
        // Update position
        const positionComponent = enemy.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const pos = positionComponent.getPosition();
            visual.parentNode.position.set(pos.x, pos.y, pos.z);
        }

        // Update size based on health and growth
        const healthComponent = enemy.getComponent<HealthComponent>('health');
        if (healthComponent) {
            const healthPercentage = healthComponent.getHealthPercentage();
            const maxHealth = healthComponent.getMaxHealth();
            
            // Scale based on max health (growth over time) and current health percentage
            const growthScale = Math.min(maxHealth / 75, 3.0); // Original max health was 75
            const healthScale = 0.7 + (healthPercentage * 0.3); // Scale down when damaged
            const finalScale = this.visualConfig.baseSize * growthScale * healthScale;
            
            visual.mesh.scaling.setAll(Math.min(finalScale, this.visualConfig.maxSize));
            
            // Update material color based on health and state
            this.updateEnemyColor(visual, healthPercentage, enemy);
            
            // Update health bar
            if (visual.healthBar) {
                this.updateHealthBar(visual.healthBar, healthPercentage);
            }
        }

        // Update state indicator
        if (visual.stateIndicator) {
            const aiComponent = enemy.getComponent<AIBehaviorComponent>('aiBehavior');
            if (aiComponent) {
                this.updateStateIndicator(visual.stateIndicator, aiComponent.getCurrentState());
            }
        }

        visual.lastUpdateTime = currentTime;
    }

    /**
     * Remove enemy visual when enemy is destroyed
     */
    public removeEnemyVisual(enemyId: string): void {
        const visual = this.enemyVisuals.get(enemyId);
        if (!visual) return;

        Logger.log(LogCategory.RENDERING, `Removing enemy visual: ${enemyId}`);
        
        // Dispose of all meshes and materials
        visual.mesh.dispose();
        visual.material.dispose();
        
        if (visual.healthBar) {
            visual.healthBar.dispose();
        }
        
        if (visual.stateIndicator) {
            visual.stateIndicator.dispose();
        }
        
        visual.parentNode.dispose();
        
        this.enemyVisuals.delete(enemyId);
    }

    /**
     * Get enemy visual by ID
     */
    public getEnemyVisual(enemyId: string): EnemyVisual | undefined {
        return this.enemyVisuals.get(enemyId);
    }

    /**
     * Update all enemy visuals (batch update)
     */
    public updateAllVisuals(enemies: Enemy[]): void {
        enemies.forEach(enemy => {
            if (!enemy.isDead()) {
                this.updateEnemyVisual(enemy);
            }
        });
    }

    /**
     * Create a health bar mesh
     */
    private createHealthBar(enemyId: string): Mesh {
        const healthBar = MeshBuilder.CreateBox(
            `enemy_health_${enemyId}`,
            { width: 0.8, height: 0.1, depth: 0.02 },
            this.scene
        );
        
        const healthMaterial = new StandardMaterial(`enemy_health_mat_${enemyId}`, this.scene);
        healthMaterial.diffuseColor = new Color3(0, 1, 0); // Green
        healthMaterial.emissiveColor = new Color3(0, 0.3, 0);
        healthBar.material = healthMaterial;
        
        // Position above enemy
        healthBar.position.y = 1.0;
        
        return healthBar;
    }

    /**
     * Create a state indicator mesh
     */
    private createStateIndicator(enemyId: string): Mesh {
        const indicator = MeshBuilder.CreateSphere(
            `enemy_state_${enemyId}`,
            { diameter: 0.2 },
            this.scene
        );
        
        const indicatorMaterial = new StandardMaterial(`enemy_state_mat_${enemyId}`, this.scene);
        indicatorMaterial.diffuseColor = new Color3(1, 1, 0); // Yellow default
        indicatorMaterial.emissiveColor = new Color3(0.3, 0.3, 0);
        indicator.material = indicatorMaterial;
        
        // Position above health bar
        indicator.position.y = 1.3;
        
        return indicator;
    }

    /**
     * Update enemy color based on health and AI state
     */
    private updateEnemyColor(visual: EnemyVisual, healthPercentage: number, enemy: Enemy): void {
        let targetColor: Color3;
        
        if (enemy.isDead()) {
            targetColor = this.visualConfig.materialColors.dead;
        } else {
            const aiComponent = enemy.getComponent<AIBehaviorComponent>('aiBehavior');
            const aiState = aiComponent?.getCurrentState() ?? AIState.WANDERING;
            
            if (aiState === AIState.ATTACKING || aiState === AIState.PURSUING) {
                targetColor = this.visualConfig.materialColors.aggressive;
            } else if (healthPercentage < 0.5) {
                targetColor = this.visualConfig.materialColors.damaged;
            } else {
                targetColor = this.visualConfig.materialColors.base;
            }
        }
        
        visual.material.diffuseColor = targetColor.clone();
    }

    /**
     * Update health bar visual
     */
    private updateHealthBar(healthBar: Mesh, healthPercentage: number): void {
        // Scale width based on health percentage
        healthBar.scaling.x = Math.max(0.1, healthPercentage);
        
        // Change color based on health
        const material = healthBar.material as StandardMaterial;
        if (healthPercentage > 0.6) {
            material.diffuseColor = new Color3(0, 1, 0); // Green
        } else if (healthPercentage > 0.3) {
            material.diffuseColor = new Color3(1, 1, 0); // Yellow
        } else {
            material.diffuseColor = new Color3(1, 0, 0); // Red
        }
    }

    /**
     * Update state indicator visual
     */
    private updateStateIndicator(indicator: Mesh, aiState: AIState): void {
        const material = indicator.material as StandardMaterial;
        
        switch (aiState) {
            case AIState.WANDERING:
                material.diffuseColor = new Color3(0, 1, 0); // Green
                break;
            case AIState.ATTACKING:
                material.diffuseColor = new Color3(1, 0, 0); // Red
                break;
            case AIState.PURSUING:
                material.diffuseColor = new Color3(1, 0.5, 0); // Orange
                break;
            case AIState.RETREATING:
                material.diffuseColor = new Color3(0, 0, 1); // Blue
                break;
            case AIState.PAUSED:
                material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray
                break;
            default:
                material.diffuseColor = new Color3(1, 1, 0); // Yellow
        }
    }

    /**
     * Dispose of all enemy visuals and clean up resources
     */
    public dispose(): void {
        this.enemyVisuals.forEach((_, enemyId) => {
            this.removeEnemyVisual(enemyId);
        });
        this.enemyVisuals.clear();
        
        Logger.log(LogCategory.RENDERING, "EnemyRenderer disposed");
    }
}
