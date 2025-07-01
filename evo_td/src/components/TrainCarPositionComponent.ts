/**
 * TrainCarPositionComponent - Manages position of individual train cars within a train formation.
 * This component handles the specific positioning logic for train cars that need to follow
 * behind a lead engine while maintaining proper spacing and formation.
 */
import { Component } from '../core/Component';
import type { GameObject } from '../core/GameObject';
import { Logger, LogCategory } from '../utils/Logger';

export interface TrainCarPositionState {
    /** Position index within the train (0 = engine, 1 = first car, etc.) */
    carIndex: number;
    /** Distance behind the lead car/engine */
    offsetDistance: number;
    /** Side offset for multiple tracks or special formations */
    sideOffset: number;
    /** Whether this car is connected to a train */
    isConnected: boolean;
    /** ID of the train this car belongs to */
    trainId: string | null;
    /** Length of this car for spacing calculations */
    carLength: number;
}

/**
 * Component that manages the relative positioning of train cars within a train formation.
 * Works in conjunction with RailPositionComponent to maintain proper car spacing and formation.
 */
export class TrainCarPositionComponent extends Component<TrainCarPositionState> {
    public readonly type = 'trainCarPosition';
    
    private _carIndex: number = 0;
    private _offsetDistance: number = 0;
    private _sideOffset: number = 0;
    private _isConnected: boolean = false;
    private _trainId: string | null = null;
    private _carLength: number = 1.0;

    constructor(gameObject: GameObject, carLength: number = 1.0) {
        super();
        this.attachTo(gameObject);
        this._carLength = carLength;
        
        Logger.log(LogCategory.SYSTEM, `TrainCarPositionComponent created for ${gameObject.id}`, {
            carLength
        });
    }

    /**
     * Connect this car to a train at a specific position
     */
    connectToTrain(trainId: string, carIndex: number, spacingDistance: number = 0.3): void {
        this._trainId = trainId;
        this._carIndex = carIndex;
        this._isConnected = true;
        
        // Calculate offset distance based on car index and spacing
        this._offsetDistance = carIndex * (this._carLength + spacingDistance);
        
        Logger.log(LogCategory.TRAIN, `Car connected to train`, {
            carId: this._gameObject?.id,
            trainId,
            carIndex,
            offsetDistance: this._offsetDistance
        });
    }

    /**
     * Disconnect this car from its train
     */
    disconnectFromTrain(): void {
        const wasConnected = this._isConnected;
        this._trainId = null;
        this._carIndex = 0;
        this._offsetDistance = 0;
        this._isConnected = false;
        
        if (wasConnected) {
            Logger.log(LogCategory.TRAIN, `Car disconnected from train`, {
                carId: this._gameObject?.id
            });
        }
    }

    /**
     * Update car position in formation (called when train composition changes)
     */
    updateFormationPosition(newCarIndex: number, spacingDistance: number = 0.3): void {
        if (!this._isConnected) return;
        
        this._carIndex = newCarIndex;
        this._offsetDistance = newCarIndex * (this._carLength + spacingDistance);
        
        Logger.log(LogCategory.TRAIN, `Car formation position updated`, {
            carId: this._gameObject?.id,
            trainId: this._trainId,
            newCarIndex,
            newOffsetDistance: this._offsetDistance
        });
    }

    /**
     * Set side offset for special formations or multi-track scenarios
     */
    setSideOffset(sideOffset: number): void {
        this._sideOffset = sideOffset;
    }

    /**
     * Calculate the rail progress offset this car should have relative to the train engine
     */
    calculateRailProgressOffset(railLength: number): number {
        if (!this._isConnected || railLength <= 0) return 0;
        
        // Convert distance offset to progress offset
        return this._offsetDistance / railLength;
    }

    /**
     * Check if this is the engine car (index 0)
     */
    isEngine(): boolean {
        return this._carIndex === 0 && this._isConnected;
    }

    /**
     * Get the distance this car should maintain behind the car in front of it
     */
    getFollowDistance(): number {
        return this._carLength + 0.3; // Car length + spacing gap
    }

    // Getters
    getCarIndex(): number { return this._carIndex; }
    getOffsetDistance(): number { return this._offsetDistance; }
    getSideOffset(): number { return this._sideOffset; }
    isConnected(): boolean { return this._isConnected; }
    getTrainId(): string | null { return this._trainId; }
    getCarLength(): number { return this._carLength; }

    serialize(): TrainCarPositionState {
        return {
            carIndex: this._carIndex,
            offsetDistance: this._offsetDistance,
            sideOffset: this._sideOffset,
            isConnected: this._isConnected,
            trainId: this._trainId,
            carLength: this._carLength
        };
    }

    deserialize(data: TrainCarPositionState): void {
        this._carIndex = data.carIndex;
        this._offsetDistance = data.offsetDistance;
        this._sideOffset = data.sideOffset;
        this._isConnected = data.isConnected;
        this._trainId = data.trainId;
        this._carLength = data.carLength;
    }
}