/**
 * Attachment Entity - Represents physical attachments that can be mounted on train cars
 * This is a proper GameObject with PositionComponent, HealthComponent, etc.
 */

import { GameObject } from '../../../engine/core/GameObject';
import { PositionComponent } from '../../../engine/components/PositionComponent';
import { HealthComponent } from '../../../engine/components/HealthComponent';
import { EventStack } from '../../../engine/core/EventStack';
import { Logger, LogCategory } from '../../../engine/utils/Logger';

/**
 * Types of attachments available
 */
export enum AttachmentType {
    WEAPON = 'weapon',
    ARMOR = 'armor',
    UTILITY = 'utility',
    CARGO = 'cargo',
    SHIELD = 'shield'
}

/**
 * Slot types where attachments can be mounted
 */
export enum AttachmentSlotType {
    TOP = 'top',
    SIDE_LEFT = 'side_left', 
    SIDE_RIGHT = 'side_right',
    FRONT = 'front',
    REAR = 'rear',
    BOTTOM = 'bottom'
}

/**
 * 3D size of an attachment
 */
export interface AttachmentSize {
    width: number;  // X dimension
    height: number; // Y dimension  
    depth: number;  // Z dimension
}

/**
 * Configuration for creating an attachment
 */
export interface AttachmentConfig {
    name: string;
    description: string;
    type: AttachmentType;
    size: AttachmentSize;
    allowedSlots: AttachmentSlotType[];
    weight: number;
    health: number;
    cost: number;
    color: { r: number; g: number; b: number };
    properties: Map<string, any>; // Custom properties like damage, range, etc.
}

/**
 * Information about where an attachment is mounted
 */
export interface AttachmentMountInfo {
    x: number;
    y: number;
    z: number;
    slotType: AttachmentSlotType;
    parentCarId: string;
    rotation?: { x: number; y: number; z: number };
}

/**
 * Attachment entity - a physical object that can be mounted on train cars
 */
export class Attachment extends GameObject {
    private config: AttachmentConfig;
    private mountInfo: AttachmentMountInfo | null = null;
    private isDestroyed: boolean = false;
    private isActive: boolean = true;
    private runtimeProperties: Map<string, any> = new Map();

    constructor(config: AttachmentConfig, eventStack?: EventStack) {
        super(`attachment_${config.name}_${Date.now()}`, eventStack);
        
        this.config = config;

        // Add core components
        const positionComponent = new PositionComponent();
        positionComponent.setPosition({ x: 0, y: 0, z: 0 });
        this.addComponent(positionComponent);
        
        this.addComponent(new HealthComponent(config.health));

        // Copy properties to runtime properties
        for (const [key, value] of config.properties) {
            this.runtimeProperties.set(key, value);
        }

        // Set initial last shot time for weapons
        if (config.type === AttachmentType.WEAPON) {
            this.runtimeProperties.set('lastShotTime', 0);
        }

        Logger.log(LogCategory.SYSTEM, `Created attachment: ${config.name}`, {
            type: config.type,
            size: config.size,
            allowedSlots: config.allowedSlots
        });
    }

    /**
     * Get attachment configuration
     */
    getConfig(): AttachmentConfig {
        return { ...this.config };
    }

    /**
     * Get attachment size
     */
    getSize(): AttachmentSize {
        return { ...this.config.size };
    }

    /**
     * Get allowed slot types
     */
    getAllowedSlots(): AttachmentSlotType[] {
        return [...this.config.allowedSlots];
    }

    /**
     * Mount this attachment at a specific location
     */
    mount(mountInfo: AttachmentMountInfo): boolean {
        if (this.mountInfo) {
            Logger.warn(LogCategory.SYSTEM, `Attachment ${this.config.name} is already mounted`);
            return false;
        }

        this.mountInfo = { ...mountInfo };
        
        // Initially set position to mount position (relative to car)
        // The world position will be calculated when updateWorldPosition is called
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent) {
            positionComponent.setPosition({
                x: mountInfo.x,
                y: mountInfo.y,
                z: mountInfo.z
            });
        }

        Logger.log(LogCategory.SYSTEM, `Mounted attachment ${this.config.name}`, {
            position: `(${mountInfo.x}, ${mountInfo.y}, ${mountInfo.z})`,
            slotType: mountInfo.slotType,
            parentCar: mountInfo.parentCarId
        });
        return true;
    }

    /**
     * Get mount information
     */
    getMountInfo(): AttachmentMountInfo | null {
        return this.mountInfo ? { ...this.mountInfo } : null;
    }

    /**
     * Check if attachment is mounted
     */
    isMounted(): boolean {
        return this.mountInfo !== null;
    }

    /**
     * Unmount this attachment
     */
    unmount(): void {
        if (this.mountInfo) {
            Logger.log(LogCategory.SYSTEM, `Unmounted attachment ${this.config.name}`, {
                previousPosition: `(${this.mountInfo.x}, ${this.mountInfo.y}, ${this.mountInfo.z})`,
                previousSlot: this.mountInfo.slotType
            });
        }
        this.mountInfo = null;
    }

    /**
     * Get world position of this attachment (includes parent car position)
     */
    getWorldPosition(): { x: number; y: number; z: number } | null {
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (!positionComponent) return null;

        return positionComponent.getPosition();
    }

    /**
     * Update world position based on parent car movement
     * This calculates the TRUE logical world position without any visual scaling
     * Visual scaling should be applied only in the renderer
     */
    updateWorldPosition(parentCarPosition: { x: number; y: number; z: number }): void {
        if (!this.mountInfo) return;

        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent) {
            // Calculate logical world position based on mount info
            // This uses full-scale coordinates - the "true" physical position
            let logicalOffset;
            
            switch (this.mountInfo.slotType) {
                case 'top':
                    logicalOffset = {
                        x: this.mountInfo.x,
                        y: this.mountInfo.y + 1.0, // Place on top surface of car (1 unit above car center)
                        z: this.mountInfo.z
                    };
                    break;
                case 'side_left':
                    logicalOffset = {
                        x: this.mountInfo.x - 1.0, // Place on left side of car
                        y: this.mountInfo.y,
                        z: this.mountInfo.z
                    };
                    break;
                case 'side_right':
                    logicalOffset = {
                        x: this.mountInfo.x + 1.0, // Place on right side of car
                        y: this.mountInfo.y,
                        z: this.mountInfo.z
                    };
                    break;
                case 'front':
                    logicalOffset = {
                        x: this.mountInfo.x,
                        y: this.mountInfo.y,
                        z: this.mountInfo.z + 1.0 // Place at front of car
                    };
                    break;
                case 'rear':
                    logicalOffset = {
                        x: this.mountInfo.x,
                        y: this.mountInfo.y,
                        z: this.mountInfo.z - 1.0 // Place at rear of car
                    };
                    break;
                default: // bottom or unknown
                    logicalOffset = {
                        x: this.mountInfo.x,
                        y: this.mountInfo.y,
                        z: this.mountInfo.z
                    };
            }

            positionComponent.setPosition({
                x: parentCarPosition.x + logicalOffset.x,
                y: parentCarPosition.y + logicalOffset.y,
                z: parentCarPosition.z + logicalOffset.z
            });
        }
    }

    /**
     * Get parent car ID
     */
    getParentCarId(): string | null {
        return this.mountInfo?.parentCarId || null;
    }

    /**
     * Weapon-specific methods
     */
    canAttack(): boolean {
        return this.config.type === AttachmentType.WEAPON && !this.isDestroyed && this.isActive;
    }

    getDamage(): number {
        return this.getProperty('damage') || 0;
    }

    getAttackRange(): number {
        return this.getProperty('range') || 1;
    }

    getFireRate(): number {
        return this.getProperty('fireRate') || 1.0;
    }

    getAccuracy(): number {
        return this.getProperty('accuracy') || 0.5;
    }

    hasAmmo(): boolean {
        const currentAmmo = this.getProperty('currentAmmo') || 0;
        return currentAmmo > 0;
    }

    /**
     * Property management
     */
    getProperty(key: string): any {
        return this.runtimeProperties.get(key);
    }

    setProperty(key: string, value: any): void {
        this.runtimeProperties.set(key, value);
    }

    /**
     * Take damage
     */
    takeDamage(damage: number): void {
        const healthComponent = this.getComponent<HealthComponent>('health');
        if (healthComponent) {
            healthComponent.takeDamage(damage, 'kinetic');
            
            if (healthComponent.isDead()) {
                this.isDestroyed = true;
                this.isActive = false;
            }
        }
    }

    /**
     * Check if attachment is destroyed
     */
    isAttachmentDestroyed(): boolean {
        return this.isDestroyed;
    }

    /**
     * Update method for weapon behavior
     */
    update(deltaTime: number): void {
        // Handle weapon-specific updates
        if (this.config.type === AttachmentType.WEAPON && this.canAttack()) {
            this.updateWeaponBehavior(deltaTime);
        }
    }

    /**
     * Update weapon behavior - targeting and firing
     */
    private updateWeaponBehavior(_deltaTime: number): void {
        // Get time since last shot
        const lastShotTime = this.getProperty('lastShotTime') || 0;
        const currentTime = performance.now();
        const timeSinceLastShot = (currentTime - lastShotTime) / 1000; // Convert to seconds
        
        const fireRate = this.getFireRate();
        const timeBetweenShots = 1.0 / fireRate;
        
        // Check if we can fire again
        if (timeSinceLastShot >= timeBetweenShots && this.hasAmmo()) {
            // Emit targeting event - let the combat system handle target finding
            if (this.eventStack) {
                this.eventStack.emit({
                    type: 'turret_request_target',
                    payload: {
                        attachmentId: this.id, // Use GameObject id
                        range: this.getAttackRange(),
                        worldPosition: this.getWorldPosition(),
                        targetTypes: this.getProperty('targetTypes') || 'enemy'
                    },
                    source: 'attachment'
                });
            }
        }
    }

    /**
     * Get attachment type
     */
    getAttachmentType(): AttachmentType {
        return this.config.type;
    }

    /**
     * Check if attachment is functional (not destroyed and active)
     */
    isFunctional(): boolean {
        return !this.isDestroyed && this.isActive;
    }

    /**
     * Serialize attachment data
     */
    serialize(): any {
        return {
            config: {
                ...this.config,
                properties: Array.from(this.config.properties.entries())
            },
            mountInfo: this.mountInfo,
            isDestroyed: this.isDestroyed,
            isActive: this.isActive,
            runtimeProperties: Array.from(this.runtimeProperties.entries())
        };
    }

    /**
     * Deserialize attachment data
     */
    static deserialize(data: any, eventStack?: EventStack): Attachment {
        const config = {
            ...data.config,
            properties: new Map(data.config.properties)
        };
        
        const attachment = new Attachment(config, eventStack);
        
        if (data.mountInfo) {
            attachment.mount(data.mountInfo);
        }
        
        attachment.isDestroyed = data.isDestroyed || false;
        attachment.isActive = data.isActive !== false;
        attachment.runtimeProperties = new Map(data.runtimeProperties || []);
        
        return attachment;
    }

    /**
     * Calculate adjusted mount position for visual and logical consistency
     * This method ensures attachment positions match between visual and logical systems
     */
    static calculateAdjustedMountPosition(mountInfo: AttachmentMountInfo): { x: number; y: number; z: number } {
        switch (mountInfo.slotType) {
            case AttachmentSlotType.TOP:
                return {
                    x: mountInfo.x * 0.3, // Scale down x offset
                    y: 0.4, // Place on top surface of car (car height ~0.3, so 0.4 is just above)
                    z: mountInfo.z * 0.3  // Scale down z offset
                };
            case AttachmentSlotType.SIDE_LEFT:
                return {
                    x: -0.4, // Place on left side of car
                    y: mountInfo.y * 0.3,
                    z: mountInfo.z * 0.3
                };
            case AttachmentSlotType.SIDE_RIGHT:
                return {
                    x: 0.4, // Place on right side of car
                    y: mountInfo.y * 0.3,
                    z: mountInfo.z * 0.3
                };
            case AttachmentSlotType.FRONT:
                return {
                    x: mountInfo.x * 0.3,
                    y: mountInfo.y * 0.3,
                    z: 0.4 // Place at front of car
                };
            case AttachmentSlotType.REAR:
                return {
                    x: mountInfo.x * 0.3,
                    y: mountInfo.y * 0.3,
                    z: -0.4 // Place at rear of car
                };
            default: // bottom or unknown
                return {
                    x: mountInfo.x * 0.3,
                    y: mountInfo.y * 0.3,
                    z: mountInfo.z * 0.3
                };
        }
    }
}
