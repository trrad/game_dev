// src/engine/core/GameNodeObject.ts - Fixed TypeScript Errors

import { GameObject } from './GameObject';
import { NodeComponent } from '../components/NodeComponent';
import { VectorProperty } from '../components/ReactivePropertyComponent';
import type { Scene } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';

/**
 * GameNodeObject: A GameObject that always participates in the scene graph with reactive transforms
 * 
 * Provides convenient access to reactive transform properties:
 * - position, rotation, scale (local space)
 * - worldPosition, worldRotation (world space, computed)
 * 
 * Other systems can observe these properties for reactive behavior:
 * - Rendering systems can react to position changes
 * - AI systems can react to world position changes
 * - Physics systems can observe transform changes
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
        
        // FIXED: Establish bidirectional reference between NodeComponent and GameNodeObject
        // This is needed for hierarchy navigation
        (this.node as any)._gameObject = this;
    }

    /**
     * Get the NodeComponent for this object
     */
    getNodeComponent(): NodeComponent {
        return this.node;
    }

    // ============================================================
    // Reactive Transform Convenience API
    // ============================================================

    /**
     * Get reactive position property for observation
     */
    get position(): VectorProperty {
        return this.node.position;
    }

    /**
     * Get reactive rotation property for observation
     */
    get rotation(): VectorProperty {
        return this.node.rotation;
    }

    /**
     * Get reactive scale property for observation
     */
    get scale(): VectorProperty {
        return this.node.scale;
    }

    /**
     * Get reactive world position property for observation
     */
    get worldPosition(): VectorProperty {
        return this.node.worldPosition;
    }

    /**
     * Get reactive world rotation property for observation
     */
    get worldRotation(): VectorProperty {
        return this.node.worldRotation;
    }

    // ============================================================
    // Transform Convenience Methods
    // ============================================================

    /**
     * Set local position (convenience method)
     */
    setPosition(x: number, y: number, z: number): void {
        this.node.setLocalPosition(x, y, z);
    }

    setPositionFromVector(position: Vector3): void {
        this.node.setLocalPositionFromVector(position);
    }

    /**
     * Get current local position value
     */
    getPosition(): Vector3 {
        return this.node.getLocalPosition();
    }

    /**
     * Set local rotation (convenience method)
     */
    setRotation(x: number, y: number, z: number): void {
        this.node.setLocalRotation(x, y, z);
    }

    setRotationFromVector(rotation: Vector3): void {
        this.node.setLocalRotationFromVector(rotation);
    }

    /**
     * Get current local rotation value
     */
    getRotation(): Vector3 {
        return this.node.getLocalRotation();
    }

    /**
     * Set local scale (convenience method)
     */
    setScale(x: number, y: number, z: number): void {
        this.node.setLocalScale(x, y, z);
    }

    setUniformScale(scale: number): void {
        this.node.setUniformLocalScale(scale);
    }

    /**
     * Get current local scale value
     */
    getScale(): Vector3 {
        return this.node.getLocalScale();
    }

    /**
     * Get current world position value
     */
    getWorldPosition(): Vector3 {
        return this.node.getWorldPosition();
    }

    /**
     * Get current world rotation value
     */
    getWorldRotation(): Vector3 {
        return this.node.getWorldRotation();
    }

    // ============================================================
    // Movement and Animation Helpers
    // ============================================================

    /**
     * Move relative to current position using VectorProperty API
     */
    translate(x: number, y: number, z: number): void {
        this.node.translate(x, y, z);
    }

    translateByVector(offset: Vector3): void {
        this.node.translateByVector(offset);
    }

    /**
     * Rotate relative to current rotation
     */
    rotate(x: number, y: number, z: number): void {
        this.node.rotate(x, y, z);
    }

    rotateByVector(rotation: Vector3): void {
        const current = this.rotation.getValue();
        // FIXED: Use 'set' method instead of non-existent 'update' method
        this.rotation.set(current.add(rotation), 'rotateByVector');
    }

    /**
     * Scale using VectorProperty API
     */
    scaleUniform(factor: number): void {
        this.node.scaleUniform(factor);
    }

    scaleByVector(scaleVector: Vector3): void {
        this.node.scaleByVector(scaleVector);
    }

    /**
     * Look at a target position
     */
    lookAt(targetPosition: Vector3): void {
        this.node.lookAt(targetPosition);
    }

    lookAtEntity(target: GameNodeObject): void {
        this.node.lookAt(target.getWorldPosition());
    }

    // ============================================================
    // Reactive Behavior Helpers
    // ============================================================

    /**
     * Set up reactive behavior when position changes
     * @param callback Function to call when position changes
     * @returns Cleanup function
     */
    onPositionChanged(callback: (newPosition: Vector3, oldPosition: Vector3, source: string) => void): () => void {
        const observer = this.position.onChange((event) => {
            callback(event.to, event.from, event.source);
        });
        return () => observer.remove();
    }

    /**
     * Set up reactive behavior when world position changes
     * @param callback Function to call when world position changes
     * @returns Cleanup function
     */
    onWorldPositionChanged(callback: (newPosition: Vector3, oldPosition: Vector3, source: string) => void): () => void {
        const observer = this.worldPosition.onChange((event) => {
            callback(event.to, event.from, event.source);
        });
        return () => observer.remove();
    }

    /**
     * Set up reactive behavior when rotation changes
     * @param callback Function to call when rotation changes
     * @returns Cleanup function
     */
    onRotationChanged(callback: (newRotation: Vector3, oldRotation: Vector3, source: string) => void): () => void {
        const observer = this.rotation.onChange((event) => {
            callback(event.to, event.from, event.source);
        });
        return () => observer.remove();
    }

    // ============================================================
    // Hierarchy Management
    // ============================================================

    /**
     * Set parent node
     */
    setParent(parent: GameNodeObject | NodeComponent | null): void {
        if (parent instanceof GameNodeObject) {
            this.node.setParent(parent.node);
        } else {
            this.node.setParent(parent);
        }
    }

    /**
     * Add child entity
     */
    addChild(child: GameNodeObject): void {
        child.setParent(this);
    }

    /**
     * Remove child entity
     */
    removeChild(child: GameNodeObject): void {
        if (child.node.getParent() === this.node) {
            child.setParent(null);
        }
    }

    /**
     * Get parent entity (if parent is also a GameNodeObject)
     */
    getParent(): GameNodeObject | null {
        const parentNode = this.node.getParent();
        // FIXED: Access the _gameObject property we established in constructor
        if (parentNode && (parentNode as any)._gameObject instanceof GameNodeObject) {
            return (parentNode as any)._gameObject;
        }
        return null;
    }

    /**
     * Get child entities
     */
    getChildren(): GameNodeObject[] {
        return this.node.getChildren()
            .map(childNode => (childNode as any)._gameObject)
            .filter((obj): obj is GameNodeObject => obj instanceof GameNodeObject);
    }

    // ============================================================
    // Utility Methods
    // ============================================================

    /**
     * Calculate distance to another entity
     */
    distanceTo(other: GameNodeObject): number {
        return Vector3.Distance(this.getWorldPosition(), other.getWorldPosition());
    }

    /**
     * Calculate distance squared (faster for comparisons)
     */
    distanceSquaredTo(other: GameNodeObject): number {
        return Vector3.DistanceSquared(this.getWorldPosition(), other.getWorldPosition());
    }

    /**
     * Check if within range of another entity
     */
    isWithinRange(other: GameNodeObject, range: number): boolean {
        return this.distanceSquaredTo(other) <= (range * range);
    }

    /**
     * Get direction vector to another entity
     */
    getDirectionTo(other: GameNodeObject): Vector3 {
        return other.getWorldPosition().subtract(this.getWorldPosition()).normalize();
    }

    // ============================================================
    // Component Lifecycle
    // ============================================================

    dispose(): void {
        // NodeComponent will handle its own reactive property cleanup
        super.dispose();
    }
}