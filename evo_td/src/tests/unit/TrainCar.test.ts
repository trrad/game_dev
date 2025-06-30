/**
 * Unit tests for the TrainCar class and its components.
 */
import { Vector3 } from "@babylonjs/core";
import { TrainCar } from '../../entities/TrainCar';
import type { TrainCarConfig } from '../../entities/TrainCar';

describe('TrainCar', () => {
    let car: TrainCar;
    const defaultConfig: TrainCarConfig = {
        id: 'car1',
        type: 'cargo',
        length: 10,
        cargoCapacity: 100,
        attachmentSlots: 2,
        maxHealth: 100
    };

    beforeEach(() => {
        car = new TrainCar(defaultConfig);
    });

    describe('Creation', () => {
        it('should create with correct initial values', () => {
            expect(car.carId).toBe('car1');
            expect(car.carType).toBe('cargo');
            expect(car.length).toBe(10);
        });

        it('should initialize components based on car type', () => {
            // Default cargo car should have all components
            expect(car.getComponent('position')).toBeDefined();
            expect(car.getComponent('inventory')).toBeDefined();
            expect(car.getComponent('attachment')).toBeDefined();

            // Engine car without cargo/attachments
            const engineCar = new TrainCar({
                id: 'engine1',
                type: 'engine',
                length: 8
            });

            expect(engineCar.getComponent('position')).toBeDefined();
            expect(engineCar.getComponent('inventory')).toBeUndefined();
            expect(engineCar.getComponent('attachment')).toBeUndefined();
        });
    });

    describe.skip('Health System (Future Feature)', () => {
        it('should be implemented in the future', () => {
            // Tests will be implemented when health system is ready
        });
    });

    describe('Update Logic', () => {
        it('should check and update damage state during update', () => {
            car.takeDamage(60); // Down to 40 health
            car.update(1);
            expect(car.isDamaged).toBe(true);
        });

        it('should check and update operational state during update', () => {
            car.takeDamage(100); // Down to 0 health
            car.update(1);
            expect(car.isOperational).toBe(false);
        });
    });

    describe('Serialization', () => {
        it('should serialize to a valid state object', () => {
            car.takeDamage(30);
            const serialized = car.serialize();

            expect(serialized).toEqual({
                ...defaultConfig,
                health: 70,
                isDamaged: false,
                isOperational: true
            });
        });

        it('should deserialize and restore state correctly', () => {
            const newState = {
                ...defaultConfig,
                health: 40,
                isDamaged: true,
                isOperational: false
            };

            car.deserialize(newState);
            expect(car.health).toBe(40);
            expect(car.isDamaged).toBe(true);
            expect(car.isOperational).toBe(false);
        });

        it('should preserve unspecified state values during deserialization', () => {
            const initialHealth = car.health;
            car.deserialize({
                ...defaultConfig,
                isDamaged: true
            });
            
            expect(car.health).toBe(initialHealth);
            expect(car.isDamaged).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on disposal', () => {
            const mockMeshDispose = jest.fn();
            const mockGroupDispose = jest.fn();
            car.mesh = { dispose: mockMeshDispose } as any;
            car.group = { dispose: mockGroupDispose } as any;
            
            car.dispose();
            
            expect(mockMeshDispose).toHaveBeenCalled();
            expect(mockGroupDispose).toHaveBeenCalled();
            expect(car.mesh).toBeUndefined();
            expect(car.group).toBeUndefined();
        });
    });
});
