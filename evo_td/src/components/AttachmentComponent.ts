/**
 * Handles weapon and upgrade attachments for game objects.
 */
import { Component } from '../core/Component';
import { Logger, LogCategory } from '../utils/Logger';
import type { GameObject } from '../core/GameObject';
import type { Position3D } from './PositionComponent';

export interface Attachment {
    id: string;
    type: string;
    position?: Position3D;
}

export interface AttachmentItem extends Attachment {
    item: GameObject;
}

export class AttachmentComponent extends Component {
    public readonly type = 'attachment';
    private _attachments: Map<string, Attachment> = new Map();
    private _attachmentPoints: Position3D[] = [];
    private _attachedItems: Map<string, GameObject> = new Map();

    addAttachmentPoint(point: Position3D): void {
        this._attachmentPoints.push({ ...point });
    }

    canAttach(position: Position3D): boolean {
        // If no attachment points are defined, allow attachment anywhere
        if (this._attachmentPoints.length === 0) {
            return true;
        }
        
        return this._attachmentPoints.some(p => 
            p.x === position.x && 
            p.y === position.y && 
            p.z === position.z
        );
    }

    attach(attachment: Attachment): boolean {
        // Only check position if it's provided
        if (attachment.position && !this.canAttach(attachment.position)) {
            Logger.warn(LogCategory.ATTACHMENT, 'Invalid attachment position', {
                objectId: this._gameObject?.id,
                attachment
            });
            return false;
        }

        this._attachments.set(attachment.id, { ...attachment });
        return true;
    }
    
    /**
     * Attach a game object as an item
     * @param attachmentItem The attachment item with game object
     * @returns True if attachment was successful
     */
    attachItem(attachmentItem: AttachmentItem): boolean {
        const { id, type, item, position } = attachmentItem;
        
        // Create the base attachment
        const attachment: Attachment = { 
            id, 
            type,
            position
        };
        
        // Attach the base attachment
        const success = this.attach(attachment);
        
        if (success) {
            // Store the game object reference
            this._attachedItems.set(id, item);
            
            Logger.log(LogCategory.ATTACHMENT, `Attached ${type} item ${id} to ${this._gameObject?.id}`);
        }
        
        return success;
    }
    
    /**
     * Get an attached game object by ID
     * @param id The attachment ID
     * @returns The attached game object or undefined
     */
    getAttachedItem(id: string): GameObject | undefined {
        return this._attachedItems.get(id);
    }
    
    /**
     * Get all attached game objects
     * @returns Array of attached game objects
     */
    getAttachedItems(): GameObject[] {
        return Array.from(this._attachedItems.values());
    }

    detach(attachmentId: string): boolean {
        // Also remove from attached items if present
        this._attachedItems.delete(attachmentId);
        return this._attachments.delete(attachmentId);
    }

    getAttachments(): Attachment[] {
        return Array.from(this._attachments.values());
    }

    serialize(): any {
        return {
            attachments: Array.from(this._attachments.values()),
            attachmentPoints: [...this._attachmentPoints]
        };
    }

    deserialize(data: any): void {
        this._attachments = new Map(
            (data.attachments ?? []).map((a: Attachment) => [a.id, a])
        );
        this._attachmentPoints = [...(data.attachmentPoints ?? [])];
        
        // Note: attached GameObject references are not serialized/deserialized
        // They need to be re-attached separately after deserialization
    }
}
