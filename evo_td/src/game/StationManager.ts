/**
 * StationManager - Handles generation, management, and coordination of expanded stations
 */
import { Vector3 } from "@babylonjs/core";
import { Station, StationConfig } from "../entities/Station";
import { TimeManager } from "../engine/core/TimeManager";
import { EventStack } from "../engine/core/EventStack";
import { Logger, LogCategory } from "../engine/utils/Logger";

export interface StationManagerConfig {
    minStationDistance: number;
    defaultPerimeterRadius: number;
    maxStationsPerWorld: number;
}

export class StationManager {
    private stations: Map<string, Station> = new Map();
    private config: StationManagerConfig;
    private timeManager: TimeManager;
    private eventStack: EventStack;
    private unsubscribeFunctions: (() => void)[] = [];

    constructor(timeManager: TimeManager, eventStack: EventStack, config?: Partial<StationManagerConfig>) {
        this.timeManager = timeManager;
        this.eventStack = eventStack;
        this.config = {
            minStationDistance: 200, // Increased from default for expanded stations
            defaultPerimeterRadius: 50,
            maxStationsPerWorld: 20,
            ...config
        };
        
        this.setupEventSubscriptions();
        Logger.log(LogCategory.SYSTEM, 'StationManager initialized');
    }

    /**
     * Set up event subscriptions for cross-entity communication
     */
    private setupEventSubscriptions(): void {
        // Subscribe to train arrival events
        const unsubscribeArrival = this.eventStack.subscribe('train_arrived_at_station', (event) => {
            if (event.payload?.trainId && event.payload?.stationId) {
                this.handleTrainArrival(event.payload.trainId, event.payload.stationId);
            }
        });
        this.unsubscribeFunctions.push(unsubscribeArrival);

        // Subscribe to train departure events
        const unsubscribeDeparture = this.eventStack.subscribe('train_departed_from_station', (event) => {
            if (event.payload?.trainId && event.payload?.stationId) {
                this.handleTrainDeparture(event.payload.trainId, event.payload.stationId);
            }
        });
        this.unsubscribeFunctions.push(unsubscribeDeparture);

        // Subscribe to time speed changes
        const unsubscribeTimeSpeed = this.eventStack.subscribe('time_speed_changed', () => {
            this.updateWarehousePrices();
        });
        this.unsubscribeFunctions.push(unsubscribeTimeSpeed);
    }

    /**
     * Create a new expanded station
     */
    createStation(config: StationConfig): Station {
        // Ensure minimum distance from existing stations
        if (!this.isValidStationPosition(config.position)) {
            throw new Error(`Invalid station position: too close to existing station`);
        }

        // Set default expanded station properties
        const expandedConfig: StationConfig = {
            perimeterRadius: this.config.defaultPerimeterRadius,
            hasCargoWarehouse: true,
            decorativeBuildingCount: Math.floor(Math.random() * 5) + 6, // 6-10 buildings per station
            ...config
        };

        const station = new Station(expandedConfig, this.eventStack);
        
        // Expand the station immediately
        station.expandStation();
        
        this.stations.set(station.stationId, station);
        
        Logger.log(LogCategory.SYSTEM, `Created expanded station: ${station.stationId} at (${config.position.x}, ${config.position.z})`);
        
        // Emit station creation event for other systems
        this.eventStack.emit({
            type: 'station_created',
            payload: {
                stationId: station.stationId,
                position: config.position,
                isExpanded: true
            },
            source: 'StationManager'
        });

        return station;
    }

    /**
     * Get a station by ID
     */
    getStation(stationId: string): Station | null {
        return this.stations.get(stationId) || null;
    }

    /**
     * Get all stations
     */
    getAllStations(): Station[] {
        return Array.from(this.stations.values());
    }

    /**
     * Update all stations
     */
    update(deltaTime: number): void {
        this.stations.forEach(station => {
            station.update(deltaTime);
        });
    }

    /**
     * Check if a position is valid for a new station (minimum distance check)
     */
    private isValidStationPosition(position: Vector3): boolean {
        for (const station of this.stations.values()) {
            const distance = Vector3.Distance(position, station.position);
            if (distance < this.config.minStationDistance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Handle train arrival at a station
     */
    handleTrainArrival(trainId: string, stationId: string): void {
        const station = this.getStation(stationId);
        if (!station || !station.isExpanded) {
            return;
        }

        Logger.log(LogCategory.SYSTEM, `Train ${trainId} arrived at expanded station ${stationId}`);
        
        // Emit camera focus event for expanded stations
        this.eventStack.emit({
            type: 'camera_focus_station',
            payload: {
                stationId: stationId,
                trainId: trainId,
                position: station.position,
                perimeter: station.getPerimeter()
            },
            source: 'StationManager'
        });

        // Auto-sell cargo if cargo warehouse exists
        const warehouse = station.getCargoWarehouse();
        if (warehouse) {
            this.processAutoTrade(trainId, warehouse);
        }
    }

    /**
     * Handle train departure from a station
     */
    handleTrainDeparture(trainId: string, stationId: string): void {
        const station = this.getStation(stationId);
        if (!station || !station.isExpanded) {
            return;
        }

        Logger.log(LogCategory.SYSTEM, `Train ${trainId} departed from expanded station ${stationId}`);
        
        // Emit camera release event
        this.eventStack.emit({
            type: 'camera_release_station',
            payload: {
                stationId: stationId,
                trainId: trainId
            },
            source: 'StationManager'
        });
    }

    /**
     * Process automatic cargo trading when train arrives
     */
    private processAutoTrade(trainId: string, _warehouse: any): void {
        // This would integrate with the train's cargo system
        // For now, just log the intention and emit trade event
        Logger.log(LogCategory.SYSTEM, `Processing auto-trade for train ${trainId} at warehouse`);
        
        // Emit trade processing event for other systems
        this.eventStack.emit({
            type: 'cargo_trade_processed',
            payload: {
                trainId: trainId,
                tradeType: 'auto_sell'
            },
            source: 'StationManager'
        });
    }

    /**
     * Update warehouse prices based on time speed
     */
    updateWarehousePrices(): void {
        const currentSpeed = this.timeManager.getSpeed();
        Logger.log(LogCategory.SYSTEM, `Updating warehouse prices for time speed: ${currentSpeed}x`);
        
        // Update station market prices more frequently at higher speeds
        this.stations.forEach(station => {
            const warehouse = station.getCargoWarehouse();
            if (warehouse) {
                // Pass empty price multipliers for default price update
                warehouse.updatePrices(new Map());
            }
        });
    }

    /**
     * Get the closest station to a position
     */
    getClosestStation(position: Vector3): Station | null {
        let closest: Station | null = null;
        let minDistance = Infinity;

        this.stations.forEach(station => {
            const distance = Vector3.Distance(position, station.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = station;
            }
        });

        return closest;
    }

    /**
     * Get stations within a certain distance of a position
     */
    getStationsInRange(position: Vector3, range: number): Station[] {
        const stationsInRange: Station[] = [];
        
        this.stations.forEach(station => {
            const distance = Vector3.Distance(position, station.position);
            if (distance <= range) {
                stationsInRange.push(station);
            }
        });

        return stationsInRange;
    }

    /**
     * Generate positions for a network of stations with proper spacing
     */
    generateStationNetwork(stationCount: number, worldRadius: number = 500): Vector3[] {
        const positions: Vector3[] = [];
        const maxAttempts = stationCount * 10;
        let attempts = 0;

        while (positions.length < stationCount && attempts < maxAttempts) {
            attempts++;

            // Generate random position within world bounds
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * worldRadius;
            const position = new Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            // Check minimum distance from existing positions
            let validPosition = true;
            for (const existingPos of positions) {
                if (Vector3.Distance(position, existingPos) < this.config.minStationDistance) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                positions.push(position);
            }
        }

        Logger.log(LogCategory.SYSTEM, `Generated ${positions.length} station positions in ${attempts} attempts`);
        return positions;
    }

    /**
     * Dispose of the station manager and clean up resources
     */
    dispose(): void {
        this.stations.forEach(station => {
            station.dispose();
        });
        this.stations.clear();
        
        // Clean up event subscriptions
        this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFunctions.length = 0;
        
        Logger.log(LogCategory.SYSTEM, 'StationManager disposed');
    }
}
