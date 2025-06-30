/**
 * Manages train entities and their behaviors.
 */
import { Logger, LogCategory } from '../utils/Logger';
import { GameObject } from '../core/GameObject';
import { Train } from '../entities/Train';
import type { TrainConfig } from '../entities/Train';
import { PositionComponent, type Position3D } from '../components/PositionComponent';
import { MovementComponent } from '../components/MovementComponent';
import { Rail } from '../entities/Rail';
import { TimeManager } from '../core/TimeManager';
import { Vector3 } from '@babylonjs/core';
import { TrainRenderer } from '../renderers/TrainRenderer';

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

        // Initialize car positions relative to the train's starting position
        // Note: This will only work if cars are already added to the train
        // For initial setup, call initializeCarPositions() after adding cars
        // this.initializeTrainCarPositions(train);

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
        
        if (!movementComponent || !positionComponent) return;
        
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
        const progress = movementComponent.getRailProgress();
        const frontPosition = rail.getPositionAt(progress);
        
        // Update train entity position (represents the front of the train)
        positionComponent.setPosition({
            x: frontPosition.x,
            y: frontPosition.y,
            z: frontPosition.z
        });
        
        // Update rotation based on direction along rail
        const direction = rail.getDirectionAt(progress);
        if (direction) {
            // Convert direction to rotation (looking along the direction)
            const rotationY = Math.atan2(direction.x, direction.z);
            positionComponent.setRotation({
                x: 0,
                y: rotationY,
                z: 0
            });
        }
        
        // Update individual car positions along the rail
        this.updateTrainCarPositions(train, progress, rail);
        
        // Note: Car visual positions are now updated by SceneManager
        // reading from each car's PositionComponent, so no need to call trainRenderer
        
        // Check if journey is complete
        if (movementComponent.isMovementComplete()) {
            this.completeJourney(train);
        }
    }

    /**
     * Update individual car positions along the rail
     * Each car follows the rail path independently at the correct offset distance
     */
    private updateTrainCarPositions(train: Train, frontProgress: number, rail: Rail): void {
        const trainCars = train.getCars();
        let currentOffset = 0;
        
        for (let i = 0; i < trainCars.length; i++) {
            const car = trainCars[i];
            const carPositionComponent = car.getComponent<PositionComponent>('position');
            
            if (!carPositionComponent) {
                Logger.warn(LogCategory.TRAIN, `TrainCar ${car.carId} missing position component`);
                continue;
            }
            
            // Calculate this car's progress along the rail based on its offset distance
            const railLength = rail.totalDistance;
            const carProgressOffset = currentOffset / railLength;
            const carProgress = Math.max(0, frontProgress - carProgressOffset);
            
            // Get this car's world position and direction from the rail
            const carWorldPosition = rail.getPositionAt(carProgress);
            const carDirection = rail.getDirectionAt(carProgress);
            
            if (carWorldPosition && carDirection) {
                // Update car's position component
                carPositionComponent.setPosition({
                    x: carWorldPosition.x,
                    y: carWorldPosition.y,
                    z: carWorldPosition.z
                });
                
                // Update car's rotation to align with rail direction
                const carRotationY = Math.atan2(carDirection.x, carDirection.z);
                carPositionComponent.setRotation({
                    x: 0,
                    y: carRotationY,
                    z: 0
                });
            }
            
            // Update offset for next car (car length + spacing)
            // Using the same spacing as the renderer for consistency
            currentOffset += car.length + 0.3; // Match carSpacing from TrainRenderer
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
        
        Logger.log(LogCategory.TRAIN, `Train journey completed`, {
            trainId: train.id,
            targetStationId
        });
        
        // Call the train's completeJourney method which will emit the event
        if (targetStationId) {
            train.completeJourney(targetStationId);
        }
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
     * Get all active trains (for use by other systems like EnemySystem)
     */
    getAllTrains(): Train[] {
        return Array.from(this.trains.values());
    }

    /**
     * Get a specific train by ID
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

    /**
     * Initialize individual car positions when a train is first created
     * Cars are positioned in a line behind the train's initial position
     */
    private initializeTrainCarPositions(train: Train): void {
        const trainPositionComponent = train.getComponent<PositionComponent>('position');
        if (!trainPositionComponent) {
            Logger.warn(LogCategory.TRAIN, `Train ${train.id} missing position component during car initialization`);
            return;
        }
        
        const trainPosition = trainPositionComponent.getPosition();
        const trainRotation = trainPositionComponent.getRotation();
        const trainCars = train.getCars();
        
        // Calculate direction vector from rotation (assuming Y rotation represents heading)
        const directionX = Math.sin(trainRotation.y);
        const directionZ = Math.cos(trainRotation.y);
        
        let currentOffset = 0;
        
        for (let i = 0; i < trainCars.length; i++) {
            const car = trainCars[i];
            const carPositionComponent = car.getComponent<PositionComponent>('position');
            
            if (!carPositionComponent) {
                Logger.warn(LogCategory.TRAIN, `TrainCar ${car.carId} missing position component during initialization`);
                continue;
            }
            
            // Calculate car position: train position minus offset along the train's direction
            const carPosition = {
                x: trainPosition.x - (directionX * currentOffset),
                y: trainPosition.y,
                z: trainPosition.z - (directionZ * currentOffset)
            };
            
            // Set car position and rotation to match train
            carPositionComponent.setPosition(carPosition);
            carPositionComponent.setRotation(trainRotation);
            
            Logger.log(LogCategory.TRAIN, `Initialized car position: ${car.carId}`, {
                carPosition: `(${carPosition.x.toFixed(2)}, ${carPosition.y.toFixed(2)}, ${carPosition.z.toFixed(2)})`,
                offset: currentOffset.toFixed(2)
            });
            
            // Update offset for next car (car length + spacing)
            // Using the same spacing as defined in the renderer
            currentOffset += car.length + 0.3; // Match the carSpacing from renderer
        }
    }

    /**
     * Initialize car positions for a train (call after cars are added)
     * @param trainId ID of the train to initialize
     */
    initializeCarPositions(trainId: string): void {
        const train = this.trains.get(trainId);
        if (!train) {
            Logger.warn(LogCategory.TRAIN, `Train ${trainId} not found for car position initialization`);
            return;
        }
        
        this.initializeTrainCarPositions(train);
        
        Logger.log(LogCategory.TRAIN, `Initialized car positions for train ${trainId}`, {
            carCount: train.getCarCount()
        });
    }
}
