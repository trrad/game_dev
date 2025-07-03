/**
 * AttachmentFactory - Creates pre-configured attachment entities for the modular train system
 */

import { Attachment, AttachmentConfig, AttachmentType, AttachmentSlotType } from './Attachment';
import { Logger, LogCategory } from "../../../engine/utils/Logger";
import { EventStack } from "../../../engine/core/EventStack";

/**
 * Pre-defined attachment configurations
 */
export class AttachmentFactory {
    
    /**
     * Create a basic turret weapon attachment
     */
    static createBasicTurret(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.WEAPON,
            name: 'Basic Turret',
            description: 'A simple automated turret for defending against enemies',
            size: { width: 1, height: 1, depth: 1 }, // Make it smaller and more reasonable
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 150,
            health: 100,
            cost: 500,
            color: { r: 0.8, g: 0.2, b: 0.2 },
            properties: new Map<string, any>([
                ['damage', 25],
                ['range', 15],
                ['fireRate', 0.25], // shots per second (much slower - 1 shot every 4 seconds)
                ['ammoCapacity', 100],
                ['currentAmmo', 100],
                ['autoTarget', true],
                ['targetTypes', 'enemy'], // What it can target
                ['rotationSpeed', 180], // degrees per second
                ['accuracy', 0.8] // 80% hit chance
            ])
        };

        const attachment = new Attachment(config, eventStack);
        
        Logger.log(LogCategory.SYSTEM, `Created basic turret attachment`, {
            name: config.name,
            damage: config.properties.get('damage'),
            range: config.properties.get('range'),
            fireRate: config.properties.get('fireRate')
        });

        return attachment;
    }

    /**
     * Create a heavy cannon attachment
     */
    static createHeavyCannon(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.WEAPON,
            name: 'Heavy Cannon',
            description: 'A powerful cannon for dealing heavy damage to tough enemies',
            size: { width: 2, height: 2, depth: 2 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 400,
            health: 200,
            cost: 1500,
            color: { r: 0.6, g: 0.6, b: 0.1 },
            properties: new Map([
                ['damage', 100],
                ['range', 15],
                ['fireRate', 0.5], // slow but powerful
                ['ammoCapacity', 20],
                ['currentAmmo', 20],
                ['splashRadius', 3]
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a cargo container attachment
     */
    static createCargoContainer(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.CARGO,
            name: 'Cargo Container',
            description: 'Additional storage space for trade goods',
            size: { width: 2, height: 2, depth: 2 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 100,
            health: 80,
            cost: 200,
            color: { r: 0.6, g: 0.4, b: 0.2 },
            properties: new Map<string, any>([
                ['capacity', 50],
                ['currentLoad', 0],
                ['weatherResistant', true]
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create armor plating attachment
     */
    static createArmorPlating(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.ARMOR,
            name: 'Armor Plating',
            description: 'Protective plating to reduce incoming damage',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.SIDE_LEFT, AttachmentSlotType.SIDE_RIGHT, AttachmentSlotType.FRONT],
            weight: 80,
            health: 120,
            cost: 300,
            color: { r: 0.3, g: 0.3, b: 0.8 },
            properties: new Map<string, any>([
                ['damageReduction', 0.3], // Reduces incoming damage by 30%
                ['resistance', 'physical']
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a shield generator attachment
     */
    static createShieldGenerator(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.SHIELD,
            name: 'Shield Generator',
            description: 'Generates an energy shield to absorb damage',
            size: { width: 1, height: 2, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 120,
            health: 60,
            cost: 800,
            color: { r: 0.2, g: 0.6, b: 0.8 },
            properties: new Map([
                ['shieldCapacity', 200],
                ['currentShield', 200],
                ['rechargeRate', 10], // shield points per second
                ['rechargeDelay', 3] // seconds after taking damage
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a repair system attachment
     */
    static createRepairSystem(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Auto-Repair System',
            description: 'Automatically repairs damage to the train over time',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.BOTTOM],
            weight: 60,
            health: 40,
            cost: 600,
            color: { r: 0.2, g: 0.8, b: 0.2 },
            properties: new Map([
                ['repairRate', 2], // health points per second
                ['range', 5], // can repair components within this range
                ['efficiency', 0.8] // 80% repair efficiency
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a sensor array attachment
     */
    static createSensorArray(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Sensor Array',
            description: 'Advanced sensors for detecting enemies and resources',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 30,
            health: 50,
            cost: 400,
            color: { r: 0.8, g: 0.8, b: 0.2 },
            properties: new Map<string, any>([
                ['detectionRange', 20],
                ['accuracyBonus', 0.2], // 20% accuracy bonus for weapons
                ['enemyMarking', true]
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a power generator attachment
     */
    static createPowerGenerator(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Auxiliary Power Unit',
            description: 'Additional power generation for energy-hungry systems',
            size: { width: 2, height: 1, depth: 2 },
            allowedSlots: [AttachmentSlotType.BOTTOM],
            weight: 200,
            health: 80,
            cost: 700,
            color: { r: 0.2, g: 0.2, b: 0.2 },
            properties: new Map([
                ['powerOutput', 100], // power units per second
                ['efficiency', 0.9],
                ['fuelConsumption', 5] // fuel units per second
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Create a basic structural block
     */
    static createStructuralBlock(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Structural Block',
            description: 'Basic building block for custom train car designs',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [
                AttachmentSlotType.TOP,
                AttachmentSlotType.SIDE_LEFT,
                AttachmentSlotType.SIDE_RIGHT,
                AttachmentSlotType.BOTTOM
            ],
            weight: 50,
            health: 100,
            cost: 100,
            color: { r: 0.5, g: 0.5, b: 0.5 },
            properties: new Map<string, any>([
                ['structural', true],
                ['connectivity', 6] // Can connect to 6 other blocks
            ])
        };

        return new Attachment(config, eventStack);
    }

    /**
     * Get all available attachment types (for UI dropdowns)
     */
    static getAvailableTypes(): string[] {
        return [
            'Basic Turret',
            'Heavy Cannon',
            'Shield Generator',
            'Armor Plating',
            'Cargo Container',
            'Repair System',
            'Sensor Array',
            'Power Generator',
            'Structural Block'
        ];
    }

    /**
     * Create an attachment by name (for UI selection)
     */
    static createByName(name: string, eventStack?: EventStack): Attachment | null {
        switch (name) {
            case 'Basic Turret': return this.createBasicTurret(eventStack);
            case 'Heavy Cannon': return this.createHeavyCannon(eventStack);
            case 'Shield Generator': return this.createShieldGenerator(eventStack);
            case 'Armor Plating': return this.createArmorPlating(eventStack);
            case 'Cargo Container': return this.createCargoContainer(eventStack);
            case 'Repair System': return this.createRepairSystem(eventStack);
            case 'Sensor Array': return this.createSensorArray(eventStack);
            case 'Power Generator': return this.createPowerGenerator(eventStack);
            case 'Structural Block': return this.createStructuralBlock(eventStack);
            default: return null;
        }
    }

    /**
     * Get sample loadouts for different car types
     */
    static getSampleLoadout(carType: string): Attachment[] {
        switch (carType.toLowerCase()) {
            case 'engine':
                return [
                    this.createSensorArray(),
                    this.createArmorPlating(),
                    this.createRepairSystem()
                ];
            case 'weapons':
                return [
                    this.createHeavyCannon(),
                    this.createBasicTurret(),
                    this.createShieldGenerator(),
                    this.createArmorPlating()
                ];
            case 'cargo':
                return [
                    this.createCargoContainer(),
                    this.createCargoContainer(),
                    this.createArmorPlating()
                ];
            case 'passenger':
                return [
                    this.createShieldGenerator(),
                    this.createRepairSystem(),
                    this.createArmorPlating()
                ];
            default:
                return [this.createStructuralBlock()];
        }
    }
}
