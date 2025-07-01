/**
 * TrainRenderer - Responsible for creating and managing visual representations of trains
 * Now renders individual voxels rather than monolithic car meshes
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, TransformNode } from "@babylonjs/core";
import { TrainCar } from "../entities/TrainCar";
import { TrainCarVoxel } from "../entities/TrainCarVoxel";
import { Attachment } from "../entities/Attachment";
import { HealthComponent } from "../components/HealthComponent";
import { PositionComponent } from "../components/PositionComponent";
import { VoxelMaterial, CargoCapacityType } from "../components/TrainCarVoxelComponent";
import { Logger, LogCategory } from "../utils/Logger";
import { TrainRenderComponent } from "./TrainRenderComponent";
import { CarRenderComponent } from "./CarRenderComponent";
import { VoxelRenderComponent } from "./VoxelRenderComponent";

/**
 * Individual voxel visual representation
 */
export interface VoxelVisual {
    mesh: Mesh;
    voxelId: string;
    gridPosition: { x: number; y: number; z: number };
    carId: string;
}

/**
 * Individual car visual representation (now contains voxels)
 */
export interface TrainCarVisual {
    voxels: VoxelVisual[];
    carId: string;
    carIndex: number;
    offsetDistance: number; // Distance from the front of the train
}

/**
 * Train visual group containing individual car visuals
 */
export interface TrainVisualGroup {
    parentNode: TransformNode;
    cars: TrainCarVisual[];
    trainId: string;
}

/**
 * Train visual style configuration for voxel-based rendering
 */
export interface TrainVisualConfig {
    voxelSize: number;     // Size of individual voxel cubes
    carSpacing: number;    // Gap between cars (only used for reference, positioning is via PositionComponents)
    yOffset: number;       // Position above ground
    engineColor: Color3;
    cargoColor: Color3;
    structuralColor: Color3;
    damagedColor: Color3;
}

/**
 * Default visual configuration for voxel-based trains
 */
const DEFAULT_TRAIN_VISUAL: TrainVisualConfig = {
    voxelSize: 0.4,        // Size of each voxel cube (smaller)
    carSpacing: 2.0,       // Gap between cars (reference only, positioning via PositionComponents)
    yOffset: 0.4,          // Position above ground
    engineColor: new Color3(0.8, 0.2, 0.2),      // Red engine voxels
    cargoColor: new Color3(0.2, 0.2, 0.8),       // Blue cargo voxels
    structuralColor: new Color3(0.6, 0.6, 0.6),  // Gray structural voxels
    damagedColor: new Color3(0.8, 0.4, 0.1)      // Orange damaged voxels
};

/**
 * Handles the rendering aspects of Train entities
 */
export class TrainRenderer {
    private scene: Scene;
    private visualConfig: TrainVisualConfig;
    private trainVisuals: Map<string, TrainVisualGroup> = new Map();

    /**
     * Create a new TrainRenderer
     * @param scene The Babylon.js scene
     * @param config Optional visual configuration
     */
    constructor(scene: Scene, config?: Partial<TrainVisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_TRAIN_VISUAL, ...config };
        
        Logger.log(LogCategory.RENDERING, "TrainRenderer initialized");
    }

    /**
     * Create a visual representation for individual voxels in a train car
     * @param voxel The voxel to create visuals for
     * @param carId The ID of the parent car
     * @returns The created voxel visual
     */
    createVoxelVisual(voxel: TrainCarVoxel, carId: string): VoxelVisual {
        const voxelId = voxel.id;
        
        Logger.log(LogCategory.RENDERING, `Creating voxel visual: ${voxelId}`);
        
        // Create the voxel mesh as a proper cube
        const voxelMesh = MeshBuilder.CreateBox(
            `voxel_${voxelId}`,
            {
                width: this.visualConfig.voxelSize,
                height: this.visualConfig.voxelSize,
                depth: this.visualConfig.voxelSize
            },
            this.scene
        );
        
        // Get the voxel's world position from its PositionComponent (authoritative)
        const positionComponent = voxel.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const worldPos = positionComponent.getPosition();
            voxelMesh.position = new Vector3(worldPos.x, worldPos.y + this.visualConfig.yOffset, worldPos.z);
        } else {
            Logger.warn(LogCategory.RENDERING, `Voxel ${voxelId} missing PositionComponent, using fallback position`);
            // Fallback to origin if no position component
            voxelMesh.position = new Vector3(0, this.visualConfig.yOffset, 0);
        }
        
        // Ensure the mesh is visible
        voxelMesh.isVisible = true;
        voxelMesh.checkCollisions = false;
        voxelMesh.alwaysSelectAsActiveMesh = true;
        
        // Add material based on voxel properties
        const material = new StandardMaterial(`voxel_${voxelId}_mat`, this.scene);
        const color = this.getVoxelColor(voxel);
        material.diffuseColor = color;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new Color3(0.05, 0.05, 0.05);
        voxelMesh.material = material;
        
        // Store the mesh in the voxel for easy access
        voxel.mesh = voxelMesh;
        
        Logger.log(LogCategory.RENDERING, `Voxel visual created: ${voxelId}`, {
            position: voxelMesh.position.toString(),
            gridPosition: `(${voxel.gridPosition.x}, ${voxel.gridPosition.y}, ${voxel.gridPosition.z})`,
            cargoType: voxel.cargoType,
            material: voxel.material
        });
        
        return {
            mesh: voxelMesh,
            voxelId: voxelId,
            gridPosition: voxel.gridPosition,
            carId: carId
        };
    }

    /**
     * Get the appropriate color for a voxel based on its properties
     */
    private getVoxelColor(voxel: TrainCarVoxel): Color3 {
        // Check health status first
        const healthComponent = voxel.getComponent<HealthComponent>('health');
        if (healthComponent && healthComponent.getHealthPercentage() < 0.5) {
            return this.visualConfig.damagedColor;
        }

        // Color based on cargo type
        switch (voxel.cargoType) {
            case CargoCapacityType.STRUCTURAL:
                return this.visualConfig.structuralColor;
            case CargoCapacityType.STANDARD:
                return this.visualConfig.cargoColor;
            case CargoCapacityType.HAZARDOUS:
                return new Color3(0.8, 0.8, 0.1); // Yellow for hazardous
            case CargoCapacityType.LIQUID:
                return new Color3(0.1, 0.6, 0.8); // Cyan for liquid
            case CargoCapacityType.PERISHABLE:
                return new Color3(0.1, 0.8, 0.1); // Green for perishable
            default:
                return this.visualConfig.cargoColor;
        }
    }

    /**
     * Create a visual representation for a complete train car using voxels
     * @param trainCar Train car entity
     * @param carIndex Index of the car in the train (0 = engine)
     * @returns The created car visual containing voxel meshes
     */
    createTrainCarVisual(trainCar: TrainCar, carIndex: number = 0): TrainCarVisual {
        const carId = trainCar.carId;
        
        Logger.log(LogCategory.RENDERING, `Creating train car visual: ${carId} (index: ${carIndex})`);
        
        // Get all voxels from the train car
        const voxels = trainCar.getVoxels();
        const voxelVisuals: VoxelVisual[] = [];
        
        // Create visual for each voxel
        voxels.forEach(voxel => {
            const voxelVisual = this.createVoxelVisual(voxel, carId);
            voxelVisuals.push(voxelVisual);
        });
        
        Logger.log(LogCategory.RENDERING, `Train car visual created: ${carId}`, {
            voxelCount: voxelVisuals.length,
            carIndex: carIndex
        });
        
        return {
            voxels: voxelVisuals,
            carId: carId,
            carIndex: carIndex,
            offsetDistance: 0 // Will be calculated by caller
        };
    }

    /**
     * Create a visual representation for a complete train
     * @param trainCars Array of train car entities
     * @param trainId Unique identifier for the train
     * @returns The created train group containing references to car meshes
     */
    createTrainVisual(trainCars: TrainCar[], trainId: string): TransformNode {
        Logger.log(LogCategory.RENDERING, `Creating train visual: ${trainId} with ${trainCars.length} cars (LEGACY DISABLED - using Entity-Level Registration)`);
        
        // Create a parent node for organizational purposes only
        const trainGroup = new TransformNode(`train_${trainId}`, this.scene);
        
        // LEGACY SYSTEM DISABLED - Voxels now render themselves via Entity-Level Registration
        // The new VoxelRenderComponents in each voxel handle rendering automatically
        
        // Store empty visual group for reference (for cleanup compatibility)
        const visualGroup: TrainVisualGroup = {
            parentNode: trainGroup,
            cars: [], // Empty - no legacy car visuals created
            trainId: trainId
        };
        this.trainVisuals.set(trainId, visualGroup);
        
        // Position the train group at the origin (it's just a reference node)
        trainGroup.position = new Vector3(0, 0, 0);
        
        Logger.log(LogCategory.RENDERING, `Train visual created: ${trainId} (Entity-Level Registration)`, {
            groupPosition: trainGroup.position.toString(),
            carCount: trainCars.length,
            totalVoxels: 0, // Voxels now render themselves
            isEnabled: trainGroup.isEnabled(),
            renderingSystem: "Entity-Level Registration"
        });
        
        return trainGroup;
    }
    
    /**
     * Update individual car positions from their PositionComponents.
     * TrainSystem handles the positioning logic; this just updates visuals.
     * @param trainId The train to update
     * @param _frontProgress Progress of the front of the train (0-1) - unused in visual-only update
     * @param _rail Rail object with position/direction methods - unused in visual-only update
     */
    updateTrainCarPositions(trainId: string, _frontProgress: number, _rail: any): void {
        const visualGroup = this.trainVisuals.get(trainId);
        if (!visualGroup) return;
        
        // Simply update each car's visual position from its PositionComponent
        // The positioning logic is handled by TrainSystem
        for (const carVisual of visualGroup.cars) {
            // Get the corresponding TrainCar entity (we'll need a way to find it)
            // For now, assume the car mesh position is updated by SceneManager
            // which reads from the car's PositionComponent
            
            // No positioning logic here - just ensure cars are visible and properly rendered
            // The actual positioning is handled by SceneManager reading PositionComponent
        }
    }
    
    /**
     * Get a train visual group by ID
     * @param trainId The train ID
     * @returns The visual group or undefined
     */
    getTrainVisual(trainId: string): TrainVisualGroup | undefined {
        return this.trainVisuals.get(trainId);
    }
    
    /**
     * Remove a train visual
     * @param trainId The train ID to remove
     */
    removeTrainVisual(trainId: string): void {
        const visualGroup = this.trainVisuals.get(trainId);
        if (visualGroup) {
            // Dispose of all voxel meshes in each car
            visualGroup.cars.forEach(carVisual => {
                carVisual.voxels.forEach(voxelVisual => {
                    voxelVisual.mesh.dispose();
                });
            });
            
            // Dispose of the parent node
            visualGroup.parentNode.dispose();
            
            // Remove from tracking
            this.trainVisuals.delete(trainId);
            
            Logger.log(LogCategory.RENDERING, `Train visual removed: ${trainId}`);
        }
    }

    /**
     * Create visual representations for attachment slots on a train car (simplified for voxel system)
     * @param trainCar The train car to create slot visuals for
     * @param parentNode The parent node to attach slot indicators to
     */
    createSlotVisuals(trainCar: TrainCar, parentNode: TransformNode): void {
        // For now, skip slot visuals since we need to adapt this to work with external voxel faces
        // In the new voxel system, attachment slots should be generated from external voxel faces
        Logger.log(LogCategory.RENDERING, `Skipping slot visuals for car ${trainCar.carId} - voxel-based slots not yet implemented`);
        
        // TODO: Implement slot visuals based on external voxel faces:
        // 1. Get external voxels from trainCar.getExternalVoxels()
        // 2. For each external voxel, create slot visuals on its available faces
        // 3. Position slot visuals relative to each voxel's world position
    }

    /**
     * Create visual representation for an attached component (simplified for voxel system)
     * @param attachment The attachment component to visualize
     * @param parentNode The parent node to attach the visual to (first voxel mesh)
     */
    createAttachmentVisual(attachment: Attachment, parentNode: TransformNode): Mesh {
        const config = attachment.getConfig();
        const mountInfo = attachment.getMountInfo();
        
        if (!mountInfo) {
            throw new Error(`Cannot create visual for unmounted attachment ${config.name}`);
        }

        // Create attachment mesh based on size, scaled for voxel system
        const size = attachment.getSize();
        const attachmentMesh = MeshBuilder.CreateBox(
            `attachment_${config.name}`,
            {
                width: size.width * 0.4,   // Scale for voxel system
                height: size.height * 0.4,
                depth: size.depth * 0.4
            },
            this.scene
        );

        // Position attachment based on its type and mounting face
        const attachmentConfig = attachment.getConfig();
        let visualPosition: Vector3;
        
        if (attachmentConfig.type === 'weapon') {
            // Place weapons directly on top face of voxels
            visualPosition = new Vector3(0, this.visualConfig.voxelSize * 0.5, 0);
        } else {
            // Place other attachments directly on side face of voxels
            visualPosition = new Vector3(this.visualConfig.voxelSize * 0.5, 0, 0);
        }
        
        attachmentMesh.position = visualPosition;
        attachmentMesh.parent = parentNode;

        // Create material based on attachment type
        const material = new StandardMaterial(`attachment_${config.name}_mat`, this.scene);
        
        // Color based on attachment type
        switch (attachmentConfig.type) {
            case 'weapon':
                material.diffuseColor = new Color3(0.8, 0.2, 0.2); // Red for weapons
                break;
            case 'cargo':
                material.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown for cargo
                break;
            case 'armor':
                material.diffuseColor = new Color3(0.3, 0.3, 0.8); // Blue for armor
                break;
            case 'utility':
                material.diffuseColor = new Color3(0.5, 0.8, 0.2); // Green for utility
                break;
            case 'shield':
                material.diffuseColor = new Color3(0.2, 0.2, 0.2); // Dark gray for shield generators
                break;
            default:
                material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray for unknown
        }

        // Add custom color if specified
        if (attachmentConfig.color) {
            material.diffuseColor = new Color3(attachmentConfig.color.r, attachmentConfig.color.g, attachmentConfig.color.b);
        }

        // Adjust material properties based on health
        const healthComponent = attachment.getComponent<HealthComponent>('HealthComponent');
        const healthPercentage = healthComponent ? healthComponent.getHealthPercentage() : 1.0;
        if (healthPercentage < 0.5) {
            material.emissiveColor = new Color3(0.3, 0.1, 0.1); // Reddish glow for damaged
        } else if (healthPercentage < 0.8) {
            material.emissiveColor = new Color3(0.3, 0.3, 0.1); // Yellowish glow for worn
        }

        if (!attachment.isFunctional()) {
            material.alpha = 0.5; // Semi-transparent for non-functional
        }

        attachmentMesh.material = material;
        attachmentMesh.checkCollisions = false;

        Logger.log(LogCategory.RENDERING, `Created attachment visual: ${attachmentConfig.name}`, {
            type: attachmentConfig.type,
            scaledSize: `${(size.width * 0.4).toFixed(2)}x${(size.height * 0.4).toFixed(2)}x${(size.depth * 0.4).toFixed(2)}`,
            visualPosition: `(${visualPosition.x.toFixed(2)}, ${visualPosition.y.toFixed(2)}, ${visualPosition.z.toFixed(2)})`,
            health: `${(healthPercentage * 100).toFixed(1)}%`,
            functional: attachment.isFunctional()
        });

        return attachmentMesh;
    }

    /**
     * Get all voxel meshes for a train (for registering with SceneManager)
     * @param trainId The train ID
     * @returns Array of voxel meshes with their corresponding car and voxel IDs
     */
    getTrainCarMeshes(trainId: string): Array<{ carId: string, voxelId: string, mesh: Mesh }> {
        const visualGroup = this.trainVisuals.get(trainId);
        if (!visualGroup) return [];
        
        const allVoxelMeshes: Array<{ carId: string, voxelId: string, mesh: Mesh }> = [];
        
        visualGroup.cars.forEach(carVisual => {
            carVisual.voxels.forEach(voxelVisual => {
                allVoxelMeshes.push({
                    carId: carVisual.carId,
                    voxelId: voxelVisual.voxelId,
                    mesh: voxelVisual.mesh
                });
            });
        });
        
        return allVoxelMeshes;
    }

    /**
     * Update attachment visuals for a specific train car
     * Call this after attachments are added or removed
     */
    updateCarAttachmentVisuals(trainCar: TrainCar): void {
        Logger.log(LogCategory.RENDERING, `Updating attachment visuals for car ${trainCar.carId}`);
        
        // Get current attachments and create visuals for them
        const attachments = trainCar.getAttachments();
        Logger.log(LogCategory.RENDERING, `Creating visuals for ${attachments.length} attachments on car ${trainCar.carId}`);

        attachments.forEach(attachment => {
            try {
                const attachmentConfig = attachment.getConfig();
                const carMesh = this.getCarMesh(trainCar.carId, attachmentConfig.type);
                
                if (!carMesh) {
                    Logger.warn(LogCategory.RENDERING, `Cannot update attachment: car mesh not found for ${trainCar.carId}`);
                    return;
                }

                // Remove existing attachment visual if it exists
                const existingAttachment = carMesh.getChildren().find(child => 
                    child.name === `attachment_${attachmentConfig.name}`
                );
                if (existingAttachment) {
                    existingAttachment.dispose();
                }

                const attachmentVisual = this.createAttachmentVisual(attachment, carMesh);
                Logger.log(LogCategory.RENDERING, `Created visual for attachment: ${attachment.getConfig().name}`, {
                    position: attachmentVisual.position.toString(),
                    visible: attachmentVisual.isVisible,
                    enabled: attachmentVisual.isEnabled(),
                    parent: attachmentVisual.parent?.name || 'no parent'
                });
            } catch (error) {
                Logger.warn(LogCategory.RENDERING, `Failed to create visual for attachment ${attachment.getConfig().name}:`, error);
            }
        });
    }

    /**
     * Update slot visuals for a specific train car to reflect occupancy changes
     */
    updateSlotVisuals(trainCar: TrainCar): void {
        const carMesh = this.getCarMesh(trainCar.carId);
        if (!carMesh) {
            Logger.warn(LogCategory.RENDERING, `Cannot update slot visuals: car mesh not found for ${trainCar.carId}`);
            return;
        }

        // Remove existing slot visuals
        const existingSlots = carMesh.getChildren().filter(child => 
            child.name.startsWith('slot_panel_')
        );
        existingSlots.forEach(child => child.dispose());

        // Recreate slot visuals with updated occupancy
        this.createSlotVisuals(trainCar, carMesh);
        
        Logger.log(LogCategory.RENDERING, `Updated slot visuals for car ${trainCar.carId}`);
    }

    /**
     * Get the appropriate voxel mesh for a specific car by car ID and attachment type
     * For weapons, find a voxel with TOP face available
     * For other attachments, use the first available voxel
     */
    private getCarMesh(carId: string, attachmentType?: string): Mesh | null {
        // Look through all train visuals to find the car's voxels
        for (const trainVisual of this.trainVisuals.values()) {
            const carVisual = trainVisual.cars.find(car => car.carId === carId);
            if (carVisual && carVisual.voxels.length > 0) {
                
                // For weapon attachments, try to find a voxel with TOP face available
                if (attachmentType === 'weapon') {
                    // Find voxel with highest Y position (topmost)
                    let topmostVoxel = carVisual.voxels[0];
                    let highestY = topmostVoxel.gridPosition.y;
                    
                    for (const voxelVisual of carVisual.voxels) {
                        if (voxelVisual.gridPosition.y > highestY) {
                            highestY = voxelVisual.gridPosition.y;
                            topmostVoxel = voxelVisual;
                        }
                    }
                    
                    return topmostVoxel.mesh;
                }
                
                // For other attachments, return the first voxel mesh
                return carVisual.voxels[0].mesh;
            }
        }
        return null;
    }

    /**
     * Get the visual world position of an attachment for accurate projectile firing
     */
    getAttachmentVisualWorldPosition(trainCar: TrainCar, attachment: Attachment): { x: number; y: number; z: number } | null {
        const attachmentConfig = attachment.getConfig();
        const carMesh = this.getCarMesh(trainCar.carId, attachmentConfig.type);
        if (!carMesh) {
            return null;
        }

        const mountInfo = attachment.getMountInfo();
        if (!mountInfo) {
            return null;
        }

        // Find the attachment visual mesh
        const attachmentMesh = carMesh.getChildren().find(child => 
            child.name === `attachment_${attachmentConfig.name}`
        ) as Mesh;

        if (attachmentMesh) {
            // Use the actual rendered position of the attachment mesh
            const worldMatrix = attachmentMesh.getWorldMatrix();
            const worldPosition = Vector3.TransformCoordinates(Vector3.Zero(), worldMatrix);
            
            Logger.log(LogCategory.RENDERING, `Attachment visual position found`, {
                attachmentName: attachmentConfig.name,
                meshPosition: `(${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})`,
                meshExists: true
            });
            
            return {
                x: worldPosition.x,
                y: worldPosition.y,
                z: worldPosition.z
            };
        }

        // Fallback: calculate position based on the parent voxel and attachment type
        const parentVoxelMatrix = carMesh.getWorldMatrix();
        const parentVoxelPos = Vector3.TransformCoordinates(Vector3.Zero(), parentVoxelMatrix);
        
        // Apply the same offset logic as in createAttachmentVisual
        let visualOffset: Vector3;
        if (attachmentConfig.type === 'weapon') {
            visualOffset = new Vector3(0, this.visualConfig.voxelSize * 0.5, 0);
        } else {
            visualOffset = new Vector3(this.visualConfig.voxelSize * 0.5, 0, 0);
        }
        
        const finalPosition = parentVoxelPos.add(visualOffset);
        
        Logger.log(LogCategory.RENDERING, `Attachment visual position calculated`, {
            attachmentName: attachmentConfig.name,
            parentVoxelPos: `(${parentVoxelPos.x.toFixed(2)}, ${parentVoxelPos.y.toFixed(2)}, ${parentVoxelPos.z.toFixed(2)})`,
            visualOffset: `(${visualOffset.x.toFixed(2)}, ${visualOffset.y.toFixed(2)}, ${visualOffset.z.toFixed(2)})`,
            finalPosition: `(${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)})`,
            meshExists: false
        });

        return {
            x: finalPosition.x,
            y: finalPosition.y,
            z: finalPosition.z
        };
    }
}

/**
 * TODO: Future integration - these will replace the monolithic TrainRenderer
 * The new component-based rendering system provides:
 * - TrainRenderComponent: Manages entire train rendering
 * - CarRenderComponent: Manages individual car rendering  
 * - VoxelRenderComponent: Manages individual voxel rendering
 * - AttachmentRenderComponent: Manages attachment rendering (when ready)
 *
 * Integration plan:
 * 1. Create TrainRenderComponent instances for each train
 * 2. Create CarRenderComponent instances for each car
 * 3. VoxelRenderComponent instances are created automatically per voxel
 * 4. Gradually migrate logic from this monolithic renderer to the component system
 * 5. Eventually deprecate this TrainRenderer in favor of pure ECS component approach
 */
