/**
 * AttachmentSlotComponent - Represents a slot on a train car where attachments (weapons, cargo, etc.) can be mounted.
 * Handles slot type, occupancy, and allowed attachment types.
 */
import { Component } from '../../engine/components/Component';
import type { GameObject } from '../../engine/core/GameObject';
import { AttachmentSlotType } from '../entities/Attachment/Attachment';

export interface AttachmentSlotConfig {
    slotType: AttachmentSlotType;
    allowedTypes: string[];
    occupied: boolean;
    attachmentId?: string;
}

export class AttachmentSlotComponent extends Component<AttachmentSlotConfig> {
    public readonly type = 'attachmentSlot';
    private _slotType: AttachmentSlotType;
    private _allowedTypes: string[];
    private _occupied: boolean;
    private _attachmentId?: string;

    constructor(gameObject: GameObject, config: AttachmentSlotConfig) {
        super();
        this.attachTo(gameObject);
        this._slotType = config.slotType;
        this._allowedTypes = config.allowedTypes;
        this._occupied = config.occupied;
        this._attachmentId = config.attachmentId;
    }

    get slotType(): AttachmentSlotType {
        return this._slotType;
    }

    get allowedTypes(): string[] {
        return this._allowedTypes;
    }

    get occupied(): boolean {
        return this._occupied;
    }

    get attachmentId(): string | undefined {
        return this._attachmentId;
    }

    occupy(attachmentId: string): void {
        this._occupied = true;
        this._attachmentId = attachmentId;
    }

    vacate(): void {
        this._occupied = false;
        this._attachmentId = undefined;
    }

    serialize(): any {
        return {
            slotType: this._slotType,
            allowedTypes: this._allowedTypes,
            occupied: this._occupied,
            attachmentId: this._attachmentId
        };
    }

    deserialize(data: any): void {
        this._slotType = data.slotType;
        this._allowedTypes = data.allowedTypes;
        this._occupied = data.occupied;
        this._attachmentId = data.attachmentId;
    }
}
