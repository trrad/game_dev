/**
 * TrainCarRenderComponent - Handles rendering of entire train cars
 * Part of the ECS-based rendering system refactor
 */
import { Mesh, TransformNode, Scene, Vector3, AbstractMesh, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import { RenderComponent, RenderConfig } from "./RenderComponent";
import { TrainCar } from "../entities/TrainCar";
import { VoxelRenderComponent, VoxelRenderConfig } from "./VoxelRenderComponent";
import { AttachmentRenderComponent } from "./AttachmentRenderComponent";
import { Attachment } from "../entities/Attachment";
import { PositionComponent } from "../components/PositionComponent";
import { Logger, LogCategory } from "../engine/utils/Logger";

/**
 * Configuration specific to train car rendering
 */
export interface TrainCarRenderConfig extends RenderConfig {
    showDebugMesh?: boolean; // Show debug orientation mesh for the whole car
    debugMeshColor?: Color3; // Color for the debug mesh
}

/**
 * Train car-level render component that manages voxel and attachment rendering
 */
export class TrainCarRenderComponent extends RenderComponent {
    private trainCar: TrainCar;
    private voxelRenderComponents: Map<string, VoxelRenderComponent> = new Map();
    private attachmentRenderComponents: Map<string, AttachmentRenderComponent> = new Map();
    private carGroupNode: TransformNode;
    private debugMesh?: Mesh; // Debug mesh to visualize car orientation
    private trainCarConfig: TrainCarRenderConfig;

    constructor(trainCar: TrainCar, scene: Scene, config: TrainCarRenderConfig = {}) {
        super(scene, config);
        this.trainCar = trainCar;
        this.trainCarConfig = {
            showDebugMesh: true, // Enable debug mesh by default for debugging
            debugMeshColor: new Color3(1, 0, 0), // Red debug mesh
            ...config
        };
        
        // Create a group node for organizational purposes
        this.carGroupNode = new TransformNode(`car_group_${trainCar.carId}`, scene);
        
        Logger.log(LogCategory.RENDERING, `TrainCarRenderComponent created for car ${trainCar.carId}`);
    }

    /**
     * Create the visual representation - required by base class
     */
    protected createVisual(): void {
        this.initializeCarRendering();
        this.createDebugMesh();
    }

    /**
     * Update the visual representation - required by base class
     */
    protected updateVisual(): void {
        // Update debug mesh position and rotation
        this.updateDebugMesh();
        
        // The individual render components will be updated by their own event subscriptions
        // This method is for car-level visual updates only
        
        // TODO: Future car-level visual effects (e.g., overall car damage, speed effects)
        
        // TODO: Future LoD system integration point
        // this.updateLevelOfDetail();

        // TODO: Future asset streaming integration point
        // this.updateAssetLoading();
        
        this.updateDebugMesh();
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
     * Create debug mesh to visualize car orientation and direction
     */
    private createDebugMesh(): void {
        if (!this.trainCarConfig.showDebugMesh) {
            Logger.log(LogCategory.RENDERING, `Debug mesh disabled for car ${this.trainCar.carId}`);
            return;
        }

        Logger.log(LogCategory.RENDERING, `Creating debug mesh for car ${this.trainCar.carId}`, {
            actualLength: this.trainCar.actualLength,
            showDebugMesh: this.trainCarConfig.showDebugMesh
        });

        // Create a simple box mesh to represent the car - make it MUCH more visible
        this.debugMesh = MeshBuilder.CreateBox(
            `debug_car_${this.trainCar.carId}`, 
            { 
                width: Math.max(20.0, this.trainCar.actualLength * 5), // Make it MUCH larger
                height: 10.0, // Make it much taller
                depth: 8.0 // Make it much wider for visibility
            }, 
            this.scene
        );

        // Set the mesh property so SceneManager can find it
        this.mesh = this.debugMesh;

        // Set up material with high visibility
        const material = new StandardMaterial(`debug_car_mat_${this.trainCar.carId}`, this.scene);
        material.diffuseColor = this.trainCarConfig.debugMeshColor || new Color3(1, 0, 0);
        material.alpha = 1.0; // Make it completely opaque
        material.emissiveColor = new Color3(1.0, 0.2, 0.2); // Make it glow bright red
        material.wireframe = false; // Use solid for better visibility
        material.backFaceCulling = false; // Ensure both sides are rendered
        this.debugMesh.material = material;

        // Set initial position and rotation - elevate it significantly above voxels
        const positionComponent = this.trainCar.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const carPosition = positionComponent.getPosition();
            const carRotation = positionComponent.getRotation();
            
            // Place it well above the voxels for visibility
            this.debugMesh.position.set(carPosition.x, carPosition.y + 15.0, carPosition.z);
            this.debugMesh.rotation.set(carRotation.x, carRotation.y, carRotation.z);
        } else {
            // Fallback position if no position component
            this.debugMesh.position.set(0, 15.0, 0);
            Logger.warn(LogCategory.RENDERING, `No position component found for car ${this.trainCar.carId}, using fallback position`);
        }

        // Don't parent to car group initially - set absolute position for testing
        // this.debugMesh.parent = this.carGroupNode;

        // Ensure the mesh is visible and enabled
        this.debugMesh.setEnabled(true);
        this.debugMesh.isVisible = true;
        
        // Check scene registration
        const sceneContainsMesh = this.scene.meshes.includes(this.debugMesh);

        Logger.log(LogCategory.RENDERING, `Created debug mesh for car ${this.trainCar.carId}`, {
            dimensions: `${Math.max(20.0, this.trainCar.actualLength * 5)}x10.0x8.0`,
            position: `(${this.debugMesh.position.x}, ${this.debugMesh.position.y}, ${this.debugMesh.position.z})`,
            rotation: `(${this.debugMesh.rotation.x}, ${this.debugMesh.rotation.y}, ${this.debugMesh.rotation.z})`,
            visible: this.debugMesh.isVisible,
            enabled: this.debugMesh.isEnabled(),
            material: !!this.debugMesh.material,
            wireframe: this.debugMesh.material?.wireframe || false,
            sceneRegistered: sceneContainsMesh,
            sceneId: this.scene.uid,
            meshId: this.debugMesh.id
        });
    }

    /**
     * Update debug mesh position and rotation
     */
    private updateDebugMesh(): void {
        if (!this.debugMesh) return;

        const positionComponent = this.trainCar.getComponent<PositionComponent>('position');
        if (!positionComponent) return;

        const carPosition = positionComponent.getPosition();
        const carRotation = positionComponent.getRotation();

        // Update position and rotation
        this.debugMesh.position.set(carPosition.x, carPosition.y + 15.0, carPosition.z); // High above ground for visibility
        this.debugMesh.rotation.set(carRotation.x, carRotation.y, carRotation.z);
    }

    /**
     * Override position updates to also update debug mesh
     */
    protected onPositionChanged(positionData: any): void {
        super.onPositionChanged(positionData);
        this.updateDebugMesh();
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

        // Dispose debug mesh
        if (this.debugMesh) {
            this.debugMesh.dispose();
            this.debugMesh = undefined;
        }

        // Dispose the group node
        this.carGroupNode.dispose();

        super.dispose();
        
        Logger.log(LogCategory.RENDERING, `TrainCarRenderComponent disposed for car ${this.trainCar.carId}`);
    }
}
