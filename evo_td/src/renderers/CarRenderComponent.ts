/**
 * CarRenderComponent - Handles rendering of entire train cars
 * Part of the ECS-based rendering system refactor
 */
import { Mesh, TransformNode, Scene, Vector3, AbstractMesh } from "@babylonjs/core";
import { RenderComponent, RenderConfig } from "./RenderComponent";
import { TrainCar } from "../entities/TrainCar";
import { VoxelRenderComponent, VoxelRenderConfig } from "./VoxelRenderComponent";
import { AttachmentRenderComponent } from "./AttachmentRenderComponent";
import { Attachment } from "../entities/Attachment";
import { PositionComponent } from "../components/PositionComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Car-level render component that manages voxel and attachment rendering
 */
export class CarRenderComponent extends RenderComponent {
    private trainCar: TrainCar;
    private voxelRenderComponents: Map<string, VoxelRenderComponent> = new Map();
    private attachmentRenderComponents: Map<string, AttachmentRenderComponent> = new Map();
    private carGroupNode: TransformNode;

    constructor(trainCar: TrainCar, scene: Scene, config: RenderConfig = {}) {
        super(scene, config);
        this.trainCar = trainCar;
        
        // Create a group node for organizational purposes
        this.carGroupNode = new TransformNode(`car_group_${trainCar.carId}`, scene);
        
        Logger.log(LogCategory.RENDERING, `CarRenderComponent created for car ${trainCar.carId}`);
    }

    /**
     * Create the visual representation - required by base class
     */
    protected createVisual(): void {
        this.initializeCarRendering();
    }

    /**
     * Update the visual representation - required by base class
     */
    protected updateVisual(): void {
        // The individual render components will be updated by their own event subscriptions
        // This method is for car-level visual updates only
        
        // TODO: Future car-level visual effects (e.g., overall car damage, speed effects)
        
        // TODO: Future LoD system integration point
        // this.updateLevelOfDetail();

        // TODO: Future asset streaming integration point
        // this.updateAssetLoading();
    }

    /**
     * Initialize rendering for all voxels and attachments in this car
     */
    private initializeCarRendering(): void {
        // Create render components for all voxels
        const voxels = this.trainCar.getVoxels();
        voxels.forEach(voxel => {
            const voxelRenderComponent = new VoxelRenderComponent(this.scene, { size: 0.4 });
            // Attach the component to the voxel entity
            voxel.addComponent(voxelRenderComponent);
            this.voxelRenderComponents.set(voxel.id, voxelRenderComponent);
        });

        // Create render components for all attachments
        const attachments = this.trainCar.getAttachments();
        Logger.log(LogCategory.RENDERING, `Processing attachments for car ${this.trainCar.carId}`, {
            attachmentCount: attachments.length,
            attachmentIds: attachments.map(a => a.id),
            attachmentTypes: attachments.map(a => a.getConfig().type)
        });
        
        attachments.forEach((attachment, index) => {
            Logger.log(LogCategory.RENDERING, `Creating render component for attachment ${index + 1}/${attachments.length}`, {
                attachmentId: attachment.id,
                attachmentType: attachment.getConfig().type,
                carId: this.trainCar.carId
            });
            
            const attachmentRenderComponent = new AttachmentRenderComponent(this.scene);
            // Attach the component to the attachment entity
            attachment.addComponent(attachmentRenderComponent);
            this.attachmentRenderComponents.set(attachment.id, attachmentRenderComponent);
            
            // Get attachment position for debugging
            const positionComponent = attachment.getComponent('position') as PositionComponent;
            const position = positionComponent ? positionComponent.getPosition() : null;
            Logger.log(LogCategory.RENDERING, `Attachment render component attached`, {
                attachmentId: attachment.id,
                position: position ? `(${position.x}, ${position.y}, ${position.z})` : 'null',
                hasRenderComponent: !!attachment.getComponent('render')
            });
        });

        Logger.log(LogCategory.RENDERING, `Car rendering initialized`, {
            carId: this.trainCar.carId,
            voxelCount: voxels.length,
            attachmentCount: attachments.length
        });
    }

    /**
     * Update the car's rendering based on current state
     */
    update(): void {
        // The individual render components will be updated by their own event subscriptions
        // This method is for car-level updates and backward compatibility
        this.updateVisual();
    }

    /**
     * Add a new voxel render component
     */
    addVoxelRenderComponent(voxel: any): void {
        if (!this.voxelRenderComponents.has(voxel.id)) {
            const voxelRenderComponent = new VoxelRenderComponent(this.scene, { size: 0.4 });
            voxel.addComponent(voxelRenderComponent);
            this.voxelRenderComponents.set(voxel.id, voxelRenderComponent);
            
            Logger.log(LogCategory.RENDERING, `Added voxel render component: ${voxel.id}`);
        }
    }

    /**
     * Remove a voxel render component
     */
    removeVoxelRenderComponent(voxelId: string): void {
        const voxelComponent = this.voxelRenderComponents.get(voxelId);
        if (voxelComponent) {
            voxelComponent.dispose();
            this.voxelRenderComponents.delete(voxelId);
            
            Logger.log(LogCategory.RENDERING, `Removed voxel render component: ${voxelId}`);
        }
    }

    /**
     * Add a new attachment render component
     */
    addAttachmentRenderComponent(attachment: Attachment): void {
        if (!this.attachmentRenderComponents.has(attachment.id)) {
            const attachmentRenderComponent = new AttachmentRenderComponent(this.scene);
            attachment.addComponent(attachmentRenderComponent);
            this.attachmentRenderComponents.set(attachment.id, attachmentRenderComponent);
            
            Logger.log(LogCategory.RENDERING, `Added attachment render component: ${attachment.id} (${attachment.getConfig().type})`);
        }
    }

    /**
     * Remove an attachment render component
     */
    removeAttachmentRenderComponent(attachmentId: string): void {
        const attachmentComponent = this.attachmentRenderComponents.get(attachmentId);
        if (attachmentComponent) {
            attachmentComponent.dispose();
            this.attachmentRenderComponents.delete(attachmentId);
            
            Logger.log(LogCategory.RENDERING, `Removed attachment render component: ${attachmentId}`);
        }
    }

    /**
     * Get a specific voxel render component
     */
    getVoxelRenderComponent(voxelId: string): VoxelRenderComponent | undefined {
        return this.voxelRenderComponents.get(voxelId);
    }

    /**
     * Get all voxel meshes for this car
     */
    getVoxelMeshes(): AbstractMesh[] {
        const meshes: AbstractMesh[] = [];
        this.voxelRenderComponents.forEach(voxelComponent => {
            const mesh = voxelComponent.getMesh();
            if (mesh) {
                meshes.push(mesh);
            }
        });
        return meshes;
    }

    /**
     * Find the best voxel mesh for mounting an attachment of a given type
     * Now integrates with the attachment system
     */
    getAttachmentMountVoxel(attachmentType: string): AbstractMesh | null {
        // For weapons, find the topmost voxel
        if (attachmentType === 'weapon') {
            // TODO: Add method to VoxelRenderComponent to get voxel entity or position
            // For now, return the first available voxel
            const firstVoxelComponent = Array.from(this.voxelRenderComponents.values())[0];
            return firstVoxelComponent?.getMesh() || null;
        }

        // For other attachments, return the first available voxel
        const firstVoxelComponent = Array.from(this.voxelRenderComponents.values())[0];
        return firstVoxelComponent?.getMesh() || null;
    }

    /**
     * Update attachment visuals when attachments are added/removed
     * This method is called when the car's attachment configuration changes
     */
    updateAttachmentVisuals(): void {
        const currentAttachments = this.trainCar.getAttachments();
        const currentAttachmentIds = new Set(currentAttachments.map(a => a.id));
        const renderedAttachmentIds = new Set(this.attachmentRenderComponents.keys());

        // Add render components for new attachments
        currentAttachments.forEach(attachment => {
            if (!renderedAttachmentIds.has(attachment.id)) {
                this.addAttachmentRenderComponent(attachment);
            }
        });

        // Remove render components for deleted attachments
        renderedAttachmentIds.forEach(attachmentId => {
            if (!currentAttachmentIds.has(attachmentId)) {
                this.removeAttachmentRenderComponent(attachmentId);
            }
        });

        Logger.log(LogCategory.RENDERING, `Updated attachment visuals for car ${this.trainCar.carId}`, {
            attachmentCount: currentAttachments.length,
            renderComponentCount: this.attachmentRenderComponents.size
        });
    }

    /**
     * TODO: Future LoD system - adjust detail based on distance from camera
     */
    private updateLevelOfDetail(): void {
        // Mock implementation for future LoD system
        // const distanceFromCamera = this.calculateDistanceFromCamera();
        // const lodLevel = this.calculateLoDLevel(distanceFromCamera);
        // this.applyLoDLevel(lodLevel);
    }

    /**
     * TODO: Future asset streaming - manage asset loading/unloading
     */
    private updateAssetLoading(): void {
        // Mock implementation for future asset streaming
        // if (this.shouldLoadHighResAssets()) {
        //     this.loadHighResAssets();
        // } else if (this.shouldUnloadAssets()) {
        //     this.unloadNonEssentialAssets();
        // }
    }

    /**
     * Dispose of all rendering resources
     */
    dispose(): void {
        // Dispose all voxel render components
        this.voxelRenderComponents.forEach(voxelComponent => {
            voxelComponent.dispose();
        });
        this.voxelRenderComponents.clear();

        // Dispose all attachment render components
        this.attachmentRenderComponents.forEach(attachmentComponent => {
            attachmentComponent.dispose();
        });
        this.attachmentRenderComponents.clear();

        // Dispose the group node
        this.carGroupNode.dispose();

        super.dispose();
        
        Logger.log(LogCategory.RENDERING, `CarRenderComponent disposed for car ${this.trainCar.carId}`);
    }
}
