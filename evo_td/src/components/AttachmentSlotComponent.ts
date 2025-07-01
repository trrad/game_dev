/**
 * AttachmentSlotComponent - Manages attachment slots on train cars
 * Supports grid-based positioning and slot occupancy tracking
 */

import { Component } from '../core/Component';
import { Attachment, AttachmentSlotType, AttachmentSize } from '../entities/Attachment';
import { Logger, LogCategory } from '../utils/Logger';
import { Vector3 } from '@babylonjs/core';

/**
 * Definition of a single attachment slot
 */
export interface AttachmentSlot {
    id: string;
    type: AttachmentSlotType;
    gridPosition: { x: number; y: number; z: number }; // Grid coordinates
    worldPosition: Vector3; // 3D world position relative to car
    maxSize: AttachmentSize; // Maximum size attachment that can fit
    isOccupied: boolean;
    occupiedBy?: string; // ID of the attachment using this slot
    rotation?: Vector3; // Optional rotation for the slot
}

/**
 * Grid-based slot layout for a train car
 */
export interface SlotGrid {
    width: number;   // Grid width (X axis)
    height: number;  // Grid height (Y axis) 
    depth: number;   // Grid depth (Z axis)
    unitSize: number; // Size of each grid unit in world units
}

/**
 * Configuration for defining attachment slots on a train car
 */
export interface AttachmentSlotConfig {
    carType: string;
    grid: SlotGrid;
    slots: AttachmentSlot[];
}

/**
 * Result of trying to place an attachment
 */
export interface AttachmentPlacementResult {
    success: boolean;
    errorMessage?: string;
    occupiedSlots?: string[]; // IDs of slots that would be occupied
    conflictingAttachments?: string[]; // IDs of attachments that would be displaced
}

/**
 * Component that manages attachment slots on a train car
 */
export class AttachmentSlotComponent extends Component {
    public readonly type = "attachmentSlot";
    
    private config: AttachmentSlotConfig;
    private slots: Map<string, AttachmentSlot> = new Map();
    private attachmentToSlots: Map<string, string[]> = new Map(); // Maps attachment ID to slot IDs it occupies
    private attachments: Map<string, Attachment> = new Map(); // Maps attachment ID to attachment instance

    constructor(config: AttachmentSlotConfig) {
        super();
        this.config = { ...config };
        
        // Initialize slots map
        for (const slot of config.slots) {
            this.slots.set(slot.id, { ...slot });
        }
        
        Logger.log(LogCategory.SYSTEM, `Created AttachmentSlotComponent for ${config.carType}`, {
            gridSize: `${config.grid.width}x${config.grid.height}x${config.grid.depth}`,
            slotCount: config.slots.length,
            unitSize: config.grid.unitSize
        });
    }

    /**
     * Get all available slots for a specific slot type
     */
    getAvailableSlots(slotType: AttachmentSlotType): AttachmentSlot[] {
        return Array.from(this.slots.values())
            .filter(slot => slot.type === slotType && !slot.isOccupied);
    }

    /**
     * Get all slots (occupied and unoccupied)
     */
    getAllSlots(): AttachmentSlot[] {
        return Array.from(this.slots.values());
    }

    /**
     * Get all attachments currently placed on this car
     */
    getAllAttachments(): Attachment[] {
        return Array.from(this.attachments.values());
    }

    /**
     * Get slots occupied by a specific attachment
     */
    getSlotsOccupiedBy(attachmentId: string): AttachmentSlot[] {
        const slotIds = this.attachmentToSlots.get(attachmentId) || [];
        return slotIds.map(id => this.slots.get(id)!).filter(slot => slot);
    }

    /**
     * Check if an attachment can be placed at a specific grid position
     */
    canPlaceAttachment(
        attachment: Attachment, 
        slotType: AttachmentSlotType, 
        gridX: number, 
        gridY: number, 
        gridZ: number
    ): AttachmentPlacementResult {
        const size = attachment.getSize();
        const allowedSlots = attachment.getAllowedSlots();

        // Check if attachment allows this slot type
        if (!allowedSlots.includes(slotType)) {
            return {
                success: false,
                errorMessage: `Attachment ${attachment.getConfig().name} cannot be placed on ${slotType} slots`
            };
        }

        // Find all slots that would be occupied by this attachment
        const requiredSlots: AttachmentSlot[] = [];
        const conflictingAttachments: Set<string> = new Set();

        for (let x = gridX; x < gridX + size.width; x++) {
            for (let y = gridY; y < gridY + size.height; y++) {
                for (let z = gridZ; z < gridZ + size.depth; z++) {
                    const slot = this.findSlotAtGridPosition(x, y, z, slotType);
                    
                    if (!slot) {
                        return {
                            success: false,
                            errorMessage: `No slot available at grid position (${x}, ${y}, ${z}) for slot type ${slotType}`
                        };
                    }

                    // Check if slot can accommodate the size
                    if (slot.maxSize.width < 1 || slot.maxSize.height < 1 || slot.maxSize.depth < 1) {
                        return {
                            success: false,
                            errorMessage: `Slot ${slot.id} is too small for this attachment`
                        };
                    }

                    requiredSlots.push(slot);

                    // Check for conflicts
                    if (slot.isOccupied && slot.occupiedBy) {
                        conflictingAttachments.add(slot.occupiedBy);
                    }
                }
            }
        }

        if (conflictingAttachments.size > 0) {
            return {
                success: false,
                errorMessage: `Placement would conflict with existing attachments`,
                conflictingAttachments: Array.from(conflictingAttachments)
            };
        }

        return {
            success: true,
            occupiedSlots: requiredSlots.map(slot => slot.id)
        };
    }

    /**
     * Place an attachment at a specific grid position
     */
    placeAttachment(
        attachment: Attachment,
        slotType: AttachmentSlotType,
        gridX: number,
        gridY: number,
        gridZ: number
    ): AttachmentPlacementResult {
        const placementCheck = this.canPlaceAttachment(attachment, slotType, gridX, gridY, gridZ);
        
        if (!placementCheck.success) {
            return placementCheck;
        }

        const attachmentId = attachment.id; // Use GameObject ID
        const slotIds = placementCheck.occupiedSlots!;

        // Mark slots as occupied
        for (const slotId of slotIds) {
            const slot = this.slots.get(slotId)!;
            slot.isOccupied = true;
            slot.occupiedBy = attachmentId;
        }

        // Track which slots this attachment occupies
        this.attachmentToSlots.set(attachmentId, slotIds);
        
        // Store the attachment instance
        this.attachments.set(attachmentId, attachment);

        // Calculate world position for the attachment (center of occupied area)
        const centerSlot = this.slots.get(slotIds[0])!;
        const worldPosition = centerSlot.worldPosition.clone();
        
        // Mount the attachment
        attachment.mount({
            x: worldPosition.x,
            y: worldPosition.y,
            z: worldPosition.z,
            slotType: slotType,
            parentCarId: this._gameObject?.id || '',
            rotation: centerSlot.rotation ? {
                x: centerSlot.rotation.x,
                y: centerSlot.rotation.y,
                z: centerSlot.rotation.z
            } : undefined
        });

        Logger.log(LogCategory.SYSTEM, `Placed attachment ${attachment.getConfig().name}`, {
            position: `(${gridX}, ${gridY}, ${gridZ})`,
            slotType: slotType,
            occupiedSlots: slotIds.length,
            worldPosition: `(${worldPosition.x}, ${worldPosition.y}, ${worldPosition.z})`
        });

        return {
            success: true,
            occupiedSlots: slotIds
        };
    }

    /**
     * Remove an attachment from its slots
     */
    removeAttachment(attachmentId: string): boolean {
        const slotIds = this.attachmentToSlots.get(attachmentId);
        
        if (!slotIds) {
            Logger.warn(LogCategory.SYSTEM, `Attempted to remove attachment ${attachmentId} that is not placed`);
            return false;
        }

        // Free up the slots
        for (const slotId of slotIds) {
            const slot = this.slots.get(slotId);
            if (slot) {
                slot.isOccupied = false;
                slot.occupiedBy = undefined;
            }
        }

        // Remove tracking
        this.attachmentToSlots.delete(attachmentId);
        this.attachments.delete(attachmentId);

        Logger.log(LogCategory.SYSTEM, `Removed attachment ${attachmentId}`, {
            freedSlots: slotIds.length
        });

        return true;
    }

    /**
     * Find a slot at a specific grid position and slot type
     */
    private findSlotAtGridPosition(
        gridX: number, 
        gridY: number, 
        gridZ: number, 
        slotType: AttachmentSlotType
    ): AttachmentSlot | null {
        for (const slot of this.slots.values()) {
            if (slot.type === slotType &&
                slot.gridPosition.x === gridX &&
                slot.gridPosition.y === gridY &&
                slot.gridPosition.z === gridZ) {
                return slot;
            }
        }
        return null;
    }

    /**
     * Get grid configuration
     */
    getGrid(): SlotGrid {
        return { ...this.config.grid };
    }

    /**
     * Get slot occupancy statistics
     */
    getOccupancyStats(): {
        total: number;
        occupied: number;
        available: number;
        byType: Map<AttachmentSlotType, { total: number; occupied: number }>;
    } {
        const byType = new Map<AttachmentSlotType, { total: number; occupied: number }>();
        let totalOccupied = 0;

        for (const slot of this.slots.values()) {
            if (!byType.has(slot.type)) {
                byType.set(slot.type, { total: 0, occupied: 0 });
            }

            const typeStats = byType.get(slot.type)!;
            typeStats.total++;

            if (slot.isOccupied) {
                typeStats.occupied++;
                totalOccupied++;
            }
        }

        return {
            total: this.slots.size,
            occupied: totalOccupied,
            available: this.slots.size - totalOccupied,
            byType
        };
    }

    /**
     * Convert grid coordinates to world position
     */
    gridToWorldPosition(gridX: number, gridY: number, gridZ: number): Vector3 {
        const grid = this.config.grid;
        return new Vector3(
            gridX * grid.unitSize,
            gridY * grid.unitSize,
            gridZ * grid.unitSize
        );
    }

    /**
     * Convert world position to grid coordinates
     */
    worldToGridPosition(worldPos: Vector3): { x: number; y: number; z: number } {
        const grid = this.config.grid;
        return {
            x: Math.floor(worldPos.x / grid.unitSize),
            y: Math.floor(worldPos.y / grid.unitSize),
            z: Math.floor(worldPos.z / grid.unitSize)
        };
    }

    /**
     * Get debug information about the slot layout
     */
    getDebugInfo(): any {
        const stats = this.getOccupancyStats();
        return {
            carType: this.config.carType,
            grid: this.config.grid,
            totalSlots: this.slots.size,
            occupancyStats: {
                total: stats.total,
                occupied: stats.occupied,
                available: stats.available,
                occupancyRate: `${((stats.occupied / stats.total) * 100).toFixed(1)}%`
            },
            slotsByType: Array.from(stats.byType.entries()).map(([type, data]) => ({
                type,
                total: data.total,
                occupied: data.occupied,
                available: data.total - data.occupied
            })),
            attachments: Array.from(this.attachmentToSlots.entries()).map(([id, slots]) => ({
                attachmentId: id,
                occupiedSlots: slots.length
            }))
        };
    }

    /**
     * Serialize slot configuration and state
     */
    serialize(): any {
        return {
            config: this.config,
            slots: Array.from(this.slots.entries()).map(([id, slot]) => ({ id, slot })),
            attachmentToSlots: Array.from(this.attachmentToSlots.entries())
        };
    }

    /**
     * Deserialize slot configuration and state
     */
    deserialize(data: any): void {
        if (data.config) {
            this.config = data.config;
        }
        
        if (data.slots) {
            this.slots.clear();
            for (const { id, slot } of data.slots) {
                this.slots.set(id, slot);
            }
        }
        
        if (data.attachmentToSlots) {
            this.attachmentToSlots.clear();
            for (const [attachmentId, slotIds] of data.attachmentToSlots) {
                this.attachmentToSlots.set(attachmentId, slotIds);
            }
        }
    }

    /**
     * Clean up component resources
     */
    dispose(): void {
        this.slots.clear();
        this.attachmentToSlots.clear();
        
        Logger.log(LogCategory.SYSTEM, `Disposed AttachmentSlotComponent for ${this.config.carType}`);
        super.dispose();
    }
}
