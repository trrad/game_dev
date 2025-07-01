/**
 * AttachmentRenderComponent - Handles rendering of train car attachments (weapons, turrets, etc.)
 * Part of the ECS-based rendering system refactor
 */
import { Mesh, Scene, Vector3, StandardMaterial, Color3, AbstractMesh } from "@babylonjs/core";
import { RenderComponent } from "./RenderComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Attachment-specific render configuration
 */
export interface AttachmentRenderConfig {
    scene: Scene;
    attachmentType: string;
    mountPosition?: Vector3;
    color?: Color3;
}

/**
 * Attachment render component that handles visual representation of attachments
 */
export class AttachmentRenderComponent extends RenderComponent {
    private attachment: any; // TODO: Replace with proper Attachment type when available
    private attachmentType: string;
    private mountPosition: Vector3;
    private color: Color3;

    constructor(attachment: any, config: AttachmentRenderConfig) {
        super(config.scene);
        this.attachment = attachment;
        this.attachmentType = config.attachmentType;
        this.mountPosition = config.mountPosition || Vector3.Zero();
        this.color = config.color || new Color3(0.8, 0.2, 0.2); // Default red for weapons
        
        this.createVisual();
        
        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent created for attachment type: ${this.attachmentType}`);
    }

    /**
     * Create the visual representation of the attachment
     */
    protected createVisual(): void {
        if (this.attachmentType === 'weapon') {
            this.createWeaponMesh();
        } else {
            this.createGenericAttachmentMesh();
        }
    }

    /**
     * Create a weapon mesh (typically a turret)
     */
    private createWeaponMesh(): void {
        const weaponMesh = Mesh.CreateCylinder(
            `weapon_${this.attachment.id || 'unknown'}`,
            0.8,  // height
            0.3,  // top diameter
            0.4,  // bottom diameter
            8,    // tessellation
            1,    // subdivisions
            this.scene
        );

        // Create material
        const material = new StandardMaterial(`weapon_material_${this.attachment.id || 'unknown'}`, this.scene);
        material.diffuseColor = this.color;
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        weaponMesh.material = material;

        // Position the weapon on the mount
        weaponMesh.position = this.mountPosition.clone();
        weaponMesh.position.y += 0.4; // Raise slightly above the mount surface

        this.mesh = weaponMesh;
    }

    /**
     * Create a generic attachment mesh
     */
    private createGenericAttachmentMesh(): void {
        const attachmentMesh = Mesh.CreateBox(
            `attachment_${this.attachment.id || 'unknown'}`,
            0.6,
            this.scene
        );

        // Create material
        const material = new StandardMaterial(`attachment_material_${this.attachment.id || 'unknown'}`, this.scene);
        material.diffuseColor = this.color;
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        attachmentMesh.material = material;

        // Position the attachment on the mount
        attachmentMesh.position = this.mountPosition.clone();
        attachmentMesh.position.y += 0.3; // Raise slightly above the mount surface

        this.mesh = attachmentMesh;
    }

    /**
     * Update the attachment's visual representation
     */
    protected updateVisual(): void {
        if (!this.mesh) return;

        // Update position if attachment has moved
        if (this.attachment.position) {
            this.mesh.position.copyFrom(this.attachment.position);
            this.mesh.position.y += 0.4; // Keep raised above surface
        }

        // Update rotation if attachment has rotated
        if (this.attachment.rotation) {
            this.mesh.rotation.copyFrom(this.attachment.rotation);
        }

        // TODO: Future LoD system integration
        // this.updateAttachmentLevelOfDetail();

        // TODO: Future asset system integration
        // this.updateAttachmentAssets();
    }

    /**
     * Update the mount position
     */
    updateMountPosition(newPosition: Vector3): void {
        this.mountPosition = newPosition.clone();
        if (this.mesh) {
            this.mesh.position.copyFrom(this.mountPosition);
            this.mesh.position.y += 0.4; // Keep raised above surface
        }
    }

    /**
     * Update the attachment color
     */
    updateColor(newColor: Color3): void {
        this.color = newColor;
        if (this.mesh && this.mesh.material instanceof StandardMaterial) {
            this.mesh.material.diffuseColor = this.color;
        }
    }

    /**
     * Get the attachment type
     */
    getAttachmentType(): string {
        return this.attachmentType;
    }

    /**
     * Get the mount position
     */
    getMountPosition(): Vector3 {
        return this.mountPosition.clone();
    }

    /**
     * TODO: Future LoD system - adjust attachment detail based on distance
     */
    private updateAttachmentLevelOfDetail(): void {
        // Mock implementation for future LoD system
        // const distanceFromCamera = this.calculateDistanceFromCamera();
        // if (distanceFromCamera > 50) {
        //     // Use low-detail attachment model
        //     this.switchToLowDetailModel();
        // } else {
        //     // Use high-detail attachment model
        //     this.switchToHighDetailModel();
        // }
    }

    /**
     * TODO: Future asset system - manage attachment asset loading
     */
    private updateAttachmentAssets(): void {
        // Mock implementation for future asset system
        // if (this.shouldLoadCustomAttachmentModel()) {
        //     this.loadCustomAttachmentModel(this.attachmentType);
        // }
    }

    /**
     * Dispose of the attachment rendering resources
     */
    dispose(): void {
        super.dispose();
        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent disposed for type: ${this.attachmentType}`);
    }
}
