import { Vector3, Mesh } from "@babylonjs/core";
import { GameObject } from "../core/GameObject";
import { Logger, LogCategory } from "../utils/Logger";
import { PositionComponent } from "../components/PositionComponent";

export interface StationConfig {
    id: string;
    name: string;
    position: Vector3;
    connectedRails: string[];
}

export interface StationState {
    level: number;
    reputation: number;
    profitMultiplier: number;
    cargoCapacity: number;
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
    
    constructor(config: StationConfig) {
        super('station');
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
            cargoCapacity: 100 // Base storage capacity
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
}
