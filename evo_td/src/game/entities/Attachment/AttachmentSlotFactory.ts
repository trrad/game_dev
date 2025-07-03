/**
 * AttachmentSlotFactory - Creates standardized slot layouts for different train car types
 */

import { Vector3 } from '@babylonjs/core';
import { AttachmentSlotType, AttachmentSize } from '../Attachment/Attachment';
import { AttachmentSlot, SlotGrid, AttachmentSlotConfig } from '../../components/AttachmentSlotComponent';
import { Logger, LogCategory } from '../../../engine/utils/Logger';

/**
 * Standard train car dimensions and specifications
 */
const CAR_SPECS = {
    ENGINE: {
        length: 3.0,
        width: 2.0,
        height: 2.5,
        gridUnits: { width: 4, height: 5, depth: 6 }
    },
    CARGO: {
        length: 4.0,
        width: 2.0,
        height: 2.0,
        gridUnits: { width: 4, height: 4, depth: 8 }
    },
    PASSENGER: {
        length: 4.0,
        width: 2.0,
        height: 2.5,
        gridUnits: { width: 4, height: 5, depth: 8 }
    },
    WEAPONS: {
        length: 3.5,
        width: 2.0,
        height: 2.0,
        gridUnits: { width: 4, height: 4, depth: 7 }
    },
    UTILITY: {
        length: 3.0,
        width: 2.0,
        height: 2.0,
        gridUnits: { width: 4, height: 4, depth: 6 }
    }
};

/**
 * Factory for creating attachment slot layouts
 */
export class AttachmentSlotFactory {
    
    /**
     * Create an attachment slot configuration for an engine car
     */
    static createEngineSlots(): AttachmentSlotConfig {
        const spec = CAR_SPECS.ENGINE;
        const grid: SlotGrid = {
            width: spec.gridUnits.width,
            height: spec.gridUnits.height,
            depth: spec.gridUnits.depth,
            unitSize: 0.5 // Each grid unit is 0.5 world units
        };

        const slots: AttachmentSlot[] = [];

        // Top slots for weapons and equipment
        for (let x = 0; x < spec.gridUnits.width; x++) {
            for (let z = 1; z < spec.gridUnits.depth - 1; z++) { // Leave front/back clear
                slots.push({
                    id: `engine_top_${x}_${z}`,
                    type: AttachmentSlotType.TOP,
                    gridPosition: { x, y: spec.gridUnits.height - 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        (spec.gridUnits.height - 1) * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 1, height: 1, depth: 1 },
                    isOccupied: false
                });
            }
        }

        // Side slots for armor and utilities
        const sideY = Math.floor(spec.gridUnits.height / 2);
        for (let z = 0; z < spec.gridUnits.depth; z++) {
            // Left side
            slots.push({
                id: `engine_left_${z}`,
                type: AttachmentSlotType.SIDE_LEFT,
                gridPosition: { x: 0, y: sideY, z },
                worldPosition: new Vector3(
                    -spec.gridUnits.width / 2 * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 2, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, Math.PI / 2, 0) // Face outward
            });

            // Right side
            slots.push({
                id: `engine_right_${z}`,
                type: AttachmentSlotType.SIDE_RIGHT,
                gridPosition: { x: spec.gridUnits.width - 1, y: sideY, z },
                worldPosition: new Vector3(
                    (spec.gridUnits.width / 2) * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 2, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, -Math.PI / 2, 0) // Face outward
            });
        }

        // Front slot for ram/plow
        slots.push({
            id: 'engine_front',
            type: AttachmentSlotType.FRONT,
            gridPosition: { x: spec.gridUnits.width / 2, y: sideY, z: 0 },
            worldPosition: new Vector3(
                0,
                sideY * grid.unitSize,
                -spec.gridUnits.depth / 2 * grid.unitSize
            ),
            maxSize: { width: 2, height: 2, depth: 1 },
            isOccupied: false
        });

        Logger.log(LogCategory.SYSTEM, `Created engine slot layout`, {
            totalSlots: slots.length,
            topSlots: slots.filter(s => s.type === AttachmentSlotType.TOP).length,
            sideSlots: slots.filter(s => s.type === AttachmentSlotType.SIDE_LEFT || s.type === AttachmentSlotType.SIDE_RIGHT).length,
            frontSlots: slots.filter(s => s.type === AttachmentSlotType.FRONT).length
        });

        return {
            carType: 'engine',
            grid,
            slots
        };
    }

    /**
     * Create an attachment slot configuration for a cargo car
     */
    static createCargoSlots(): AttachmentSlotConfig {
        const spec = CAR_SPECS.CARGO;
        const grid: SlotGrid = {
            width: spec.gridUnits.width,
            height: spec.gridUnits.height,
            depth: spec.gridUnits.depth,
            unitSize: 0.5
        };

        const slots: AttachmentSlot[] = [];

        // Top slots for cargo containers and defensive equipment
        for (let x = 0; x < spec.gridUnits.width; x++) {
            for (let z = 0; z < spec.gridUnits.depth; z++) {
                slots.push({
                    id: `cargo_top_${x}_${z}`,
                    type: AttachmentSlotType.TOP,
                    gridPosition: { x, y: spec.gridUnits.height - 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        (spec.gridUnits.height - 1) * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 2, height: 2, depth: 2 }, // Larger cargo containers
                    isOccupied: false
                });
            }
        }

        // Side slots for smaller cargo boxes and utilities
        const sideY = Math.floor(spec.gridUnits.height / 2);
        for (let z = 1; z < spec.gridUnits.depth - 1; z++) { // Leave connection points clear
            // Left side
            slots.push({
                id: `cargo_left_${z}`,
                type: AttachmentSlotType.SIDE_LEFT,
                gridPosition: { x: 0, y: sideY, z },
                worldPosition: new Vector3(
                    -spec.gridUnits.width / 2 * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, Math.PI / 2, 0)
            });

            // Right side
            slots.push({
                id: `cargo_right_${z}`,
                type: AttachmentSlotType.SIDE_RIGHT,
                gridPosition: { x: spec.gridUnits.width - 1, y: sideY, z },
                worldPosition: new Vector3(
                    (spec.gridUnits.width / 2) * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, -Math.PI / 2, 0)
            });
        }

        // Internal slots for cargo storage systems
        for (let x = 1; x < spec.gridUnits.width - 1; x++) {
            for (let z = 1; z < spec.gridUnits.depth - 1; z++) {
                slots.push({
                    id: `cargo_internal_${x}_${z}`,
                    type: AttachmentSlotType.BOTTOM,
                    gridPosition: { x, y: 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        1 * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 1, height: 2, depth: 1 },
                    isOccupied: false
                });
            }
        }

        Logger.log(LogCategory.SYSTEM, `Created cargo slot layout`, {
            totalSlots: slots.length,
            topSlots: slots.filter(s => s.type === AttachmentSlotType.TOP).length,
            sideSlots: slots.filter(s => s.type === AttachmentSlotType.SIDE_LEFT || s.type === AttachmentSlotType.SIDE_RIGHT).length,
            internalSlots: slots.filter(s => s.type === AttachmentSlotType.BOTTOM).length
        });

        return {
            carType: 'cargo',
            grid,
            slots
        };
    }

    /**
     * Create an attachment slot configuration for a weapons car
     */
    static createWeaponsSlots(): AttachmentSlotConfig {
        const spec = CAR_SPECS.WEAPONS;
        const grid: SlotGrid = {
            width: spec.gridUnits.width,
            height: spec.gridUnits.height,
            depth: spec.gridUnits.depth,
            unitSize: 0.5
        };

        const slots: AttachmentSlot[] = [];

        // Top slots for main weapons (turrets, cannons)
        const centerX = Math.floor(spec.gridUnits.width / 2);
        const centerZ = Math.floor(spec.gridUnits.depth / 2);
        
        // Main turret position
        slots.push({
            id: 'weapons_main_turret',
            type: AttachmentSlotType.TOP,
            gridPosition: { x: centerX, y: spec.gridUnits.height - 1, z: centerZ },
            worldPosition: new Vector3(0, (spec.gridUnits.height - 1) * grid.unitSize, 0),
            maxSize: { width: 2, height: 2, depth: 2 },
            isOccupied: false
        });

        // Secondary weapon positions
        for (let x = 0; x < spec.gridUnits.width; x += 2) {
            for (let z = 0; z < spec.gridUnits.depth; z += 2) {
                if (x === centerX && z === centerZ) continue; // Skip main turret position
                
                slots.push({
                    id: `weapons_top_${x}_${z}`,
                    type: AttachmentSlotType.TOP,
                    gridPosition: { x, y: spec.gridUnits.height - 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        (spec.gridUnits.height - 1) * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 1, height: 1, depth: 1 },
                    isOccupied: false
                });
            }
        }

        // Side weapon mounts
        const sideY = Math.floor(spec.gridUnits.height / 2);
        for (let z = 1; z < spec.gridUnits.depth - 1; z += 2) {
            // Left side
            slots.push({
                id: `weapons_left_${z}`,
                type: AttachmentSlotType.SIDE_LEFT,
                gridPosition: { x: 0, y: sideY, z },
                worldPosition: new Vector3(
                    -spec.gridUnits.width / 2 * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, Math.PI / 2, 0)
            });

            // Right side
            slots.push({
                id: `weapons_right_${z}`,
                type: AttachmentSlotType.SIDE_RIGHT,
                gridPosition: { x: spec.gridUnits.width - 1, y: sideY, z },
                worldPosition: new Vector3(
                    (spec.gridUnits.width / 2) * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, -Math.PI / 2, 0)
            });
        }

        Logger.log(LogCategory.SYSTEM, `Created weapons slot layout`, {
            totalSlots: slots.length,
            topSlots: slots.filter(s => s.type === AttachmentSlotType.TOP).length,
            sideSlots: slots.filter(s => s.type === AttachmentSlotType.SIDE_LEFT || s.type === AttachmentSlotType.SIDE_RIGHT).length
        });

        return {
            carType: 'weapons',
            grid,
            slots
        };
    }

    /**
     * Create an attachment slot configuration for a passenger car
     */
    static createPassengerSlots(): AttachmentSlotConfig {
        const spec = CAR_SPECS.PASSENGER;
        const grid: SlotGrid = {
            width: spec.gridUnits.width,
            height: spec.gridUnits.height,
            depth: spec.gridUnits.depth,
            unitSize: 0.5
        };

        const slots: AttachmentSlot[] = [];

        // Top slots for defensive equipment and luggage
        for (let x = 0; x < spec.gridUnits.width; x += 2) {
            for (let z = 1; z < spec.gridUnits.depth - 1; z += 2) {
                slots.push({
                    id: `passenger_top_${x}_${z}`,
                    type: AttachmentSlotType.TOP,
                    gridPosition: { x, y: spec.gridUnits.height - 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        (spec.gridUnits.height - 1) * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 1, height: 1, depth: 1 },
                    isOccupied: false
                });
            }
        }

        // Side slots for windows armor and equipment
        const sideY = Math.floor(spec.gridUnits.height / 2);
        for (let z = 2; z < spec.gridUnits.depth - 2; z += 2) {
            // Left side
            slots.push({
                id: `passenger_left_${z}`,
                type: AttachmentSlotType.SIDE_LEFT,
                gridPosition: { x: 0, y: sideY, z },
                worldPosition: new Vector3(
                    -spec.gridUnits.width / 2 * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, Math.PI / 2, 0)
            });

            // Right side
            slots.push({
                id: `passenger_right_${z}`,
                type: AttachmentSlotType.SIDE_RIGHT,
                gridPosition: { x: spec.gridUnits.width - 1, y: sideY, z },
                worldPosition: new Vector3(
                    (spec.gridUnits.width / 2) * grid.unitSize,
                    sideY * grid.unitSize,
                    (z - spec.gridUnits.depth / 2) * grid.unitSize
                ),
                maxSize: { width: 1, height: 1, depth: 1 },
                isOccupied: false,
                rotation: new Vector3(0, -Math.PI / 2, 0)
            });
        }

        // Internal slots for passenger amenities
        for (let x = 1; x < spec.gridUnits.width - 1; x++) {
            for (let z = 2; z < spec.gridUnits.depth - 2; z += 2) {
                slots.push({
                    id: `passenger_internal_${x}_${z}`,
                    type: AttachmentSlotType.BOTTOM,
                    gridPosition: { x, y: 1, z },
                    worldPosition: new Vector3(
                        (x - spec.gridUnits.width / 2) * grid.unitSize,
                        1 * grid.unitSize,
                        (z - spec.gridUnits.depth / 2) * grid.unitSize
                    ),
                    maxSize: { width: 1, height: 1, depth: 1 },
                    isOccupied: false
                });
            }
        }

        Logger.log(LogCategory.SYSTEM, `Created passenger slot layout`, {
            totalSlots: slots.length,
            topSlots: slots.filter(s => s.type === AttachmentSlotType.TOP).length,
            sideSlots: slots.filter(s => s.type === AttachmentSlotType.SIDE_LEFT || s.type === AttachmentSlotType.SIDE_RIGHT).length,
            internalSlots: slots.filter(s => s.type === AttachmentSlotType.BOTTOM).length
        });

        return {
            carType: 'passenger',
            grid,
            slots
        };
    }

    /**
     * Create a slot configuration by car type
     */
    static createSlotConfig(carType: string): AttachmentSlotConfig {
        switch (carType.toLowerCase()) {
            case 'engine':
                return this.createEngineSlots();
            case 'cargo':
                return this.createCargoSlots();
            case 'weapons':
                return this.createWeaponsSlots();
            case 'passenger':
                return this.createPassengerSlots();
            default:
                Logger.warn(LogCategory.SYSTEM, `Unknown car type: ${carType}, using cargo layout`);
                return this.createCargoSlots();
        }
    }

    /**
     * Get car specifications for a given type
     */
    static getCarSpecs(carType: string) {
        const type = carType.toUpperCase();
        return CAR_SPECS[type as keyof typeof CAR_SPECS] || CAR_SPECS.CARGO;
    }
}
