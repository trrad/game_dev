/**
 * TrainRenderer - Responsible for creating and managing visual representations of trains
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, TransformNode } from "@babylonjs/core";
import { TrainCar } from "../game/TrainCar";
import { TrainCarPositionComponent } from "../components/TrainCarPositionComponent";
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
    carWidth: 1.2,     // Width of each train car (slightly reduced)
    carHeight: 1.0,    // Height of each train car
    carLength: 3.5,    // Length of each train car (much longer for better aspect ratio)
    carSpacing: 0.15,  // Space between cars (much smaller gap)
    yOffset: 0.5,      // Position above ground
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
    private debugCounter: number = 0; // For debug logging

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
     * @returns The created train group containing all car meshes
     */
    createTrainVisual(trainCars: TrainCar[], trainId: string): TransformNode {
        Logger.log(LogCategory.RENDERING, `Creating train visual: ${trainId} with ${trainCars.length} cars`);
        
        // Create a parent node for the entire train
        const trainGroup = new TransformNode(`train_${trainId}`, this.scene);
        
        // Calculate car positions and create individual car visuals
        const carVisuals: TrainCarVisual[] = [];
        
        trainCars.forEach((car, index) => {
            const carMesh = this.createTrainCarVisual(car, index);
            
            // For articulated movement, we don't need pre-calculated offsets
            // Each car will follow the one in front of it during movement
            const carVisual: TrainCarVisual = {
                mesh: carMesh,
                carId: car.id,
                carIndex: index,
                offsetDistance: 0 // Not used in articulated approach
            };
            
            // Position the car initially at the origin (will be updated during movement)
            carMesh.position = new Vector3(0, this.visualConfig.yOffset, 0);
            
            // Do NOT parent the car to the train group - we want absolute positioning
            // carMesh.parent = trainGroup;
            
            carVisuals.push(carVisual);
            
            Logger.log(LogCategory.RENDERING, `Car ${index} created for articulated movement`);
        });
        
        // Store the train visual group for later updates
        const visualGroup: TrainVisualGroup = {
            parentNode: trainGroup,
            cars: carVisuals,
            trainId: trainId
        };
        this.trainVisuals.set(trainId, visualGroup);
        
        // Position the train group at the origin initially
        trainGroup.position = new Vector3(0, 0, 0);
        
        Logger.log(LogCategory.RENDERING, `Train visual created: ${trainId}`, {
            groupPosition: trainGroup.position.toString(),
            carCount: carVisuals.length,
            isEnabled: trainGroup.isEnabled()
        });
        
        return trainGroup;
    }
    
    /**
     * Update train car visuals based on authoritative positions from TrainSystem
     * This is the new preferred method that respects the ECS architecture
     */
    updateTrainCarPositionsFromSystem(trainId: string, carPositionComponent: TrainCarPositionComponent): void {
        const visualGroup = this.trainVisuals.get(trainId);
        if (!visualGroup) return;

        const carPositions = carPositionComponent.getAllCarPositions();
        
        // Update each car visual to match the authoritative position exactly
        carPositions.forEach(carData => {
            const carVisual = visualGroup.cars.find(visual => visual.carId === carData.carId);
            if (carVisual) {
                // Set position and rotation directly from the authoritative data - no offsets!
                carVisual.mesh.position = carData.position.clone();
                carVisual.mesh.rotation = carData.rotation.clone();
            }
        });

        // Update the train group position to the front car position for reference
        const frontCar = carPositionComponent.getFrontCar();
        if (frontCar) {
            visualGroup.parentNode.position = frontCar.position.clone();
        }
    }

    /**
     * Update individual car positions along a rail path using articulated chain physics
     * @deprecated Use updateTrainCarPositionsFromSystem instead for ECS compliance
     * @param trainId The train to update
     * @param frontProgress Progress of the front of the train (0-1)
     * @param rail Rail object with position/direction methods
     */
    updateTrainCarPositions(trainId: string, frontProgress: number, rail: any): void {
        const visualGroup = this.trainVisuals.get(trainId);
        if (!visualGroup) return;
        
        const railLength = rail.totalDistance;
        
        // Debug logging for the first few updates
        if (!this.debugCounter) this.debugCounter = 0;
        if (this.debugCounter < 5) {
            Logger.log(LogCategory.RENDERING, `Train positioning debug`, {
                trainId,
                frontProgress: frontProgress.toFixed(4),
                railLength: railLength.toFixed(2),
                carCount: visualGroup.cars.length
            });
            this.debugCounter++;
        }
        
        // Sort cars by index to ensure proper order (front to back)
        const sortedCars = [...visualGroup.cars].sort((a, b) => a.carIndex - b.carIndex);
        
        let currentProgress = frontProgress;
        
        for (let i = 0; i < sortedCars.length; i++) {
            const carVisual = sortedCars[i];
            const carLength = carVisual.mesh.getBoundingInfo().boundingBox.extendSize.z * 2;
            
            // For the first car (engine), position it directly at the front progress
            if (i === 0) {
                // Use two-point constraint for the front car
                const halfCar = (carLength * 0.5) / railLength;
                const clamp = (v: number) => Math.max(0, Math.min(1, v));
                
                const frontPos = rail.getPositionAt(clamp(currentProgress));
                const backPos = rail.getPositionAt(clamp(currentProgress - (carLength / railLength)));
                
                if (frontPos && backPos) {
                    // Position at midpoint between front and back of this car
                    const midpoint = Vector3.Lerp(backPos, frontPos, 0.5);
                    carVisual.mesh.position = new Vector3(
                        midpoint.x,
                        midpoint.y + this.visualConfig.yOffset,
                        midpoint.z
                    );
                    
                    // Set rotation based on direction
                    const direction = frontPos.subtract(backPos);
                    if (direction.length() > 0.001) {
                        const rotationY = Math.atan2(direction.x, direction.z);
                        carVisual.mesh.rotation = new Vector3(0, rotationY, 0);
                    }
                    
                    // Update progress for next car (move back by this car's length + spacing)
                    currentProgress -= (carLength + this.visualConfig.carSpacing) / railLength;
                    currentProgress = Math.max(0, currentProgress);
                }
            } else {
                // For subsequent cars, position them relative to the previous car
                // This creates an articulated chain effect
                const prevCar = sortedCars[i - 1];
                const prevCarPos = prevCar.mesh.position;
                const prevCarRotation = prevCar.mesh.rotation.y;
                
                // Calculate where this car should be based on the previous car's position and rotation
                const carSpacing = carLength + this.visualConfig.carSpacing;
                
                // Move backwards from the previous car along its facing direction
                const backwardDirection = new Vector3(
                    -Math.sin(prevCarRotation),
                    0,
                    -Math.cos(prevCarRotation)
                );
                
                const targetPosition = prevCarPos.add(backwardDirection.scale(carSpacing));
                
                // Find the closest point on the rail to this target position
                const closestProgress = this.findClosestProgressOnRail(targetPosition, rail, currentProgress);
                
                // Position the car at this progress point
                const carPosition = rail.getPositionAt(closestProgress);
                const carDirection = rail.getDirectionAt(closestProgress);
                
                if (carPosition) {
                    carVisual.mesh.position = new Vector3(
                        carPosition.x,
                        carPosition.y + this.visualConfig.yOffset,
                        carPosition.z
                    );
                    
                    // Set rotation based on rail direction
                    if (carDirection) {
                        const rotationY = Math.atan2(carDirection.x, carDirection.z);
                        carVisual.mesh.rotation = new Vector3(0, rotationY, 0);
                    }
                    
                    currentProgress = closestProgress;
                }
            }
            
            // Debug logging for the first car on the first few updates
            if (carVisual.carIndex === 0 && this.debugCounter <= 5) {
                Logger.log(LogCategory.RENDERING, `Front car position`, {
                    carIndex: carVisual.carIndex,
                    progress: currentProgress.toFixed(4),
                    finalPos: `(${carVisual.mesh.position.x.toFixed(1)}, ${carVisual.mesh.position.z.toFixed(1)})`
                });
            }
        }
        
        // Update the train group position to the front car position for reference
        if (visualGroup.cars.length > 0) {
            const frontCarPosition = rail.getPositionAt(frontProgress);
            if (frontCarPosition) {
                visualGroup.parentNode.position = new Vector3(
                    frontCarPosition.x,
                    frontCarPosition.y,
                    frontCarPosition.z
                );
            }
        }
    }
    
    /**
     * Find the closest progress value on the rail to a target 3D position
     * @param targetPosition The 3D position to find the closest rail point to
     * @param rail The rail object
     * @param startProgress Initial guess for progress (optimization)
     * @returns Progress value (0-1) of the closest point on the rail
     */
    private findClosestProgressOnRail(targetPosition: Vector3, rail: any, startProgress: number): number {
        let closestProgress = startProgress;
        let closestDistance = Infinity;
        
        // Search around the starting progress with decreasing step size
        const searchRange = 0.1; // Search within 10% of rail length
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const testProgress = Math.max(0, Math.min(1, startProgress - searchRange + (2 * searchRange * i / steps)));
            const railPosition = rail.getPositionAt(testProgress);
            
            if (railPosition) {
                const distance = Vector3.Distance(targetPosition, railPosition);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestProgress = testProgress;
                }
            }
        }
        
        return closestProgress;
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
}
