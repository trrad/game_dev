import { Vector3 } from "@babylonjs/core";
import { Station, StationConfig } from "../../game/Station";

describe('Station', () => {
    let testConfig: StationConfig;

    beforeEach(() => {
        testConfig = {
            id: 'test_station',
            name: 'Test Station',
            position: new Vector3(0, 0, 0),
            connectedRails: ['rail1', 'rail2']
        };
    });

    describe('Construction', () => {
        it('should create a station with correct initial state', () => {
            const station = new Station(testConfig);
            
            expect(station.stationId).toBe(testConfig.id);
            expect(station.name).toBe(testConfig.name);
            expect(station.position).toEqual(testConfig.position);
            expect(station.connectedRails).toEqual(testConfig.connectedRails);
            expect(station.level).toBe(1);
            expect(station.reputation).toBe(50);
            expect(station.profitMultiplier).toBe(1.0);
            expect(station.cargoCapacity).toBe(100);
        });

        it('should have required components', () => {
            const station = new Station(testConfig);
            expect(station.hasComponent('position')).toBe(true);
        });

        it('should initialize metrics correctly', () => {
            const station = new Station(testConfig);
            const metrics = station.getMetrics();
            
            expect(metrics.get('level')).toBe(1);
            expect(metrics.get('reputation')).toBe(50);
            expect(metrics.get('cargo_capacity')).toBe(100);
            expect(metrics.get('connected_rails')).toBe(2);
        });
    });

    describe('Station Level Management', () => {
        it('should update stats when level changes', () => {
            const station = new Station(testConfig);
            station.setLevel(3);
            
            expect(station.level).toBe(3);
            expect(station.cargoCapacity).toBeGreaterThan(100); // Should increase with level
            expect(station.getMetrics().get('level')).toBe(3);
        });

        it('should clamp level between 1 and 10', () => {
            const station = new Station(testConfig);
            
            station.setLevel(0);
            expect(station.level).toBe(1);
            
            station.setLevel(11);
            expect(station.level).toBe(10);
        });
    });

    describe('Reputation System', () => {
        it('should adjust reputation within bounds', () => {
            const station = new Station(testConfig);
            
            station.adjustReputation(30);
            expect(station.reputation).toBe(80);
            
            station.adjustReputation(-20);
            expect(station.reputation).toBe(60);
            
            // Should clamp at 0 and 100
            station.adjustReputation(-100);
            expect(station.reputation).toBe(0);
            
            station.adjustReputation(200);
            expect(station.reputation).toBe(100);
        });

        it('should update profit multiplier based on reputation', () => {
            const station = new Station(testConfig);
            
            station.adjustReputation(50); // Set to 100
            expect(station.profitMultiplier).toBeCloseTo(1.5); // 0.5 + (100/100)
            
            station.adjustReputation(-100); // Set to 0
            expect(station.profitMultiplier).toBeCloseTo(0.5); // 0.5 + (0/100)
        });
    });

    describe('Market System', () => {
        it('should initialize with default price modifiers', () => {
            const station = new Station(testConfig);
            
            expect(station.getPriceModifier('standard_cargo')).toBe(1.0);
            expect(station.getPriceModifier('nonexistent_type')).toBe(1.0);
        });

        it('should update market prices periodically', () => {
            const station = new Station(testConfig);
            const initialPrice = station.getPriceModifier('test_cargo');
            
            // Update with 1 hour elapsed
            station.update(3600, 3600);
            
            const newPrice = station.getPriceModifier('test_cargo');
            expect(newPrice).toBe(1.0); // Should still be default since no trade occurred
        });
    });

    describe('Rail Connectivity', () => {
        it('should correctly identify connected stations', () => {
            const station = new Station(testConfig);
            const railMap = new Map([
                ['rail1', { stationA: 'test_station', stationB: 'other_station' }],
                ['rail2', { stationA: 'test_station', stationB: 'another_station' }]
            ]);

            expect(station.isConnectedTo('other_station', railMap)).toBe(true);
            expect(station.isConnectedTo('another_station', railMap)).toBe(true);
            expect(station.isConnectedTo('nonexistent_station', railMap)).toBe(false);
        });

        it('should find correct rail between stations', () => {
            const station = new Station(testConfig);
            const railMap = new Map([
                ['rail1', { stationA: 'test_station', stationB: 'other_station' }],
                ['rail2', { stationA: 'test_station', stationB: 'another_station' }]
            ]);

            expect(station.getRailTo('other_station', railMap)).toBe('rail1');
            expect(station.getRailTo('another_station', railMap)).toBe('rail2');
            expect(station.getRailTo('nonexistent_station', railMap)).toBeNull();
        });
    });

    describe('Serialization', () => {
        it('should correctly serialize and deserialize', () => {
            const originalStation = new Station(testConfig);
            originalStation.setLevel(3);
            originalStation.adjustReputation(20);
            
            const serialized = originalStation.serialize();
            const newStation = new Station({
                id: 'temp',
                name: 'temp',
                position: new Vector3(0, 0, 0),
                connectedRails: []
            });
            newStation.deserialize(serialized);
            
            expect(newStation.stationId).toBe(testConfig.id);
            expect(newStation.name).toBe(testConfig.name);
            expect(newStation.position).toEqual(testConfig.position);
            expect(newStation.level).toBe(3);
            expect(newStation.reputation).toBe(70);
        });
    });
});
