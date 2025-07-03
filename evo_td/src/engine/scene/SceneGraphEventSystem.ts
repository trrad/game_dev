/**
 * Scene Graph Event System - Hierarchical event propagation with spatial awareness
 * Provides DOM-like event bubbling/capturing and spatial targeting for game objects
 */

import { Vector3 } from "@babylonjs/core";
import { NodeComponent } from "../components/NodeComponent";
import { ComponentEvent } from "../components/Component";

export enum EventPhase {
    CAPTURE = 1,    // Top-down from scene root to target
    TARGET = 2,     // At the target node
    BUBBLE = 3      // Bottom-up from target to scene root
}

export interface SceneGraphEvent extends ComponentEvent {
    // Existing ComponentEvent properties
    type: string;
    payload?: any;
    timestamp: number;
    source: string;
    sourceId: string;
    
    // New scene graph properties
    target: NodeComponent;           // The target node
    currentTarget: NodeComponent;    // Current node in event path
    phase: EventPhase;                    // Current event phase
    bubbles: boolean;                     // Should event bubble up?
    cancelable: boolean;                  // Can event be cancelled?
    defaultPrevented: boolean;            // Has preventDefault() been called?
    propagationStopped: boolean;          // Has stopPropagation() been called?
    immediatePropagationStopped: boolean; // Has stopImmediatePropagation() been called?
    
    // Spatial context
    worldPosition?: Vector3;              // World position of event
    localPosition?: Vector3;              // Local position relative to target
    distance?: number;                    // Distance from event origin
    
    // Helper methods
    preventDefault(): void;
    stopPropagation(): void;
    stopImmediatePropagation(): void;
}

export interface EventTarget {
    type: 'node' | 'radius' | 'hierarchy' | 'broadcast';
    
    // Specific node targeting
    node?: NodeComponent;
    
    // Radius-based targeting
    center?: Vector3;
    radius?: number;
    radiusType?: 'collision' | 'interaction' | 'detection' | 'render';
    
    // Hierarchy targeting
    root?: NodeComponent;
    maxDepth?: number;
    
    // Filtering
    filter?: (node: NodeComponent) => boolean;
}

export interface EventOptions {
    bubbles?: boolean;
    cancelable?: boolean;
    spatial?: boolean;
    capture?: boolean;
}

export interface EventListenerOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
}

export type SceneGraphEventListener = (event: SceneGraphEvent) => void;

/**
 * Scene Graph Event System - manages hierarchical event propagation
 */
export class SceneGraphEventSystem {
    private sceneRoot: NodeComponent | null = null;
    private eventListeners: Map<string, Map<NodeComponent, SceneGraphEventListener[]>> = new Map();
    private captureListeners: Map<string, Map<NodeComponent, SceneGraphEventListener[]>> = new Map();
    
    constructor(sceneRoot?: NodeComponent) {
        this.sceneRoot = sceneRoot || null;
    }
    
    setSceneRoot(root: NodeComponent): void {
        this.sceneRoot = root;
    }
    
    /**
     * Add event listener to a scene node
     */
    addEventListener(
        node: NodeComponent,
        eventType: string,
        listener: SceneGraphEventListener,
        options?: EventListenerOptions
    ): void {
        const listenerMap = options?.capture ? this.captureListeners : this.eventListeners;
        
        if (!listenerMap.has(eventType)) {
            listenerMap.set(eventType, new Map());
        }
        
        const nodeListeners = listenerMap.get(eventType)!;
        if (!nodeListeners.has(node)) {
            nodeListeners.set(node, []);
        }
        
        const listeners = nodeListeners.get(node)!;
        
        // Wrap listener if it's "once" only
        const wrappedListener = options?.once ? 
            (event: SceneGraphEvent) => {
                listener(event);
                this.removeEventListener(node, eventType, wrappedListener, options);
            } : listener;
            
        listeners.push(wrappedListener);
    }
    
    /**
     * Remove event listener from a scene node
     */
    removeEventListener(
        node: NodeComponent,
        eventType: string,
        listener: SceneGraphEventListener,
        options?: EventListenerOptions
    ): void {
        const listenerMap = options?.capture ? this.captureListeners : this.eventListeners;
        const nodeListeners = listenerMap.get(eventType);
        if (!nodeListeners) return;
        
        const listeners = nodeListeners.get(node);
        if (!listeners) return;
        
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
            
            // Clean up empty arrays
            if (listeners.length === 0) {
                nodeListeners.delete(node);
                if (nodeListeners.size === 0) {
                    listenerMap.delete(eventType);
                }
            }
        }
    }
    
    /**
     * Dispatch event with full scene graph propagation
     */
    dispatchEvent(event: SceneGraphEvent): boolean {
        if (!event.target) return false;
        
        // Build propagation path from root to target
        const propagationPath = this.buildPropagationPath(event.target);
        
        // Capture phase (root to target)
        event.phase = EventPhase.CAPTURE;
        for (let i = 0; i < propagationPath.length - 1; i++) {
            event.currentTarget = propagationPath[i];
            this.invokeListeners(event, true); // capture = true
            if (event.propagationStopped) break;
        }
        
        // Target phase
        if (!event.propagationStopped) {
            event.phase = EventPhase.TARGET;
            event.currentTarget = event.target;
            this.invokeListeners(event, false); // bubble listeners
            this.invokeListeners(event, true);  // capture listeners
        }
        
        // Bubble phase (target to root)
        if (!event.propagationStopped && event.bubbles) {
            event.phase = EventPhase.BUBBLE;
            for (let i = propagationPath.length - 2; i >= 0; i--) {
                event.currentTarget = propagationPath[i];
                this.invokeListeners(event, false); // bubble = true
                if (event.propagationStopped) break;
            }
        }
        
        return !event.defaultPrevented;
    }
    
    /**
     * Emit event to a specific node
     */
    emitToNode(
        eventType: string,
        payload: any,
        node: NodeComponent,
        options?: EventOptions
    ): boolean {
        const event = this.createEvent(eventType, payload, node, options);
        return this.dispatchEvent(event);
    }
    
    /**
     * Emit event to all nodes within radius
     */
    emitToRadius(
        eventType: string,
        payload: any,
        center: Vector3,
        radius: number,
        filter?: (node: NodeComponent) => boolean
    ): void {
        const nodesInRadius = this.getNodesInRadius(center, radius, filter);
        
        nodesInRadius.forEach(node => {
            const distance = Vector3.Distance(center, node.getWorldPosition());
            const event = this.createEvent(eventType, payload, node, { bubbles: false });
            event.worldPosition = center.clone();
            event.distance = distance;
            this.dispatchEvent(event);
        });
    }
    
    /**
     * Emit event to hierarchy starting from root
     */
    emitToHierarchy(
        eventType: string,
        payload: any,
        root: NodeComponent,
        maxDepth?: number
    ): void {
        const nodes = this.getNodesInHierarchy(root, undefined, maxDepth);
        
        nodes.forEach(node => {
            const event = this.createEvent(eventType, payload, node, { bubbles: false });
            this.dispatchEvent(event);
        });
    }
    
    /**
     * Get all nodes within radius of a center point
     */
    getNodesInRadius(
        center: Vector3,
        radius: number,
        filter?: (node: NodeComponent) => boolean
    ): NodeComponent[] {
        if (!this.sceneRoot) return [];
        
        const result: NodeComponent[] = [];
        const radiusSquared = radius * radius;
        
        this.traverseNodes(this.sceneRoot, (node) => {
            const nodePos = node.getWorldPosition();
            const distanceSquared = Vector3.DistanceSquared(center, nodePos);
            
            if (distanceSquared <= radiusSquared) {
                if (!filter || filter(node)) {
                    result.push(node);
                }
            }
        });
        
        return result;
    }
    
    /**
     * Get all nodes in hierarchy starting from root
     */
    getNodesInHierarchy(
        root: NodeComponent,
        filter?: (node: NodeComponent) => boolean,
        maxDepth?: number
    ): NodeComponent[] {
        const result: NodeComponent[] = [];
        
        this.traverseNodes(root, (node, depth) => {
            if (maxDepth !== undefined && depth > maxDepth) return false;
            
            if (!filter || filter(node)) {
                result.push(node);
            }
            return true; // Continue traversal
        });
        
        return result;
    }
    
    /**
     * Create a scene graph event
     */
    private createEvent(
        eventType: string,
        payload: any,
        target: NodeComponent,
        options?: EventOptions
    ): SceneGraphEvent {
        const event: SceneGraphEvent = {
            type: eventType,
            payload,
            timestamp: Date.now(),
            source: 'SceneGraphEventSystem',
            sourceId: 'scene_graph_event_system',
            target,
            currentTarget: target,
            phase: EventPhase.TARGET,
            bubbles: options?.bubbles ?? true,
            cancelable: options?.cancelable ?? true,
            defaultPrevented: false,
            propagationStopped: false,
            immediatePropagationStopped: false,
            
            preventDefault() {
                if (this.cancelable) {
                    this.defaultPrevented = true;
                }
            },
            
            stopPropagation() {
                this.propagationStopped = true;
            },
            
            stopImmediatePropagation() {
                this.propagationStopped = true;
                this.immediatePropagationStopped = true;
            }
        };
        
        return event;
    }
    
    /**
     * Build propagation path from scene root to target
     */
    private buildPropagationPath(target: NodeComponent): NodeComponent[] {
        const path: NodeComponent[] = [];
        let current: NodeComponent | null = target;
        
        while (current) {
            path.unshift(current);
            current = current.getParent();
            
            // Prevent infinite loops
            if (path.length > 1000) {
                console.warn('Scene graph propagation path too long, breaking to prevent infinite loop');
                break;
            }
        }
        
        return path;
    }
    
    /**
     * Invoke listeners for the current event phase
     */
    private invokeListeners(event: SceneGraphEvent, capture: boolean): void {
        const listenerMap = capture ? this.captureListeners : this.eventListeners;
        const nodeListeners = listenerMap.get(event.type);
        if (!nodeListeners) return;
        
        const listeners = nodeListeners.get(event.currentTarget);
        if (!listeners) return;
        
        // Copy listeners array to handle removal during iteration
        const listenersCopy = [...listeners];
        
        for (const listener of listenersCopy) {
            if (event.immediatePropagationStopped) break;
            
            try {
                listener(event);
            } catch (error) {
                console.error(`Error in scene graph event listener for ${event.type}:`, error);
            }
        }
    }
    
    /**
     * Traverse nodes in the scene graph
     */
    private traverseNodes(
        root: NodeComponent,
        callback: (node: NodeComponent, depth: number) => boolean | void,
        depth: number = 0
    ): void {
        const result = callback(root, depth);
        if (result === false) return; // Stop traversal
        
        const children = root.getChildren();
        for (const child of children) {
            this.traverseNodes(child, callback, depth + 1);
        }
    }
}

// Global instance for scene graph events
export const SceneEvents = new SceneGraphEventSystem();


