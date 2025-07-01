/**
 * CargoWarehouseComponent - Handles cargo trading functionality for stations
 */
import { Component } from "../core/Component";
import { Logger, LogCategory } from "../utils/Logger";

export interface CargoWarehouseData {
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

export class CargoWarehouseComponent extends Component<CargoWarehouseData> {
    readonly type = 'cargo_warehouse';

    public cargoTypes: CargoType[] = [CargoType.STANDARD, CargoType.HAZARDOUS];
    public buyPrices: Map<string, number> = new Map();
    public sellPrices: Map<string, number> = new Map();
    public stockLevels: Map<string, number> = new Map();
    public maxStock: number = 1000;
    public lastTradeTime: number = 0;

    /**
     * Initialize the cargo warehouse with default prices and stock
     */
    initialize(): void {
        // Set initial prices for cargo types
        this.buyPrices.set(CargoType.STANDARD, 100);
        this.buyPrices.set(CargoType.HAZARDOUS, 200);
        
        this.sellPrices.set(CargoType.STANDARD, 120);
        this.sellPrices.set(CargoType.HAZARDOUS, 250);
        
        // Set initial stock levels
        this.stockLevels.set(CargoType.STANDARD, 500);
        this.stockLevels.set(CargoType.HAZARDOUS, 200);
        
        this.lastTradeTime = Date.now();
        
        Logger.log(LogCategory.SYSTEM, 'CargoWarehouseComponent initialized with default prices and stock');
    }

    /**
     * Get the current buy price for a cargo type
     */
    getBuyPrice(cargoType: CargoType): number {
        return this.buyPrices.get(cargoType) || 0;
    }

    /**
     * Get the current sell price for a cargo type
     */
    getSellPrice(cargoType: CargoType): number {
        return this.sellPrices.get(cargoType) || 0;
    }

    /**
     * Get current stock level for a cargo type
     */
    getStockLevel(cargoType: CargoType): number {
        return this.stockLevels.get(cargoType) || 0;
    }

    /**
     * Check if warehouse can buy cargo
     */
    canBuy(cargoType: CargoType, quantity: number): boolean {
        const currentStock = this.getStockLevel(cargoType);
        return (currentStock + quantity) <= this.maxStock;
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
    buyCargo(cargoType: CargoType, quantity: number): number {
        if (!this.canBuy(cargoType, quantity)) {
            Logger.log(LogCategory.SYSTEM, `Cannot buy ${quantity} ${cargoType}: insufficient warehouse capacity`);
            return 0;
        }

        const pricePerUnit = this.getBuyPrice(cargoType);
        const totalCost = pricePerUnit * quantity;
        
        // Update stock
        const currentStock = this.getStockLevel(cargoType);
        this.stockLevels.set(cargoType, currentStock + quantity);
        this.lastTradeTime = Date.now();
        
        Logger.log(LogCategory.SYSTEM, `Warehouse bought ${quantity} ${cargoType} for ${totalCost} credits`);
        return totalCost;
    }

    /**
     * Sell cargo to a train (warehouse sells to player)
     * @param cargoType Type of cargo
     * @param quantity Amount to sell
     * @returns Total cost the player must pay
     */
    sellCargo(cargoType: CargoType, quantity: number): number {
        if (!this.canSell(cargoType, quantity)) {
            Logger.log(LogCategory.SYSTEM, `Cannot sell ${quantity} ${cargoType}: insufficient stock`);
            return 0;
        }

        const pricePerUnit = this.getSellPrice(cargoType);
        const totalCost = pricePerUnit * quantity;
        
        // Update stock
        const currentStock = this.getStockLevel(cargoType);
        this.stockLevels.set(cargoType, currentStock - quantity);
        this.lastTradeTime = Date.now();
        
        Logger.log(LogCategory.SYSTEM, `Warehouse sold ${quantity} ${cargoType} for ${totalCost} credits`);
        return totalCost;
    }

    /**
     * Update prices based on supply and demand (simple simulation)
     */
    updatePrices(): void {
        this.cargoTypes.forEach(cargoType => {
            const stockLevel = this.getStockLevel(cargoType);
            const stockRatio = stockLevel / this.maxStock;
            
            // Adjust buy prices based on stock (more stock = lower buy price)
            const baseBuyPrice = cargoType === CargoType.STANDARD ? 100 : 200;
            const buyPriceModifier = 1.5 - stockRatio; // Range: 0.5 to 1.5
            this.buyPrices.set(cargoType, Math.floor(baseBuyPrice * buyPriceModifier));
            
            // Adjust sell prices (maintain profit margin)
            const newBuyPrice = this.buyPrices.get(cargoType)!;
            this.sellPrices.set(cargoType, Math.floor(newBuyPrice * 1.2));
        });
        
        Logger.log(LogCategory.SYSTEM, 'Warehouse prices updated based on stock levels');
    }

    serialize(): CargoWarehouseData {
        return {
            cargoTypes: this.cargoTypes,
            buyPrices: this.buyPrices,
            sellPrices: this.sellPrices,
            stockLevels: this.stockLevels,
            maxStock: this.maxStock,
            lastTradeTime: this.lastTradeTime
        };
    }

    deserialize(data: CargoWarehouseData): void {
        this.cargoTypes = data.cargoTypes;
        this.buyPrices = data.buyPrices;
        this.sellPrices = data.sellPrices;
        this.stockLevels = data.stockLevels;
        this.maxStock = data.maxStock;
        this.lastTradeTime = data.lastTradeTime;
    }
}
