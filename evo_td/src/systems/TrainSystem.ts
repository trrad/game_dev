/**
 * Manages train entities and their behaviors.
 */
import { Logger, LogCategory } from '../utils/Logger';
import { GameObject } from '../core/GameObject';
import { Train } from '../entities/Train';
import type { TrainConfig } from '../types/TrainConfig';
import { PositionComponent, type Position3D } from '../components/PositionComponent';
import { MovementComponent } from '../components/MovementComponent';
import { TrainCarPositionComponent } from '../components/TrainCarPositionComponent';
import { Rail } from '../game/Rail';
import { TimeManager } from '../game/TimeManager';
import { Vector3 } from '@babylonjs/core';
import { TrainRenderer } from '../renderers/TrainRenderer';
import { TrainCar } from '../game/TrainCar';

export class TrainSystem {
    private trains: Map<string, Train> = new Map();
    private metrics: Map<string, number> = new Map();
    private rails: Map<string, Rail> = new Map(); // Reference to rails for movement calculations
    private timeManager: TimeManager | null = null; // Reference to TimeManager
    private trainRenderer: TrainRenderer | null = null; // Reference to TrainRenderer for visual updates

    constructor() {
        // Initialize metrics
        this.metrics.set('active_trains', 0);
        this.metrics.set('journeys_started', 0);
        this.metrics.set('journeys_completed', 0);
    }

    /**
     * Initialize a train's position at a station
     */
    initializeTrainAtStation(trainId: string, stationId: string): void {
        const train = this.trains.get(trainId);
        if (!train) {
            Logger.error(LogCategory.TRAIN, `Cannot initialize non-existent train`, new Error(`Train ${trainId} not found`));
            return;
        }

        const carPositionComponent = train.getComponent<TrainCarPositionComponent>('train_car_positions');
        if (!carPositionComponent) {
            Logger.error(LogCategory.TRAIN, `Train missing car position component`, new Error(`Train ${trainId} missing TrainCarPositionComponent`));
            return;
        }

        // Find a rail connected to this station to get the station position
        let stationPosition: Vector3 | null = null;
        for (const rail of this.rails.values()) {
            if (rail.stationA === stationId) {
                stationPosition = rail.getPositionAt(0); // Start of rail
                break;
            } else if (rail.stationB === stationId) {
                stationPosition = rail.getPositionAt(1); // End of rail
                break;
            }
        }

        if (!stationPosition) {
            Logger.error(LogCategory.TRAIN, `Cannot find position for station`, new Error(`Station ${stationId} not found on any rail`));
            return;
        }

        // Position all cars at the station position exactly
        const cars = carPositionComponent.getAllCarPositions();

        cars.forEach((carData) => {
            // Place cars exactly at the station position (no offset for now)
            const carPosition = new Vector3(
                stationPosition.x, // Exact station position
                0.3, // Fixed height
                stationPosition.z  // Exact station position
            );
            const rotation = new Vector3(0, 0, 0); // Facing forward

            carPositionComponent.updateCarPosition(carData.carId, carPosition, rotation, 0);
        });

        // Update the renderer immediately
        if (this.trainRenderer) {
            this.trainRenderer.updateTrainCarPositionsFromSystem(trainId, carPositionComponent);
        }

        Logger.log(LogCategory.TRAIN, `Initialized train ${trainId} at station ${stationId}`);
    }

    /**
     * Add cars to a train (should be called after creating the train)
     */
    addCarsToTrain(trainId: string, cars: TrainCar[]): void {
        const train = this.trains.get(trainId);
        if (!train) {
            Logger.error(LogCategory.TRAIN, `Cannot add cars to non-existent train`, new Error(`Train ${trainId} not found`));
            return;
        }

        const carPositionComponent = train.getComponent<TrainCarPositionComponent>('train_car_positions');
        if (!carPositionComponent) {
            Logger.error(LogCategory.TRAIN, `Train missing car position component`, new Error(`Train ${trainId} missing TrainCarPositionComponent`));
            return;
        }

        // Add each car to the position component
        cars.forEach((car, index) => {
            carPositionComponent.addCar(car, index);
        });

        Logger.log(LogCategory.TRAIN, `Added ${cars.length} cars to train ${trainId}`);
    }

    /**
     * Set the TimeManager reference for time-scaled movement
     */
    setTimeManager(timeManager: TimeManager): void {
        this.timeManager = timeManager;
        Logger.log(LogCategory.SYSTEM, `TimeManager connected to TrainSystem`);
    }
    
    /**
     * Set the TrainRenderer reference for visual updates
     */
    setTrainRenderer(trainRenderer: TrainRenderer): void {
        this.trainRenderer = trainRenderer;
        Logger.log(LogCategory.SYSTEM, `TrainRenderer connected to TrainSystem`);
    }

    /**
     * Add a rail to the system for train movement calculations
     */
    addRail(rail: Rail): void {
        this.rails.set(rail.railId, rail);
        Logger.log(LogCategory.SYSTEM, `Rail added to TrainSystem`, {
            railId: rail.railId,
            name: rail.name,
            totalRails: this.rails.size
        });
    }

    private setupEventHandlers(train: Train): void {
        train.on('journey_completed', () => {
            this.metrics.set('journeys_completed', 
                (this.metrics.get('journeys_completed') || 0) + 1
            );
        });
    }

    /**
     * Create a new train for a player
     */
    createTrain(playerId: string, config: TrainConfig, position?: Position3D): Train {
        const train = new Train(playerId, config);
        
        // Set initial position if provided
        if (position) {
            const posComponent = train.getComponent<PositionComponent>('position');
            if (posComponent) {
                posComponent.setPosition(position);
            }
        }

        this.setupEventHandlers(train);
        this.trains.set(train.id, train);
        this.metrics.set('active_trains', this.trains.size);

        Logger.log(LogCategory.TRAIN, `Train created in system`, {
            trainId: train.id,
            playerId,
            activeTrains: this.trains.size
        });

        return train;
    }

    /**
     * Start a train's journey along a rail
     * @param trainId ID of the train to move
     * @param railId ID of the rail to travel on
     * @param targetStationId ID of the target station
     */
    startRailJourney(trainId: string, railId: string, targetStationId: string): boolean {
        const train = this.trains.get(trainId);
        const rail = this.rails.get(railId);
        
        if (!train) {
            Logger.error(LogCategory.TRAIN, `Train not found for journey`, new Error(`Train ${trainId} not found`));
            return false;
        }
        
        if (!rail) {
            Logger.error(LogCategory.TRAIN, `Rail not found for journey`, new Error(`Rail ${railId} not found`));
            return false;
        }

        // Check if train is already moving
        if (train.isMoving) {
            Logger.log(LogCategory.TRAIN, `Journey request denied - train already moving`, {
                trainId,
                requestedRailId: railId,
                requestedTarget: targetStationId
            });
            return false;
        }

        // Get train's current position to determine direction
        const posComponent = train.getComponent<PositionComponent>('position');
        const movementComponent = train.getComponent<MovementComponent>('movement');
        
        if (!posComponent || !movementComponent) {
            Logger.error(LogCategory.TRAIN, `Train missing required components`, new Error(`Train ${trainId} missing position or movement component`));
            return false;
        }

        // Determine travel direction based on which station we're leaving
        const currentPos = posComponent.getPosition();
        const stationAPos = rail.getPositionAt(0);
        const stationBPos = rail.getPositionAt(1);
        
        const distanceToA = Vector3.Distance(new Vector3(currentPos.x, currentPos.y, currentPos.z), stationAPos);
        const distanceToB = Vector3.Distance(new Vector3(currentPos.x, currentPos.y, currentPos.z), stationBPos);
        
        // If we're closer to station A, we're going towards station B (forward)
        // If we're closer to station B, we're going towards station A (reverse)
        const direction = distanceToA < distanceToB ? 'forward' : 'reverse';
        
        // Start rail movement
        movementComponent.startRailMovement(railId, targetStationId, direction);
        
        this.metrics.set('journeys_started', (this.metrics.get('journeys_started') || 0) + 1);
        
        Logger.log(LogCategory.TRAIN, `Train journey started`, {
            trainId,
            railId,
            targetStationId,
            direction,
            currentPosition: `(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`
        });

        return true;
    }

    /**
     * Update all trains, including smooth movement along rails
     */
    update(deltaTime: number): void {
        for (const train of this.trains.values()) {
            this.updateTrainMovement(train, deltaTime);
            train.update(deltaTime);
        }
    }

    /**
     * Update smooth movement for a single train
     */
    private updateTrainMovement(train: Train, deltaTime: number): void {
        const movementComponent = train.getComponent<MovementComponent>('movement');
        const positionComponent = train.getComponent<PositionComponent>('position');
        const carPositionComponent = train.getComponent<TrainCarPositionComponent>('train_car_positions');
        
        if (!movementComponent || !positionComponent || !carPositionComponent) return;
        
        // Only update if train is moving along a rail
        if (!movementComponent.isRailMoving()) return;
        
        const railId = movementComponent.getRailId();
        if (!railId) return;
        
        const rail = this.rails.get(railId);
        if (!rail) return;
        
        // Get time scaling factor from TimeManager
        const timeScale = this.timeManager ? this.timeManager.getSpeed() : 1;
        
        // Calculate progress delta based on train speed, rail length, and time scaling
        const trainSpeed = movementComponent.getSpeed(); // units per second
        const railLength = rail.totalDistance;
        const scaledDeltaTime = deltaTime * timeScale;
        const progressDelta = (trainSpeed * scaledDeltaTime) / railLength;
        
        // Update progress
        movementComponent.updateRailProgress(progressDelta);
        
        // Get new position along the rail (this represents the front of the train)
        const frontProgress = movementComponent.getRailProgress();
        const frontPosition = rail.getPositionAt(frontProgress);
        
        // Update train entity position (for the train as a whole)
        positionComponent.setPosition({
            x: frontPosition.x,
            y: frontPosition.y,
            z: frontPosition.z
        });
        
        // Update rotation based on direction along rail
        const direction = rail.getDirectionAt(frontProgress);
        if (direction) {
            // Convert direction to rotation (looking along the direction)
            const rotationY = Math.atan2(direction.x, direction.z);
            positionComponent.setRotation({
                x: 0,
                y: rotationY,
                z: 0
            });
        }
        
        // Calculate authoritative car positions
        this.updateCarPositions(train, frontProgress, rail);
        
        // Update renderer with authoritative positions
        if (this.trainRenderer) {
            this.trainRenderer.updateTrainCarPositionsFromSystem(train.id, carPositionComponent);
        }
        
        // Check if journey is complete
        if (movementComponent.isMovementComplete()) {
            this.completeJourney(train);
        }
    }

    /**
     * Calculate authoritative positions for all cars in a train
     * This is the single source of truth for car positioning
     * Simple approach: place each car directly along the rail path
     */
    private updateCarPositions(train: Train, frontProgress: number, rail: Rail): void {
        const carPositionComponent = train.getComponent<TrainCarPositionComponent>('train_car_positions');
        if (!carPositionComponent) return;

        const cars = carPositionComponent.getAllCarPositions();
        if (cars.length === 0) return;

        // Simple car spacing in progress units (similar to original app.ts)
        const railLength = rail.totalDistance;
        const carSpacing = 2.5; // Fixed spacing in world units
        
        let currentProgress = frontProgress;

        for (let i = 0; i < cars.length; i++) {
            const carData = cars[i];
            
            // Get car length from the car's configuration  
            const carLength = carData.car.length;
            
            // Simple approach: place each car at its progress point
            const carPosition = rail.getPositionAt(currentProgress);
            const carDirection = rail.getDirectionAt(currentProgress);
            
            if (carPosition) {
                // Use fixed height of 0.3 to match original app.ts
                const position = new Vector3(carPosition.x, 0.3, carPosition.z);
                const rotation = new Vector3(0, 0, 0);
                
                if (carDirection) {
                    rotation.y = Math.atan2(carDirection.x, carDirection.z);
                }
                
                // Update authoritative position
                carPositionComponent.updateCarPosition(carData.carId, position, rotation, currentProgress);
                
                // Move back for next car by car length + spacing
                const progressOffset = (carLength + carSpacing) / railLength;
                currentProgress = Math.max(0, currentProgress - progressOffset);
            }
        }
    }

    /**
     * Complete a train's journey
     */
    private completeJourney(train: Train): void {
        const movementComponent = train.getComponent<MovementComponent>('movement');
        if (!movementComponent) return;
        
        const targetStationId = movementComponent.getTargetStationId();
        
        // Stop movement
        movementComponent.stopRailMovement();
        
        // Update metrics
        this.metrics.set('journeys_completed', (this.metrics.get('journeys_completed') || 0) + 1);
        
        Logger.log(LogCategory.TRAIN, `Train journey completed`, {
            trainId: train.id,
            targetStationId
        });
        
        // Trigger journey completed metric update (the event handler will catch this)
        // The setupEventHandlers method already handles journey_completed events
    }

    /**
     * Remove a train from the system
     */
    removeTrain(trainId: string): void {
        const train = this.trains.get(trainId);
        if (train) {
            train.dispose();
            this.trains.delete(trainId);
            this.metrics.set('active_trains', this.trains.size);

            Logger.log(LogCategory.TRAIN, `Train removed from system`, {
                trainId,
                activeTrains: this.trains.size
            });
        }
    }

    /**
     * Get a train by ID
     */
    getTrain(trainId: string): Train | undefined {
        return this.trains.get(trainId);
    }

    /**
     * Get all trains for a player
     */
    getPlayerTrains(playerId: string): Train[] {
        return Array.from(this.trains.values())
            .filter(train => train.playerId === playerId);
    }

    /**
     * Get system metrics
     */
    getMetrics(): Map<string, number> {
        return new Map(this.metrics);
    }
}
