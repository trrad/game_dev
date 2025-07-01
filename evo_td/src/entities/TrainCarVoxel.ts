/**
 * TrainCarVoxel - Individual voxel GameObject for train car construction
 * Each voxel represents a discrete unit with position, health, and cargo properties
 */

import { Mesh, Scene } from "@babylonjs/core";
import { GameObject } from '../core/GameObject';
import { PositionComponent } from '../components/PositionComponent';
import { HealthComponent } from '../components/HealthComponent';
import { CargoCapacityType, VoxelMaterial, VoxelFace } from '../components/TrainCarVoxelComponent';
import { VoxelRenderComponent } from '../renderers/VoxelRenderComponent';
import { Logger, LogCategory } from '../utils/Logger';

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
        scene?: Scene      // Scene for rendering (passed to GameObject)
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
        const pos = this.getComponent(PositionComponent);
        return pos ? { x: pos.x, y: pos.y, z: pos.z } : { x: 0, y: 0, z: 0 };
    }

    /**
     * Update world position via PositionComponent
     */
    setWorldPosition(x: number, y: number, z: number): void {
        const pos = this.getComponent(PositionComponent);
        if (pos) {
            pos.x = x;
            pos.y = y;
            pos.z = z;
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} world position updated to (${x},${y},${z})`);
        }
    }

    /**
     * Get current health from HealthComponent
     */
    getCurrentHealth(): number {
        const health = this.getComponent(HealthComponent);
        return health ? health.currentHealth : 0;
    }

    /**
     * Get max health from HealthComponent
     */
    getMaxHealth(): number {
        const health = this.getComponent(HealthComponent);
        return health ? health.maxHealth : 0;
    }

    /**
     * Take damage via HealthComponent
     */
    takeDamage(damage: number): boolean {
        const health = this.getComponent(HealthComponent);
        if (health) {
            health.takeDamage(damage);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} took ${damage} damage, health: ${health.currentHealth}/${health.maxHealth}`);
            return health.currentHealth <= 0;
        }
        return false;
    }

    /**
     * Heal voxel via HealthComponent
     */
    heal(amount: number): void {
        const health = this.getComponent(HealthComponent);
        if (health) {
            health.heal(amount);
            Logger.log(LogCategory.SYSTEM, `Voxel ${this.id} healed ${amount}, health: ${health.currentHealth}/${health.maxHealth}`);
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
        const health = voxel.getComponent(HealthComponent);
        if (health && data.currentHealth !== undefined) {
            health.currentHealth = data.currentHealth;
        }

        return voxel;
    }
}
