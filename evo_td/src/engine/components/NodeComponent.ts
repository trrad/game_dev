// src/engine/components/NodeComponent.ts - Clean Reactive Version

import { Component } from './Component';
import { TransformNode, Vector3, Matrix, Quaternion, Scene } from '@babylonjs/core';
import { VectorProperty } from './ReactivePropertyComponent';

export interface NodeComponentData {
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    scale: { x: number, y: number, z: number };
    parentId?: string | null;
}

/**
 * NodeComponent with ReactiveProperty integration
 * Provides reactive transform properties that other systems can observe
 * 
 * No events, no complex propagation - just clean reactive transforms
 */
export class NodeComponent extends Component<NodeComponentData> {
    public readonly type = 'Node';
    
    private _node: TransformNode;
    private _children: NodeComponent[] = [];
    private _parent: NodeComponent | null = null;
    private _scene: Scene;
    
    // Reactive Properties for transform data using VectorProperty
    public readonly position: VectorProperty;
    public readonly rotation: VectorProperty;
    public readonly scale: VectorProperty;
    
    // World space reactive properties (computed)
    public readonly worldPosition: VectorProperty;
    public readonly worldRotation: VectorProperty;
    
    constructor(scene: Scene, parent?: NodeComponent) {
        super();
        
        this._scene = scene;
        
        // Create the transform node
        const nodeName = `node_${this.instanceId}`;
        this._node = new TransformNode(nodeName, scene);
        
        // Initialize reactive properties using direct constructors
        this.position = new VectorProperty('position', Vector3.Zero());
        this.rotation = new VectorProperty('rotation', Vector3.Zero());
        this.scale = new VectorProperty('scale', Vector3.One());
        this.worldPosition = new VectorProperty('worldPosition', Vector3.Zero());
        this.worldRotation = new VectorProperty('worldRotation', Vector3.Zero());
        
        // Set up reactive sync: VectorProperty -> Babylon.js TransformNode
        this.position.onChange((event) => {
            this._node.position.copyFrom(event.to);
            this._updateWorldTransforms();
        });
        
        this.rotation.onChange((event) => {
            this._node.rotation.copyFrom(event.to);
            this._updateWorldTransforms();
        });
        
        this.scale.onChange((event) => {
            this._node.scaling.copyFrom(event.to);
            this._updateWorldTransforms();
        });
        
        // Set parent if provided
        if (parent) {
            this.setParent(parent);
        }
    }
    
    // ============================================================
    // Transform API - Now operates through VectorProperty
    // ============================================================
    
    /**
     * Set local position (triggers reactive updates)
     */
    setLocalPosition(x: number, y: number, z: number): void {
        this.position.set(new Vector3(x, y, z), 'setLocalPosition');
    }
    
    setLocalPositionFromVector(position: Vector3): void {
        this.position.set(position.clone(), 'setLocalPositionFromVector');
    }
    
    getLocalPosition(): Vector3 {
        return this.position.getValue().clone();
    }
    
    /**
     * Set local rotation (triggers reactive updates)
     */
    setLocalRotation(x: number, y: number, z: number): void {
        this.rotation.set(new Vector3(x, y, z), 'setLocalRotation');
    }
    
    setLocalRotationFromVector(rotation: Vector3): void {
        this.rotation.set(rotation.clone(), 'setLocalRotationFromVector');
    }
    
    getLocalRotation(): Vector3 {
        return this.rotation.getValue().clone();
    }
    
    /**
     * Set local scale (triggers reactive updates)
     */
    setLocalScale(x: number, y: number, z: number): void {
        this.scale.set(new Vector3(x, y, z), 'setLocalScale');
    }
    
    setUniformLocalScale(scale: number): void {
        this.scale.set(new Vector3(scale, scale, scale), 'setUniformLocalScale');
    }
    
    getLocalScale(): Vector3 {
        return this.scale.getValue().clone();
    }
    
    /**
     * Get world position (from reactive property)
     */
    getWorldPosition(): Vector3 {
        return this.worldPosition.getValue().clone();
    }
    
    /**
     * Get world rotation (from reactive property) 
     */
    getWorldRotation(): Vector3 {
        return this.worldRotation.getValue().clone();
    }
    
    /**
     * Update world transform reactive properties
     */
    private _updateWorldTransforms(): void {
        // Update world position
        const worldPos = this._node.getAbsolutePosition();
        this.worldPosition.set(worldPos.clone(), 'transform_update');
        
        // Update world rotation
        const worldQuat = this._node.absoluteRotationQuaternion;
        const worldRot = worldQuat.toEulerAngles();
        this.worldRotation.set(worldRot, 'transform_update');
    }
    
    // ============================================================
    // Hierarchy Management (Clean - no events)
    // ============================================================
    
    setParent(parent: NodeComponent | null): void {
        // Remove from current parent
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Set new parent
        this._parent = parent;
        
        if (parent) {
            this._node.parent = parent.getTransformNode();
            parent._children.push(this);
        } else {
            this._node.parent = null;
        }
        
        // Update world transforms due to hierarchy change
        this._updateWorldTransforms();
    }
    
    addChild(child: NodeComponent): void {
        child.setParent(this);
    }
    
    removeChild(child: NodeComponent): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            child._parent = null;
            child._node.parent = null;
            child._updateWorldTransforms();
        }
    }
    
    getChildren(): NodeComponent[] {
        return [...this._children];
    }
    
    getParent(): NodeComponent | null {
        return this._parent;
    }
    
    /**
     * Get the underlying Babylon.js TransformNode
     */
    getTransformNode(): TransformNode {
        return this._node;
    }
    
    // ============================================================
    // Movement Utilities Using VectorProperty APIs
    // ============================================================
    
    /**
     * Translate in local space using VectorProperty API
     */
    translate(x: number, y: number, z: number): void {
        this.position.translate(x, y, z, 'translate');
    }
    
    translateByVector(offset: Vector3): void {
        this.position.translateByVector(offset, 'translateByVector');
    }
    
    /**
     * Rotate in local space
     */
    rotate(x: number, y: number, z: number): void {
        const current = this.rotation.getValue();
        const offset = new Vector3(x, y, z);
        this.rotation.set(current.add(offset), 'rotate');
    }
    
    /**
     * Scale using VectorProperty API
     */
    scaleUniform(factor: number): void {
        this.scale.scale(factor, 'scaleUniform');
    }
    
    scaleByVector(scaleVector: Vector3): void {
        this.scale.scaleByVector(scaleVector, 'scaleByVector');
    }
    
    /**
     * Look at a target position
     */
    lookAt(targetPosition: Vector3): void {
        // Calculate look-at rotation
        const currentPos = this.getWorldPosition();
        const direction = targetPosition.subtract(currentPos).normalize();
        
        // Convert direction to Euler angles
        const lookRotation = this._directionToEuler(direction);
        this.rotation.set(lookRotation, 'lookAt');
    }
    
    private _directionToEuler(direction: Vector3): Vector3 {
        // Simple look-at calculation (can be enhanced)
        const yaw = Math.atan2(direction.x, direction.z);
        const pitch = Math.asin(-direction.y);
        return new Vector3(pitch, yaw, 0);
    }
    
    // ============================================================
    // Component Lifecycle
    // ============================================================
    
    dispose(): void {
        // Remove from parent
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Remove all children
        while (this._children.length > 0) {
            this.removeChild(this._children[0]);
        }
        
        // Dispose reactive properties
        this.position.dispose();
        this.rotation.dispose();
        this.scale.dispose();
        this.worldPosition.dispose();
        this.worldRotation.dispose();
        
        // Dispose Babylon.js node
        if (this._node) {
            this._node.dispose();
        }
        
        super.dispose();
    }
    
    // ============================================================
    // Serialization
    // ============================================================
    
    serialize(): NodeComponentData {
        const pos = this.position.getValue();
        const rot = this.rotation.getValue();
        const scale = this.scale.getValue();
        
        return {
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: rot.x, y: rot.y, z: rot.z },
            scale: { x: scale.x, y: scale.y, z: scale.z },
            parentId: this._parent ? this._parent.instanceId : null
        };
    }
    
    deserialize(data: NodeComponentData): void {
        if (data.position) {
            this.position.set(
                new Vector3(data.position.x, data.position.y, data.position.z),
                'deserialize'
            );
        }
        
        if (data.rotation) {
            this.rotation.set(
                new Vector3(data.rotation.x, data.rotation.y, data.rotation.z),
                'deserialize'
            );
        }
        
        if (data.scale) {
            this.scale.set(
                new Vector3(data.scale.x, data.scale.y, data.scale.z),
                'deserialize'
            );
        }
    }
}