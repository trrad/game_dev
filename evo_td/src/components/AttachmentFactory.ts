/**
 * AttachmentFactory - Creates pre-configured attachment components for the modular train system
 */

import { AttachmentComponent, AttachmentConfig, AttachmentType, AttachmentSlotType } from './AttachmentComponent';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * Pre-defined attachment configurations
 */
export class AttachmentFactory {
    
    /**
     * Create a basic turret weapon attachment
     */
    static createBasicTurret(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.WEAPON,
            name: 'Basic Turret',
            description: 'A simple automated turret for defending against enemies',
            size: { width: 1, height: 2, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 150,
            health: 100,
            cost: 500,
            color: { r: 0.8, g: 0.2, b: 0.2 },
            properties: new Map([
                ['damage', 25],
                ['range', 10],
                ['fireRate', 2.0], // shots per second
                ['ammoCapacity', 100],
                ['currentAmmo', 100]
            ])
        };

        const attachment = new AttachmentComponent(config);
        
        Logger.log(LogCategory.SYSTEM, `Created basic turret attachment`, {
            name: config.name,
            damage: config.properties.get('damage'),
            range: config.properties.get('range')
        });

        return attachment;
    }

    /**
     * Create a heavy cannon attachment
     */
    static createHeavyCannon(): AttachmentComponent {
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a cargo container attachment
     */
    static createCargoContainer(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.CARGO,
            name: 'Cargo Container',
            description: 'Additional storage space for trade goods',
            size: { width: 2, height: 2, depth: 2 },
            allowedSlots: [AttachmentSlotType.TOP, AttachmentSlotType.INTERNAL],
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

        return new AttachmentComponent(config);
    }

    /**
     * Create armor plating attachment
     */
    static createArmorPlating(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.DEFENSIVE,
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a shield generator attachment
     */
    static createShieldGenerator(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.DEFENSIVE,
            name: 'Shield Generator',
            description: 'Generates an energy shield to absorb damage',
            size: { width: 1, height: 2, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP, AttachmentSlotType.INTERNAL],
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a repair system attachment
     */
    static createRepairSystem(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Auto-Repair System',
            description: 'Automatically repairs damage to the train over time',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.INTERNAL],
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a sensor array attachment
     */
    static createSensorArray(): AttachmentComponent {
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a power generator attachment
     */
    static createPowerGenerator(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.ENGINE,
            name: 'Auxiliary Power Unit',
            description: 'Additional power generation for energy-hungry systems',
            size: { width: 2, height: 1, depth: 2 },
            allowedSlots: [AttachmentSlotType.INTERNAL],
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

        return new AttachmentComponent(config);
    }

    /**
     * Create a basic structural block
     */
    static createStructuralBlock(): AttachmentComponent {
        const config: AttachmentConfig = {
            type: AttachmentType.STRUCTURAL,
            name: 'Structural Block',
            description: 'Basic building block for custom train car designs',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [
                AttachmentSlotType.TOP,
                AttachmentSlotType.SIDE_LEFT,
                AttachmentSlotType.SIDE_RIGHT,
                AttachmentSlotType.INTERNAL
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

        return new AttachmentComponent(config);
    }

    /**
     * Create an attachment by name
     */
    static createByName(name: string): AttachmentComponent | null {
        switch (name.toLowerCase()) {
            case 'basic_turret':
            case 'turret':
                return this.createBasicTurret();
            case 'heavy_cannon':
            case 'cannon':
                return this.createHeavyCannon();
            case 'cargo_container':
            case 'cargo':
                return this.createCargoContainer();
            case 'armor_plating':
            case 'armor':
                return this.createArmorPlating();
            case 'shield_generator':
            case 'shield':
                return this.createShieldGenerator();
            case 'repair_system':
            case 'repair':
                return this.createRepairSystem();
            case 'sensor_array':
            case 'sensor':
                return this.createSensorArray();
            case 'power_generator':
            case 'power':
                return this.createPowerGenerator();
            case 'structural_block':
            case 'block':
                return this.createStructuralBlock();
            default:
                Logger.warn(LogCategory.SYSTEM, `Unknown attachment type: ${name}`);
                return null;
        }
    }

    /**
     * Get a list of all available attachment types
     */
    static getAvailableTypes(): string[] {
        return [
            'basic_turret',
            'heavy_cannon',
            'cargo_container',
            'armor_plating',
            'shield_generator',
            'repair_system',
            'sensor_array',
            'power_generator',
            'structural_block'
        ];
    }

    /**
     * Get sample loadouts for different car types
     */
    static getSampleLoadout(carType: string): AttachmentComponent[] {
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
