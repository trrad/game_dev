/**
 * TrainRenderComponent - Handles rendering of entire trains
 * Part of the ECS-based rendering system refactor
 */
import { TransformNode, Scene, Vector3 } from "@babylonjs/core";
import { RenderComponent, RenderConfig } from "./RenderComponent";
import { TrainCarRenderComponent } from "./TrainCarRenderComponent";
import { TrainCar } from "../entities/TrainCar";
import { Logger, LogCategory } from "../engine/utils/Logger";

/**
 * Train-level render component that manages car render components
 */
export class TrainRenderComponent extends RenderComponent {
    private trainId: string;
    private carRenderComponents: Map<string, TrainCarRenderComponent> = new Map();
    private trainGroupNode: TransformNode;

    constructor(trainId: string, scene: Scene, config: RenderConfig = {}) {
        super(scene, config);
        this.trainId = trainId;
        
        // Create a group node for organizational purposes
        this.trainGroupNode = new TransformNode(`train_group_${trainId}`, scene);
        
        Logger.log(LogCategory.RENDERING, `TrainRenderComponent created for train ${trainId}`);
    }

    /**
     * Create the visual representation - required by base class
     */
    protected createVisual(): void {
        // Visual creation will be handled by individual car render components
        // This is just the organizational structure
    }

    /**
     * Update the visual representation - required by base class
     */
    protected updateVisual(): void {
        // Individual car render components handle their own updates
        // This method is for train-level visual effects
        
        // TODO: Future train-level visual effects (speed effects, steam, etc.)
        
        // TODO: Future LoD system integration at train level
        // this.updateTrainLevelOfDetail();

        // TODO: Future asset streaming for entire train
        // this.updateTrainAssetLoading();
    }

    /**
     * Add a car render component to this train
     */
    addCarRenderComponent(trainCar: TrainCar): TrainCarRenderComponent {
        if (!this.carRenderComponents.has(trainCar.carId)) {
            const carRenderComponent = new TrainCarRenderComponent(trainCar, this.scene);
            
            // Attach the component to the TrainCar entity for SceneManager discovery
            trainCar.addComponent(carRenderComponent);
            
            this.carRenderComponents.set(trainCar.carId, carRenderComponent);
            
            Logger.log(LogCategory.RENDERING, `Added car render component: ${trainCar.carId} to train ${this.trainId}`);
            return carRenderComponent;
        }
        
        return this.carRenderComponents.get(trainCar.carId)!;
    }

    /**
     * Remove a car render component from this train
     */
    removeCarRenderComponent(carId: string): void {
        const carComponent = this.carRenderComponents.get(carId);
        if (carComponent) {
            carComponent.dispose();
            this.carRenderComponents.delete(carId);
            
            Logger.log(LogCategory.RENDERING, `Removed car render component: ${carId} from train ${this.trainId}`);
        }
    }

    /**
     * Get a specific car render component
     */
    getCarRenderComponent(carId: string): TrainCarRenderComponent | undefined {
        return this.carRenderComponents.get(carId);
    }

    /**
     * Get all car render components for this train
     */
    getAllCarRenderComponents(): TrainCarRenderComponent[] {
        return Array.from(this.carRenderComponents.values());
    }

    /**
     * Get the train ID
     */
    getTrainId(): string {
        return this.trainId;
    }

    /**
     * Get the train group node
     */
    getTrainGroupNode(): TransformNode {
        return this.trainGroupNode;
    }

    /**
     * TODO: Future LoD system - adjust train detail based on distance
     */
    private updateTrainLevelOfDetail(): void {
        // Mock implementation for future LoD system at train level
        // const distanceFromCamera = this.calculateTrainDistanceFromCamera();
        // if (distanceFromCamera > 100) {
        //     // Switch to simplified train representation
        //     this.switchToLowDetailTrain();
        // } else {
        //     // Use detailed car-by-car rendering
        //     this.switchToHighDetailTrain();
        // }
    }

    /**
     * TODO: Future asset streaming - manage train-level assets
     */
    private updateTrainAssetLoading(): void {
        // Mock implementation for future asset streaming at train level
        // if (this.isTrainInViewport()) {
        //     this.loadTrainAssets();
        // } else if (this.isTrainFarFromCamera()) {
        //     this.unloadDetailedTrainAssets();
        // }
    }

    /**
     * Dispose of all rendering resources
     */
    dispose(): void {
        // Dispose all car render components
        this.carRenderComponents.forEach(carComponent => {
            carComponent.dispose();
        });
        this.carRenderComponents.clear();

        // Dispose the group node
        this.trainGroupNode.dispose();

        super.dispose();
        
        Logger.log(LogCategory.RENDERING, `TrainRenderComponent disposed for train ${this.trainId}`);
    }
}
