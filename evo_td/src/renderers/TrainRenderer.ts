/**
 * TrainRenderer - Responsible for creating and managing visual representations of trains
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, TransformNode } from "@babylonjs/core";
import { TrainCar } from "../entities/TrainCar";
import { AttachmentComponent } from "../components/AttachmentComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Individual car visual representation
 */
export interface TrainCarVisual {
    mesh: Mesh;
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
 * Train visual style configuration
 */
export interface TrainVisualConfig {
    carWidth: number;
    carHeight: number;
    carLength: number;
    carSpacing: number;
    yOffset: number;
    engineColor: Color3;
    carColor: Color3;
}

/**
 * Default visual configuration for trains
 */
const DEFAULT_TRAIN_VISUAL: TrainVisualConfig = {
    carWidth: 0.6,     // Train car width
    carHeight: 0.5,    // Train car height
    carLength: 1.4,    // Longer cars for better train-like proportions
    carSpacing: 0.3,   // Gap between cars to prevent overlap
    yOffset: 0.3,      // Position above ground
    engineColor: new Color3(0.8, 0.2, 0.2), // Red engine
    carColor: new Color3(0.2, 0.2, 0.8)     // Blue cars
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
     * Create a visual representation for a single train car
     * @param trainCar Train car entity
     * @param carIndex Index of the car in the train (0 = engine)
     * @returns The created mesh
     */
    createTrainCarVisual(trainCar: TrainCar, carIndex: number = 0): Mesh {
        const carId = trainCar.id;
        
        Logger.log(LogCategory.RENDERING, `Creating train car visual: ${carId} (index: ${carIndex})`);
        
        // Create the train car mesh
        const carMesh = MeshBuilder.CreateBox(
            `traincar_${carId}`,
            {
                width: this.visualConfig.carWidth,
                height: this.visualConfig.carHeight,
                depth: this.visualConfig.carLength
            },
            this.scene
        );
        
        Logger.log(LogCategory.RENDERING, `Train car mesh created: ${carMesh.name}`, {
            dimensions: `${this.visualConfig.carWidth} x ${this.visualConfig.carHeight} x ${this.visualConfig.carLength}`,
            yOffset: this.visualConfig.yOffset,
            isDisposed: carMesh.isDisposed()
        });
        
        // Position the mesh
        carMesh.position = new Vector3(0, this.visualConfig.yOffset, 0);
        
        // Ensure the mesh is visible
        carMesh.isVisible = true;
        carMesh.checkCollisions = false;
        carMesh.alwaysSelectAsActiveMesh = true; // Force rendering
        
        // Add material with appropriate color
        const material = new StandardMaterial(`traincar_${carId}_mat`, this.scene);
        const color = carIndex === 0 ? this.visualConfig.engineColor : this.visualConfig.carColor;
        material.diffuseColor = color;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Add some glow to make it more visible
        carMesh.material = material;
        
        Logger.log(LogCategory.RENDERING, `Train car visual setup complete: ${carId}`, {
            position: carMesh.position.toString(),
            visible: carMesh.isVisible,
            hasMaterial: !!carMesh.material,
            materialColor: `(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)})`
        });
        
        return carMesh;
    }

    /**
     * Create a visual representation for a complete train
     * @param trainCars Array of train car entities
     * @param trainId Unique identifier for the train
     * @returns The created train group containing references to car meshes
     */
    createTrainVisual(trainCars: TrainCar[], trainId: string): TransformNode {
        Logger.log(LogCategory.RENDERING, `Creating train visual: ${trainId} with ${trainCars.length} cars`);
        
        // Create a parent node for organizational purposes (not for positioning)
        const trainGroup = new TransformNode(`train_${trainId}`, this.scene);
        
        // Create individual car visuals that will be positioned independently
        const carVisuals: TrainCarVisual[] = [];
        let currentOffset = 0;
        
        trainCars.forEach((car, index) => {
            const carMesh = this.createTrainCarVisual(car, index);
            
            // Calculate this car's offset distance from the front of the train
            const carVisual: TrainCarVisual = {
                mesh: carMesh,
                carId: car.id,
                carIndex: index,
                offsetDistance: currentOffset
            };
            
            // Position the car initially at origin - TrainSystem will handle actual positioning
            carMesh.position = new Vector3(0, this.visualConfig.yOffset, 0);
            
            // Don't parent cars to the train group - they will be positioned independently
            // Each car will be registered separately with SceneManager
            
            // Create slot visuals for this car (debug/development feature)
            this.createSlotVisuals(car, carMesh);
            
            carVisuals.push(carVisual);
            
            // Update offset for next car (car length + spacing)
            currentOffset += car.length + this.visualConfig.carSpacing;
            
            Logger.log(LogCategory.RENDERING, `Car ${index} positioned with offset: ${carVisual.offsetDistance}`);
        });
        
        // Store the train visual group for reference (mainly for cleanup)
        const visualGroup: TrainVisualGroup = {
            parentNode: trainGroup,
            cars: carVisuals,
            trainId: trainId
        };
        this.trainVisuals.set(trainId, visualGroup);
        
        // Position the train group at the origin (it's just a reference node)
        trainGroup.position = new Vector3(0, 0, 0);
        
        Logger.log(LogCategory.RENDERING, `Train visual created: ${trainId}`, {
            groupPosition: trainGroup.position.toString(),
            carCount: carVisuals.length,
            totalLength: currentOffset,
            isEnabled: trainGroup.isEnabled()
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
            // Dispose of all car meshes
            visualGroup.cars.forEach(carVisual => {
                carVisual.mesh.dispose();
            });
            
            // Dispose of the parent node
            visualGroup.parentNode.dispose();
            
            // Remove from tracking
            this.trainVisuals.delete(trainId);
            
            Logger.log(LogCategory.RENDERING, `Train visual removed: ${trainId}`);
        }
    }

    /**
     * Create visual representations for attachment slots on a train car
     * @param trainCar The train car to create slot visuals for
     * @param parentNode The parent node to attach slot indicators to
     */
    createSlotVisuals(trainCar: TrainCar, parentNode: TransformNode): void {
        const slotComponent = trainCar.getSlotComponent();
        if (!slotComponent) {
            Logger.warn(LogCategory.RENDERING, `No slot component found for car ${trainCar.carId}`);
            return;
        }

        const slots = slotComponent.getAllSlots();
        Logger.log(LogCategory.RENDERING, `Creating ${slots.length} slot visuals for car ${trainCar.carId}`);

        slots.forEach(slot => {
            // Create a small visual indicator for each slot
            const slotIndicator = MeshBuilder.CreateSphere(
                `slot_${slot.id}`,
                { diameter: 0.08 }, // Much smaller for the new car size
                this.scene
            );

            // Position the indicator at the slot's position, scaled and adjusted for new car dimensions
            // The slot positions need to be scaled down significantly to match our smaller car scale
            const scaledPosition = slot.worldPosition.clone().scale(0.3); // Scale much smaller to match car
            slotIndicator.position = scaledPosition;
            slotIndicator.parent = parentNode;

            // Color code by slot type and occupancy
            const material = new StandardMaterial(`slot_${slot.id}_mat`, this.scene);
            
            if (slot.isOccupied) {
                material.diffuseColor = new Color3(1, 0, 0); // Red for occupied
                material.emissiveColor = new Color3(0.2, 0, 0);
            } else {
                // Different colors for different slot types
                switch (slot.type) {
                    case 'top':
                        material.diffuseColor = new Color3(0, 1, 0); // Green for top
                        break;
                    case 'side_left':
                    case 'side_right':
                        material.diffuseColor = new Color3(0, 0, 1); // Blue for sides
                        break;
                    case 'front':
                    case 'rear':
                        material.diffuseColor = new Color3(1, 1, 0); // Yellow for front/rear
                        break;
                    case 'internal':
                        material.diffuseColor = new Color3(1, 0, 1); // Magenta for internal
                        break;
                    default:
                        material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray for unknown
                }
                material.emissiveColor = material.diffuseColor.scale(0.2);
            }

            slotIndicator.material = material;
            
            // Make slot indicators semi-transparent and non-colliding
            material.alpha = 0.7;
            slotIndicator.checkCollisions = false;
        });
    }

    /**
     * Create visual representation for an attached component
     * @param attachment The attachment component to visualize
     * @param parentNode The parent node to attach the visual to
     */
    createAttachmentVisual(attachment: AttachmentComponent, parentNode: TransformNode): Mesh {
        const config = attachment.getConfig();
        const mountInfo = attachment.getMountInfo();
        
        if (!mountInfo) {
            throw new Error(`Cannot create visual for unmounted attachment ${config.name}`);
        }

        // Create attachment mesh based on size, scaled to fit new car dimensions
        const size = attachment.getSize();
        const attachmentMesh = MeshBuilder.CreateBox(
            `attachment_${config.name}`,
            {
                width: size.width * 0.15,   // Scale down significantly to fit smaller cars
                height: size.height * 0.15, // Scale down significantly to fit smaller cars
                depth: size.depth * 0.15    // Scale down significantly to fit smaller cars
            },
            this.scene
        );

        // Position at mount location - ensure it's properly attached to the car surface
        const adjustedMountInfo = {
            x: mountInfo.x * 0.3, // Scale down the offset positions significantly
            y: mountInfo.y * 0.3, // Scale down the offset positions significantly
            z: mountInfo.z * 0.3  // Scale down the offset positions significantly
        };
        
        attachmentMesh.position = new Vector3(adjustedMountInfo.x, adjustedMountInfo.y, adjustedMountInfo.z);
        attachmentMesh.parent = parentNode;

        // Apply rotation if specified
        if (mountInfo.rotation) {
            attachmentMesh.rotation = new Vector3(
                mountInfo.rotation.x,
                mountInfo.rotation.y,
                mountInfo.rotation.z
            );
        }

        // Create material based on attachment type
        const material = new StandardMaterial(`attachment_${config.name}_mat`, this.scene);
        
        // Color based on attachment type
        switch (config.type) {
            case 'weapon':
                material.diffuseColor = new Color3(0.8, 0.2, 0.2); // Red for weapons
                break;
            case 'cargo':
                material.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown for cargo
                break;
            case 'defensive':
                material.diffuseColor = new Color3(0.3, 0.3, 0.8); // Blue for defense
                break;
            case 'utility':
                material.diffuseColor = new Color3(0.5, 0.8, 0.2); // Green for utility
                break;
            case 'engine':
                material.diffuseColor = new Color3(0.2, 0.2, 0.2); // Dark gray for engine parts
                break;
            default:
                material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray for unknown
        }

        // Add custom color if specified
        if (config.color) {
            material.diffuseColor = new Color3(config.color.r, config.color.g, config.color.b);
        }

        // Adjust material properties based on health
        const healthPercentage = attachment.getHealthPercentage();
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

        Logger.log(LogCategory.RENDERING, `Created attachment visual: ${config.name}`, {
            type: config.type,
            originalSize: `${size.width}x${size.height}x${size.depth}`,
            scaledSize: `${(size.width * 0.15).toFixed(2)}x${(size.height * 0.15).toFixed(2)}x${(size.depth * 0.15).toFixed(2)}`,
            position: `(${adjustedMountInfo.x.toFixed(2)}, ${adjustedMountInfo.y.toFixed(2)}, ${adjustedMountInfo.z.toFixed(2)})`,
            health: `${(healthPercentage * 100).toFixed(1)}%`,
            functional: attachment.isFunctional()
        });

        return attachmentMesh;
    }

    /**
     * Get all car meshes for a train (for registering with SceneManager)
     * @param trainId The train ID
     * @returns Array of car meshes with their corresponding car IDs
     */
    getTrainCarMeshes(trainId: string): Array<{ carId: string, mesh: Mesh }> {
        const visualGroup = this.trainVisuals.get(trainId);
        if (!visualGroup) return [];
        
        return visualGroup.cars.map(carVisual => ({
            carId: carVisual.carId,
            mesh: carVisual.mesh
        }));
    }
}
