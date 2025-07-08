// src/engine/components/RenderComponent.ts - Corrected (Keeping Event Parameters)

import { Scene, AbstractMesh, Material, Vector3, StandardMaterial, Observer } from "@babylonjs/core";
import { Component } from "./Component";
import { NodeComponent } from "./NodeComponent";
import { GameObject } from "../core/GameObject";
import { GameNodeObject } from "../core/GameNodeObject";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Simplified render component configuration
 */
export interface RenderConfig {
    visible?: boolean;
    yOffset?: number; // Vertical offset from logical position
    autoParentToNode?: boolean; // Whether to automatically parent mesh to NodeComponent
}

/**
 * Simplified RenderComponent - Reactive transform sync only
 * 
 * Always uses reactive property observation for transform updates.
 * Clean, simple, and integrates perfectly with your reactive system.
 */
export abstract class RenderComponent extends Component<RenderConfig> {
    public readonly type = 'render';
    
    protected scene: Scene;
    protected mesh?: AbstractMesh;
    protected material?: StandardMaterial;
    protected config: RenderConfig;
    
    // Node component reference for transform operations
    protected nodeComponent?: NodeComponent;
    private isAttached = false;
    
    // Reactive property observers for cleanup
    private positionObserver?: Observer<any>;
    private rotationObserver?: Observer<any>;
    private scaleObserver?: Observer<any>;

    constructor(scene: Scene, config: RenderConfig = {}) {
        super();
        this.scene = scene;
        this.config = {
            visible: true,
            yOffset: 0,
            autoParentToNode: true,
            ...config
        };
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} created with reactive transforms`);
    }

    /**
     * Called when component is attached to a GameObject
     */
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        this.onAttach();
    }

    /**
     * Component attachment lifecycle
     */
    private onAttach(): void {
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
        
        // Set up reactive transform synchronization
        this.setupReactiveTransformSync();
        
        // Apply initial state
        this.updatePosition();
        this.updateVisibility();
        
        this.isAttached = true;
        
        Logger.log(LogCategory.RENDERING, 
            `${this.constructor.name} attached to ${this._gameObject.id} with reactive transforms`);
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
     * Set up reactive transform synchronization using your reactive properties
     */
    private setupReactiveTransformSync(): void {
        if (!this.nodeComponent) return;
        
        this.positionObserver = this.nodeComponent.position.onChange((event) => {
            this.updatePosition();
            // Use event parameter for potential debugging/logging
            if (false) { // Debug flag
                console.log('Position changed:', event.source, event.changed);
            }
        });
        
        this.rotationObserver = this.nodeComponent.rotation.onChange((event) => {
            this.updatePosition();
            if (false) { // Debug flag  
                console.log('Rotation changed:', event.source, event.changed);
            }
        });
        
        this.scaleObserver = this.nodeComponent.scale.onChange((event) => {
            this.updatePosition();
            if (false) { // Debug flag
                console.log('Scale changed:', event.source, event.changed);
            }
        });
        
        Logger.log(LogCategory.RENDERING, `Reactive transform sync enabled for ${this._gameObject?.id}`);
    }

    /**
     * Update mesh position using reactive properties
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
     * Update visibility based on configuration
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
     * Clean up reactive observers
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
     * Component disposal lifecycle
     */
    dispose(): void {
        this.cleanupObservers();
        this.disposeVisualResources();
        this.isAttached = false;
        
        Logger.log(LogCategory.RENDERING, `${this.constructor.name} disposed`);
        super.dispose();
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
}