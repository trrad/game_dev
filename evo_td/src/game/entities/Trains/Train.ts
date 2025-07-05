/**
 * Train entity that manages a collection of train cars as a cohesive unit
 */

import { GameNodeObject } from '../../../engine/core/GameNodeObject';
import { Logger, LogCategory } from '../../../engine/utils/Logger';
import { PositionComponent } from '../../../engine/components/PositionComponent';
import { MovementComponent } from '../../../engine/components/MovementComponent';
import { RailPositionComponent } from '../../components/RailPositionComponent';
import { RailMovementComponent } from '../../components/RailMovementComponent';
import { RadiusComponent, createCollisionRadius, createDetectionRadius } from '../../../engine/components/RadiusComponent';
import { TrainCar } from './TrainCar/TrainCar';
import type { EventStack } from '../../../engine/core/EventStack';
import { NodeComponent } from '../../../engine/components/NodeComponent';

/**
 * Configuration interface for Train entities.
 */
export interface TrainConfig {
    /** Maximum cargo capacity in units */
    cargoCapacity: number;
    /** Base movement speed */
    baseSpeed: number;
    /** Spacing between train cars */
    carSpacing: number;
    /** Power efficiency multiplier */
    powerEfficiency: number;
}

export interface TrainState {
    currentSpeed: number;
    totalWeight: number;
    totalCargoCapacity: number;
    totalHealth: number;
    maxHealth: number;
    isMoving: boolean;
    currentRailId?: string;
    targetStationId?: string;
}

/**
 * Train entity representing a complete train with multiple cars
 */
export class Train extends GameNodeObject {
    private _playerId: string;
    private _config: TrainConfig;
    private _cars: TrainCar[] = [];
    private _state: TrainState;

    constructor(playerId: string, config: TrainConfig, eventStack?: EventStack, scene?: any, parentNode?: NodeComponent | null) {
        super('train', eventStack, scene, parentNode);
        this._playerId = playerId;
        this._config = { ...config };

        // Initialize state
        this._state = {
            currentSpeed: 0,
            totalWeight: 0,
            totalCargoCapacity: config.cargoCapacity || 0,
            totalHealth: 0,
            maxHealth: 0,
            isMoving: false
        };

        // Add components
        const position = new PositionComponent();
        this.addComponent(position);

        const movement = new MovementComponent(this, config.baseSpeed || 0.1);
        this.addComponent(movement);

        const detectionRadius = createDetectionRadius(5);
        this.addComponent(detectionRadius);

        const collisionRadius = createCollisionRadius(2);
        this.addComponent(collisionRadius);

        // Listen for events
        this.on('car:critical_damage', (event) => {
            Logger.log(LogCategory.TRAIN, `Train ${this.id} received critical damage report from car ${event.payload.carId}`);
        });

        this.on('car:repair_complete', (event) => {
            Logger.log(LogCategory.TRAIN, `Train ${this.id} received repair completion from car ${event.payload.carId}`);
        });

        this.on('station:proximity', (event) => {
            Logger.log(LogCategory.TRAIN, `Train ${this.id} approaching station ${event.payload.stationId}`);
        });

        // Rail components
        const railPosition = new RailPositionComponent(this);
        this.addComponent(railPosition);

        const railMovement = new RailMovementComponent(this, config.baseSpeed || 1.0);
        this.addComponent(railMovement);

        // Metrics
        this.metrics.set('cars_count', 0);
        this.metrics.set('total_weight', 0);
        this.metrics.set('cargo_capacity', this._state.totalCargoCapacity);
        this.metrics.set('health', 0);
        this.metrics.set('journeys_completed', 0);

        Logger.log(LogCategory.TRAIN, `Train entity created`, {
            trainId: this.id,
            playerId: this._playerId,
            config: this._config
        });

        // Listen for journey:request events from UI or other sources
        this.addEventListener('journey:request', (event) => {
            const { trainId, railId, destinationStationId, targetSpeed } = event.payload || {};
            // Only process if this is the correct train
            if (trainId !== this.id) return;

            // Get the RailMovementComponent
            const railMovement = this.getComponent<RailMovementComponent>('railMovement');
            if (!railMovement) {
                Logger.warn(LogCategory.TRAIN, `No RailMovementComponent found for train ${this.id}`);
                this.emit('journey:failed', {
                    trainId: this.id,
                    railId,
                    destinationStationId,
                    reason: 'no_rail_movement_component'
                });
                return;
            }

            // Start the journey using the movement component
            try {
                railMovement.startJourney(destinationStationId, targetSpeed);
                this.emit('journey:started', {
                    trainId: this.id,
                    railId,
                    destinationStationId
                });
            } catch (error) {
                Logger.warn(LogCategory.TRAIN, `Failed to start journey: ${error}`);
                this.emit('journey:failed', {
                    trainId: this.id,
                    railId,
                    destinationStationId,
                    reason: error?.message || 'unknown_error'
                });
            }
        });
    }

    /**
     * Get the player ID who owns this train
     */
    get playerId(): string {
        return this._playerId;
    }

    /**
     * Get the train configuration
     */
    get config(): Readonly<TrainConfig> {
        return this._config;
    }

    /**
     * Get the current train state
     */
    get state(): Readonly<TrainState> {
        return { ...this._state };
    }

    /**
     * Check if the train is currently moving
     */
    get isMoving(): boolean {
        return this._state.isMoving;
    }

    /**
     * Get current progress along the rail (0.0 = start, 1.0 = end)
     */
    get progress(): number {
        const railPosition = this.getComponent<RailPositionComponent>('railPosition');
        return railPosition?.getProgress() ?? 0;
    }

    /**
     * Add a train car to this train
     */
    addCar(car: TrainCar): void {
        if (this._cars.includes(car)) {
            Logger.warn(LogCategory.TRAIN, `Car ${car.carId} already attached to train ${this.id}`);
            return;
        }

        this._cars.push(car);
        this.updateTrainStats();

        this.emitEvent({
            type: 'car_added',
            trainId: this.id,
            carId: car.carId,
            carType: car.carType,
            totalCars: this._cars.length,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Car added to train ${this.id}`, {
            carId: car.carId,
            carType: car.carType,
            totalCars: this._cars.length,
            newWeight: this._state.totalWeight,
            newCapacity: this._state.totalCargoCapacity
        });
    }

    /**
     * Remove a train car from this train
     */
    removeCar(carId: string): TrainCar | null {
        const carIndex = this._cars.findIndex(car => car.carId === carId);
        if (carIndex === -1) {
            Logger.warn(LogCategory.TRAIN, `Car ${carId} not found in train ${this.id}`);
            return null;
        }

        const removedCar = this._cars.splice(carIndex, 1)[0];
        this.updateTrainStats();

        this.emitEvent({
            type: 'car_removed',
            trainId: this.id,
            carId: carId,
            totalCars: this._cars.length,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Car removed from train ${this.id}`, {
            carId: carId,
            totalCars: this._cars.length,
            newWeight: this._state.totalWeight,
            newCapacity: this._state.totalCargoCapacity
        });

        return removedCar;
    }

    /**
     * Get all train cars
     */
    getCars(): TrainCar[] {
        return [...this._cars]; // Return a copy to prevent external modification
    }

    /**
     * Get a specific car by ID
     */
    getCar(carId: string): TrainCar | null {
        return this._cars.find(car => car.carId === carId) || null;
    }

    /**
     * Get the number of cars in this train
     */
    getCarCount(): number {
        return this._cars.length;
    }

    /**
     * Get the engine car (first car)
     */
    getEngine(): TrainCar | null {
        return this._cars.length > 0 ? this._cars[0] : null;
    }

    /**
     * Update train statistics based on current cars
     */
    private updateTrainStats(): void {
        this._state.totalWeight = 0;
        this._state.totalCargoCapacity = 0;
        this._state.totalHealth = 0;
        this._state.maxHealth = 0;

        for (const car of this._cars) {
            // Weight calculation (could be improved with actual weight from attachments)
            this._state.totalWeight += 100; // Base car weight

            // Cargo capacity
            const carCapacity = car.serialize().cargoCapacity || 0;
            this._state.totalCargoCapacity += carCapacity;

            // Health
            this._state.totalHealth += car.health;
            this._state.maxHealth += car.serialize().maxHealth || 100;
        }

        // Update metrics
        this.metrics.set('cars_count', this._cars.length);
        this.metrics.set('total_weight', this._state.totalWeight);
        this.metrics.set('cargo_capacity', this._state.totalCargoCapacity);
        this.metrics.set('health', this._state.totalHealth);
        this.metrics.set('max_health', this._state.maxHealth);
    }

    /**
     * Start movement along a rail
     */
    startMovement(railId: string, targetStationId: string): void {
        this._state.isMoving = true;
        this._state.currentRailId = railId;
        this._state.targetStationId = targetStationId;

        // Emit event for both local listeners and EventStack routing
        this.emit('journey_started', {
            trainId: this.id,
            railId: railId,
            targetStationId: targetStationId,
            timestamp: performance.now()
        });

        this.emitEvent({
            type: 'movement_started',
            trainId: this.id,
            railId: railId,
            targetStationId: targetStationId,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Train movement started`, {
            trainId: this.id,
            railId: railId,
            targetStationId: targetStationId
        });
    }

    /**
     * Stop movement
     */
    stopMovement(): void {
        this._state.isMoving = false;
        this._state.currentRailId = undefined;
        this._state.targetStationId = undefined;
        
        // Also stop the rail components
        const railMovement = this.getComponent<RailMovementComponent>('railMovement');
        const railPosition = this.getComponent<RailPositionComponent>('railPosition');
        
        if (railMovement) {
            railMovement.stopJourney();
        }
        if (railPosition) {
            railPosition.clearRailPosition();
        }

        this.emitEvent({
            type: 'movement_stopped',
            trainId: this.id,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Train movement stopped`, {
            trainId: this.id
        });
    }

    /**
     * Complete a journey (when train reaches target station)
     */
    completeJourney(stationId: string): void {
        const wasMoving = this._state.isMoving;
        this.stopMovement();

        if (wasMoving) {
            // Increment journey count
            const journeyCount = this.metrics.get('journeys_completed') || 0;
            this.metrics.set('journeys_completed', journeyCount + 1);

            // Emit the journey_completed event that TrainSystem is listening for
            this.emit('journey_completed', {
                trainId: this.id,
                stationId: stationId,
                journeyCount: journeyCount + 1,
                timestamp: performance.now()
            });

            this.emitEvent({
                type: 'journey_completed',
                trainId: this.id,
                stationId: stationId,
                journeyCount: journeyCount + 1,
                timestamp: performance.now()
            });

            Logger.log(LogCategory.TRAIN, `Train completed journey`, {
                trainId: this.id,
                stationId: stationId,
                totalJourneys: journeyCount + 1
            });
        }
    }

    // ============================================================
    // Scene Graph Integration & Event Handlers
    // ============================================================
    
    /**
     * Get the scene node component
     */
    getSceneNode(): NodeComponent | undefined {
        return this.getComponent<NodeComponent>('sceneNode');
    }
    
    /**
     * Handle critical damage to a car
     */
    private handleCriticalCarDamage(payload: any): void {
        Logger.log(LogCategory.TRAIN, `Train ${this.id} handling critical damage to car ${payload.carId}`);
        
        // If critical car (engine), reduce train speed
        const damagedCar = this._cars.find(car => car.id === payload.carId);
        if (damagedCar && payload.carType === 'engine') {
            this._state.currentSpeed *= 0.5; // Reduce speed by half
            Logger.log(LogCategory.TRAIN, `Engine damage: reducing train speed to ${this._state.currentSpeed}`);
        }
        
        // Check if train is still operational
        this.updateTrainStatsFromCars();
        
        // Emit repair requests to other cars if needed
        if (this._state.totalHealth < this._state.maxHealth * 0.3) {
            this.requestEmergencyRepairs();
        }
    }
    
    /**
     * Update train statistics from car states
     */
    private updateTrainStatsFromCars(): void {
        let totalHealth = 0;
        let maxHealth = 0;
        let totalWeight = 0;
        let totalCargoCapacity = 0;
        
        this._cars.forEach(car => {
            const carState = car.getState();
            totalHealth += carState.health;
            maxHealth += 100; // Assuming max 100 health per car
            totalWeight += car.getTotalWeight();
            totalCargoCapacity += car.getCargoCapacity();
        });
        
        this._state.totalHealth = totalHealth;
        this._state.maxHealth = maxHealth;
        this._state.totalWeight = totalWeight;
        this._state.totalCargoCapacity = totalCargoCapacity;
        this._state.isMoving = this._state.totalHealth > this._state.maxHealth * 0.2;
        
        Logger.log(LogCategory.TRAIN, `Train stats updated: ${totalHealth}/${maxHealth} health, ${totalWeight} weight`);
    }
    
    /**
     * Handle proximity to stations
     */
    private handleStationProximity(payload: any): void {
        Logger.log(LogCategory.TRAIN, `Train ${this.id} near station ${payload.stationId} at distance ${payload.distance}`);
        
        // Slow down when approaching station
        if (payload.distance < 5) {
            this._state.currentSpeed = Math.min(this._state.currentSpeed, 0.1);
        }
    }
    
    /**
     * Request emergency repairs from all cars
     */
    private requestEmergencyRepairs(): void {
        const sceneNode = this.getSceneNode();
        if (!sceneNode) return;
        
        Logger.log(LogCategory.TRAIN, `Train ${this.id} requesting emergency repairs from all cars`);
        
        sceneNode.emitToChildren('repair:request', {
            priority: 'high',
            trainHealth: this._state.totalHealth / this._state.maxHealth,
            requestedBy: 'train'
        }, true); // Recursive to all descendants (cars and voxels)
    }
    
    /**
     * Emit power changes to all cars
     */
    emitPowerChange(newPower: number, efficiency: number = 1.0): void {
        const sceneNode = this.getSceneNode();
        if (!sceneNode) return;
        
        Logger.log(LogCategory.TRAIN, `Train ${this.id} broadcasting power change: ${newPower} at ${efficiency} efficiency`);
        
        sceneNode.emitToChildren('train:power_change', {
            newPower,
            efficiency,
            trainId: this.id
        }, false); // Only to direct children (cars)
    }
    
    /**
     * Add car to train with scene graph hierarchy
     */
    addCarWithSceneGraph(car: TrainCar): void {
        const sceneNode = this.getSceneNode();
        const carSceneNode = car.getSceneNode();
        
        if (sceneNode && carSceneNode) {
            // Set car as child of train in scene graph
            carSceneNode.setParent(sceneNode);
            
            // Position car relative to train
            const carIndex = this._cars.length;
            const carOffset = carIndex * (this._config.carSpacing || 2);
            carSceneNode.setLocalPosition(-carOffset, 0, 0); // Cars trail behind engine
            
            Logger.log(LogCategory.TRAIN, `Car ${car.id} added to train scene graph at offset ${carOffset}`);
        }
        
        this._cars.push(car);
        this.updateTrainStatsFromCars();
    }

    /**
     * Update train and all its cars
     */
    override update(deltaTime: number): void {
        // Update base GameObject
        super.update(deltaTime);

        // Update all cars
        for (const car of this._cars) {
            car.update(deltaTime);
        }

        // Update train state based on car conditions
        this.updateTrainStats();

        // Update movement state from RailMovementComponent
        const railMovement = this.getComponent<RailMovementComponent>('railMovement');
        if (railMovement) {
            this._state.isMoving = railMovement.isMoving();
            this._state.currentSpeed = railMovement.getSpeed();
        }
    }

    /**
     * Take damage to the train (distributed across cars)
     */
    takeDamage(amount: number): void {
        if (this._cars.length === 0) return;

        // Distribute damage across all cars
        const damagePerCar = amount / this._cars.length;
        
        for (const car of this._cars) {
            car.takeDamage(damagePerCar);
        }

        this.emitEvent({
            type: 'train_damage_taken',
            trainId: this.id,
            totalDamage: amount,
            damagePerCar: damagePerCar,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Train took damage`, {
            trainId: this.id,
            totalDamage: amount,
            damagePerCar: damagePerCar,
            carsAffected: this._cars.length
        });
    }

    /**
     * Repair the train (distributed across cars)
     */
    repair(amount: number): void {
        if (this._cars.length === 0) return;

        // Distribute repair across all cars
        const repairPerCar = amount / this._cars.length;
        
        for (const car of this._cars) {
            car.repair(repairPerCar);
        }

        this.emitEvent({
            type: 'train_repaired',
            trainId: this.id,
            totalRepair: amount,
            repairPerCar: repairPerCar,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Train repaired`, {
            trainId: this.id,
            totalRepair: amount,
            repairPerCar: repairPerCar,
            carsAffected: this._cars.length
        });
    }

    /**
     * Get total train length
     */
    getTotalLength(): number {
        return this._cars.reduce((total, car) => total + car.length, 0);
    }

    /**
     * Serialize train data
     */
    serialize(): any {
        return {
            id: this.id,
            type: this.type,
            playerId: this._playerId,
            config: this._config,
            state: this._state,
            cars: this._cars.map(car => car.serialize())
        };
    }

    /**
     * Deserialize train data
     */
    deserialize(data: any): void {
        if (data.playerId) this._playerId = data.playerId;
        if (data.config) this._config = data.config;
        if (data.state) this._state = { ...this._state, ...data.state };
        
        // Note: Cars would need to be recreated separately during deserialization
        // as they are complex objects with their own state
    }

    /**
     * Clean up train resources
     */
    override dispose(): void {
        // Dispose all cars
        for (const car of this._cars) {
            car.dispose();
        }
        this._cars.length = 0; // Clear the array

        Logger.log(LogCategory.TRAIN, `Disposed train ${this.id}`);
        super.dispose();
    }

    /**
     * Get debug information about the train
     */
    getDebugInfo(): any {
        return {
            id: this.id,
            playerId: this._playerId,
            carCount: this._cars.length,
            totalLength: this.getTotalLength(),
            state: this._state,
            cars: this._cars.map(car => ({
                id: car.carId,
                type: car.carType,
                health: car.health,
                length: car.length,
                attachmentStats: car.getAttachmentStats()
            }))
        };
    }

    /**
     * Legacy compatibility method for startJourney (used by tests)
     * @param railId The rail to travel on
     * @param targetStationId The destination station
     * @param _distance The distance (used for rail position setup)
     * @returns true if journey started successfully
     */
    startJourney(railId: string, targetStationId: string, _distance: number): boolean {
        try {
            // Set up rail position if not already set
            const railPosition = this.getComponent<RailPositionComponent>('railPosition');
            if (railPosition && !railPosition.isOnRail()) {
                railPosition.setRailPosition(railId, 0); // Start at beginning
            }

            this.startMovement(railId, targetStationId);
            return true;
        } catch (error) {
            Logger.warn(LogCategory.TRAIN, `Failed to start journey: ${error}`);
            return false;
        }
    }

    // Add the actual journey start logic here
    private startRailJourney(railId: string, destinationStationId: string): boolean {
        // Only start a journey if not already moving
        if (this._state.isMoving) {
            Logger.warn(LogCategory.TRAIN, `Train ${this.id} is already moving.`);
            return false;
        }
        // Optionally: validate railId and destinationStationId here
        // For now, just start movement
        this.startMovement(railId, destinationStationId);
        return true;
    }
}