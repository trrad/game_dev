/**
 * Example integration of expanded stations with SceneManager
 * This shows how to use the new StationManager and event system
 */
import { Scene, Vector3 } from "@babylonjs/core";
import { StationManager } from "../core/StationManager";
import { StationRenderer } from "../renderers/StationRenderer";
import { EventStack } from "../core/EventStack";
import { TimeManager } from "../core/TimeManager";
import { Logger, LogCategory } from "../utils/Logger";

export class ExpandedStationExample {
    private stationManager: StationManager;
    private stationRenderer: StationRenderer;
    private eventStack: EventStack;
    private timeManager: TimeManager;
    private scene: Scene;

    constructor(scene: Scene, timeManager: TimeManager, eventStack: EventStack) {
        this.scene = scene;
        this.timeManager = timeManager;
        this.eventStack = eventStack;
        
        // Initialize station renderer
        this.stationRenderer = new StationRenderer(scene);
        
        // Initialize station manager with event system
        this.stationManager = new StationManager(timeManager, eventStack, {
            minStationDistance: 250, // Even more space for expanded stations
            defaultPerimeterRadius: 60,
            maxStationsPerWorld: 15
        });

        this.setupEventSubscriptions();
        this.createExampleStations();
        
        Logger.log(LogCategory.SYSTEM, 'ExpandedStationExample initialized');
    }

    /**
     * Set up event subscriptions for rendering and camera control
     */
    private setupEventSubscriptions(): void {
        // Subscribe to station creation events to render them
        this.eventStack.subscribe('station_created', (event) => {
            if (event.payload?.stationId && event.payload?.isExpanded) {
                const station = this.stationManager.getStation(event.payload.stationId);
                if (station) {
                    this.renderExpandedStation(station);
                }
            }
        });

        // Subscribe to camera focus events (placeholder - real camera system would handle this)
        this.eventStack.subscribe('camera_focus_station', (event) => {
            Logger.log(LogCategory.SYSTEM, `Camera focusing on station: ${event.payload?.stationId}`);
            // In a real implementation, this would zoom camera to station perimeter
            // and switch to fixed position mode
        });

        // Subscribe to camera release events
        this.eventStack.subscribe('camera_release_station', (event) => {
            Logger.log(LogCategory.SYSTEM, `Camera released from station: ${event.payload?.stationId}`);
            // In a real implementation, this would return camera to normal follow mode
        });

        // Subscribe to trade events for UI updates
        this.eventStack.subscribe('cargo_trade_processed', (event) => {
            Logger.log(LogCategory.SYSTEM, `Trade processed for train: ${event.payload?.trainId}`);
            // In a real implementation, this would update UI with trade results
        });
    }

    /**
     * Create example expanded stations
     */
    private createExampleStations(): void {
        // Generate positions for a small network
        const positions = this.stationManager.generateStationNetwork(5, 300);
        
        positions.forEach((position, index) => {
            const station = this.stationManager.createStation({
                id: `expanded_station_${index}`,
                name: `Station ${index + 1}`,
                position: position,
                connectedRails: [], // Would be filled by rail system
                perimeterRadius: 50 + (index * 10), // Vary sizes
                hasCargoWarehouse: true,
                decorativeBuildingCount: 2 + index
            });

            Logger.log(LogCategory.SYSTEM, `Created example station: ${station.stationId}`);
        });
    }

    /**
     * Render an expanded station with all its components
     */
    private renderExpandedStation(station: any): void {
        const colorIndex = Math.floor(Math.random() * 3); // Random color
        const stationVisuals = this.stationRenderer.createExpandedStationVisual(station, colorIndex);
        
        Logger.log(LogCategory.RENDERING, 
            `Rendered expanded station ${station.stationId}: ` +
            `main mesh + ${stationVisuals.perimeterMesh ? 'perimeter' : 'no perimeter'} + ` +
            `${stationVisuals.buildingMeshes.length} buildings`
        );
    }

    /**
     * Simulate train arrival for testing
     */
    simulateTrainArrival(trainId: string, stationId: string): void {
        Logger.log(LogCategory.SYSTEM, `Simulating train arrival: ${trainId} -> ${stationId}`);
        
        // Emit train arrival event
        this.eventStack.emit({
            type: 'train_arrived_at_station',
            payload: {
                trainId: trainId,
                stationId: stationId
            },
            source: 'ExpandedStationExample'
        });
    }

    /**
     * Simulate train departure for testing
     */
    simulateTrainDeparture(trainId: string, stationId: string): void {
        Logger.log(LogCategory.SYSTEM, `Simulating train departure: ${trainId} <- ${stationId}`);
        
        // Emit train departure event
        this.eventStack.emit({
            type: 'train_departed_from_station',
            payload: {
                trainId: trainId,
                stationId: stationId
            },
            source: 'ExpandedStationExample'
        });
    }

    /**
     * Update the station system
     */
    update(deltaTime: number): void {
        this.stationManager.update(deltaTime);
    }

    /**
     * Get the station manager for external access
     */
    getStationManager(): StationManager {
        return this.stationManager;
    }

    /**
     * Get all stations for debugging
     */
    getAllStations(): any[] {
        return this.stationManager.getAllStations();
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stationManager.dispose();
        Logger.log(LogCategory.SYSTEM, 'ExpandedStationExample disposed');
    }
}
