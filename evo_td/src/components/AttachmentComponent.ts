/**
 * AttachmentComponent - Represents an attachment that can be placed on a train car
 * Supports different sizes, types, and mounting configurations for the modular train system
 */

import { Component } from '../core/Component';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * Types of attachments available
 */
export enum AttachmentType {
    WEAPON = 'weapon',
    CARGO = 'cargo',
    UTILITY = 'utility',
    DEFENSIVE = 'defensive',
    ENGINE = 'engine',
    STRUCTURAL = 'structural' // For basic train car blocks
}

/**
 * Where an attachment can be mounted
 */
export enum AttachmentSlotType {
    TOP = 'top',           // On top of train car
    SIDE_LEFT = 'side_left',     // Left side of train car
    SIDE_RIGHT = 'side_right',   // Right side of train car
    FRONT = 'front',       // Front of train car
    REAR = 'rear',         // Rear of train car
    INTERNAL = 'internal'  // Inside the train car (crew, control systems)
}

/**
 * Size of attachment in grid units
 */
export interface AttachmentSize {
    width: number;  // X dimension (units)
    height: number; // Y dimension (units)
    depth: number;  // Z dimension (units)
}

/**
 * Configuration for an attachment
 */
export interface AttachmentConfig {
    type: AttachmentType;
    name: string;
    description: string;
    size: AttachmentSize;
    allowedSlots: AttachmentSlotType[];
    weight: number;
    health: number;
    cost: number;
    
    // Visual properties
    color?: { r: number; g: number; b: number };
    meshName?: string; // For when we upgrade to 3D models
    
    // Gameplay properties
    properties: Map<string, any>;
}

/**
 * Current state of an attachment
 */
export interface AttachmentState {
    health: number;
    maxHealth: number;
    isDestroyed: boolean;
    isActive: boolean;
    
    // Runtime properties that can change
    runtimeProperties: Map<string, any>;
}

/**
 * Positioning information for mounted attachments
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
 * Component representing an attachment that can be mounted on train cars
 */
export class AttachmentComponent extends Component {
    public readonly type = "attachment";
    
    private config: AttachmentConfig;
    private state: AttachmentState;
    private mountInfo: AttachmentMountInfo | null = null;

    constructor(config: AttachmentConfig) {
        super();
        this.config = { ...config };
        this.state = {
            health: config.health,
            maxHealth: config.health,
            isDestroyed: false,
            isActive: true,
            runtimeProperties: new Map(config.properties)
        };
        
        Logger.log(LogCategory.SYSTEM, `Created attachment: ${config.name}`, {
            type: config.type,
            size: config.size,
            allowedSlots: config.allowedSlots
        });
    }

    /**
     * Get attachment configuration
     */
    getConfig(): Readonly<AttachmentConfig> {
        return this.config;
    }

    /**
     * Get current attachment state
     */
    getState(): Readonly<AttachmentState> {
        return { ...this.state };
    }

    /**
     * Get attachment type
     */
    getAttachmentType(): AttachmentType {
        return this.config.type;
    }

    /**
     * Get attachment size
     */
    getSize(): AttachmentSize {
        return { ...this.config.size };
    }

    /**
     * Get allowed slot types for this attachment
     */
    getAllowedSlots(): AttachmentSlotType[] {
        return [...this.config.allowedSlots];
    }

    /**
     * Check if attachment can be placed in a specific slot type
     */
    canAttachToSlot(slotType: AttachmentSlotType): boolean {
        return this.config.allowedSlots.includes(slotType);
    }

    /**
     * Get weight of attachment (affects train performance)
     */
    getWeight(): number {
        return this.config.weight;
    }

    /**
     * Mount the attachment to a specific position and slot
     */
    mount(mountInfo: AttachmentMountInfo): boolean {
        if (!this.canAttachToSlot(mountInfo.slotType)) {
            Logger.warn(LogCategory.SYSTEM, `Cannot mount ${this.config.name} to slot type ${mountInfo.slotType}`, {
                allowedSlots: this.config.allowedSlots,
                requestedSlot: mountInfo.slotType
            });
            return false;
        }

        this.mountInfo = { ...mountInfo };
        Logger.log(LogCategory.SYSTEM, `Mounted attachment ${this.config.name}`, {
            position: `(${mountInfo.x}, ${mountInfo.y}, ${mountInfo.z})`,
            slotType: mountInfo.slotType,
            parentCar: mountInfo.parentCarId
        });
        return true;
    }

    /**
     * Get the mount information where this attachment is positioned
     */
    getMountInfo(): AttachmentMountInfo | null {
        return this.mountInfo ? { ...this.mountInfo } : null;
    }

    /**
     * Check if attachment is currently mounted
     */
    isMounted(): boolean {
        return this.mountInfo !== null;
    }

    /**
     * Remove attachment from its mount
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
     * Apply damage to the attachment
     */
    takeDamage(damage: number): void {
        if (this.state.isDestroyed) return;

        const previousHealth = this.state.health;
        this.state.health = Math.max(0, this.state.health - damage);
        
        Logger.log(LogCategory.SYSTEM, `Attachment ${this.config.name} took ${damage} damage`, {
            previousHealth,
            currentHealth: this.state.health,
            maxHealth: this.state.maxHealth
        });
        
        if (this.state.health <= 0 && !this.state.isDestroyed) {
            this.destroy();
        }
    }

    /**
     * Destroy the attachment
     */
    private destroy(): void {
        this.state.isDestroyed = true;
        this.state.isActive = false;
        
        Logger.log(LogCategory.SYSTEM, `Attachment ${this.config.name} destroyed`, {
            type: this.config.type,
            wasActive: this.state.isActive
        });
        
        // Emit destruction event for systems to handle
        // This could trigger visual effects, drop loot, etc.
    }

    /**
     * Repair the attachment
     */
    repair(amount: number): void {
        if (this.state.isDestroyed) {
            Logger.warn(LogCategory.SYSTEM, `Cannot repair destroyed attachment ${this.config.name}`);
            return;
        }

        const previousHealth = this.state.health;
        this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
        
        Logger.log(LogCategory.SYSTEM, `Repaired attachment ${this.config.name}`, {
            previousHealth,
            currentHealth: this.state.health,
            healingAmount: amount
        });
    }

    /**
     * Set attachment active/inactive state
     */
    setActive(active: boolean): void {
        if (this.state.isDestroyed) {
            Logger.warn(LogCategory.SYSTEM, `Cannot change active state of destroyed attachment ${this.config.name}`);
            return;
        }

        if (this.state.isActive !== active) {
            this.state.isActive = active;
            Logger.log(LogCategory.SYSTEM, `Attachment ${this.config.name} ${active ? 'activated' : 'deactivated'}`);
        }
    }

    /**
     * Get a runtime property value
     */
    getProperty(key: string): any {
        return this.state.runtimeProperties.get(key);
    }

    /**
     * Set a runtime property value
     */
    setProperty(key: string, value: any): void {
        this.state.runtimeProperties.set(key, value);
    }

    /**
     * Get all runtime properties
     */
    getAllProperties(): Map<string, any> {
        return new Map(this.state.runtimeProperties);
    }

    /**
     * Check if attachment is functional (not destroyed and active)
     */
    isFunctional(): boolean {
        return !this.state.isDestroyed && this.state.isActive;
    }

    /**
     * Get health percentage (0-1)
     */
    getHealthPercentage(): number {
        return this.state.maxHealth > 0 ? this.state.health / this.state.maxHealth : 0;
    }

    /**
     * Update attachment logic each frame
     */
    update(deltaTime: number): void {
        // Override in subclasses for specific attachment behavior
        // For example, weapons might have cooling down, cargo might have decay, etc.
        
        // Base update logic - could include things like:
        // - Self-repair over time for certain attachment types
        // - Degradation over time
        // - Status effect processing
    }

    /**
     * Serialize attachment data for network sync or save/load
     */
    serialize(): any {
        return {
            config: {
                ...this.config,
                properties: Array.from(this.config.properties.entries())
            },
            state: {
                ...this.state,
                runtimeProperties: Array.from(this.state.runtimeProperties.entries())
            },
            mountInfo: this.mountInfo
        };
    }

    /**
     * Deserialize attachment data
     */
    deserialize(data: any): void {
        if (data.config) {
            this.config = {
                ...data.config,
                properties: new Map(data.config.properties || [])
            };
        }
        
        if (data.state) {
            this.state = {
                ...data.state,
                runtimeProperties: new Map(data.state.runtimeProperties || [])
            };
        }
        
        this.mountInfo = data.mountInfo || null;
    }

    /**
     * Clean up attachment resources
     */
    dispose(): void {
        this.mountInfo = null;
        this.state.runtimeProperties.clear();
        this.config.properties.clear();
        
        Logger.log(LogCategory.SYSTEM, `Disposed attachment ${this.config.name}`);
        super.dispose();
    }

    /**
     * Get a summary of the attachment for debugging
     */
    getDebugInfo(): any {
        return {
            name: this.config.name,
            type: this.config.type,
            size: this.config.size,
            health: `${this.state.health}/${this.state.maxHealth}`,
            healthPercentage: `${(this.getHealthPercentage() * 100).toFixed(1)}%`,
            weight: this.config.weight,
            isDestroyed: this.state.isDestroyed,
            isActive: this.state.isActive,
            isFunctional: this.isFunctional(),
            isMounted: this.isMounted(),
            mountInfo: this.mountInfo,
            allowedSlots: this.config.allowedSlots,
            propertiesCount: this.state.runtimeProperties.size
        };
    }
}
