/**
 * Base RenderComponent - Foundation for all visual representation components
 * Handles common rendering concerns and provides event-driven updates
 */

import { Scene, AbstractMesh, Material, Vector3 } from "@babylonjs/core";
import { Component } from "./Component";
import { PositionComponent } from "./PositionComponent";
import { HealthComponent } from "./HealthComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Asset reference for future asset loading system
 */
export interface AssetReference {
    id: string;
    type: 'mesh' | 'material' | 'texture';
    path?: string;
    fallback?: () => AbstractMesh | Material; // Procedural fallback
}

/**
 * Level of Detail configuration
 */
export interface LODConfig {
    distances: number[]; // Distance thresholds for LOD levels
    meshes?: AssetReference[]; // Different mesh assets per LOD
    enabled: boolean;
}

/**
 * Base configuration for all render components
 */
export interface RenderConfig {
    visible?: boolean;
    assetId?: string; // Primary asset reference
    lod?: LODConfig; // LOD configuration
    yOffset?: number; // Vertical offset from logical position
}

/**
 * Abstract base class for all render components
 * Handles position synchronization, visibility, and common rendering concerns
 */
export abstract class RenderComponent extends Component<RenderConfig> {
    public readonly type = 'render';
    
    protected scene: Scene;
    protected mesh?: AbstractMesh;
    protected material?: Material;
    protected config: RenderConfig;
    
    // Event subscription cleanup functions
    private unsubscribePosition?: () => void;
    private unsubscribeHealth?: () => void;

    constructor(scene: Scene, config: RenderConfig = {}) {
        super();
        this.scene = scene;
        this.config = {
            visible: true,
            yOffset: 0,
            ...config
        };
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} created`);
    }

    /**
     * Called when component is attached to a GameObject
     * Sets up event subscriptions for position and health changes
     */
    onAttach(): void {
        // Subscribe to position changes from sibling PositionComponent
        const positionComponent = this._gameObject?.getComponent<PositionComponent>('position');
        if (positionComponent) {
            this.unsubscribePosition = this.subscribeToSibling('position_changed', 
                (event) => this.onPositionChanged(event.payload)
            );
        }
        
        // Subscribe to health changes for visual damage effects
        const healthComponent = this._gameObject?.getComponent<HealthComponent>('health');
        if (healthComponent) {
            this.unsubscribeHealth = this.subscribeToSibling('health_changed',
                (event) => this.onHealthChanged(event.payload)
            );
        }
        
        // Create initial visual representation
        this.createVisual();
        this.updatePosition();
        this.updateVisibility();
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} attached to ${this._gameObject?.id}`);
    }

    /**
     * Called when component is detached from a GameObject
     * Cleans up event subscriptions and disposes of visual resources
     */
    onDetach(): void {
        // Clean up event subscriptions
        if (this.unsubscribePosition) {
            this.unsubscribePosition();
            this.unsubscribePosition = undefined;
        }
        
        if (this.unsubscribeHealth) {
            this.unsubscribeHealth();
            this.unsubscribeHealth = undefined;
        }
        
        // Dispose of visual resources
        this.dispose();
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} detached from ${this._gameObject?.id}`);
    }

    /**
     * Abstract method - subclasses must implement visual creation
     */
    protected abstract createVisual(): void;

    /**
     * Abstract method - subclasses can override for custom visual updates
     */
    protected abstract updateVisual(): void;

    /**
     * Handle position changes from PositionComponent
     */
    protected onPositionChanged(_positionData: any): void {
        this.updatePosition();
    }

    /**
     * Handle health changes from HealthComponent
     */
    protected onHealthChanged(healthData: any): void {
        this.updateHealthVisuals(healthData);
    }

    /**
     * Update mesh position from PositionComponent
     */
    protected updatePosition(): void {
        if (!this.mesh || !this._gameObject) return;
        
        const positionComponent = this._gameObject.getComponent<PositionComponent>('position');
        if (!positionComponent) return;
        
        const pos = positionComponent.getPosition();
        const rot = positionComponent.getRotation();
        
        // Apply position with optional Y offset
        this.mesh.position = new Vector3(
            pos.x, 
            pos.y + (this.config.yOffset || 0), 
            pos.z
        );
        
        // Apply rotation
        this.mesh.rotation = new Vector3(rot.x, rot.y, rot.z);
    }

    /**
     * Update visibility based on configuration and game state
     */
    protected updateVisibility(): void {
        if (this.mesh) {
            this.mesh.isVisible = this.config.visible ?? true;
        }
    }

    /**
     * Update visual effects based on health (damage, etc.)
     * Can be overridden by subclasses for specific health visualization
     */
    protected updateHealthVisuals(healthData: any): void {
        // TODO: Implement health-based visual effects
        // - Damage sparks/smoke
        // - Color changes
        // - Transparency for destroyed parts
        Logger.log(LogCategory.RENDERING, `Health visual update: ${JSON.stringify(healthData)}`);
    }

    /**
     * Set visibility of the rendered object
     */
    setVisible(visible: boolean): void {
        this.config.visible = visible;
        this.updateVisibility();
    }

    /**
     * Get the current mesh (if any)
     */
    getMesh(): AbstractMesh | undefined {
        return this.mesh;
    }

    /**
     * Dispose of all visual resources
     */
    dispose(): void {
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = undefined;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = undefined;
        }
    }

    /**
     * Serialize component data
     */
    serialize(): RenderConfig {
        return { ...this.config };
    }

    /**
     * Deserialize component data
     */
    deserialize(data: RenderConfig): void {
        this.config = { ...this.config, ...data };
        this.updateVisibility();
    }

    // TODO: Future LOD system integration
    protected updateLOD(_cameraDistance: number): void {
        // if (this.config.lod?.enabled) {
        //     const lodLevel = this.calculateLODLevel(cameraDistance);
        //     this.switchToLOD(lodLevel);
        // }
    }

    // TODO: Future asset system integration
    protected loadAsset(_assetId: string): Promise<AbstractMesh> {
        // return AssetManager.loadMesh(assetId)
        //     .catch(() => this.createFallbackMesh());
        throw new Error("Asset system not yet implemented");
    }
}
