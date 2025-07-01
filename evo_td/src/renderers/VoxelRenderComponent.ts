/**
 * VoxelRenderComponent - Handles visual representation of individual TrainCarVoxel entities
 * Creates cube meshes with appropriate materials based on voxel properties
 */

import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh } from "@babylonjs/core";
import { RenderComponent, RenderConfig } from "./RenderComponent";
import { TrainCarVoxel } from "../entities/TrainCarVoxel";
import { HealthComponent } from "../components/HealthComponent";
import { PositionComponent } from "../components/PositionComponent";
import { CargoCapacityType, VoxelMaterial } from "../components/TrainCarVoxelComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Configuration specific to voxel rendering
 */
export interface VoxelRenderConfig extends RenderConfig {
    size?: number; // Cube size (default 0.4)
    materialOverride?: VoxelMaterial; // Override the voxel's material
    colorOverride?: Color3; // Override the computed color
}

/**
 * Default visual configuration for voxels
 */
const DEFAULT_VOXEL_CONFIG: VoxelRenderConfig = {
    size: 0.4, // Production voxel size
    yOffset: 0.4, // Position above ground
    visible: true
};

/**
 * Renders individual voxels as cubes with materials based on cargo type and health
 */
export class VoxelRenderComponent extends RenderComponent {
    public readonly type = 'render'; // Override with voxel-specific behavior
    
    private voxelConfig: VoxelRenderConfig;
    private voxelEntity?: TrainCarVoxel; // Reference to the voxel entity for properties

    constructor(scene: Scene, config: VoxelRenderConfig = {}) {
        super(scene, config);
        this.voxelConfig = { ...DEFAULT_VOXEL_CONFIG, ...config };
        
        Logger.log(LogCategory.RENDERING, `VoxelRenderComponent created with size ${this.voxelConfig.size}`);
    }

    /**
     * Called when attached - get reference to the voxel entity
     */
    onAttach(): void {
        // Cast the GameObject to TrainCarVoxel to access voxel properties
        // IMPORTANT: This must be done BEFORE calling super.onAttach() 
        // because super.onAttach() calls createVisual() which needs this.voxelEntity
        this.voxelEntity = this._gameObject as TrainCarVoxel;
        
        if (!this.voxelEntity) {
            Logger.warn(LogCategory.RENDERING, `VoxelRenderComponent attached to non-voxel entity: ${this._gameObject?.id}`);
            return; // Don't proceed if we can't cast to TrainCarVoxel
        }
        
        // Now call super.onAttach() which will trigger createVisual()
        super.onAttach();
    }

    /**
     * Create the cube mesh for this voxel
     */
    protected createVisual(): void {
        if (!this.voxelEntity) {
            Logger.warn(LogCategory.RENDERING, `Cannot create voxel visual: no voxel entity`);
            return;
        }

        const voxelId = this.voxelEntity.id;
        const size = this.voxelConfig.size || 0.4;
        
        Logger.log(LogCategory.RENDERING, `Creating voxel visual: ${voxelId}`);
        
        // Create the voxel mesh as a proper cube
        this.mesh = MeshBuilder.CreateBox(
            `voxel_${voxelId}`,
            {
                width: size,
                height: size,
                depth: size
            },
            this.scene
        ) as Mesh;
        
        // Ensure the mesh is visible and configured correctly
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = false;
        this.mesh.alwaysSelectAsActiveMesh = true;
        
        // Create and apply material
        this.createVoxelMaterial();
        
        // Store a reference to the mesh in the voxel entity for legacy compatibility
        // TODO: Remove this when all systems use RenderComponent pattern
        if (this.mesh instanceof Mesh) {
            this.voxelEntity.mesh = this.mesh;
        }
        
        Logger.log(LogCategory.RENDERING, `Voxel visual created: ${voxelId}`, {
            gridPosition: `(${this.voxelEntity.gridPosition.x}, ${this.voxelEntity.gridPosition.y}, ${this.voxelEntity.gridPosition.z})`,
            cargoType: this.voxelEntity.cargoType,
            material: this.voxelEntity.material,
            size: size
        });
    }

    /**
     * Create and apply material based on voxel properties
     */
    private createVoxelMaterial(): void {
        if (!this.mesh || !this.voxelEntity) return;

        const voxelId = this.voxelEntity.id;
        this.material = new StandardMaterial(`voxel_${voxelId}_mat`, this.scene);
        
        const material = this.material as StandardMaterial;
        const color = this.voxelConfig.colorOverride || this.getVoxelColor();
        
        material.diffuseColor = color;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new Color3(0.05, 0.05, 0.05);
        
        this.mesh.material = material;
    }

    /**
     * Get the appropriate color for the voxel based on its properties
     */
    private getVoxelColor(): Color3 {
        if (!this.voxelEntity) return new Color3(0.5, 0.5, 0.5);

        // Check health status first
        const healthComponent = this.voxelEntity.getComponent<HealthComponent>('health');
        if (healthComponent && healthComponent.getHealthPercentage() < 0.5) {
            return new Color3(0.8, 0.4, 0.1); // Orange for damaged
        }

        // Color based on cargo type
        switch (this.voxelEntity.cargoType) {
            case CargoCapacityType.STRUCTURAL:
                return new Color3(1.0, 0.0, 0.0); // Bright red for testing
            case CargoCapacityType.STANDARD:
                return new Color3(0.0, 1.0, 0.0); // Bright green for testing
            case CargoCapacityType.HAZARDOUS:
                return new Color3(1.0, 1.0, 0.0); // Bright yellow for testing
            case CargoCapacityType.LIQUID:
                return new Color3(0.0, 1.0, 1.0); // Bright cyan for testing
            case CargoCapacityType.PERISHABLE:
                return new Color3(1.0, 0.0, 1.0); // Bright magenta for testing
            default:
                return new Color3(1.0, 1.0, 1.0); // Bright white for testing
        }
    }

    /**
     * Update visual representation (called on component updates)
     */
    protected updateVisual(): void {
        if (!this.mesh || !this.voxelEntity) return;
        
        // Update material if health or properties changed
        this.createVoxelMaterial();
        
        // Update visibility based on configuration
        this.updateVisibility();
    }

    /**
     * Override health visual updates for voxel-specific effects
     */
    protected updateHealthVisuals(healthData: any): void {
        super.updateHealthVisuals(healthData);
        
        // Update material color based on health
        this.createVoxelMaterial();
        
        // TODO: Add voxel-specific damage effects
        // - Cracks/holes in the mesh
        // - Smoke particles
        // - Sparks on damage
        Logger.log(LogCategory.RENDERING, `Voxel health visual update: ${this.voxelEntity?.id}`, healthData);
    }

    /**
     * Get voxel-specific information for debugging
     */
    getDebugInfo(): any {
        return {
            voxelId: this.voxelEntity?.id,
            gridPosition: this.voxelEntity?.gridPosition,
            cargoType: this.voxelEntity?.cargoType,
            material: this.voxelEntity?.material,
            meshExists: !!this.mesh,
            visible: this.mesh?.isVisible
        };
    }

    /**
     * Update configuration and rebuild visual if needed
     */
    updateConfig(newConfig: Partial<VoxelRenderConfig>): void {
        const oldSize = this.voxelConfig.size;
        this.voxelConfig = { ...this.voxelConfig, ...newConfig };
        
        // If size changed, recreate the mesh
        if (oldSize !== this.voxelConfig.size && this.mesh) {
            this.dispose();
            this.createVisual();
            this.updatePosition();
        } else {
            this.updateVisual();
        }
    }

    /**
     * Serialize voxel render component data
     */
    serialize(): VoxelRenderConfig {
        return { ...this.voxelConfig };
    }

    /**
     * Deserialize voxel render component data
     */
    deserialize(data: VoxelRenderConfig): void {
        this.updateConfig(data);
    }

    /**
     * Update mesh position from PositionComponent with train orientation alignment
     */
    protected updatePosition(): void {
        if (!this.mesh || !this._gameObject) return;
        
        const positionComponent = this._gameObject.getComponent<PositionComponent>('position');
        if (!positionComponent) return;
        
        const pos = positionComponent.getPosition();
        const rot = positionComponent.getRotation();
        
        // Apply position with Y offset for voxels
        this.mesh.position.x = pos.x;
        this.mesh.position.y = pos.y + (this.config.yOffset || 0);
        this.mesh.position.z = pos.z;
        
        // Apply rotation - this aligns voxels with train direction
        this.mesh.rotation.x = rot.x;
        this.mesh.rotation.y = rot.y; // This is the key for train rail alignment
        this.mesh.rotation.z = rot.z;
    }
}
