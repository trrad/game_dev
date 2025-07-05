import { GameObject } from './GameObject';
import { NodeComponent } from '../components/NodeComponent';
import type { Scene } from '@babylonjs/core';

/**
 * GameNodeObject: A GameObject that always participates in the scene graph.
 * Adds a NodeComponent and parents it to the provided parent node or scene root.
 */
export class GameNodeObject extends GameObject {
    /** The NodeComponent managing this object's transform and hierarchy */
    public readonly node: NodeComponent;

    constructor(
        type: string,
        scene?: Scene,
        parentNode?: NodeComponent | null
    ) {
        super(type, scene);
        this.node = new NodeComponent(scene!, parentNode || null);
        this.addComponent(this.node);
    }

    /**
     * Get the NodeComponent for this object
     */
    getNodeComponent(): NodeComponent {
        return this.node;
    }

    /**
     * Emit an event from this node (scene graph event system)
     */
    emit(eventType: string, payload?: any, options?: import('../scene/SceneGraphEventSystem').EventOptions): boolean {
        return this.node.emit(eventType, payload, options);
    }

    /**
     * Add an event listener to this node (scene graph event system)
     */
    addEventListener(eventType: string, listener: import('../scene/SceneGraphEventSystem').SceneGraphEventListener, options?: import('../scene/SceneGraphEventSystem').EventListenerOptions): void {
        this.node.addEventListener(eventType, listener, options);
    }

    /**
     * Remove an event listener from this node (scene graph event system)
     */
    removeEventListener(eventType: string, listener: import('../scene/SceneGraphEventSystem').SceneGraphEventListener, options?: import('../scene/SceneGraphEventSystem').EventListenerOptions): void {
        this.node.removeEventListener(eventType, listener, options);
    }
}
