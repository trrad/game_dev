// src/engine/components/Skeletons.ts - Minimal Fix for Compilation
// NOTE: This is a rough draft and not currently in use

import { Component } from './Component';
import { GameObject } from '../core/GameObject';
import { AbstractMesh, Skeleton, Bone, AnimationGroup, Matrix, Vector3, Scene } from '@babylonjs/core';
import * as BABYLON from '@babylonjs/core';

// Extend existing NodeComponentData interface
export interface SkeletalNodeData {
    skeletonId?: string;
    attachedBoneName?: string;
    animationState?: {
        current: string;
        time: number;
        speed: number;
    };
}

// MINIMAL FIX: Simplified skeletal extensions (not fully functional)
// This is just to stop compilation errors for the draft code

/**
 * Component for entities that have skeletal meshes
 * Manages the relationship between GameNodeObject and Babylon skeleton
 */
export class SkeletalMeshComponent extends Component<any> {
    public readonly type = 'SkeletalMesh';
    
    private _meshUrl: string;
    private _skeleton?: Skeleton;
    private _mesh?: AbstractMesh;
    private _loaded = false;
    
    constructor(meshUrl: string) {
        super();
        this._meshUrl = meshUrl;
    }
    
    async loadMesh(scene: Scene): Promise<void> {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                "", 
                this._meshUrl, 
                scene
            );
            
            this._mesh = result.meshes[0] as AbstractMesh;
            this._skeleton = result.skeletons[0];
            
            // SIMPLIFIED: Basic connection without complex node integration
            this._loaded = true;
            
            console.log('Skeletal mesh loaded:', {
                meshUrl: this._meshUrl,
                vertexCount: this._mesh.getTotalVertices(),
                boneCount: this._skeleton?.bones.length || 0,
                animationCount: result.animationGroups.length
            });
            
        } catch (error) {
            console.error('Failed to load skeletal mesh:', error);
        }
    }
    
    getMesh(): AbstractMesh | undefined {
        return this._mesh;
    }
    
    getSkeleton(): Skeleton | undefined {
        return this._skeleton;
    }
    
    isLoaded(): boolean {
        return this._loaded;
    }

    serialize(): any {
        return {
            meshUrl: this._meshUrl,
            loaded: this._loaded
        };
    }

    deserialize(data: any): void {
        this._meshUrl = data.meshUrl || '';
        this._loaded = data.loaded || false;
    }
}

/**
 * Component for objects that attach to bones (weapons, equipment)
 */
export class BoneAttachmentComponent extends Component<any> {
    public readonly type = 'BoneAttachment';
    
    private _targetBoneName: string;
    private _offset: Vector3;
    private _isAttached = false;
    
    constructor(boneName: string, offset: Vector3 = Vector3.Zero()) {
        super();
        this._targetBoneName = boneName;
        this._offset = offset.clone();
    }
    
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        
        // SIMPLIFIED: Basic attachment without complex event system
        console.log(`Bone attachment component attached to ${gameObject.id}`);
    }
    
    getBoneName(): string {
        return this._targetBoneName;
    }
    
    isAttached(): boolean {
        return this._isAttached;
    }

    serialize(): any {
        return {
            targetBoneName: this._targetBoneName,
            offset: { x: this._offset.x, y: this._offset.y, z: this._offset.z },
            isAttached: this._isAttached
        };
    }

    deserialize(data: any): void {
        this._targetBoneName = data.targetBoneName || '';
        if (data.offset) {
            this._offset = new Vector3(data.offset.x, data.offset.y, data.offset.z);
        }
        this._isAttached = data.isAttached || false;
    }
}

// Helper functions for bone operations (simplified)
export class SkeletonUtils {
    static getBoneByName(skeleton: Skeleton, boneName: string): Bone | null {
        return skeleton.bones.find(bone => bone.name === boneName) || null;
    }

    static getAnimationRanges(skeleton: Skeleton): any[] {
        // FIXED: Use correct Babylon.js API
        return skeleton.getAnimationRanges() || [];
    }

    static getBoneWorldPosition(bone: Bone, mesh: AbstractMesh): Vector3 {
        const matrix = bone.getWorldMatrix();
        // Use mesh parameter for potential future mesh-relative calculations
        if (mesh && false) { // Future enhancement placeholder
            // Could use mesh.getWorldMatrix() for relative positioning
        }
        return Vector3.TransformCoordinates(Vector3.Zero(), matrix);
    }

    static getBoneWorldMatrix(bone: Bone): Matrix {
        return bone.getWorldMatrix();
    }
}

// Usage examples and documentation
export const SKELETAL_SYSTEM_NOTES = `
SKELETAL SYSTEM - DRAFT IMPLEMENTATION NOTES

This is a rough draft of skeletal animation support for the engine.
Current status: NOT IN ACTIVE USE

Planned features:
- Skeletal mesh loading and management
- Bone attachment for equipment/weapons
- Animation playback and control
- Hierarchical bone transformations

TODO when this system is needed:
1. Integrate with NodeComponent reactive properties
2. Add proper event system integration
3. Implement animation state management
4. Add bone attachment validation
5. Performance optimizations for bone updates

For now, this file just prevents compilation errors.
`;