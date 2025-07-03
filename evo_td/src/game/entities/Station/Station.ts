import { Vector3, Mesh } from "@babylonjs/core";
import { GameObject } from "../../../engine/core/GameObject";
import { Logger, LogCategory } from "../../../engine/utils/Logger";
import { PositionComponent } from "../../../engine/components/PositionComponent";
import { HealthComponent } from "../../../engine/components/HealthComponent";
import { StationPerimeterComponent } from "../../components/StationPerimeterComponent";
import { Building, BuildingType } from "../Building/Building";
import { CargoWarehouse, CargoType } from "../CargoWarehouse/CargoWarehouse";
import type { EventStack } from "../../../engine/core/EventStack";

export interface StationConfig {
    id: string;
    name: string;
    position: Vector3;
    connectedRails: string[];
    // New expanded station properties
    perimeterRadius?: number;
    hasCargoWarehouse?: boolean;
    decorativeBuildingCount?: number;
}

export interface StationBuildingData {
    id: string;
    type: BuildingType;
    position: Vector3;
    size: Vector3;
    colorIndex: number;
}

export interface StationState {
    level: number;
    reputation: number;
    profitMultiplier: number;
    cargoCapacity: number;
    // New state properties
    isExpanded: boolean;
    buildingIds: string[];
    buildingData: StationBuildingData[];
}

export interface MarketPrices {
    [key: string]: number; // cargo type -> current price modifier
}

/**
 * Station represents a node in the rail network where trains can stop.
 * Stations have levels, reputation, and dynamic cargo pricing.
 */
export class Station extends GameObject {
    private _config: StationConfig;
    private _state: StationState;
    private _mesh?: Mesh;
    private _marketPrices: MarketPrices = {};
    private _lastPriceUpdate: number = 0;
    
    constructor(config: StationConfig, eventStack?: EventStack) {
        super('station', eventStack);
        this._config = config;
        
        // Debug log to see the auto-generated ID versus the config ID
        Logger.log(LogCategory.SYSTEM, `Station created with IDs - GameObject ID: ${this.id}, Config ID: ${config.id}`);
        
        // Add required components
        this.addComponent(new PositionComponent());
        const pos = this.getComponent<PositionComponent>('position');
        if (pos) {
            // Convert Vector3 to Position3D interface
            pos.setPosition({
                x: config.position.x,
                y: config.position.y,
                z: config.position.z
            });
            Logger.log(LogCategory.SYSTEM, `Station ${config.id} position set to: (${config.position.x}, ${config.position.y}, ${config.position.z})`);
        }
        
        this._state = {
            level: 1,
            reputation: 50, // 0-100 scale
            profitMultiplier: 1.0,
            cargoCapacity: 100, // Base storage capacity
            // Initialize new state properties
            isExpanded: false,
            buildingIds: [],
            buildingData: []
        };

        // Set up metrics
        this.metrics.set('level', this._state.level);
        this.metrics.set('reputation', this._state.reputation);
        this.metrics.set('cargo_capacity', this._state.cargoCapacity);
        this.metrics.set('connected_rails', config.connectedRails.length);

        Logger.log(LogCategory.SYSTEM, `Station created`, {
            id: config.id,
            name: config.name,
            connectedRails: config.connectedRails.length
        });
    }

    get stationId(): string {
        return this._config.id;
    }

    get name(): string {
        return this._config.name;
    }

    get position(): Vector3 {
        const pos = this.getComponent<PositionComponent>('position');
        if (pos) {
            const p = pos.getPosition();
            // Convert Position3D to Vector3
            return new Vector3(p.x, p.y, p.z);
        } else {
            return this._config.position;
        }
    }

    get connectedRails(): string[] {
        return [...this._config.connectedRails];
    }

    get level(): number {
        return this._state.level;
    }

    get reputation(): number {
        return this._state.reputation;
    }

    get profitMultiplier(): number {
        return this._state.profitMultiplier;
    }

    get cargoCapacity(): number {
        return this._state.cargoCapacity;
    }

    get mesh(): Mesh | undefined {
        return this._mesh;
    }

    set mesh(value: Mesh | undefined) {
        this._mesh = value;
    }

    /**
     * Update station state and market prices
     * @param deltaTime Time elapsed in seconds since last update
     * @param gameTime Current game time in seconds (optional)
     */
    update(deltaTime: number, gameTime?: number): void {
        super.update(deltaTime);

        // If gameTime is provided, update market prices
        if (gameTime !== undefined && gameTime - this._lastPriceUpdate >= 3600) {
            this.updateMarketPrices(gameTime);
        }
    }

    /**
     * Set the station's level and update related stats
     */
    setLevel(level: number): void {
        this._state.level = Math.max(1, Math.min(10, level));
        this._state.cargoCapacity = 100 * Math.pow(1.5, level - 1);
        
        // Update metrics
        this.metrics.set('level', this._state.level);
        this.metrics.set('cargo_capacity', this._state.cargoCapacity);

        Logger.log(LogCategory.SYSTEM, `Station level changed`, {
            id: this.stationId,
            level: this._state.level,
            newCapacity: this._state.cargoCapacity
        });
    }

    /**
     * Change station's reputation based on events
     */
    adjustReputation(change: number): void {
        this._state.reputation = Math.max(0, Math.min(100, this._state.reputation + change));
        this.metrics.set('reputation', this._state.reputation);
        this._state.profitMultiplier = 0.5 + (this._state.reputation / 100);

        Logger.log(LogCategory.SYSTEM, `Station reputation adjusted`, {
            id: this.stationId,
            change,
            newReputation: this._state.reputation
        });
    }

    /**
     * Get current price modifier for a cargo type
     */
    getPriceModifier(cargoType: string): number {
        return this._marketPrices[cargoType] || 1.0;
    }

    /**
     * Check if this station is connected to another station via any rail
     */
    isConnectedTo(stationId: string, railMap: Map<string, { stationA: string; stationB: string }>): boolean {
        return this.connectedRails.some(railId => {
            const rail = railMap.get(railId);
            if (!rail) return false;
            return rail.stationA === stationId || rail.stationB === stationId;
        });
    }

    /**
     * Gets the rail that connects this station to another station
     */
    getRailTo(stationId: string, railMap: Map<string, { stationA: string; stationB: string }>): string | null {
        const foundRailId = this.connectedRails.find(railId => {
            const rail = railMap.get(railId);
            if (!rail) return false;
            return rail.stationA === stationId || rail.stationB === stationId;
        });
        
        return foundRailId || null;
    }

    /**
     * Update market prices based on time and station reputation
     * @param gameTime Current game time in seconds
     */
    private updateMarketPrices(gameTime: number): void {
        // Update prices logic would go here
        this._lastPriceUpdate = gameTime;
        
        // For now, just log that prices were updated
        Logger.log(LogCategory.SYSTEM, `Market prices updated at station`, {
            id: this.stationId,
            time: gameTime
        });
    }

    /**
     * Expand the station to include perimeter, buildings, and cargo warehouse
     */
    expandStation(): void {
        if (this._state.isExpanded) {
            Logger.log(LogCategory.SYSTEM, `Station ${this.stationId} already expanded`);
            return;
        }

        // Add station perimeter component
        const perimeterRadius = this._config.perimeterRadius || 50;
        const perimeter = new StationPerimeterComponent(this.position, perimeterRadius);
        this.addComponent(perimeter);

        // Add health component for station vulnerability
        const health = new HealthComponent(1000, 0); // 1000 HP, no regen
        this.addComponent(health);

        // Create cargo warehouse if specified
        if (this._config.hasCargoWarehouse !== false) {
            this.createCargoWarehouse();
        }

        // Create decorative buildings
        const buildingCount = this._config.decorativeBuildingCount || 3;
        this.createDecorativeBuildings(buildingCount);

        this._state.isExpanded = true;
        Logger.log(LogCategory.SYSTEM, `Station ${this.stationId} expanded with perimeter radius ${perimeterRadius}`);
    }

    /**
     * Create a cargo warehouse building within the station
     */
    private createCargoWarehouse(): void {
        const perimeter = this.getComponent<StationPerimeterComponent>('station_perimeter');
        if (!perimeter) return;

        // Place warehouse at a fixed offset from station center (within 3-4 unit radius)
        const warehousePosition = new Vector3(
            this.position.x + 2.5, // 2.5 units east of center
            this.position.y,
            this.position.z - 1.5  // 1.5 units south of center
        );
        
        // Create cargo warehouse entity (extends Building)
        const warehouse = new CargoWarehouse({
            buildingType: BuildingType.CARGO_WAREHOUSE,
            position: warehousePosition,
            size: new Vector3(12, 6, 8),
            health: 500,
            name: 'cargo_warehouse',
            maxStock: 1000
        });

        this._state.buildingIds.push(warehouse.id);
        Logger.log(LogCategory.SYSTEM, `Created cargo warehouse for station ${this.stationId} at controlled position`);
    }

    /**
     * Create decorative buildings around the station
     */
    private createDecorativeBuildings(count: number): void {
        const buildingTypes = [
            BuildingType.DECORATIVE_TOWER,
            BuildingType.DECORATIVE_SHOP,
            BuildingType.DECORATIVE_BUILDING
        ];

        // Generate random, unique positions in a 2-4 unit radius around station center for each station
        for (let i = 0; i < count; i++) {
            const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
            
            // Generate random position within 2-4 unit radius
            const angle = Math.random() * 2 * Math.PI;
            const distance = 2 + Math.random() * 2; // 2-4 unit radius
            
            const position = new Vector3(
                this.position.x + Math.cos(angle) * distance,
                this.position.y,
                this.position.z + Math.sin(angle) * distance
            );

            const building = new Building({
                buildingType: buildingType,
                position: position,
                size: this.getRandomBuildingSize(buildingType),
                health: 300,
                name: 'decorative_building'
            });

            // Store building data for renderer
            const buildingData: StationBuildingData = {
                id: building.id,
                type: buildingType,
                position: position.clone(),
                size: building.size.clone(),
                colorIndex: Math.floor(Math.random() * 5) // Random grey tone index
            };
            
            this._state.buildingData.push(buildingData);
            this._state.buildingIds.push(building.id);
        }

        Logger.log(LogCategory.SYSTEM, `Created ${count} randomly positioned decorative buildings for station ${this.stationId}`);
    }

    /**
     * Check if a position is occupied by existing buildings
     */
    private isPositionOccupied(position: Vector3, minDistance: number): boolean {
        // For now, just check distance from station center
        // In a full implementation, this would check against all building positions
        const distanceFromCenter = Vector3.Distance(position, this.position);
        return distanceFromCenter < minDistance;
    }

    /**
     * Get random building size based on type (smaller sizes for more buildings)
     */
    private getRandomBuildingSize(buildingType: BuildingType): Vector3 {
        // Add random variation to building sizes for more uniqueness
        const variation = 0.5 + Math.random() * 0.5; // 0.5x to 1.0x size variation
        
        switch (buildingType) {
            case BuildingType.DECORATIVE_TOWER:
                return new Vector3(
                    1.5 * variation, 
                    6 + Math.random() * 4, // 6-10 height for towers
                    1.5 * variation
                );
            case BuildingType.DECORATIVE_SHOP:
                return new Vector3(
                    3 + Math.random() * 2, // 3-5 width
                    2 + Math.random() * 2, // 2-4 height
                    2.5 * variation
                );
            case BuildingType.DECORATIVE_BUILDING:
                return new Vector3(
                    2.5 + Math.random() * 1.5, // 2.5-4 width
                    3 + Math.random() * 2,      // 3-5 height
                    2.5 + Math.random() * 1     // 2.5-3.5 depth
                );
            default:
                return new Vector3(
                    2 + Math.random() * 1, 
                    2.5 + Math.random() * 1.5, 
                    2 + Math.random() * 1
                );
        }
    }

    /**
     * Get the cargo warehouse entity if it exists
     */
    getCargoWarehouse(): CargoWarehouse | null {
        // For now, return null since we're not tracking individual building entities
        // In a full implementation, this would search through building entities by ID
        // This method can be enhanced later when we need to interact with the warehouse
        return null;
    }

    /**
     * Check if the station is expanded
     */
    get isExpanded(): boolean {
        return this._state.isExpanded;
    }

    /**
     * Get the station perimeter component
     */
    getPerimeter(): StationPerimeterComponent | null {
        return this.getComponent<StationPerimeterComponent>('station_perimeter');
    }

    /**
     * Get the building data for this station
     */
    get buildingData(): StationBuildingData[] {
        return [...this._state.buildingData]; // Return a copy to prevent external modification
    }
}
