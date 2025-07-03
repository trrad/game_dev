/**
 * SceneNodeDebugger - Visual debugging tools for scene node hierarchy
 * Helps visualize parent-child relationships and transformations
 */

import { Scene, LinesMesh, Vector3, Color3, AxesViewer, Material, StandardMaterial } from '@babylonjs/core';
import { SceneNodeComponent } from './SceneNodeComponent';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * Configuration options for debug visualization
 */
export interface SceneNodeDebugOptions {
    /** Show connection lines between parent-child nodes */
    showConnections?: boolean;
    /** Show local coordinate axes for each node */
    showAxes?: boolean;
    /** Color for parent-child connection lines */
    connectionColor?: Color3;
    /** Size of the axes visualization */
    axesSize?: number;
    /** Only show debug for specific nodes (empty = show all) */
    nodeFilter?: (node: SceneNodeComponent) => boolean;
}

/**
 * SceneNodeDebugger provides visual tools for debugging scene node hierarchies
 */
export class SceneNodeDebugger {
    private _scene: Scene;
    private _options: SceneNodeDebugOptions;
    private _connectionLines: LinesMesh[] = [];
    private _axesViewers: AxesViewer[] = [];
    private _enabled: boolean = false;
    private _lineMaterial: StandardMaterial;
    
    /**
     * Create a new scene node debugger
     * @param scene Babylon.js scene
     * @param options Debug visualization options
     */
    constructor(scene: Scene, options: SceneNodeDebugOptions = {}) {
        this._scene = scene;
        this._options = {
            showConnections: options.showConnections ?? true,
            showAxes: options.showAxes ?? true,
            connectionColor: options.connectionColor ?? new Color3(0, 1, 1),
            axesSize: options.axesSize ?? 1.0,
            nodeFilter: options.nodeFilter
        };
        
        // Create material for connection lines
        this._lineMaterial = new StandardMaterial('sceneNodeDebugLineMaterial', scene);
        this._lineMaterial.emissiveColor = this._options.connectionColor || new Color3(0, 1, 1);
        this._lineMaterial.disableLighting = true;
    }
    
    /**
     * Enable visualization
     */
    enable(): void {
        if (this._enabled) return;
        this._enabled = true;
        Logger.log(LogCategory.SYSTEM, 'Scene node debug visualization enabled');
    }
    
    /**
     * Disable visualization
     */
    disable(): void {
        if (!this._enabled) return;
        this._enabled = false;
        this._clearVisualizations();
        Logger.log(LogCategory.SYSTEM, 'Scene node debug visualization disabled');
    }
    
    /**
     * Toggle visualization on/off
     */
    toggle(): void {
        if (this._enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    /**
     * Update visualizations for a set of root nodes
     * @param rootNodes Root nodes to visualize (with their children)
     */
    visualize(rootNodes: SceneNodeComponent[]): void {
        if (!this._enabled) return;
        
        // Clear previous visualizations
        this._clearVisualizations();
        
        // Process each root node
        rootNodes.forEach(rootNode => {
            this._visualizeNodeHierarchy(rootNode);
        });
        
        Logger.log(LogCategory.SYSTEM, 
            `Updated scene node debug visualization with ${this._connectionLines.length} connections and ${this._axesViewers.length} axes`);
    }
    
    /**
     * Recursively visualize a node and its children
     */
    private _visualizeNodeHierarchy(node: SceneNodeComponent): void {
        // Apply filter if one is set
        if (this._options.nodeFilter && !this._options.nodeFilter(node)) {
            return;
        }
        
        // Show axes for this node
        if (this._options.showAxes) {
            const axesViewer = new AxesViewer(this._scene, this._options.axesSize);
            axesViewer.xAxis.parent = node.getTransformNode();
            axesViewer.yAxis.parent = node.getTransformNode();
            axesViewer.zAxis.parent = node.getTransformNode();
            this._axesViewers.push(axesViewer);
        }
        
        // Process children
        const children = node.getChildren();
        children.forEach(child => {
            // Draw connection line if enabled
            if (this._options.showConnections) {
                this._drawConnectionLine(node, child);
            }
            
            // Recurse to child
            this._visualizeNodeHierarchy(child);
        });
    }
    
    /**
     * Draw a line between parent and child nodes
     */
    private _drawConnectionLine(parent: SceneNodeComponent, child: SceneNodeComponent): void {
        const points = [
            parent.getWorldPosition(),
            child.getWorldPosition()
        ];
        
        const lines = LinesMesh.CreateLines(
            `connection_${parent.instanceId}_${child.instanceId}`,
            points,
            this._scene,
            false
        );
        
        lines.color = this._options.connectionColor || new Color3(0, 1, 1);
        lines.alpha = 0.5;
        lines.material = this._lineMaterial;
        
        // Store for later cleanup
        this._connectionLines.push(lines);
    }
    
    /**
     * Clear all visualization objects
     */
    private _clearVisualizations(): void {
        // Dispose connection lines
        this._connectionLines.forEach(lines => {
            if (lines && !lines.isDisposed) {
                lines.dispose();
            }
        });
        this._connectionLines = [];
        
        // Dispose axes viewers
        this._axesViewers.forEach(axesViewer => {
            axesViewer.dispose();
        });
        this._axesViewers = [];
    }
    
    /**
     * Update debug options
     */
    updateOptions(options: Partial<SceneNodeDebugOptions>): void {
        this._options = {
            ...this._options,
            ...options
        };
        
        // Update line material color if changed
        if (options.connectionColor) {
            this._lineMaterial.emissiveColor = options.connectionColor;
        }
        
        Logger.log(LogCategory.SYSTEM, 'Scene node debug options updated');
    }
}
