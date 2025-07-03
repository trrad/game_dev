/**
 * TransformComponent - Manages hierarchical spatial relationships
 * Provides a bridge between our ECS and Babylon.js scene graph
 */

import { Component } from '../core/Component';
import { TransformNode, Vector3, Matrix, Quaternion, Scene } from '@babylonjs/core';
import { Logger, LogCategory } from '../utils/Logger';
import { GameObject } from '../core/GameObject';

/**
 * TransformComponent data interface for serialization
 */
export interface TransformComponentData {
    position?: { x: number, y: number, z: number };
    rotation?: { x: number, y: number, z: number };
    scale?: { x: number, y: number, z: number };
    parentId?: string | null; // For serialization only
}

/**
 * TransformComponent manages hierarchical spatial relationships between entities
 * using Babylon.js TransformNodes as the underlying implementation.
 */
export class TransformComponent extends Component<TransformComponentData> {
    public readonly type = 'transform';
    
    private _node: TransformNode;
    private _children: TransformComponent[] = [];
    private _parent: TransformComponent | null = null;
    private _scene: Scene;
    
    /**
     * Create a new TransformComponent
     * @param scene Babylon.js scene
     * @param parent Optional parent transform component
     */
    constructor(scene: Scene, parent?: TransformComponent) {
        super();
        
        this._scene = scene;
        
        // Create the transform node with a unique name
        const nodeName = `transform_${this.instanceId}`;
        this._node = new TransformNode(nodeName, scene);
        
        Logger.log(LogCategory.SYSTEM, `Created TransformComponent with node ${nodeName}`);
        
        // Set parent if provided
        if (parent) {
            this.setParent(parent);
        }
    }
    
    /**
     * Called when this component is attached to a GameObject
     */
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        
        if (this._gameObject) {
            // Update node name to include GameObject ID for better debugging
            this._node.name = `transform_${this._gameObject.id}`;
            
            Logger.log(LogCategory.SYSTEM, 
                `TransformComponent attached to ${this._gameObject.id}`);
        }
    }
    
    /**
     * Clean up resources when component is disposed
     */
    dispose(): void {
        // Remove from parent if exists
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Remove all children (they'll reparent to null/scene root)
        while (this._children.length > 0) {
            this.removeChild(this._children[0]);
        }
        
        // Dispose Babylon.js node
        if (this._node) {
            this._node.dispose();
        }
        
        Logger.log(LogCategory.SYSTEM, 
            `TransformComponent ${this.instanceId} disposed`);
            
        super.dispose();
    }
    
    /**
     * Serialize this component's state
     */
    serialize(): TransformComponentData {
        return {
            position: {
                x: this._node.position.x,
                y: this._node.position.y,
                z: this._node.position.z
            },
            rotation: {
                x: this._node.rotation.x,
                y: this._node.rotation.y,
                z: this._node.rotation.z
            },
            scale: {
                x: this._node.scaling.x,
                y: this._node.scaling.y,
                z: this._node.scaling.z
            },
            parentId: this._parent ? this._parent.instanceId : null
        };
    }
    
    /**
     * Deserialize this component's state
     * @param data The serialized data
     */
    deserialize(data: TransformComponentData): void {
        if (data.position) {
            this._node.position.set(data.position.x, data.position.y, data.position.z);
        }
        
        if (data.rotation) {
            this._node.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
        
        if (data.scale) {
            this._node.scaling.set(data.scale.x, data.scale.y, data.scale.z);
        }
        
        // Note: Parent relationships must be resolved after all components are loaded
        // This is typically handled by a deserialization manager
    }
    
    /**
     * Set the parent of this transform
     * @param parent The parent transform or null to attach to scene root
     */
    setParent(parent: TransformComponent | null): void {
        // Remove from current parent if exists
        if (this._parent) {
            this._parent.removeChild(this);
        }
        
        // Set new parent
        this._parent = parent;
        
        // Update Babylon.js node parent
        if (parent) {
            this._node.parent = parent.getTransformNode();
            parent._children.push(this);
            
            Logger.log(LogCategory.SYSTEM, 
                `Transform ${this.instanceId} parented to ${parent.instanceId}`);
        } else {
            this._node.parent = null;
            Logger.log(LogCategory.SYSTEM, 
                `Transform ${this.instanceId} unparented`);
        }
    }
    
    /**
     * Add a child transform to this transform
     * @param child The child transform to add
     */
    addChild(child: TransformComponent): void {
        child.setParent(this);
    }
    
    /**
     * Remove a child transform from this transform
     * @param child The child transform to remove
     */
    removeChild(child: TransformComponent): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            child._parent = null;
            child._node.parent = null;
            
            Logger.log(LogCategory.SYSTEM, 
                `Removed child transform ${child.instanceId} from ${this.instanceId}`);
        }
    }
    
    /**
     * Get all child transforms
     */
    getChildren(): TransformComponent[] {
        return [...this._children];
    }
    
    /**
     * Get the parent transform
     */
    getParent(): TransformComponent | null {
        return this._parent;
    }
    
    /**
     * Get the underlying Babylon.js TransformNode
     */
    getTransformNode(): TransformNode {
        return this._node;
    }
    
    /**
     * Set local position (relative to parent)
     */
    setLocalPosition(x: number, y: number, z: number): void {
        this._node.position.set(x, y, z);
    }
    
    /**
     * Set local position from Vector3
     */
    setLocalPositionFromVector(position: Vector3): void {
        this._node.position.copyFrom(position);
    }
    
    /**
     * Get local position
     */
    getLocalPosition(): Vector3 {
        return this._node.position.clone();
    }
    
    /**
     * Set local rotation (Euler angles in radians)
     */
    setLocalRotation(x: number, y: number, z: number): void {
        this._node.rotation.set(x, y, z);
    }
    
    /**
     * Set local rotation from Vector3 (Euler angles in radians)
     */
    setLocalRotationFromVector(rotation: Vector3): void {
        this._node.rotation.copyFrom(rotation);
    }
    
    /**
     * Get local rotation (Euler angles in radians)
     */
    getLocalRotation(): Vector3 {
        return this._node.rotation.clone();
    }
    
    /**
     * Set local scale
     */
    setLocalScale(x: number, y: number, z: number): void {
        this._node.scaling.set(x, y, z);
    }
    
    /**
     * Set uniform local scale (same in all directions)
     */
    setUniformLocalScale(scale: number): void {
        this._node.scaling.setAll(scale);
    }
    
    /**
     * Get local scale
     */
    getLocalScale(): Vector3 {
        return this._node.scaling.clone();
    }
    
    /**
     * Get world position
     */
    getWorldPosition(): Vector3 {
        return this._node.getAbsolutePosition();
    }
    
    /**
     * Set world position (regardless of parent)
     */
    setWorldPosition(x: number, y: number, z: number): void {
        const pos = new Vector3(x, y, z);
        const worldToLocal = this._getWorldToLocalMatrix();
        const localPos = Vector3.TransformCoordinates(pos, worldToLocal);
        this._node.position.copyFrom(localPos);
    }
    
    /**
     * Get world rotation as Quaternion
     */
    getWorldRotationQuaternion(): Quaternion {
        const quat = new Quaternion();
        // Clone the quaternion since Babylon doesn't have a copyTo method
        return this._node.absoluteRotationQuaternion.clone();
    }
    
    /**
     * Get world rotation as Euler angles
     */
    getWorldRotation(): Vector3 {
        const quat = this.getWorldRotationQuaternion();
        return quat.toEulerAngles();
    }
    
    /**
     * Get world matrix
     */
    getWorldMatrix(): Matrix {
        return this._node.getWorldMatrix();
    }
    
    /**
     * Get forward direction in world space
     */
    getWorldForward(): Vector3 {
        const matrix = this._node.getWorldMatrix();
        const forward = new Vector3(0, 0, 1);
        return Vector3.TransformNormal(forward, matrix).normalize();
    }
    
    /**
     * Get up direction in world space
     */
    getWorldUp(): Vector3 {
        const matrix = this._node.getWorldMatrix();
        const up = new Vector3(0, 1, 0);
        return Vector3.TransformNormal(up, matrix).normalize();
    }
    
    /**
     * Get right direction in world space
     */
    getWorldRight(): Vector3 {
        const matrix = this._node.getWorldMatrix();
        const right = new Vector3(1, 0, 0);
        return Vector3.TransformNormal(right, matrix).normalize();
    }
    
    /**
     * Look at a world position
     * @param targetPosition The position to look at
     * @param upVector Optional up vector (not used in basic implementation)
     */
    lookAt(targetPosition: Vector3): void {
        // Correct usage of lookAt with proper parameters
        this._node.lookAt(targetPosition);
    }
    
    /**
     * Translate in local space
     */
    translate(x: number, y: number, z: number): void {
        const offset = new Vector3(x, y, z);
        this._node.position.addInPlace(offset);
    }
    
    /**
     * Rotate in local space (Euler angles in radians)
     */
    rotate(x: number, y: number, z: number): void {
        this._node.rotation.addInPlace(new Vector3(x, y, z));
    }
    
    /**
     * Helper method to get world to local transform matrix
     */
    private _getWorldToLocalMatrix(): Matrix {
        const worldMatrix = this._node.getWorldMatrix();
        const worldToLocal = Matrix.Invert(worldMatrix);
        return worldToLocal;
    }
    
    /**
     * Sync with a PositionComponent (transition helper)
     */
    syncWithPositionComponent(): boolean {
        // This helper is useful during transition period
        if (!this._gameObject) return false;
        
        const posComp = this._gameObject.getComponent('position');
        if (!posComp) return false;
        
        // Use type assertion for access
        const pos = (posComp as any).getPosition();
        const rot = (posComp as any).getRotation();
        
        if (pos && rot) {
            this.setLocalPositionFromVector(pos);
            this.setLocalRotationFromVector(rot);
            return true;
        }
        
        return false;
    }
}
