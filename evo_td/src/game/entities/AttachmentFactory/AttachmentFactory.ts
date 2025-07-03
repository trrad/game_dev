/**
 * AttachmentFactory - Creates pre-configured attachment entities for the modular train system
 */
import { Attachment, AttachmentConfig, AttachmentType, AttachmentSlotType } from '../Attachment/Attachment';
import { Logger, LogCategory } from '../../../engine/utils/Logger';
import { EventStack } from '../../../engine/core/EventStack';

export class AttachmentFactory {
    /**
     * Create a basic turret weapon attachment
     */
    static createBasicTurret(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.WEAPON,
            name: 'Basic Turret',
            description: 'A simple automated turret for defending against enemies',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP],
            weight: 150,
            health: 100,
            cost: 500,
            color: { r: 0.8, g: 0.2, b: 0.2 },
            properties: new Map<string, any>([
                ['damage', 25],
                ['range', 15],
                ['fireRate', 0.25],
                ['ammoCapacity', 100],
                ['currentAmmo', 100],
                ['autoTarget', true],
                ['targetTypes', 'enemy'],
                ['rotationSpeed', 180],
                ['accuracy', 0.8]
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
     * Create a basic shield attachment
     */
    static createBasicShield(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.SHIELD,
            name: 'Basic Shield',
            description: 'A simple energy shield for protecting against enemy fire',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.FRONT],
            weight: 200,
            health: 150,
            cost: 700,
            color: { r: 0.2, g: 0.2, b: 0.8 },
            properties: new Map<string, any>([
            ['shieldStrength', 50],
            ['energyConsumption', 5],
            ['rechargeRate', 2],
            ['duration', 10],
            ['cooldown', 5]
            ])
        };
        const attachment = new Attachment(config, eventStack);
        Logger.log(LogCategory.SYSTEM, `Created basic shield attachment`, {
            name: config.name,
            shieldStrength: config.properties.get('shieldStrength'),
            energyConsumption: config.properties.get('energyConsumption')
        });
        return attachment;
    }
    /**
     * Create a basic sensor attachment
     */
    static createBasicSensor(eventStack?: EventStack): Attachment {
        const config: AttachmentConfig = {
            type: AttachmentType.UTILITY,
            name: 'Basic Sensor',
            description: 'A simple sensor for detecting nearby objects',
            size: { width: 1, height: 1, depth: 1 },
            allowedSlots: [AttachmentSlotType.TOP, AttachmentSlotType.BOTTOM],
            weight: 50,
            health: 100,
            cost: 200,
            color: { r: 0.2, g: 0.8, b: 0.8 },
            properties: new Map<string, any>([
                ['detectionRange', 20],
                ['angle', 90],
                ['interval', 1],
                ['isActive', true]
            ])
        };
        const attachment = new Attachment(config, eventStack);
        Logger.log(LogCategory.SYSTEM, `Created basic sensor attachment`, {
            name: config.name,
            detectionRange: config.properties.get('detectionRange')
        });
        return attachment;
    }
}
