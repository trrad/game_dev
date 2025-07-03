import { GameObject } from './GameObject';
import { NodeComponent } from '../components/NodeComponent';
import type { Scene } from '@babylonjs/core';
import type { EventStack } from './EventStack';

/**
 * GameNodeObject: A GameObject that always participates in the scene graph.
 * Adds a NodeComponent and parents it to the provided parent node or scene root.
 */
export class GameNodeObject extends GameObject {
    /** The NodeComponent managing this object's transform and hierarchy */
    public readonly node: NodeComponent;

    constructor(
        type: string,
        eventStack?: EventStack,
        scene?: Scene,
        parentNode?: NodeComponent | null
    ) {
        super(type, eventStack, scene);
        this.node = new NodeComponent(scene!, parentNode || null);
        this.addComponent(this.node);
    }

    /**
     * Get the NodeComponent for this object
     */
    getNodeComponent(): NodeComponent {
        return this.node;
    }
}
