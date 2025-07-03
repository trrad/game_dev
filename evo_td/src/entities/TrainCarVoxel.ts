/**
 * TrainCarVoxel - Individual voxel GameObject for train car construction
 * Each voxel represents a discrete unit with position, health, and cargo properties
 */

import { Mesh, Scene } from "@babylonjs/core";
import { GameObject } from '../engine/core/GameObject';
import { PositionComponent } from '../components/PositionComponent';
import { HealthComponent } from '../components/HealthComponent';
import { SceneNodeComponent } from '../engine/scene/SceneNodeComponent';
import { RadiusComponent, createCollisionRadius } from '../components/RadiusComponent';
import { CargoCapacityType, VoxelMaterial, VoxelFace } from '../components/TrainCarVoxelComponent';
import { VoxelRenderComponent } from '../renderers/VoxelRenderComponent';
import { Logger, LogCategory } from '../engine/utils/Logger';

/**
 * Individual voxel unit that makes up train cars
 * Each voxel is a full GameObject with ECS components
 */
export class TrainCarVoxel extends GameObject {
    // Grid position within the train car
    public readonly gridPosition: { x: number; y: number; z: number };
    
    // Voxel properties
    public cargoType: CargoCapacityType;
    public material: VoxelMaterial;
    public capacity: number;           // Storage capacity for this cargo type
    public weight: number;            // Affects train performance
    public isExternal: boolean;       // Whether this voxel is on the external surface
    public availableFaces: VoxelFace[]; // Which faces can have attachments
    public connectedVoxels: string[]; // IDs of voxels connected to this one
    
    // Visual representation
    public mesh?: Mesh;               // Babylon.js mesh for rendering

    constructor(
        id: string,
        gridPosition: { x: number; y: number; z: number },
        worldPosition: { x: number; y: number; z: number },
        cargoType: CargoCapacityType = CargoCapacityType.STANDARD,
        material: VoxelMaterial = VoxelMaterial.STEEL,
        capacity: number = 100,
        maxHealth: number = 100,
        eventStack?: any,  // EventStack for GameObject
        scene?: Scene,     // Scene for rendering (passed to GameObject)
        parentSceneNode?: SceneNodeComponent  // Parent scene node for hierarchy
    ) {
        super('trainCarVoxel', eventStack, scene);
        
        // Override the ID to use the provided ID instead of auto-generated one
        (this as any).id = id;
        
        this.gridPosition = { ...gridPosition };
        this.cargoType = cargoType;
        this.material = material;
        this.capacity = capacity;
        this.weight = this.calculateVoxelWeight(material);
        this.isExternal = false; // Will be set by parent TrainCar
        this.availableFaces = []; // Will be set by parent TrainCar
        this.connectedVoxels = [];

        // Add required ECS components
        const positionComponent = new PositionComponent();
        positionComponent.setPosition({ x: worldPosition.x, y: worldPosition.y, z: worldPosition.z });
        this.addComponent(positionComponent);
        this.addComponent(new HealthComponent(maxHealth));

        // Add scene graph component for hierarchical positioning
        if (this.scene) {
            const sceneNode = new SceneNodeComponent(this.scene, parentSceneNode);
            sceneNode.setLocalPosition(worldPosition.x, worldPosition.y, worldPosition.z);
            this.addComponent(sceneNode);
            
            // Add collision radius for voxel interactions
            const collisionRadius = createCollisionRadius(0.5); // Half-unit radius for voxel
            this.addComponent(collisionRadius);
            
            // Set up voxel event listeners for damage and interaction
            sceneNode.addEventListener('damage:voxel', (event) => {
                this.takeDamage(event.payload.amount || 0);
                
                // Report damage to parent car
                sceneNode.emitToParent('voxel:damaged', {
                    voxelId: this.id,
                    gridPosition: this.gridPosition,
                    damage: event.payload.amount,
                    remainingHealth: this.getCurrentHealth()
                });
            });
            
            // Listen for repair events from parent
            sceneNode.addEventListener('repair:request', (event) => {
                if (event.payload.priority === 'high' && this.getCurrentHealth() < this.getMaxHealth() * 0.5) {
                    this.heal(25); // Emergency repair
                    Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} received emergency repair`);
                }
            });
        }

        // Add render component if scene is available (Entity-Level Registration pattern)
        if (this.scene) {
            const voxelRenderComponent = new VoxelRenderComponent(this.scene, { 
                size: 0.4  // Standard voxel size
            });
            this.addComponent(voxelRenderComponent);
            
            Logger.log(LogCategory.RENDERING, `Added VoxelRenderComponent to voxel ${id}`);
        }

        Logger.log(LogCategory.SYSTEM, `Created TrainCarVoxel ${id} at grid(${gridPosition.x},${gridPosition.y},${gridPosition.z}) world(${worldPosition.x},${worldPosition.y},${worldPosition.z})`);
    }

    /**
     * Calculate voxel weight based on material
     */
    private calculateVoxelWeight(material: VoxelMaterial): number {
        switch (material) {
            case VoxelMaterial.ALUMINUM: return 50;
            case VoxelMaterial.STEEL: return 100;
            case VoxelMaterial.REINFORCED: return 150;
            case VoxelMaterial.COMPOSITE: return 75;
            default: return 100;
        }
    }

    /**
     * Update voxel material and recalculate weight
     */
    setMaterial(material: VoxelMaterial): void {
        this.material = material;
        this.weight = this.calculateVoxelWeight(material);
        
        Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} material changed to ${material}, weight: ${this.weight}`);
    }

    /**
     * Update cargo type and capacity
     */
    setCargoType(cargoType: CargoCapacityType, capacity?: number): void {
        this.cargoType = cargoType;
        if (capacity !== undefined) {
            this.capacity = capacity;
        }
        
        Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} cargo type changed to ${cargoType}, capacity: ${this.capacity}`);
    }

    /**
     * Set external status and available faces
     */
    setExternalStatus(isExternal: boolean, availableFaces: VoxelFace[]): void {
        this.isExternal = isExternal;
        this.availableFaces = [...availableFaces];
        
        Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} external status: ${isExternal}, faces: [${availableFaces.join(', ')}]`);
    }

    /**
     * Add connection to another voxel
     */
    addConnection(voxelId: string): void {
        if (!this.connectedVoxels.includes(voxelId)) {
            this.connectedVoxels.push(voxelId);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} connected to ${voxelId}`);
        }
    }

    /**
     * Remove connection to another voxel
     */
    removeConnection(voxelId: string): void {
        const index = this.connectedVoxels.indexOf(voxelId);
        if (index !== -1) {
            this.connectedVoxels.splice(index, 1);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} disconnected from ${voxelId}`);
        }
    }

    /**
     * Get world position from PositionComponent
     */
    getWorldPosition(): { x: number; y: number; z: number } {
        const pos = this.getComponent<PositionComponent>('position');
        if (pos) {
            const position = pos.getPosition();
            return { x: position.x, y: position.y, z: position.z };
        }
        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Update world position via PositionComponent
     */
    setWorldPosition(x: number, y: number, z: number): void {
        const pos = this.getComponent<PositionComponent>('position');
        if (pos) {
            pos.setPosition({ x, y, z });
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} world position updated to (${x},${y},${z})`);
        }
    }

    /**
     * Get current health from HealthComponent
     */
    getCurrentHealth(): number {
        const health = this.getComponent<HealthComponent>('health');
        return health ? health.getHealth() : 0;
    }

    /**
     * Get max health from HealthComponent
     */
    getMaxHealth(): number {
        const health = this.getComponent<HealthComponent>('health');
        return health ? health.getMaxHealth() : 0;
    }

    /**
     * Take damage via HealthComponent
     */
    takeDamage(damage: number): boolean {
        const health = this.getComponent<HealthComponent>('health');
        if (health) {
            health.takeDamage(damage);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} took ${damage} damage, health: ${health.getHealth()}/${health.getMaxHealth()}`);
            return health.isDead();
        }
        return false;
    }

    /**
     * Heal voxel via HealthComponent
     */
    heal(amount: number): void {
        const health = this.getComponent<HealthComponent>('health');
        if (health) {
            health.heal(amount);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} healed ${amount}, health: ${health.getHealth()}/${health.getMaxHealth()}`);
        }
    }

    /**
     * Check if voxel is destroyed (health <= 0)
     */
    isDestroyed(): boolean {
        return this.getCurrentHealth() <= 0;
    }

    /**
     * Check if voxel can have attachments on a specific face
     */
    canAttachToFace(face: VoxelFace): boolean {
        return this.isExternal && this.availableFaces.includes(face);
    }

    /**
     * Block a face from attachments (when something is attached)
     */
    blockFace(face: VoxelFace): void {
        const index = this.availableFaces.indexOf(face);
        if (index !== -1) {
            this.availableFaces.splice(index, 1);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} face ${face} blocked`);
        }
    }

    /**
     * Unblock a face for attachments (when something is detached)
     */
    unblockFace(face: VoxelFace): void {
        if (!this.availableFaces.includes(face)) {
            this.availableFaces.push(face);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} face ${face} unblocked`);
        }
    }

    // ============================================================
    // Scene Graph Integration
    // ============================================================
    
    /**
     * Get the scene node component
     */
    getSceneNode(): SceneNodeComponent | undefined {
        return this.getComponent<SceneNodeComponent>('sceneNode');
    }
    
    /**
     * Get world position from scene node (preferred over PositionComponent)
     */
    getSceneWorldPosition(): { x: number; y: number; z: number } {
        const sceneNode = this.getSceneNode();
        if (sceneNode) {
            const pos = sceneNode.getWorldPosition();
            return { x: pos.x, y: pos.y, z: pos.z };
        }
        // Fallback to PositionComponent
        return this.getWorldPosition();
    }
    
    /**
     * Set local position relative to parent car
     */
    setSceneLocalPosition(x: number, y: number, z: number): void {
        const sceneNode = this.getSceneNode();
        if (sceneNode) {
            sceneNode.setLocalPosition(x, y, z);
        } else {
            // Fallback to PositionComponent
            this.setWorldPosition(x, y, z);
        }
    }
    
    /**
     * Get collision radius component
     */
    getCollisionRadius(): RadiusComponent | undefined {
        return this.getComponent<RadiusComponent>('radius');
    }
    
    /**
     * Check collision with another voxel
     */
    checkVoxelCollision(other: TrainCarVoxel): boolean {
        const thisRadius = this.getCollisionRadius();
        const otherRadius = other.getCollisionRadius();
        
        if (!thisRadius || !otherRadius) return false;
        return thisRadius.checkCollision(otherRadius);
    }
    
    /**
     * Emit damage event to nearby voxels (for explosion propagation)
     */
    emitDamageToNearbyVoxels(damage: number, radius: number = 2.0): void {
        const sceneNode = this.getSceneNode();
        if (!sceneNode) return;
        
        sceneNode.emitToRadius('damage:voxel', { 
            amount: damage,
            source: this.id,
            sourceType: 'voxel_explosion'
        }, radius, (node) => {
            // Only target other voxels
            return node.gameObject?.type === 'trainCarVoxel' && node.gameObject.id !== this.id;
        });
        
        Logger.log(LogCategory.COMBAT, `Voxel ${this.id} emitted ${damage} damage to ${radius} unit radius`);
    }

    /**
     * Get serializable data for save/load
     */
    serialize(): any {
        return {
            id: this.id,
            gridPosition: this.gridPosition,
            worldPosition: this.getWorldPosition(),
            cargoType: this.cargoType,
            material: this.material,
            capacity: this.capacity,
            weight: this.weight,
            isExternal: this.isExternal,
            availableFaces: this.availableFaces,
            connectedVoxels: this.connectedVoxels,
            currentHealth: this.getCurrentHealth(),
            maxHealth: this.getMaxHealth()
        };
    }

    /**
     * Create voxel from serialized data
     */
    static deserialize(data: any): TrainCarVoxel {
        const voxel = new TrainCarVoxel(
            data.id,
            data.gridPosition,
            data.worldPosition,
            data.cargoType,
            data.material,
            data.capacity,
            data.maxHealth
        );

        // Restore state
        voxel.weight = data.weight;
        voxel.setExternalStatus(data.isExternal, data.availableFaces);
        voxel.connectedVoxels = [...data.connectedVoxels];

        // Set health
        const health = voxel.getComponent<HealthComponent>('health');
        if (health && data.currentHealth !== undefined) {
            // Use heal/damage to set health properly
            const currentHealth = health.getHealth();
            if (data.currentHealth > currentHealth) {
                health.heal(data.currentHealth - currentHealth);
            } else if (data.currentHealth < currentHealth) {
                health.takeDamage(currentHealth - data.currentHealth);
            }
        }

        return voxel;
    }
}
