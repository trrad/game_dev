/**
 * TrainCarVoxelComponent - Manages voxel-based train car construction
 * Each train car is composed of discrete voxel units arranged in a 3D grid
 */

import { Component } from '../core/Component';
import { AttachmentSlotType } from '../entities/Attachment';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * Types of cargo capacity that voxels can provide
 */
export enum CargoCapacityType {
    STANDARD = 'standard',        // Regular cargo
    HAZARDOUS = 'hazardous',     // Dangerous materials
    PERISHABLE = 'perishable',   // Time-sensitive cargo
    LIQUID = 'liquid',           // Fluid containers
    STRUCTURAL = 'structural'    // Provides structural integrity, minimal cargo
}

/**
 * Materials that affect voxel properties
 */
export enum VoxelMaterial {
    STEEL = 'steel',             // Balanced weight/durability
    ALUMINUM = 'aluminum',       // Lightweight, less durable
    REINFORCED = 'reinforced',   // Heavy, very durable
    COMPOSITE = 'composite'      // Specialized properties
}

/**
 * Face directions for a voxel (used for attachment slots)
 */
export enum VoxelFace {
    TOP = 'top',
    BOTTOM = 'bottom',
    FRONT = 'front',
    REAR = 'rear',
    LEFT = 'left',
    RIGHT = 'right'
}

/**
 * Individual voxel data structure
 */
export interface TrainCarVoxel {
    gridPosition: { x: number; y: number; z: number };
    cargoType: CargoCapacityType;
    material: VoxelMaterial;
    capacity: number;           // Storage capacity for this cargo type
    weight: number;            // Affects train performance
    health: number;            // Individual voxel health for destruction
    maxHealth: number;
    isExternal: boolean;       // Whether this voxel is on the external surface
    availableFaces: VoxelFace[]; // Which faces can have attachments
    connectedVoxels: string[]; // IDs of voxels connected to this one
}

/**
 * Component that manages the voxel grid structure of a train car
 */
export class TrainCarVoxelComponent extends Component<TrainCarVoxel[]> {
    public readonly type = 'trainCarVoxel';
    
    private voxelGrid: Map<string, TrainCarVoxel> = new Map();
    private dimensions: { width: number; height: number; length: number };
    private voxelSize: number;

    constructor(
        dimensions: { width: number; height: number; length: number },
        voxelSize: number = 0.4
    ) {
        super();
        this.dimensions = dimensions;
        this.voxelSize = voxelSize;
        this.initializeVoxelGrid();
        
        Logger.log(LogCategory.SYSTEM, `TrainCarVoxelComponent initialized with dimensions ${dimensions.width}x${dimensions.height}x${dimensions.length}, voxelSize: ${voxelSize}`);
    }

    /**
     * Serialize the voxel data
     */
    serialize(): TrainCarVoxel[] {
        return Array.from(this.voxelGrid.values());
    }

    /**
     * Deserialize voxel data
     */
    deserialize(data: TrainCarVoxel[]): void {
        this.voxelGrid.clear();
        data.forEach(voxel => {
            const key = this.getVoxelKey(voxel.gridPosition.x, voxel.gridPosition.y, voxel.gridPosition.z);
            this.voxelGrid.set(key, voxel);
        });
    }

    /**
     * Initialize the voxel grid with default structure voxels
     */
    private initializeVoxelGrid(): void {
        const voxels: TrainCarVoxel[] = [];

        for (let x = 0; x < this.dimensions.length; x++) {
            for (let y = 0; y < this.dimensions.height; y++) {
                for (let z = 0; z < this.dimensions.width; z++) {
                    const voxel: TrainCarVoxel = {
                        gridPosition: { x, y, z },
                        cargoType: this.getDefaultCargoType(x, y, z),
                        material: VoxelMaterial.STEEL,
                        capacity: 100,
                        weight: this.calculateVoxelWeight(VoxelMaterial.STEEL),
                        health: 100,
                        maxHealth: 100,
                        isExternal: this.isExternalPosition(x, y, z),
                        availableFaces: this.getAvailableFaces(x, y, z),
                        connectedVoxels: []
                    };

                    const key = this.getVoxelKey(x, y, z);
                    this.voxelGrid.set(key, voxel);
                    voxels.push(voxel);
                }
            }
        }

        Logger.log(LogCategory.SYSTEM, `Initialized ${voxels.length} voxels, ${voxels.filter(v => v.isExternal).length} external`);
    }

    /**
     * Determine default cargo type based on position
     */
    private getDefaultCargoType(x: number, _y: number, _z: number): CargoCapacityType {
        // Front section (first 2 voxels) - structural for connection
        if (x < 2) {
            return CargoCapacityType.STRUCTURAL;
        }
        // Middle section - standard cargo
        else if (x < this.dimensions.length - 2) {
            return CargoCapacityType.STANDARD;
        }
        // Rear section - structural
        else {
            return CargoCapacityType.STRUCTURAL;
        }
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
     * Check if a position is on the external surface
     */
    private isExternalPosition(x: number, y: number, z: number): boolean {
        return (
            x === 0 || x === this.dimensions.length - 1 ||  // Front/rear faces
            y === 0 || y === this.dimensions.height - 1 ||  // Top/bottom faces
            z === 0 || z === this.dimensions.width - 1      // Left/right faces
        );
    }

    /**
     * Get available faces for attachment slots based on position
     */
    private getAvailableFaces(x: number, y: number, z: number): VoxelFace[] {
        if (!this.isExternalPosition(x, y, z)) {
            return []; // Internal voxels have no attachment faces
        }

        const faces: VoxelFace[] = [];

        // Check each face to see if it's external
        if (x === 0) faces.push(VoxelFace.FRONT);
        if (x === this.dimensions.length - 1) faces.push(VoxelFace.REAR);
        if (y === 0) faces.push(VoxelFace.BOTTOM);
        if (y === this.dimensions.height - 1) faces.push(VoxelFace.TOP);
        if (z === 0) faces.push(VoxelFace.LEFT);
        if (z === this.dimensions.width - 1) faces.push(VoxelFace.RIGHT);

        return faces;
    }

    /**
     * Generate voxel key for map storage
     */
    private getVoxelKey(x: number, y: number, z: number): string {
        return `${x},${y},${z}`;
    }

    /**
     * Get voxel at specific grid position
     */
    getVoxelAt(x: number, y: number, z: number): TrainCarVoxel | null {
        const key = this.getVoxelKey(x, y, z);
        return this.voxelGrid.get(key) || null;
    }

    /**
     * Set voxel at specific grid position
     */
    setVoxelAt(x: number, y: number, z: number, voxel: TrainCarVoxel): void {
        const key = this.getVoxelKey(x, y, z);
        this.voxelGrid.set(key, voxel);
    }

    /**
     * Get all external voxels (those that can have attachments)
     */
    getExternalVoxels(): TrainCarVoxel[] {
        return Array.from(this.voxelGrid.values()).filter(voxel => voxel.isExternal);
    }

    /**
     * Get voxels by cargo type
     */
    getVoxelsByCargoType(cargoType: CargoCapacityType): TrainCarVoxel[] {
        return Array.from(this.voxelGrid.values()).filter(voxel => voxel.cargoType === cargoType);
    }

    /**
     * Get voxels by material
     */
    getVoxelsByMaterial(material: VoxelMaterial): TrainCarVoxel[] {
        return Array.from(this.voxelGrid.values()).filter(voxel => voxel.material === material);
    }

    /**
     * Connect two voxels and block their connecting faces
     */
    connectVoxels(voxel1Key: string, voxel2Key: string, face1: VoxelFace, face2: VoxelFace): boolean {
        const voxel1 = this.voxelGrid.get(voxel1Key);
        const voxel2 = this.voxelGrid.get(voxel2Key);

        if (!voxel1 || !voxel2) {
            Logger.warn(LogCategory.SYSTEM, `Cannot connect voxels: one or both not found`);
            return false;
        }

        // Check if faces are available
        if (!voxel1.availableFaces.includes(face1) || !voxel2.availableFaces.includes(face2)) {
            Logger.warn(LogCategory.SYSTEM, `Cannot connect voxels: faces not available`);
            return false;
        }

        // Add connections
        voxel1.connectedVoxels.push(voxel2Key);
        voxel2.connectedVoxels.push(voxel1Key);

        // Remove the connecting faces from available faces
        voxel1.availableFaces = voxel1.availableFaces.filter(f => f !== face1);
        voxel2.availableFaces = voxel2.availableFaces.filter(f => f !== face2);

        // Update external status
        this.updateExternalStatus();

        Logger.log(LogCategory.SYSTEM, `Connected voxels at ${voxel1Key} and ${voxel2Key}`);
        return true;
    }

    /**
     * Disconnect two voxels and restore their faces
     */
    disconnectVoxels(voxel1Key: string, voxel2Key: string, face1: VoxelFace, face2: VoxelFace): boolean {
        const voxel1 = this.voxelGrid.get(voxel1Key);
        const voxel2 = this.voxelGrid.get(voxel2Key);

        if (!voxel1 || !voxel2) {
            return false;
        }

        // Remove connections
        voxel1.connectedVoxels = voxel1.connectedVoxels.filter(id => id !== voxel2Key);
        voxel2.connectedVoxels = voxel2.connectedVoxels.filter(id => id !== voxel1Key);

        // Restore faces if they're actually external
        const pos1 = voxel1.gridPosition;
        const pos2 = voxel2.gridPosition;
        
        if (this.isExternalPosition(pos1.x, pos1.y, pos1.z)) {
            voxel1.availableFaces.push(face1);
        }
        if (this.isExternalPosition(pos2.x, pos2.y, pos2.z)) {
            voxel2.availableFaces.push(face2);
        }

        // Update external status
        this.updateExternalStatus();

        Logger.log(LogCategory.SYSTEM, `Disconnected voxels at ${voxel1Key} and ${voxel2Key}`);
        return true;
    }

    /**
     * Update external status for all voxels based on connections
     */
    private updateExternalStatus(): void {
        for (const voxel of this.voxelGrid.values()) {
            const pos = voxel.gridPosition;
            voxel.isExternal = this.isExternalPosition(pos.x, pos.y, pos.z) && voxel.availableFaces.length > 0;
        }
    }

    /**
     * Convert VoxelFace to AttachmentSlotType for compatibility
     */
    static voxelFaceToSlotType(face: VoxelFace): AttachmentSlotType {
        switch (face) {
            case VoxelFace.TOP: return AttachmentSlotType.TOP;
            case VoxelFace.BOTTOM: return AttachmentSlotType.BOTTOM;
            case VoxelFace.FRONT: return AttachmentSlotType.FRONT;
            case VoxelFace.REAR: return AttachmentSlotType.REAR;
            case VoxelFace.LEFT: return AttachmentSlotType.SIDE_LEFT;
            case VoxelFace.RIGHT: return AttachmentSlotType.SIDE_RIGHT;
            default: return AttachmentSlotType.BOTTOM;
        }
    }

    /**
     * Get grid dimensions
     */
    getDimensions(): { width: number; height: number; length: number } {
        return { ...this.dimensions };
    }

    /**
     * Get total voxel count
     */
    getTotalVoxelCount(): number {
        return this.voxelGrid.size;
    }

    /**
     * Get external voxel count (those with attachment possibilities)
     */
    getExternalVoxelCount(): number {
        return this.getExternalVoxels().length;
    }

    /**
     * Calculate local position for a voxel based on grid coordinates
     * X-axis: along the length of the train car (forward/backward)
     * Y-axis: vertical (up/down)
     * Z-axis: across the width of the train car (left/right)
     */
    getVoxelLocalPosition(gridX: number, gridY: number, gridZ: number): { x: number; y: number; z: number } {
        return {
            x: (gridX - (this.dimensions.length - 1) / 2) * this.voxelSize,
            y: (gridY - (this.dimensions.height - 1) / 2) * this.voxelSize,
            z: (gridZ - (this.dimensions.width - 1) / 2) * this.voxelSize
        };
    }
}
