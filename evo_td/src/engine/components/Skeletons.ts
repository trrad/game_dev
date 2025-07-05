// ============================================================
// SKELETAL EXTENSIONS TO EXISTING NODECOMPONENT
// No breaking changes - just additions
// This is currently a theoretical change, and represents just a rough first pass at the implementation of more advanced bone and animation systems on top of NodeComponent.
// Likely this will be not necessary until we start to get into complex enemy rendering systems.
// Currently re-implements NodeComponent in this file, whereas the real one lives in src/engine/components/NodeComponent.ts.
// ============================================================

import { AbstractMesh, Skeleton, Bone, AnimationGroup, Matrix, Vector3 } from '@babylonjs/core';

// Extend NodeComponent with skeletal support
export interface SkeletalNodeData {
    skeletonId?: string;
    attachedBoneName?: string;
    animationState?: {
        current: string;
        time: number;
        speed: number;
    };
}

// Add these methods to your existing NodeComponent class
export class NodeComponent extends Component<NodeComponentData> {
    // ... existing code ...
    
    // ============================================================
    // SKELETAL RIGGING ADDITIONS
    // ============================================================
    
    private _skeleton?: Skeleton;
    private _attachedBone?: Bone;
    private _animationGroups: Map<string, AnimationGroup> = new Map();
    private _skeletalMesh?: AbstractMesh;
    
    /**
     * Associate this node with a skeletal mesh
     * Usually called when loading a rigged character model
     */
    setSkeletalMesh(mesh: AbstractMesh, skeleton: Skeleton): void {
        this._skeletalMesh = mesh;
        this._skeleton = skeleton;
        
        // Parent our TransformNode to the skeletal mesh
        // This ensures the NodeComponent follows the mesh
        this._node.parent = mesh;
        
        this.emit('skeletal:mesh:attached', {
            meshName: mesh.name,
            boneCount: skeleton.bones.length,
            hasAnimations: skeleton.animationRanges.length > 0
        });
    }
    
    /**
     * Attach this NodeComponent to a specific bone
     * Perfect for weapons, equipment, attachment points
     */
    attachToBone(boneName: string): boolean {
        if (!this._skeleton) {
            console.warn('No skeleton available for bone attachment');
            return false;
        }
        
        const bone = this._skeleton.getBoneByName(boneName);
        if (!bone) {
            console.warn(`Bone '${boneName}' not found in skeleton`);
            return false;
        }
        
        this._attachedBone = bone;
        
        // Use Babylon's attachToBone for the underlying TransformNode
        this._skeletalMesh?.attachToBone(this._node, bone);
        
        this.emit('bone:attached', {
            boneName,
            boneIndex: this._skeleton.bones.indexOf(bone)
        });
        
        return true;
    }
    
    /**
     * Detach from current bone
     */
    detachFromBone(): void {
        if (this._attachedBone && this._skeletalMesh) {
            this._skeletalMesh.detachFromBone(this._node);
            this._attachedBone = undefined;
            
            this.emit('bone:detached', {});
        }
    }
    
    /**
     * Get the bone this node is attached to
     */
    getAttachedBone(): Bone | undefined {
        return this._attachedBone;
    }
    
    /**
     * Get bone by name from this node's skeleton
     */
    getBone(boneName: string): Bone | undefined {
        return this._skeleton?.getBoneByName(boneName);
    }
    
    /**
     * Get all bones in this skeleton
     */
    getAllBones(): Bone[] {
        return this._skeleton?.bones || [];
    }
    
    /**
     * Register animation groups for this skeletal mesh
     */
    registerAnimationGroups(animationGroups: AnimationGroup[]): void {
        this._animationGroups.clear();
        
        animationGroups.forEach(group => {
            this._animationGroups.set(group.name, group);
        });
        
        this.emit('skeletal:animations:registered', {
            animationNames: Array.from(this._animationGroups.keys())
        });
    }
    
    /**
     * Play a skeletal animation by name
     */
    playAnimation(animationName: string, loop: boolean = true, speed: number = 1.0): boolean {
        const animGroup = this._animationGroups.get(animationName);
        if (!animGroup) {
            console.warn(`Animation '${animationName}' not found`);
            return false;
        }
        
        // Stop all other animations first
        this._animationGroups.forEach(group => group.stop());
        
        // Play the requested animation
        animGroup.speedRatio = speed;
        animGroup.play(loop);
        
        this.emit('skeletal:animation:started', {
            animationName,
            loop,
            speed,
            duration: animGroup.to - animGroup.from
        });
        
        return true;
    }
    
    /**
     * Stop current animation
     */
    stopAnimation(): void {
        this._animationGroups.forEach(group => group.stop());
        this.emit('skeletal:animation:stopped', {});
    }
    
    /**
     * Get bone world position (useful for attachment points)
     */
    getBoneWorldPosition(boneName: string): Vector3 | null {
        const bone = this.getBone(boneName);
        if (!bone || !this._skeletalMesh) return null;
        
        const matrix = bone.getWorldMatrix();
        return Vector3.TransformCoordinates(Vector3.Zero(), matrix);
    }
    
    /**
     * Get bone world matrix (for advanced attachment calculations)
     */
    getBoneWorldMatrix(boneName: string): Matrix | null {
        const bone = this.getBone(boneName);
        return bone ? bone.getWorldMatrix() : null;
    }
    
    /**
     * Check if this node has skeletal capabilities
     */
    hasSkeletalMesh(): boolean {
        return !!this._skeleton && !!this._skeletalMesh;
    }
    
    /**
     * Get available animation names
     */
    getAnimationNames(): string[] {
        return Array.from(this._animationGroups.keys());
    }
    
    /**
     * Serialize skeletal data (extends existing serialize)
     */
    serializeSkeletal(): SkeletalNodeData {
        const data: SkeletalNodeData = {};
        
        if (this._skeleton) {
            data.skeletonId = this._skeleton.id;
        }
        
        if (this._attachedBone) {
            data.attachedBoneName = this._attachedBone.name;
        }
        
        // Find currently playing animation
        for (const [name, group] of this._animationGroups) {
            if (group.isPlaying) {
                data.animationState = {
                    current: name,
                    time: group.animatables[0]?.masterFrame || 0,
                    speed: group.speedRatio
                };
                break;
            }
        }
        
        return data;
    }
    
    /**
     * Deserialize skeletal data
     */
    deserializeSkeletal(data: SkeletalNodeData): void {
        // Note: Skeleton and bone restoration needs to happen after
        // the skeletal mesh is loaded and skeleton is available
        
        if (data.attachedBoneName) {
            // This will need to be called after skeleton is loaded
            this.attachToBone(data.attachedBoneName);
        }
        
        if (data.animationState) {
            this.playAnimation(
                data.animationState.current,
                true,
                data.animationState.speed
            );
            // TODO: Seek to correct time
        }
    }
}

// ============================================================
// SPECIALIZED SKELETAL COMPONENTS
// ============================================================

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
            
            // Connect to NodeComponent
            const nodeComp = this._gameObject?.getComponent<NodeComponent>('node');
            if (nodeComp) {
                nodeComp.setSkeletalMesh(this._mesh, this._skeleton);
                nodeComp.registerAnimationGroups(result.animationGroups);
            }
            
            this._loaded = true;
            
            this._gameObject?.node.emit('skeletal:mesh:loaded', {
                meshUrl: this._meshUrl,
                vertexCount: this._mesh.getTotalVertices(),
                boneCount: this._skeleton.bones.length,
                animationCount: result.animationGroups.length
            });
            
        } catch (error) {
            console.error('Failed to load skeletal mesh:', error);
            this._gameObject?.node.emit('skeletal:mesh:load_failed', {
                meshUrl: this._meshUrl,
                error: error.message
            });
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
        
        // Listen for when a skeletal target is available
        this._gameObject?.node.addEventListener('skeletal:target:found', (event) => {
            this.attemptAttachment(event.payload.nodeComponent);
        });
    }
    
    private attemptAttachment(targetNode: NodeComponent): void {
        if (targetNode.hasSkeletalMesh()) {
            const success = this._gameObject?.node.attachToBone(this._targetBoneName);
            if (success) {
                // Apply offset if needed
                if (!this._offset.equals(Vector3.Zero())) {
                    const node = this._gameObject?.node.getTransformNode();
                    if (node) {
                        node.position.addInPlace(this._offset);
                    }
                }
                
                this._isAttached = true;
                this._gameObject?.node.emit('attachment:successful', {
                    boneName: this._targetBoneName,
                    offset: this._offset
                });
            }
        }
    }
    
    getBoneName(): string {
        return this._targetBoneName;
    }
    
    isAttached(): boolean {
        return this._isAttached;
    }
}

// ============================================================
// USAGE EXAMPLES
// ============================================================

/*
// Example 1: Character with skeletal mesh
class Character extends GameNodeObject {
    constructor(modelUrl: string, parentNode?: NodeComponent) {
        super('character', scene, parentNode);
        
        // Add skeletal mesh component
        const skeletalMesh = new SkeletalMeshComponent(modelUrl);
        this.addComponent(skeletalMesh);
        
        // Load the mesh
        skeletalMesh.loadMesh(scene);
        
        // Listen for when mesh is loaded
        this.node.addEventListener('skeletal:mesh:loaded', (event) => {
            // Now we can play animations
            this.node.playAnimation('idle', true);
        });
    }
    
    equipWeapon(weapon: Weapon): void {
        // Weapon will attach to the hand bone
        weapon.node.emit('skeletal:target:found', {
            nodeComponent: this.node
        });
    }
}

// Example 2: Weapon that attaches to bones
class Weapon extends GameNodeObject {
    constructor(weaponMesh: string, parentNode?: NodeComponent) {
        super('weapon', scene, parentNode);
        
        // Add attachment component for right hand
        const attachment = new BoneAttachmentComponent(
            'hand_R', 
            new Vector3(0, 0.1, 0) // Small offset
        );
        this.addComponent(attachment);
        
        // Add render component for the weapon mesh
        // ... weapon mesh loading code
    }
}

// Example 3: Usage in game
const character = new Character('models/character.glb');
const sword = new Weapon('models/sword.glb');

// When character is ready, equip the sword
character.node.addEventListener('skeletal:mesh:loaded', () => {
    character.equipWeapon(sword);
});
*/