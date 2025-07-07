/**
 * Updated RenderComponent - Foundation for all visual representation components
 * Now integrates with NodeComponent and GameNodeObject architecture
 * Supports both direct TransformNode access (performance) and reactive property observation (maintainability)
 */

import { Scene, AbstractMesh, Material, Vector3, StandardMaterial, Observer } from "@babylonjs/core";
import { Component } from "./Component";
import { NodeComponent } from "./NodeComponent";
import { ReactivePropertiesComponent } from "./ReactivePropertyComponent";
import { GameObject } from "../core/GameObject";
import { GameNodeObject } from "../core/GameNodeObject";
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
 * Render component update strategy
 */
export type RenderUpdateStrategy = 'direct' | 'reactive' | 'hybrid';

/**
 * Base configuration for all render components
 */
export interface RenderConfig {
    visible?: boolean;
    assetId?: string; // Primary asset reference
    lod?: LODConfig; // LOD configuration
    yOffset?: number; // Vertical offset from logical position
    updateStrategy?: RenderUpdateStrategy; // How to handle transform updates
    autoParentToNode?: boolean; // Whether to automatically parent mesh to NodeComponent
}

/**
 * Abstract base class for all render components
 * Handles position synchronization, visibility, and common rendering concerns
 * Now works with NodeComponent and GameNodeObject architecture
 */
export abstract class RenderComponent extends Component<RenderConfig> {
    public readonly type = 'render';
    
    protected scene: Scene;
    protected mesh?: AbstractMesh;
    protected material?: StandardMaterial;
    protected config: RenderConfig;
    
    // Node component reference for transform operations
    protected nodeComponent?: NodeComponent;
    private isAttached = false; // Guard against duplicate attachment
    
    // Reactive property observers for cleanup
    private positionObserver?: Observer<any>;
    private rotationObserver?: Observer<any>;
    private scaleObserver?: Observer<any>;
    
    // Direct update tracking for performance mode
    private lastDirectUpdateTime = 0;
    private directUpdateInterval = 16; // ~60fps for direct updates

    constructor(scene: Scene, config: RenderConfig = {}) {
        super();
        this.scene = scene;
        this.config = {
            visible: true,
            yOffset: 0,
            updateStrategy: 'hybrid', // Default to hybrid approach
            autoParentToNode: true,
            ...config
        };
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} created with strategy: ${this.config.updateStrategy}`);
    }

    /**
     * Called when component is attached to a GameObject
     * Follows existing component lifecycle patterns
     */
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        this.onAttach();
    }

    /**
     * Component attachment lifecycle - matches existing RenderComponent pattern
     */
    private onAttach(): void {
       // Guard against duplicate attachment
        if (this.isAttached) {
            Logger.warn(LogCategory.RENDERING, 
                `RenderComponent already attached to ${this._gameObject?.id}`);
            return;
        }
        
        // Ensure we're working with a GameNodeObject
        if (!(this._gameObject instanceof GameNodeObject)) {
            Logger.error(LogCategory.RENDERING, 
                `RenderComponent requires GameNodeObject, got ${this._gameObject?.constructor.name}`);
            return;
        }
        
        this.nodeComponent = this._gameObject.getNodeComponent();
        if (!this.nodeComponent) {
            Logger.error(LogCategory.RENDERING, 
                `GameNodeObject ${this._gameObject.id} missing NodeComponent`);
            return;
        }
        
        // Create initial visual representation
        this.createVisual();
        
        // Set up transform synchronization based on strategy
        this.setupTransformSync();
        
        // Apply initial state
        this.updatePosition();
        this.updateVisibility();
        
        this.isAttached = true;
        
        Logger.log(LogCategory.RENDERING, 
            `${this.constructor.name} attached to ${this._gameObject.id} with NodeComponent`);
    }

    /**
     * Called when component is detached from a GameObject
     * Follows existing component lifecycle patterns
     */
    dispose(): void {
        this.onDetach();
        super.dispose();
    }

    /**
     * Component detachment lifecycle - matches existing RenderComponent pattern
     */
    private onDetach(): void {
        // Clean up reactive observers
        this.cleanupObservers();
        
        // Dispose of visual resources
        this.disposeVisualResources();

        this.isAttached = false;
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} disposed`);
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
     * Set up transform synchronization based on the configured strategy
     */
    private setupTransformSync(): void {
        if (!this.nodeComponent) return;
        
        switch (this.config.updateStrategy) {
            case 'direct':
                this.setupDirectTransformSync();
                break;
            case 'reactive':
                this.setupReactiveTransformSync();
                break;
            case 'hybrid':
                this.setupHybridTransformSync();
                break;
            default:
                Logger.warn(LogCategory.RENDERING, 
                    `Unknown update strategy: ${this.config.updateStrategy}, using hybrid`);
                this.setupHybridTransformSync();
        }
    }

    /**
     * Direct transform sync - Best performance, polls TransformNode directly
     * Use for performance-critical rendering with many objects
     * Matches ObservableFactory performance patterns
     */
    private setupDirectTransformSync(): void {
        if (!this.nodeComponent) return;
        
        // Use Babylon.js onBeforeRenderObservable for frame-based updates
        // Follows same pattern as ObservableFactory spatial tracking
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            const currentTime = performance.now();
            if (currentTime - this.lastDirectUpdateTime >= this.directUpdateInterval) {
                this.updatePositionDirect();
                this.lastDirectUpdateTime = currentTime;
            }
        });
        
        // Store observer for cleanup
        this.positionObserver = observer;
        
        Logger.log(LogCategory.RENDERING, `Direct transform sync enabled for ${this._gameObject?.id}`);
    }

    /**
     * Reactive transform sync - Uses reactive properties, better for debugging
     * Use when you need to react to specific transform changes
     */
    private setupReactiveTransformSync(): void {
        if (!this.nodeComponent) return;
        
        // Subscribe to reactive transform properties using their onChange pattern
        this.positionObserver = this.nodeComponent.position.onChange((event) => {
            this.updatePosition();
        });
        
        this.rotationObserver = this.nodeComponent.rotation.onChange((event) => {
            this.updatePosition(); // Rotation affects transform
        });
        
        this.scaleObserver = this.nodeComponent.scale.onChange((event) => {
            this.updatePosition(); // Scale affects transform
        });
        
        Logger.log(LogCategory.RENDERING, `Reactive transform sync enabled for ${this._gameObject?.id}`);
    }

    /**
     * Hybrid transform sync - Reactive for non-frequent changes, direct for frequent updates
     * Best balance of performance and maintainability
     */
    private setupHybridTransformSync(): void {
        if (!this.nodeComponent) return;
        
        let hasFrequentUpdates = false;
        let updateCount = 0;
        let lastResetTime = performance.now();
        
        // Monitor update frequency to switch modes - follows existing performance patterns
        const checkUpdateFrequency = () => {
            const currentTime = performance.now();
            if (currentTime - lastResetTime > 1000) { // Check every second
                hasFrequentUpdates = updateCount > 30; // More than 30 updates/sec = frequent
                updateCount = 0;
                lastResetTime = currentTime;
            }
        };
        
        // Reactive observers that can detect frequent updates
        this.positionObserver = this.nodeComponent.position.onChange((event) => {
            updateCount++;
            checkUpdateFrequency();
            
            if (!hasFrequentUpdates) {
                this.updatePosition();
            }
        });
        
        // Direct update loop for frequent changes - matches ObservableFactory pattern
        const directObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (hasFrequentUpdates) {
                const currentTime = performance.now();
                if (currentTime - this.lastDirectUpdateTime >= this.directUpdateInterval) {
                    this.updatePositionDirect();
                    this.lastDirectUpdateTime = currentTime;
                }
            }
        });
        
        // Store both observers for cleanup
        this.rotationObserver = directObserver;
        
        Logger.log(LogCategory.RENDERING, `Hybrid transform sync enabled for ${this._gameObject?.id}`);
    }

    /**
     * Update mesh position using direct TransformNode access (performance mode)
     */
    protected updatePositionDirect(): void {
        if (!this.mesh || !this.nodeComponent) return;
        
        // Get transform directly from Babylon.js TransformNode (fastest)
        const transformNode = this.nodeComponent.getTransformNode();
        const worldMatrix = transformNode.getWorldMatrix();
        
        // Apply world matrix directly to mesh
        if (this.config.autoParentToNode) {
            // Mesh is parented to transform node, no manual sync needed
            return;
        }
        
        // Manual position sync with Y offset
        const position = transformNode.getAbsolutePosition();
        if (this.config.yOffset) {
            position.y += this.config.yOffset;
        }
        
        this.mesh.position = position;
        this.mesh.rotationQuaternion = transformNode.absoluteRotationQuaternion?.clone() || null;
    }

    /**
     * Update mesh position using reactive properties (maintainability mode)
     */
    protected updatePosition(): void {
        if (!this.mesh || !this.nodeComponent) return;
        
        if (this.config.autoParentToNode) {
            // Parent mesh to NodeComponent's transform for automatic updates
            if (this.mesh.parent !== this.nodeComponent.getTransformNode()) {
                this.mesh.parent = this.nodeComponent.getTransformNode();
                
                // Apply Y offset if needed
                if (this.config.yOffset) {
                    this.mesh.position.y = this.config.yOffset;
                } else {
                    this.mesh.position.setAll(0); // Reset to origin relative to parent
                }
                this.mesh.rotation.setAll(0);
            }
            return;
        }
        
        // Manual position sync using reactive properties
        const pos = this.nodeComponent.getWorldPosition();
        const rot = this.nodeComponent.getWorldRotation();
        
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
     * Set visibility of the rendered object
     */
    setVisible(visible: boolean): void {
        this.config.visible = visible;
        this.updateVisibility();
    }

    /**
     * Change update strategy at runtime
     */
    setUpdateStrategy(strategy: RenderUpdateStrategy): void {
        if (strategy === this.config.updateStrategy) return;
        
        // Clean up current observers
        this.cleanupObservers();
        
        // Update config and setup new strategy
        this.config.updateStrategy = strategy;
        this.setupTransformSync();
        
        Logger.log(LogCategory.RENDERING, 
            `Updated render strategy to ${strategy} for ${this._gameObject?.id}`);
    }

    /**
     * Get the current mesh (if any)
     */
    getMesh(): AbstractMesh | undefined {
        return this.mesh;
    }

    /**
     * Get the NodeComponent this render component is working with
     */
    getNodeComponent(): NodeComponent | undefined {
        return this.nodeComponent;
    }

    /**
     * Clean up all reactive observers
     */
    private cleanupObservers(): void {
        if (this.positionObserver) {
            this.positionObserver.remove();
            this.positionObserver = undefined;
        }
        
        if (this.rotationObserver) {
            this.rotationObserver.remove();
            this.rotationObserver = undefined;
        }
        
        if (this.scaleObserver) {
            this.scaleObserver.remove();
            this.scaleObserver = undefined;
        }
    }

    /**
     * Dispose of all visual resources
     */
    private disposeVisualResources(): void {
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
        
        // Re-setup transform sync if strategy changed
        if (data.updateStrategy && data.updateStrategy !== this.config.updateStrategy) {
            this.setUpdateStrategy(data.updateStrategy);
        }
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