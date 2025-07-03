import { Vector3 } from "@babylonjs/core";
import { Rail, RailConfig } from "../../entities/Rail";

describe('Rail', () => {
    let testConfig: RailConfig;
    let trackPoints: Vector3[];

    beforeEach(() => {
        trackPoints = [
            new Vector3(0, 0, 0),
            new Vector3(5, 0, 0),
            new Vector3(10, 0, 0)
        ];
        testConfig = {
            id: 'test_rail',
            name: 'Test Rail',
            stationA: 'station_a',
            stationB: 'station_b',
            trackPoints,
            isOperational: true,
            efficiency: 1.0
        };
    });

    describe('Construction', () => {
        it('should create a rail with correct initial state', () => {
            const rail = new Rail(testConfig);
            
            expect(rail.railId).toBe(testConfig.id);
            expect(rail.name).toBe(testConfig.name);
            expect(rail.stationA).toBe(testConfig.stationA);
            expect(rail.stationB).toBe(testConfig.stationB);
            expect(rail.isOperational).toBe(true);
            expect(rail.efficiency).toBe(1.0);
            expect(rail.trackPoints).toEqual(trackPoints);
        });

        it('should calculate total distance correctly', () => {
            const rail = new Rail(testConfig);
            
            // Distance should be sum of segment lengths (5 + 5 = 10)
            expect(rail.totalDistance).toBe(10);
        });

        it('should initialize metrics correctly', () => {
            const rail = new Rail(testConfig);
            const metrics = rail.getMetrics();
            
            expect(metrics.get('distance')).toBe(10);
            expect(metrics.get('efficiency')).toBe(1.0);
            expect(metrics.get('is_operational')).toBe(1);
            expect(metrics.get('segments')).toBe(2); // 3 points = 2 segments
        });
    });

    describe('Track Point Navigation', () => {
        it('should interpolate positions along rail correctly', () => {
            const rail = new Rail(testConfig);
            
            // Start point
            expect(rail.getPositionAt(0)).toEqual(trackPoints[0]);
            
            // End point
            expect(rail.getPositionAt(1)).toEqual(trackPoints[2]);
            
            // Middle point (50%)
            const midPoint = rail.getPositionAt(0.5);
            expect(midPoint.x).toBe(5);
            expect(midPoint.y).toBe(0);
            expect(midPoint.z).toBe(0);
        });

        it('should calculate direction vectors correctly', () => {
            const rail = new Rail(testConfig);
            
            // Middle of first segment
            const direction = rail.getDirectionAt(0.25);
            expect(direction).toBeTruthy();
            if (direction) {
                expect(direction.x).toBe(1); // Normalized direction along x-axis
                expect(direction.y).toBe(0);
                expect(direction.z).toBe(0);
            }
            
            // Invalid positions should return null
            expect(rail.getDirectionAt(0)).toBeNull();
            expect(rail.getDirectionAt(1)).toBeNull();
        });

        it('should provide correct segment information', () => {
            const rail = new Rail(testConfig);
            
            const start = rail.getSegmentInfo(0);
            expect(start.segmentIndex).toBe(0);
            expect(start.segmentProgress).toBe(0);
            
            const middle = rail.getSegmentInfo(0.5);
            expect(middle.segmentIndex).toBe(1);
            expect(middle.segmentProgress).toBe(0);
            
            const end = rail.getSegmentInfo(1);
            expect(end.segmentIndex).toBe(1);
            expect(end.segmentProgress).toBe(1);
        });
    });

    describe('Operational Status', () => {
        it('should update operational status correctly', () => {
            const rail = new Rail(testConfig);
            
            rail.setOperational(false);
            expect(rail.isOperational).toBe(false);
            expect(rail.getMetrics().get('is_operational')).toBe(0);
            
            rail.setOperational(true);
            expect(rail.isOperational).toBe(true);
            expect(rail.getMetrics().get('is_operational')).toBe(1);
        });

        it('should manage efficiency within bounds', () => {
            const rail = new Rail(testConfig);
            
            rail.setEfficiency(1.5);
            expect(rail.efficiency).toBe(1.5);
            expect(rail.getMetrics().get('efficiency')).toBe(1.5);
            
            // Should clamp to min/max
            rail.setEfficiency(0.05);
            expect(rail.efficiency).toBe(0.1); // Minimum
            
            rail.setEfficiency(2.5);
            expect(rail.efficiency).toBe(2.0); // Maximum
        });
    });

    describe('Serialization', () => {
        it('should correctly serialize and deserialize', () => {
            const originalRail = new Rail(testConfig);
            originalRail.setOperational(false);
            originalRail.setEfficiency(1.5);
            
            const serialized = originalRail.serialize();
            const newRail = new Rail({
                id: 'temp',
                name: 'temp',
                stationA: 'temp',
                stationB: 'temp',
                trackPoints: [new Vector3(0, 0, 0)],
                isOperational: true
            });
            newRail.deserialize(serialized);
            
            expect(newRail.railId).toBe(testConfig.id);
            expect(newRail.name).toBe(testConfig.name);
            expect(newRail.stationA).toBe(testConfig.stationA);
            expect(newRail.stationB).toBe(testConfig.stationB);
            expect(newRail.isOperational).toBe(false);
            expect(newRail.efficiency).toBe(1.5);
            expect(newRail.trackPoints).toEqual(trackPoints);
        });
    });
});
