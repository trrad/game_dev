// src/engine/components/NodeComponent.ts - Fixed reactive property sync

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
 * ✅ FIXED: Reactive property → TransformNode sync
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
        
        // ✅ FIXED: Set up reactive sync with proper Vector3 conversion
        this.position.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode position`, event.to);
            
            // ✅ FIX: Ensure we have a proper Vector3 object
            let newPosition: Vector3;
            if (event.to instanceof Vector3) {
                newPosition = event.to;
            } else if (event.to && typeof event.to === 'object' && 'x' in event.to && 'y' in event.to && 'z' in event.to) {
                // Convert plain object to Vector3
                newPosition = new Vector3(event.to.x, event.to.y, event.to.z);
            } else {
                console.error('Invalid position value:', event.to);
                return;
            }
            
            this._node.position.copyFrom(newPosition);
            this._updateWorldTransforms();
            
            console.log(`✅ NodeComponent: TransformNode updated to`, this._node.position);
        });
        
        this.rotation.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode rotation`, event.to);
            
            let newRotation: Vector3;
            if (event.to instanceof Vector3) {
                newRotation = event.to;
            } else if (event.to && typeof event.to === 'object' && 'x' in event.to && 'y' in event.to && 'z' in event.to) {
                newRotation = new Vector3(event.to.x, event.to.y, event.to.z);
            } else {
                console.error('Invalid rotation value:', event.to);
                return;
            }
            
            this._node.rotation.copyFrom(newRotation);
            this._updateWorldTransforms();
        });
        
        this.scale.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode scale`, event.to);
            
            let newScale: Vector3;
            if (event.to instanceof Vector3) {
                newScale = event.to;
            } else if (event.to && typeof event.to === 'object' && 'x' in event.to && 'y' in event.to && 'z' in event.to) {
                newScale = new Vector3(event.to.x, event.to.y, event.to.z);
            } else {
                console.error('Invalid scale value:', event.to);
                return;
            }
            
            this._node.scaling.copyFrom(newScale);
            this._updateWorldTransforms();
        });
        
        // Set parent if provided
        if (parent) {
            this.setParent(parent);
        }
        
        console.log(`🎯 NodeComponent created: ${nodeName}`);
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
     * ✅ ENHANCED: Update world transform reactive properties with debugging
     */
    private _updateWorldTransforms(): void {
        try {
            // Update world position
            const worldPos = this._node.getAbsolutePosition();
            this.worldPosition.set(worldPos.clone(), 'transform_update');
            
            // Update world rotation
            const worldQuat = this._node.absoluteRotationQuaternion;
            const worldRot = worldQuat.toEulerAngles();
            this.worldRotation.set(worldRot, 'transform_update');
            
            console.log(`🌍 NodeComponent: World transforms updated - pos: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
        } catch (error) {
            console.error('Error updating world transforms:', error);
        }
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
            console.log(`🔗 NodeComponent: Set parent to ${parent.getTransformNode().name}`);
        } else {
            this._node.parent = null;
            console.log(`🔗 NodeComponent: Removed parent`);
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