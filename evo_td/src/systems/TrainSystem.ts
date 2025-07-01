/**
 * Manages train entities and their behaviors.
 */
import { Logger, LogCategory } from '../utils/Logger';
import { ConfigManager } from '../core/ConfigManager';
import { GameObject } from '../core/GameObject';
import { Train } from '../entities/Train';
import type { TrainConfig } from '../entities/Train';
import { PositionComponent, type Position3D } from '../components/PositionComponent';
import { MovementComponent } from '../components/MovementComponent';
import { RailPositionComponent } from '../components/RailPositionComponent';
import { RailMovementComponent } from '../components/RailMovementComponent';
import { TrainCarPositionComponent } from '../components/TrainCarPositionComponent';
import { Rail } from '../entities/Rail';
import { TimeManager } from '../core/TimeManager';
import { Vector3 } from '@babylonjs/core';
import { TrainRenderer } from '../renderers/TrainRenderer';
import { EventStack } from '../core/EventStack';

export class TrainSystem {
    private trains: Map<string, Train> = new Map();
    private metrics: Map<string, number> = new Map();
    private rails: Map<string, Rail> = new Map(); // Reference to rails for movement calculations
    private timeManager: TimeManager | null = null; // Reference to TimeManager
    private trainRenderer: TrainRenderer | null = null; // Reference to TrainRenderer for visual updates
    private eventStack: EventStack | null = null; // Reference to EventStack for event logging

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
     * Set the EventStack reference for event logging
     */
    setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
        Logger.log(LogCategory.SYSTEM, `EventStack connected to TrainSystem`);
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

    /**
     * Create a new train for a player
     */
    createTrain(playerId: string, config: TrainConfig, position?: Position3D): Train {
        const train = new Train(playerId, config, this.eventStack);
        
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

        // No longer need manual event handlers - GameObject now routes through EventStack automatically
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
     * Start a train's journey along a rail using the new rail components
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

        // Get rail components
        const railPosition = train.getComponent<RailPositionComponent>('railPosition');
        const railMovement = train.getComponent<RailMovementComponent>('railMovement');
        const posComponent = train.getComponent<PositionComponent>('position');
        
        if (!railPosition || !railMovement || !posComponent) {
            Logger.error(LogCategory.TRAIN, `Train missing required rail components`, new Error(`Train ${trainId} missing rail components`));
            return false;
        }

        // Check if train is already moving
        if (railMovement.isMoving()) {
            Logger.log(LogCategory.TRAIN, `Journey request denied - train already moving`, {
                trainId,
                requestedRailId: railId,
                requestedTarget: targetStationId
            });
            return false;
        }

        // Determine travel direction based on current position
        const currentPos = posComponent.getPosition();
        const stationAPos = rail.getPositionAt(0);
        const stationBPos = rail.getPositionAt(1);
        
        const distanceToA = Vector3.Distance(new Vector3(currentPos.x, currentPos.y, currentPos.z), stationAPos);
        const distanceToB = Vector3.Distance(new Vector3(currentPos.x, currentPos.y, currentPos.z), stationBPos);
        
        const direction = distanceToA < distanceToB ? 'forward' : 'reverse';
        const initialProgress = direction === 'forward' ? 0 : 1;
        
        // Set rail position
        railPosition.setRailPosition(railId, initialProgress, direction);
        
        // Start rail movement
        railMovement.startJourney(targetStationId);
        
        // Notify train that journey is starting (this will emit events)
        train.startMovement(railId, targetStationId);
        
        // Initialize car positions in formation
        this.initializeTrainCarRailPositions(train, railId);
        
        this.metrics.set('journeys_started', (this.metrics.get('journeys_started') || 0) + 1);
        
        // Train will emit journey_started event automatically via GameObject EventStack integration
        
        Logger.log(LogCategory.TRAIN, `Train rail journey started`, {
            trainId,
            railId,
            targetStationId,
            direction,
            initialProgress
        });

        return true;
    }

    /**
     * Initialize rail positions for all cars in a train formation
     */
    private initializeTrainCarRailPositions(train: Train, railId: string): void {
        const cars = train.getCars();
        
        cars.forEach((car, index) => {
            const carRailPosition = car.getComponent<RailPositionComponent>('railPosition');
            const carTrainPosition = car.getComponent<TrainCarPositionComponent>('trainCarPosition');
            
            if (carRailPosition && carTrainPosition) {
                // Connect car to train formation
                carTrainPosition.connectToTrain(train.id, index);
                
                // Set initial rail position with proper offset
                const trainRailPosition = train.getComponent<RailPositionComponent>('railPosition');
                if (trainRailPosition) {
                    const rail = this.rails.get(railId);
                    if (rail) {
                        const progressOffset = carTrainPosition.calculateRailProgressOffset(rail.totalDistance);
                        const carProgress = Math.max(0, Math.min(1, 
                            trainRailPosition.getProgress() - progressOffset
                        ));
                        
                        carRailPosition.setRailPosition(railId, carProgress, trainRailPosition.getDirection());
                        carRailPosition.setFormationOffset(carTrainPosition.getOffsetDistance());
                    }
                }
            }
        });
    }

    /**
     * Update all trains using the new rail components
     */
    update(deltaTime: number): void {
        for (const train of this.trains.values()) {
            this.updateTrainRailMovement(train, deltaTime);
            train.update(deltaTime);
        }
    }

    /**
     * Update train movement using rail components
     */
    private updateTrainRailMovement(train: Train, deltaTime: number): void {
        const railPosition = train.getComponent<RailPositionComponent>('railPosition');
        const railMovement = train.getComponent<RailMovementComponent>('railMovement');
        const positionComponent = train.getComponent<PositionComponent>('position');
        
        if (!railPosition || !railMovement || !positionComponent) return;
        
        // Only update if train is on a rail
        if (!railPosition.isOnRail()) return;
        
        const railId = railPosition.getRailId();
        if (!railId) return;
        
        const rail = this.rails.get(railId);
        if (!rail) return;
        
        // Get time scaling factor from TimeManager
        const timeScale = this.timeManager ? this.timeManager.getSpeed() : 1;
        const scaledDeltaTime = deltaTime * timeScale;
        
        // Update movement state (acceleration/deceleration)
        railMovement.updateMovement(scaledDeltaTime);
        
        // Calculate progress delta based on current speed and rail length
        const progressDelta = railMovement.calculateProgressDelta(scaledDeltaTime, rail.totalDistance);
        
        // Update rail progress
        railPosition.updateProgress(progressDelta);
        
        // Calculate world position from rail progress
        const progress = railPosition.getEffectiveProgress();
        const worldPosition = rail.getPositionAt(progress);
        const worldDirection = rail.getDirectionAt(progress);
        
        // Update actual world position
        positionComponent.setPosition({
            x: worldPosition.x,
            y: worldPosition.y,
            z: worldPosition.z
        });
        
        // Calculate rotation from direction vector
        if (worldDirection) {
            const rotationY = Math.atan2(worldDirection.x, worldDirection.z);
            positionComponent.setRotation({
                x: 0,
                y: rotationY,
                z: 0
            });
        }
        
        // Update car positions if this train has cars
        this.updateTrainCarPositions(train);
        
        // Check if journey is complete - simply based on reaching the end
        if (railPosition.hasReachedEnd()) {
            this.completeJourney(train);
        }
    }

    /**
     * Update individual car positions along the rail
     * Each car follows the rail path independently at the correct offset distance
     */
    private updateTrainCarPositions(train: Train): void {
        const railPosition = train.getComponent<RailPositionComponent>('railPosition');
        const railId = railPosition?.getRailId();
        
        if (!railPosition || !railId) return;
        
        const rail = this.rails.get(railId);
        if (!rail) return;
        
        const trainCars = train.getCars();
        const frontProgress = railPosition.getProgress();
        
        // Get spacing configuration
        const carSpacing = ConfigManager.get<number>('train.carSpacing') || 0.8;
        const engineLength = 1.4; // TODO: Move to config
        
        // Start offset with train engine length + spacing for first car
        let currentOffset = engineLength + carSpacing;
        
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
            
            // Ensure car progress is behind the train (subtract offset for forward movement)
            let carProgress;
            if (railPosition.getDirection() === 'forward') {
                carProgress = Math.max(0, frontProgress - carProgressOffset);
            } else {
                carProgress = Math.min(1, frontProgress + carProgressOffset);
            }
            
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
                // For reverse direction, flip the rotation 180 degrees
                let carRotationY = Math.atan2(carDirection.x, carDirection.z);
                if (railPosition.getDirection() === 'reverse') {
                    carRotationY += Math.PI;
                }
                
                carPositionComponent.setRotation({
                    x: 0,
                    y: carRotationY,
                    z: 0
                });
            }
            
            // Update offset for next car (this car's length + spacing)
            currentOffset += car.length + carSpacing;
        }
    }

    /**
     * Complete a train's journey using rail components
     */
    private completeJourney(train: Train): void {
        const railMovement = train.getComponent<RailMovementComponent>('railMovement');
        const railPosition = train.getComponent<RailPositionComponent>('railPosition');
        
        if (!railMovement || !railPosition) return;
        
        const targetStationId = railMovement.getTargetStationId();
        
        // Stop rail movement
        railMovement.stopJourney();
        railPosition.clearRailPosition();
        
        // Train will emit journey_completed event automatically via GameObject EventStack integration
        
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
     * Complete a rail journey using the new components
     */
    private completeRailJourney(train: Train): void {
        const railMovement = train.getComponent<RailMovementComponent>('railMovement');
        const railPosition = train.getComponent<RailPositionComponent>('railPosition');
        
        if (!railMovement || !railPosition) return;
        
        const targetStationId = railMovement.getTargetStationId();
        
        // Stop movement
        railMovement.stopJourney();
        
        // Clear rail position for train and cars
        railPosition.clearRailPosition();
        
        const cars = train.getCars();
        cars.forEach(car => {
            const carRailPosition = car.getComponent<RailPositionComponent>('railPosition');
            const carTrainPosition = car.getComponent<TrainCarPositionComponent>('trainCarPosition');
            
            if (carRailPosition) {
                carRailPosition.clearRailPosition();
            }
        });
        
        this.metrics.set('journeys_completed', (this.metrics.get('journeys_completed') || 0) + 1);
        
        Logger.log(LogCategory.TRAIN, `Rail journey completed`, {
            trainId: train.id,
            targetStationId
        });

        // Complete the journey using train's method
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

    /**
     * Update rail positions for all cars in a train formation using new rail components
     */
    private updateCarRailPositions(train: Train): void {
        const trainRailPosition = train.getComponent<RailPositionComponent>('railPosition');
        if (!trainRailPosition || !trainRailPosition.isOnRail()) return;
        
        const railId = trainRailPosition.getRailId();
        if (!railId) return;
        
        const rail = this.rails.get(railId);
        if (!rail) return;
        
        const cars = train.getCars();
        cars.forEach(car => {
            const carRailPosition = car.getComponent<RailPositionComponent>('railPosition');
            const carTrainPosition = car.getComponent<TrainCarPositionComponent>('trainCarPosition');
            const carWorldPosition = car.getComponent<PositionComponent>('position');
            
            if (carRailPosition && carTrainPosition && carWorldPosition && carTrainPosition.isConnected()) {
                // Calculate car's progress based on train position and formation offset
                const progressOffset = carTrainPosition.calculateRailProgressOffset(rail.totalDistance);
                const carProgress = Math.max(0, Math.min(1, 
                    trainRailPosition.getProgress() - progressOffset
                ));
                
                // Update car's rail position
                carRailPosition.updateProgress(carProgress - carRailPosition.getProgress());
                
                // Update car's world position
                const carWorldPos = rail.getPositionAt(carProgress);
                const carWorldDir = rail.getDirectionAt(carProgress);
                
                if (carWorldPos && carWorldDir) {
                    carWorldPosition.setPosition({
                        x: carWorldPos.x,
                        y: carWorldPos.y,
                        z: carWorldPos.z
                    });
                    
                    const carRotationY = Math.atan2(carWorldDir.x, carWorldDir.z);
                    carWorldPosition.setRotation({
                        x: 0,
                        y: carRotationY,
                        z: 0
                    });
                }
            }
        });
    }
}
