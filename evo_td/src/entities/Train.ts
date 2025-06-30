/**
 * Train entity that manages a collection of train cars as a cohesive unit
 */

import { GameObject } from "../core/GameObject";
import { Logger, LogCategory } from "../utils/Logger";
import { PositionComponent } from "../components/PositionComponent";
import { MovementComponent } from "../components/MovementComponent";
import { TrainCar } from "../game/TrainCar";
import type { TrainConfig } from "../types/TrainConfig";

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
export class Train extends GameObject {
    private _playerId: string;
    private _config: TrainConfig;
    private _cars: TrainCar[] = [];
    private _state: TrainState;

    constructor(playerId: string, config: TrainConfig) {
        super('train');
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

        // Add required components
        const position = new PositionComponent();
        this.addComponent(position);

        const movement = new MovementComponent(this, 1.0);
        this.addComponent(movement);

        // Initialize metrics
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

        // Update movement state from MovementComponent
        const movementComponent = this.getComponent<MovementComponent>('movement');
        if (movementComponent) {
            this._state.isMoving = movementComponent.isRailMoving();
            this._state.currentSpeed = movementComponent.getSpeed();
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
}