/**
 * Train Journey Controls UI Component
 * Shows available journey options when train is at a station
 */

import { Train } from "../entities/Trains/Train";
import { Station } from "../entities/Station/Station";
import { TrainSystem } from "../systems/TrainSystem";
import { GameNodeObject } from '../../engine/core/GameNodeObject';
import { PositionComponent } from '../../engine/components/PositionComponent';
import { MathUtils } from '../../engine/utils/MathUtils';
import { Logger, LogCategory } from "../../engine/utils/Logger";

export interface JourneyOption {
    stationId: string;
    stationName: string;
    railId: string;
    railName: string;
}

export class TrainJourneyControlsUI extends GameNodeObject {
    private container: HTMLElement;
    private train: Train;
    private trainSystem: TrainSystem;
    private stations: Map<string, Station>;
    private rails: Map<string, any>; // Rail objects
    private currentStationId: string | null = null;
    private updateInterval: number;

    constructor(
        train: Train, 
        trainSystem: TrainSystem, 
        stations: Map<string, Station>,
        rails: Map<string, any>,
        scene?: any,
        parentNode?: any
    ) {
        super('train_journey_controls_ui', undefined, scene, parentNode);
        this.train = train;
        this.trainSystem = trainSystem;
        this.stations = stations;
        this.rails = rails;

        this.createUI();
        this.startMonitoring();

        // Listen for journey started/completed events via node-based API
        this.train.addEventListener('journey:started', () => this.hideControls());
        this.train.addEventListener('journey:completed', () => this.updateUI());
    }

    /**
     * Create the journey controls UI
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'train-journey-controls';
        this.container.className = 'train-journey-controls';
        this.container.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(this.container);
        
        Logger.log(LogCategory.UI, 'Train journey controls UI created');
    }

    /**
     * Start monitoring train position and status
     */
    private startMonitoring(): void {
        this.updateInterval = window.setInterval(() => {
            this.updateUI();
        }, 200); // Check every 200ms for more responsive updates
    }

    /**
     * Update the UI based on train status
     */
    private updateUI(): void {
        // Simply check if train is moving - the Train entity should have reliable state
        const isMoving = this.train.isMoving;
        
        if (isMoving) {
            // Train is moving - hide controls immediately
            this.hideControls();
            return;
        }

        // Train is stationary - check if at a station
        const currentStation = this.getCurrentStation();
        if (currentStation) {
            this.showStationControls(currentStation);
        } else {
            this.hideControls();
        }
    }

    /**
     * Determine which station the train is currently at
     */
    private getCurrentStation(): Station | null {
        const trainPosComponent = this.train.getComponent('position') as PositionComponent;
        if (!trainPosComponent) return null;
        
        const trainPos = trainPosComponent.getPosition();

        // Check distance to each station
        for (const [stationId, station] of this.stations) {
            const stationPosComponent = station.getComponent('position') as PositionComponent;
            if (!stationPosComponent) continue;
            
            const stationPos = stationPosComponent.getPosition();

            const distance = MathUtils.calculateDistance2D(trainPos, stationPos);

            // If within 2 units, consider at station
            if (distance < 2.0) {
                return station;
            }
        }

        return null;
    }

    /**
     * Show controls for the current station
     */
    private showStationControls(station: Station): void {
        const stationConfig = (station as any)._config; // Access private config
        
        if (this.currentStationId === stationConfig.id) {
            return; // Already showing controls for this station
        }

        this.currentStationId = stationConfig.id;
        
        // Get available journey options
        const journeyOptions = this.getAvailableJourneys(stationConfig);
        
        if (journeyOptions.length === 0) {
            this.hideControls();
            return;
        }

        // Build UI content
        this.container.innerHTML = `
            <div class="journey-header">
                <h3>🚂 At ${stationConfig.name}</h3>
                <p>Select destination:</p>
            </div>
            <div class="journey-buttons">
                ${journeyOptions.map(option => `
                    <button class="journey-button" data-station-id="${option.stationId}" data-rail-id="${option.railId}">
                        <div class="destination-name">${option.stationName}</div>
                        <div class="rail-name">via ${option.railName}</div>
                    </button>
                `).join('')}
            </div>
        `;

        // Add event listeners to buttons
        const buttons = this.container.querySelectorAll('.journey-button');
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.currentTarget as HTMLElement;
                const stationId = target.getAttribute('data-station-id');
                const railId = target.getAttribute('data-rail-id');
                
                if (stationId && railId) {
                    this.startJourney(railId, stationId);
                }
            });
        });

        this.container.style.display = 'block';
    }

    /**
     * Hide the journey controls
     */
    private hideControls(): void {
        if (this.container.style.display !== 'none') {
            this.container.style.display = 'none';
            this.currentStationId = null;
        }
    }

    /**
     * Get available journey options from current station
     */
    private getAvailableJourneys(stationConfig: any): JourneyOption[] {
        const options: JourneyOption[] = [];
        
        for (const railId of stationConfig.connectedRails) {
            const rail = this.rails.get(railId);
            if (!rail) continue;

            // Determine the other station on this rail
            const otherStationId = rail.stationA === stationConfig.id ? rail.stationB : rail.stationA;
            const otherStation = this.stations.get(otherStationId);
            
            if (otherStation) {
                const otherStationConfig = (otherStation as any)._config;
                options.push({
                    stationId: otherStationId,
                    stationName: otherStationConfig.name,
                    railId: railId,
                    railName: rail.name || `Rail ${railId}`
                });
            }
        }

        return options;
    }

    /**
     * Start a journey to the specified destination
     */
    private startJourney(railId: string, destinationStationId: string): void {
        // Hide controls immediately when journey starts
        this.hideControls();

        // Emit journey:request event from the UI node (not the train)
        this.emit('journey:request', {
            trainId: this.train.id,
            railId,
            destinationStationId
        });
    }

    /**
     * Public method to show the journey controls UI
     */
    public show(): void {
        this.container.style.display = 'block';
    }

    /**
     * Public method to hide the journey controls UI
     */
    public hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Dispose of the journey controls UI
     */
    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        Logger.log(LogCategory.UI, 'Train journey controls UI disposed');
    }
}
