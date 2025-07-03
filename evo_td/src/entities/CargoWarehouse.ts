/**
 * CargoWarehouse - Specialized building entity for cargo trading functionality
 */
import { Building, BuildingType, BuildingConfig, BuildingState } from "./Building";
import { Vector3 } from "@babylonjs/core";
import { Logger, LogCategory } from "../engine/utils/Logger";

export interface CargoWarehouseConfig extends BuildingConfig {
    maxStock?: number;
    initialStockLevels?: Map<string, number>;
    initialPrices?: { buy: Map<string, number>; sell: Map<string, number> };
}

export interface CargoWarehouseState {
    cargoTypes: CargoType[];
    buyPrices: Map<string, number>;
    sellPrices: Map<string, number>;
    stockLevels: Map<string, number>;
    maxStock: number;
    lastTradeTime: number;
}

export enum CargoType {
    STANDARD = 'standard',
    HAZARDOUS = 'hazardous'
}

export interface CargoInventorySlot {
    cargoType: CargoType;
    quantity: number;
    value: number;
    lastUpdated: number;
}

export class CargoWarehouse extends Building {
    private _state: CargoWarehouseState;

    constructor(config: CargoWarehouseConfig) {
        // Call Building constructor with cargo warehouse specifics
        super({
            buildingType: BuildingType.CARGO_WAREHOUSE,
            position: config.position,
            size: config.size || new Vector3(12, 6, 8),
            health: config.health || 500,
            name: config.name || 'cargo_warehouse'
        });
        
        // Initialize cargo-specific state
        this._state = {
            cargoTypes: [CargoType.STANDARD, CargoType.HAZARDOUS],
            buyPrices: new Map(),
            sellPrices: new Map(),
            stockLevels: new Map(),
            maxStock: config.maxStock || 1000,
            lastTradeTime: Date.now()
        };

        // Set initial prices
        if (config.initialPrices) {
            this._state.buyPrices = new Map(config.initialPrices.buy);
            this._state.sellPrices = new Map(config.initialPrices.sell);
        } else {
            // Default prices
            this._state.buyPrices.set(CargoType.STANDARD, 100);
            this._state.buyPrices.set(CargoType.HAZARDOUS, 200);
            this._state.sellPrices.set(CargoType.STANDARD, 120);
            this._state.sellPrices.set(CargoType.HAZARDOUS, 250);
        }

        // Set initial stock levels
        if (config.initialStockLevels) {
            this._state.stockLevels = new Map(config.initialStockLevels);
        } else {
            // Default stock levels
            this._state.stockLevels.set(CargoType.STANDARD, 500);
            this._state.stockLevels.set(CargoType.HAZARDOUS, 200);
        }

        Logger.log(LogCategory.SYSTEM, `CargoWarehouse initialized with ${this._state.maxStock} max stock capacity`);
    }

    // Getter methods for state access
    get cargoTypes(): CargoType[] {
        return [...this._state.cargoTypes];
    }

    get maxStock(): number {
        return this._state.maxStock;
    }

    get lastTradeTime(): number {
        return this._state.lastTradeTime;
    }

    /**
     * Get the current buy price for a cargo type
     */
    getBuyPrice(cargoType: CargoType): number {
        return this._state.buyPrices.get(cargoType) || 0;
    }

    /**
     * Get the current sell price for a cargo type
     */
    getSellPrice(cargoType: CargoType): number {
        return this._state.sellPrices.get(cargoType) || 0;
    }

    /**
     * Get current stock level for a cargo type
     */
    getStockLevel(cargoType: CargoType): number {
        return this._state.stockLevels.get(cargoType) || 0;
    }

    /**
     * Check if warehouse can buy cargo
     */
    canBuy(cargoType: CargoType, quantity: number): boolean {
        const currentStock = this.getStockLevel(cargoType);
        return (currentStock + quantity) <= this._state.maxStock;
    }

    /**
     * Check if warehouse can sell cargo
     */
    canSell(cargoType: CargoType, quantity: number): boolean {
        const currentStock = this.getStockLevel(cargoType);
        return currentStock >= quantity;
    }

    /**
     * Buy cargo from a train (warehouse purchases from player)
     * @param cargoType Type of cargo
     * @param quantity Amount to buy
     * @returns Total cost to pay the player
     */
    buyFromTrain(cargoType: CargoType, quantity: number): number {
        if (!this.canBuy(cargoType, quantity)) {
            Logger.warn(LogCategory.SYSTEM, `CargoWarehouse cannot buy ${quantity} ${cargoType} - insufficient capacity`);
            return 0;
        }

        const unitPrice = this.getBuyPrice(cargoType);
        const totalCost = unitPrice * quantity;
        
        // Update stock
        const currentStock = this.getStockLevel(cargoType);
        this._state.stockLevels.set(cargoType, currentStock + quantity);
        this._state.lastTradeTime = Date.now();

        Logger.log(LogCategory.SYSTEM, `CargoWarehouse bought ${quantity} ${cargoType} for ${totalCost} credits`);
        return totalCost;
    }

    /**
     * Sell cargo to a train (warehouse sells to player)
     * @param cargoType Type of cargo
     * @param quantity Amount to sell
     * @returns Total cost for the player to pay
     */
    sellToTrain(cargoType: CargoType, quantity: number): number {
        if (!this.canSell(cargoType, quantity)) {
            Logger.warn(LogCategory.SYSTEM, `CargoWarehouse cannot sell ${quantity} ${cargoType} - insufficient stock`);
            return 0;
        }

        const unitPrice = this.getSellPrice(cargoType);
        const totalCost = unitPrice * quantity;
        
        // Update stock
        const currentStock = this.getStockLevel(cargoType);
        this._state.stockLevels.set(cargoType, currentStock - quantity);
        this._state.lastTradeTime = Date.now();

        Logger.log(LogCategory.SYSTEM, `CargoWarehouse sold ${quantity} ${cargoType} for ${totalCost} credits`);
        return totalCost;
    }

    /**
     * Update prices based on market conditions
     */
    updatePrices(priceMultipliers: Map<string, number>): void {
        for (const [cargoType, multiplier] of priceMultipliers) {
            const currentBuyPrice = this.getBuyPrice(cargoType as CargoType);
            const currentSellPrice = this.getSellPrice(cargoType as CargoType);
            
            if (currentBuyPrice > 0) {
                this._state.buyPrices.set(cargoType, Math.round(currentBuyPrice * multiplier));
            }
            if (currentSellPrice > 0) {
                this._state.sellPrices.set(cargoType, Math.round(currentSellPrice * multiplier));
            }
        }

        Logger.log(LogCategory.SYSTEM, 'CargoWarehouse prices updated based on market conditions');
    }

    /**
     * Get warehouse status summary
     */
    getStatus(): { cargoType: CargoType; stock: number; buyPrice: number; sellPrice: number }[] {
        return this._state.cargoTypes.map(cargoType => ({
            cargoType,
            stock: this.getStockLevel(cargoType),
            buyPrice: this.getBuyPrice(cargoType),
            sellPrice: this.getSellPrice(cargoType)
        }));
    }

    serialize(): BuildingConfig & BuildingState & CargoWarehouseState {
        const buildingData = super.serialize();
        return {
            ...buildingData,
            maxStock: this._state.maxStock,
            cargoTypes: this._state.cargoTypes,
            buyPrices: this._state.buyPrices,
            sellPrices: this._state.sellPrices,
            stockLevels: this._state.stockLevels,
            lastTradeTime: this._state.lastTradeTime
        };
    }

    deserialize(data: BuildingConfig & BuildingState & CargoWarehouseState): void {
        // Call parent deserialize for building-specific data
        super.deserialize(data);

        // Update cargo-specific state
        if (data.cargoTypes) this._state.cargoTypes = data.cargoTypes;
        if (data.buyPrices) this._state.buyPrices = data.buyPrices;
        if (data.sellPrices) this._state.sellPrices = data.sellPrices;
        if (data.stockLevels) this._state.stockLevels = data.stockLevels;
        if (data.maxStock) this._state.maxStock = data.maxStock;
        if (data.lastTradeTime) this._state.lastTradeTime = data.lastTradeTime;
        this._state.maxStock = data.maxStock || this._state.maxStock;
        this._state.lastTradeTime = data.lastTradeTime || this._state.lastTradeTime;
    }
}
