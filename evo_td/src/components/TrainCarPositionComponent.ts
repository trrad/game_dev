/**
 * Component that stores authoritative positioning data for train cars
 */
import { Component } from '../core/Component';
import { GameObject } from '../core/GameObject';
import { Vector3 } from '@babylonjs/core';
import { TrainCar } from '../game/TrainCar';

export interface CarPositionData {
    carId: string;
    carIndex: number;
    position: Vector3;
    rotation: Vector3;
    railProgress: number; // Progress along the rail (0-1)
    car: TrainCar; // Reference to the actual car entity
}

/**
 * Component that maintains authoritative positioning for all cars in a train
 * This is the single source of truth for car positions that both
 * game logic and rendering systems can rely on
 */
export class TrainCarPositionComponent extends Component {
    public readonly type = 'train_car_positions';
    private carPositions: Map<string, CarPositionData> = new Map();
    private sortedCarIds: string[] = []; // Ordered from front to back

    /**
     * Add a car to this train's positioning system
     */
    addCar(car: TrainCar, index: number): void {
        const carData: CarPositionData = {
            carId: car.id,
            carIndex: index,
            position: new Vector3(0, 0, 0),
            rotation: new Vector3(0, 0, 0),
            railProgress: 0,
            car: car
        };
        
        this.carPositions.set(car.id, carData);
        
        // Rebuild sorted list
        this.sortedCarIds = Array.from(this.carPositions.values())
            .sort((a, b) => a.carIndex - b.carIndex)
            .map(data => data.carId);
    }

    /**
     * Remove a car from this train
     */
    removeCar(carId: string): void {
        this.carPositions.delete(carId);
        this.sortedCarIds = this.sortedCarIds.filter(id => id !== carId);
    }

    /**
     * Update position data for a specific car
     */
    updateCarPosition(carId: string, position: Vector3, rotation: Vector3, railProgress: number): void {
        const carData = this.carPositions.get(carId);
        if (carData) {
            carData.position = position.clone();
            carData.rotation = rotation.clone();
            carData.railProgress = railProgress;
        }
    }

    /**
     * Get position data for a specific car
     */
    getCarPosition(carId: string): CarPositionData | undefined {
        return this.carPositions.get(carId);
    }

    /**
     * Get all car position data, sorted by index (front to back)
     */
    getAllCarPositions(): CarPositionData[] {
        return this.sortedCarIds
            .map(carId => this.carPositions.get(carId))
            .filter(data => data !== undefined) as CarPositionData[];
    }

    /**
     * Get cars in order (front to back)
     */
    getCarsInOrder(): TrainCar[] {
        return this.getAllCarPositions().map(data => data.car);
    }

    /**
     * Get the number of cars
     */
    getCarCount(): number {
        return this.carPositions.size;
    }

    /**
     * Get the front car (engine)
     */
    getFrontCar(): CarPositionData | undefined {
        return this.sortedCarIds.length > 0 ? 
            this.carPositions.get(this.sortedCarIds[0]) : undefined;
    }

    /**
     * Get car at specific index
     */
    getCarAtIndex(index: number): CarPositionData | undefined {
        const carId = this.sortedCarIds[index];
        return carId ? this.carPositions.get(carId) : undefined;
    }

    update(_deltaTime: number): void {
        // This component is updated by the TrainSystem, not by itself
    }

    serialize(): any {
        const carsData = Array.from(this.carPositions.values()).map(data => ({
            carId: data.carId,
            carIndex: data.carIndex,
            position: { x: data.position.x, y: data.position.y, z: data.position.z },
            rotation: { x: data.rotation.x, y: data.rotation.y, z: data.rotation.z },
            railProgress: data.railProgress,
            // Note: car reference will need to be re-established on deserialize
        }));
        
        return {
            cars: carsData,
            sortedCarIds: [...this.sortedCarIds]
        };
    }

    deserialize(data: any): void {
        // Note: This doesn't restore car references - those need to be re-added
        // after deserialization through addCar()
        if (data.cars && Array.isArray(data.cars)) {
            this.carPositions.clear();
            data.cars.forEach((carData: any) => {
                const positionData: Partial<CarPositionData> = {
                    carId: carData.carId,
                    carIndex: carData.carIndex,
                    position: new Vector3(carData.position.x, carData.position.y, carData.position.z),
                    rotation: new Vector3(carData.rotation.x, carData.rotation.y, carData.rotation.z),
                    railProgress: carData.railProgress
                    // car reference will be null until re-added
                };
                // We can't fully restore without car references
            });
        }
        
        if (data.sortedCarIds && Array.isArray(data.sortedCarIds)) {
            this.sortedCarIds = [...data.sortedCarIds];
        }
    }

    dispose(): void {
        this.carPositions.clear();
        this.sortedCarIds = [];
        super.dispose();
    }
}
