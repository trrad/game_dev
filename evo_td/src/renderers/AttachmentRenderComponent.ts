/**
 * AttachmentRenderComponent - Handles rendering of train car attachments (weapons, turrets, etc.)
 * Part of the ECS-based rendering system refactor using Entity-Level Registration pattern
 */
import { Mesh, Scene, Vector3, StandardMaterial, Color3, AbstractMesh } from "@babylonjs/core";
import { RenderComponent, RenderConfig } from "./RenderComponent";
import { Attachment } from "../entities/Attachment";
import { PositionComponent } from "../components/PositionComponent";
import { Logger, LogCategory } from "../engine/utils/Logger";

/**
 * Attachment render component that handles visual representation of attachments
 * Uses Entity-Level Registration pattern - automatically discovered by SceneManager
 */
export class AttachmentRenderComponent extends RenderComponent {
    private attachment?: Attachment; // Set in onAttach()

    constructor(scene: Scene, config: RenderConfig = {}) {
        super(scene, config);
        
        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent created`);
    }

    /**
     * Called when component is attached to entity - automatically creates visuals
     */
    onAttach(): void {
        // Cast the GameObject to Attachment to access attachment properties
        // IMPORTANT: This must be done BEFORE calling super.onAttach() 
        // because super.onAttach() calls createVisual() which needs this.attachment
        this.attachment = this._gameObject as Attachment;
        
        if (!this.attachment) {
            Logger.warn(LogCategory.RENDERING, `AttachmentRenderComponent attached to non-attachment entity: ${this._gameObject?.id}`);
            return; // Don't proceed if we can't cast to Attachment
        }

        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent onAttach called`, {
            attachmentId: this.attachment.id,
            attachmentType: this.attachment.getConfig().type,
            entityId: this._gameObject?.id
        });
        
        // Now call super.onAttach() which will trigger createVisual()
        super.onAttach();
        
        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent onAttach completed`, {
            attachmentId: this.attachment.id,
            hasMesh: !!this.mesh,
            meshName: this.mesh?.name || 'none'
        });
    }

    /**
     * Create the visual representation of the attachment
     */
    protected createVisual(): void {
        if (!this.attachment) {
            Logger.warn(LogCategory.RENDERING, `Cannot create visual - attachment not set`);
            return;
        }
        
        const config = this.attachment.getConfig();
        Logger.log(LogCategory.RENDERING, `Creating visual for attachment`, {
            attachmentId: this.attachment.id,
            attachmentType: config.type,
            attachmentName: config.name,
            color: config.color
        });
        
        if (config.type === 'weapon') {
            this.createWeaponMesh();
        } else {
            this.createGenericAttachmentMesh();
        }
        
        Logger.log(LogCategory.RENDERING, `Visual created for attachment`, {
            attachmentId: this.attachment.id,
            meshName: this.mesh?.name || 'none',
            meshPosition: this.mesh ? `(${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})` : 'none',
            meshVisible: this.mesh?.isVisible || false
        });
    }

    /**
     * Update the visual representation - required by base class
     */
    protected updateVisual(): void {
        if (!this.mesh || !this.attachment) return;

        // Get position from PositionComponent
        const positionComponent = this.attachment.getComponent('position') as PositionComponent;
        if (positionComponent) {
            const position = positionComponent.getPosition();
            const oldPosition = `(${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})`;
            this.mesh.position.set(position.x, position.y, position.z);
            
            Logger.debug(LogCategory.RENDERING, `Updated attachment visual position`, {
                attachmentId: this.attachment.id,
                oldPosition: oldPosition,
                newPosition: `(${position.x}, ${position.y}, ${position.z})`,
                meshPosition: `(${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})`
            });
        } else {
            Logger.warn(LogCategory.RENDERING, `No position component found for attachment: ${this.attachment.id}`);
        }

        // TODO: Future LoD system integration
        // this.updateAttachmentLevelOfDetail();

        // TODO: Future asset system integration
        // this.updateAttachmentAssets();
    }

    /**
     * Create a weapon mesh (typically a turret)
     */
    private createWeaponMesh(): void {
        if (!this.attachment) return;
        
        const config = this.attachment.getConfig();
        const weaponMesh = Mesh.CreateCylinder(
            `weapon_${this.attachment.id}`,
            0.8,  // height
            0.3,  // top diameter
            0.4,  // bottom diameter
            8,    // tessellation
            1,    // subdivisions
            this.scene
        );

        // Create material
        const material = new StandardMaterial(`weapon_material_${this.attachment.id}`, this.scene);
        const color = config.color;
        material.diffuseColor = new Color3(color.r, color.g, color.b);
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        weaponMesh.material = material;

        // Position will be updated by updateVisual() using PositionComponent
        weaponMesh.position.y += 0.4; // Raise slightly above the mount surface

        this.mesh = weaponMesh;
    }

    /**
     * Create a generic attachment mesh
     */
    private createGenericAttachmentMesh(): void {
        if (!this.attachment) return;
        
        const config = this.attachment.getConfig();
        const attachmentMesh = Mesh.CreateBox(
            `attachment_${this.attachment.id}`,
            0.6,
            this.scene
        );

        // Create material
        const material = new StandardMaterial(`attachment_material_${this.attachment.id}`, this.scene);
        const color = config.color;
        material.diffuseColor = new Color3(color.r, color.g, color.b);
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        attachmentMesh.material = material;

        // Position will be updated by updateVisual() using PositionComponent
        attachmentMesh.position.y += 0.3; // Raise slightly above the mount surface

        this.mesh = attachmentMesh;
    }
    /**
     * Get the attachment entity
     */
    getAttachment(): Attachment | undefined {
        return this.attachment;
    }

    /**
     * Get the attachment type
     */
    getAttachmentType(): string {
        return this.attachment?.getConfig().type || 'unknown';
    }

    /**
     * Get the current mount position from PositionComponent
     */
    getMountPosition(): Vector3 {
        if (!this.attachment) return Vector3.Zero();
        
        const positionComponent = this.attachment.getComponent('position') as PositionComponent;
        if (positionComponent) {
            const pos = positionComponent.getPosition();
            return new Vector3(pos.x, pos.y, pos.z);
        }
        return Vector3.Zero();
    }

    /**
     * Update the attachment's mount position (updates PositionComponent)
     */
    updateMountPosition(newPosition: Vector3): void {
        if (!this.attachment) return;
        
        const positionComponent = this.attachment.getComponent('position') as PositionComponent;
        if (positionComponent) {
            positionComponent.setPosition({
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z
            });
            // Visual will be updated automatically via updateVisual()
        }
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
        //     this.loadCustomAttachmentModel(this.getAttachmentType());
        // }
    }

    /**
     * Dispose of the attachment rendering resources
     */
    dispose(): void {
        super.dispose();
        Logger.log(LogCategory.RENDERING, `AttachmentRenderComponent disposed for type: ${this.getAttachmentType()}`);
    }
}
