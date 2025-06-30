import { Vector3, Mesh, TransformNode } from "@babylonjs/core";
import { GameObject } from "../core/GameObject";
import { Logger, LogCategory } from "../utils/Logger";
import { PositionComponent } from "../components/PositionComponent";
import { InventoryComponent } from "../components/InventoryComponent";
import { AttachmentComponent } from "../components/AttachmentComponent";
import { AttachmentSlotComponent } from "../components/AttachmentSlotComponent";
import { AttachmentSlotFactory } from "./AttachmentSlotFactory";

export interface TrainCarConfig {
    id: string;
    type: string; // 'engine' | 'cargo' | 'passenger' | 'weapons'
    length: number;
    cargoCapacity?: number;
    attachmentSlots?: number;
    maxHealth?: number;
}

export interface TrainCarState {
    health: number;
    isDamaged: boolean;
    isOperational: boolean;
}

/**
 * TrainCar represents a single car in a train, using the ECS architecture.
 * Cars can carry cargo, mount attachments (like weapons), and take damage.
 */
export class TrainCar extends GameObject {
    private _config: TrainCarConfig;
    private _state: TrainCarState;
    private _mesh?: Mesh;
    private _group?: TransformNode;

    constructor(config: TrainCarConfig) {
        super('trainCar');
        this._config = config;

        // Initialize state
        this._state = {
            health: config.maxHealth || 100,
            isDamaged: false,
            isOperational: true
        };

        // Add required components
        const position = new PositionComponent();
        this.addComponent(position);

        // Add optional components based on car type
        if (config.cargoCapacity) {
            const inventory = new InventoryComponent(this, config.cargoCapacity);
            this.addComponent(inventory);
        }

        // All train cars support attachments via slot system
        const slotConfig = AttachmentSlotFactory.createSlotConfig(config.type);
        const slotComponent = new AttachmentSlotComponent(slotConfig);
        this.addComponent(slotComponent);

        // Initialize metrics
        this.metrics.set('health', this._state.health);
        this.metrics.set('cargo_used', 0);
        this.metrics.set('attachments_count', 0);
        this.metrics.set('damage_taken', 0);

        Logger.log(LogCategory.TRAIN, `TrainCar created`, {
            id: config.id,
            type: config.type
        });
    }

    get carId(): string {
        return this._config.id;
    }

    get carType(): string {
        return this._config.type;
    }

    get length(): number {
        return this._config.length;
    }

    get health(): number {
        return this._state.health;
    }

    get isDamaged(): boolean {
        return this._state.isDamaged;
    }

    get isOperational(): boolean {
        return this._state.isOperational;
    }

    get mesh(): Mesh | undefined {
        return this._mesh;
    }

    set mesh(value: Mesh | undefined) {
        this._mesh = value;
    }

    get group(): TransformNode | undefined {
        return this._group;
    }

    set group(value: TransformNode | undefined) {
        this._group = value;
    }

    /**
     * Update car state and components
     * @param deltaTime Time elapsed since last update in seconds
     */
    override update(deltaTime: number): void {
        // Update base components first
        super.update(deltaTime);

        // Update health state
        if (this._state.health <= 50 && !this._state.isDamaged) {
            this._state.isDamaged = true;
            this.emitEvent({
                type: 'car_damaged',
                carId: this.carId,
                health: this._state.health,
                timestamp: performance.now()
            });
        }

        if (this._state.health <= 0 && this._state.isOperational) {
            this._state.isOperational = false;
            this.emitEvent({
                type: 'car_disabled',
                carId: this.carId,
                timestamp: performance.now()
            });
        }
    }

    /**
     * Take damage and update state
     */
    takeDamage(amount: number): void {
        const prevHealth = this._state.health;
        this._state.health = Math.max(0, this._state.health - amount);
        
        // Update metrics
        this.metrics.set('health', this._state.health);
        this.metrics.set('damage_taken', this.metrics.get('damage_taken')! + amount);

        this.emitEvent({
            type: 'car_damage_taken',
            carId: this.carId,
            damage: amount,
            previousHealth: prevHealth,
            currentHealth: this._state.health,
            timestamp: performance.now()
        });
    }

    /**
     * Repair the car and update state
     */
    repair(amount: number): void {
        const maxHealth = this._config.maxHealth || 100;
        const prevHealth = this._state.health;
        this._state.health = Math.min(maxHealth, this._state.health + amount);

        // Update state flags
        if (this._state.health > 50) {
            this._state.isDamaged = false;
        }
        if (this._state.health > 0) {
            this._state.isOperational = true;
        }

        this.metrics.set('health', this._state.health);

        this.emitEvent({
            type: 'car_repaired',
            carId: this.carId,
            amount: amount,
            previousHealth: prevHealth,
            currentHealth: this._state.health,
            timestamp: performance.now()
        });
    }

    /**
     * Get the attachment slot component for this car
     */
    getSlotComponent(): AttachmentSlotComponent | null {
        return this.getComponent('attachmentSlot') as AttachmentSlotComponent | null;
    }

    /**
     * Add an attachment to this car at a specific grid position
     */
    addAttachment(
        attachment: AttachmentComponent,
        slotType: string,
        gridX: number,
        gridY: number,
        gridZ: number
    ): boolean {
        const slotComponent = this.getSlotComponent();
        if (!slotComponent) {
            Logger.warn(LogCategory.TRAIN, `Cannot add attachment to car ${this.carId}: no slot component`);
            return false;
        }

        const result = slotComponent.placeAttachment(
            attachment,
            slotType as any, // Type assertion for slot type enum
            gridX,
            gridY,
            gridZ
        );

        if (result.success) {
            this.metrics.set('attachments_count', this.metrics.get('attachments_count')! + 1);
            
            this.emitEvent({
                type: 'attachment_added',
                carId: this.carId,
                attachmentName: attachment.getConfig().name,
                attachmentType: attachment.getAttachmentType(),
                gridPosition: { x: gridX, y: gridY, z: gridZ },
                slotType: slotType,
                timestamp: performance.now()
            });

            Logger.log(LogCategory.TRAIN, `Added attachment to car ${this.carId}`, {
                attachment: attachment.getConfig().name,
                position: `(${gridX}, ${gridY}, ${gridZ})`,
                slotType: slotType
            });
        } else {
            Logger.warn(LogCategory.TRAIN, `Failed to add attachment to car ${this.carId}`, {
                error: result.errorMessage,
                conflicts: result.conflictingAttachments
            });
        }

        return result.success;
    }

    /**
     * Remove an attachment from this car
     */
    removeAttachment(attachmentId: string): boolean {
        const slotComponent = this.getSlotComponent();
        if (!slotComponent) {
            Logger.warn(LogCategory.TRAIN, `Cannot remove attachment from car ${this.carId}: no slot component`);
            return false;
        }

        const success = slotComponent.removeAttachment(attachmentId);
        
        if (success) {
            this.metrics.set('attachments_count', Math.max(0, this.metrics.get('attachments_count')! - 1));
            
            this.emitEvent({
                type: 'attachment_removed',
                carId: this.carId,
                attachmentId: attachmentId,
                timestamp: performance.now()
            });

            Logger.log(LogCategory.TRAIN, `Removed attachment from car ${this.carId}`, {
                attachmentId: attachmentId
            });
        }

        return success;
    }

    /**
     * Get all attachments on this car
     */
    getAttachments(): AttachmentComponent[] {
        // This would need to be implemented by tracking attachments
        // For now, return empty array
        return [];
    }

    /**
     * Get attachment capacity statistics
     */
    getAttachmentStats(): any {
        const slotComponent = this.getSlotComponent();
        if (!slotComponent) {
            return { totalSlots: 0, occupied: 0, available: 0 };
        }

        return slotComponent.getOccupancyStats();
    }

    serialize(): TrainCarConfig & TrainCarState {
        return {
            ...this._config,
            ...this._state
        };
    }

    deserialize(data: TrainCarConfig & Partial<TrainCarState>): void {
        this._config = { ...data };
        this._state = {
            health: data.health ?? this._state.health,
            isDamaged: data.isDamaged ?? this._state.isDamaged,
            isOperational: data.isOperational ?? this._state.isOperational
        };

        // Update metrics
        this.metrics.set('health', this._state.health);
    }

    dispose(): void {
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = undefined;
        }
        if (this._group) {
            this._group.dispose();
            this._group = undefined;
        }
        super.dispose();
    }
}
