// src/engine/components/NodeComponent.ts - Minimal TypeScript Fixes

import { Component } from './Component';
import { TransformNode, Vector3, Scene } from '@babylonjs/core';
import { VectorProperty } from './ReactivePropertyComponent';

export interface NodeComponentData {
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    scale: { x: number, y: number, z: number };
    parentId?: string | null;
}

/**
 * NodeComponent with ReactiveProperty integration
 * ✅ MINIMAL FIX: Only fix TypeScript errors, no other changes
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
        
        // ✅ MINIMAL FIX: Type assertion for Vector3 values
        this.position.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode position`, event.to);
            
            // ✅ FIX: Type assertion to ensure Vector3
            const newPosition = event.to as Vector3;
            if (newPosition && typeof newPosition === 'object' && 'x' in newPosition) {
                // Ensure we have a proper Vector3 object
                const vec3 = newPosition instanceof Vector3 ? 
                    newPosition : 
                    new Vector3(newPosition.x, newPosition.y, newPosition.z);
                
                this._node.position.copyFrom(vec3);
                this._updateWorldTransforms();
                console.log(`✅ NodeComponent: TransformNode updated to`, this._node.position);
            } else {
                console.error('Invalid position value:', event.to);
            }
        });
        
        this.rotation.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode rotation`, event.to);
            
            // ✅ FIX: Type assertion to ensure Vector3
            const newRotation = event.to as Vector3;
            if (newRotation && typeof newRotation === 'object' && 'x' in newRotation) {
                const vec3 = newRotation instanceof Vector3 ? 
                    newRotation : 
                    new Vector3(newRotation.x, newRotation.y, newRotation.z);
                
                this._node.rotation.copyFrom(vec3);
                this._updateWorldTransforms();
            } else {
                console.error('Invalid rotation value:', event.to);
            }
        });
        
        this.scale.onChange((event) => {
            console.log(`🔧 NodeComponent: Updating TransformNode scale`, event.to);
            
            // ✅ FIX: Type assertion to ensure Vector3
            const newScale = event.to as Vector3;
            if (newScale && typeof newScale === 'object' && 'x' in newScale) {
                const vec3 = newScale instanceof Vector3 ? 
                    newScale : 
                    new Vector3(newScale.x, newScale.y, newScale.z);
                
                this._node.scaling.copyFrom(vec3);
                this._updateWorldTransforms();
            } else {
                console.error('Invalid scale value:', event.to);
            }
        });
        
        // Set parent if provided
        if (parent) {
            this.setParent(parent);
        }
        
        console.log(`🎯 NodeComponent created: ${nodeName}`);
    }
    
    // ============================================================
    // Transform API - All other methods remain exactly the same
    // ============================================================
    
    setLocalPosition(x: number, y: number, z: number): void {
        this.position.set(new Vector3(x, y, z), 'setLocalPosition');
    }
    
    setLocalPositionFromVector(position: Vector3): void {
        this.position.set(position.clone(), 'setLocalPositionFromVector');
    }
    
    getLocalPosition(): Vector3 {
        return this.position.getValue().clone();
    }
    
    setLocalRotation(x: number, y: number, z: number): void {
        this.rotation.set(new Vector3(x, y, z), 'setLocalRotation');
    }
    
    setLocalRotationFromVector(rotation: Vector3): void {
        this.rotation.set(rotation.clone(), 'setLocalRotationFromVector');
    }
    
    getLocalRotation(): Vector3 {
        return this.rotation.getValue().clone();
    }
    
    setLocalScale(x: number, y: number, z: number): void {
        this.scale.set(new Vector3(x, y, z), 'setLocalScale');
    }
    
    setUniformLocalScale(scale: number): void {
        this.scale.set(new Vector3(scale, scale, scale), 'setUniformLocalScale');
    }
    
    getLocalScale(): Vector3 {
        return this.scale.getValue().clone();
    }
    
    getWorldPosition(): Vector3 {
        return this.worldPosition.getValue().clone();
    }
    
    getWorldRotation(): Vector3 {
        return this.worldRotation.getValue().clone();
    }
    
    /**
     * ✅ UNCHANGED: Update world transform reactive properties
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
    // All other methods remain exactly the same
    // ============================================================
    
    setParent(parent: NodeComponent | null): void {
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        this._parent = parent;
        
        if (parent) {
            this._node.parent = parent.getTransformNode();
            parent._children.push(this);
            console.log(`🔗 NodeComponent: Set parent to ${parent.getTransformNode().name}`);
        } else {
            this._node.parent = null;
            console.log(`🔗 NodeComponent: Removed parent`);
        }
        
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
    
    getTransformNode(): TransformNode {
        return this._node;
    }
    
    // ============================================================
    // Movement Utilities Using VectorProperty APIs
    // ============================================================
    
    translate(x: number, y: number, z: number): void {
        this.position.translate(x, y, z, 'translate');
    }
    
    translateByVector(offset: Vector3): void {
        this.position.translateByVector(offset, 'translateByVector');
    }
    
    rotate(x: number, y: number, z: number): void {
        const current = this.rotation.getValue();
        const offset = new Vector3(x, y, z);
        this.rotation.set(current.add(offset), 'rotate');
    }
    
    scaleUniform(factor: number): void {
        this.scale.scale(factor, 'scaleUniform');
    }
    
    scaleByVector(scaleVector: Vector3): void {
        this.scale.scaleByVector(scaleVector, 'scaleByVector');
    }
    
    lookAt(targetPosition: Vector3): void {
        const currentPos = this.getWorldPosition();
        const direction = targetPosition.subtract(currentPos).normalize();
        
        const lookRotation = this._directionToEuler(direction);
        this.rotation.set(lookRotation, 'lookAt');
    }
    
    private _directionToEuler(direction: Vector3): Vector3 {
        const yaw = Math.atan2(direction.x, direction.z);
        const pitch = Math.asin(-direction.y);
        return new Vector3(pitch, yaw, 0);
    }
    
    // ============================================================
    // Component Lifecycle - unchanged
    // ============================================================
    
    dispose(): void {
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        while (this._children.length > 0) {
            this.removeChild(this._children[0]);
        }
        
        this.position.dispose();
        this.rotation.dispose();
        this.scale.dispose();
        this.worldPosition.dispose();
        this.worldRotation.dispose();
        
        if (this._node) {
            this._node.dispose();
        }
        
        super.dispose();
    }
    
    // ============================================================
    // Serialization - unchanged
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