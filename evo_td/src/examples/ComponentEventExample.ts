/**
 * Example of component-level event handling in action
 * Shows how components can communicate autonomously
 */
import { CargoWarehouseComponent, CargoType } from "../components/CargoWarehouseComponent";
import { HealthComponent } from "../components/HealthComponent";
import { StationPerimeterComponent } from "../components/StationPerimeterComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Enhanced CargoWarehouseComponent with autonomous event handling
 */
export class EventDrivenCargoWarehouse extends CargoWarehouseComponent {
    
    constructor() {
        super();
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for train arrivals at this station
        this.subscribe('train_arrived_at_station', (event) => {
            if (event.payload?.stationId === this._gameObject?.id) {
                this.handleTrainArrival(event.payload.trainId);
            }
        });

        // Listen for health changes from sibling HealthComponent
        this.subscribeToSibling('health_changed', (event) => {
            this.handleHealthChange(event.payload?.health, event.payload?.maxHealth);
        });

        // Listen for security breaches from perimeter
        this.subscribeToComponent('station_perimeter', 'perimeter_breached', (event) => {
            this.handleSecurityBreach(event.payload);
        });

        // Listen for market price updates from other warehouses
        this.subscribe('market_price_update', (event) => {
            if (event.payload?.cargoType) {
                this.adjustPricesBasedOnMarket(event.payload.cargoType, event.payload.priceChange);
            }
        });
    }

    private handleTrainArrival(trainId: string): void {
        Logger.log(LogCategory.SYSTEM, `Warehouse processing train arrival: ${trainId}`);
        
        // Auto-process cargo trade
        const tradeResult = this.processAutoTrade(trainId);
        
        // Emit trade completion event for other systems
        this.emit('cargo_trade_completed', {
            trainId: trainId,
            warehouseId: this.instanceId,
            cargoSold: tradeResult.cargoSold,
            creditsEarned: tradeResult.creditsEarned,
            newStockLevels: this.getStockSummary()
        });
        
        // Update market prices based on trade volume
        this.updatePrices();
        this.emit('market_price_update', {
            warehouseId: this.instanceId,
            priceUpdates: this.getPriceUpdates()
        });
    }

    private handleHealthChange(currentHealth: number, maxHealth: number): void {
        const healthPercentage = currentHealth / maxHealth;
        
        if (healthPercentage < 0.5) {
            Logger.log(LogCategory.SYSTEM, 'Warehouse damaged - reducing operational efficiency');
            
            // Reduce warehouse capacity when damaged
            this.maxStock = Math.floor(this.maxStock * healthPercentage);
            
            // Emit efficiency change event
            this.emit('warehouse_efficiency_changed', {
                warehouseId: this.instanceId,
                efficiencyFactor: healthPercentage,
                reason: 'damage'
            });
        }
    }

    private handleSecurityBreach(breachData: any): void {
        Logger.log(LogCategory.SYSTEM, 'Security breach detected - implementing emergency protocols');
        
        // Increase prices due to security risk
        this.cargoTypes.forEach(cargoType => {
            const currentBuyPrice = this.getBuyPrice(cargoType);
            const currentSellPrice = this.getSellPrice(cargoType);
            
            this.buyPrices.set(cargoType, Math.floor(currentBuyPrice * 0.8)); // Pay less for risky cargo
            this.sellPrices.set(cargoType, Math.floor(currentSellPrice * 1.3)); // Charge more due to risk
        });
        
        // Emit security alert for other systems
        this.emit('warehouse_security_alert', {
            warehouseId: this.instanceId,
            breachType: breachData.breachType,
            severity: breachData.severity,
            priceAdjustments: this.getPriceUpdates()
        });
    }

    private adjustPricesBasedOnMarket(cargoType: CargoType, priceChange: number): void {
        const currentSellPrice = this.getSellPrice(cargoType);
        const newSellPrice = Math.floor(currentSellPrice * (1 + priceChange));
        this.sellPrices.set(cargoType, newSellPrice);
        
        Logger.log(LogCategory.SYSTEM, `Adjusted ${cargoType} price based on market: ${currentSellPrice} -> ${newSellPrice}`);
    }

    private processAutoTrade(_trainId: string): { cargoSold: any[], creditsEarned: number } {
        // Simplified auto-trade logic
        const standardCargo = Math.floor(Math.random() * 50);
        const hazardousCargo = Math.floor(Math.random() * 20);
        
        const standardCredits = this.buyCargo(CargoType.STANDARD, standardCargo);
        const hazardousCredits = this.buyCargo(CargoType.HAZARDOUS, hazardousCargo);
        
        return {
            cargoSold: [
                { type: CargoType.STANDARD, quantity: standardCargo },
                { type: CargoType.HAZARDOUS, quantity: hazardousCargo }
            ],
            creditsEarned: standardCredits + hazardousCredits
        };
    }

    private getStockSummary(): any {
        return {
            standard: this.getStockLevel(CargoType.STANDARD),
            hazardous: this.getStockLevel(CargoType.HAZARDOUS),
            maxCapacity: this.maxStock
        };
    }

    private getPriceUpdates(): any {
        return {
            standard: {
                buy: this.getBuyPrice(CargoType.STANDARD),
                sell: this.getSellPrice(CargoType.STANDARD)
            },
            hazardous: {
                buy: this.getBuyPrice(CargoType.HAZARDOUS),
                sell: this.getSellPrice(CargoType.HAZARDOUS)
            }
        };
    }
}

/**
 * Enhanced HealthComponent that emits events when health changes
 */
export class EventDrivenHealthComponent extends HealthComponent {
    
    constructor(maxHealth: number = 100, regenerationRate: number = 0) {
        super(maxHealth, regenerationRate);
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for damage events from external sources
        this.subscribe('apply_damage', (event) => {
            if (event.payload?.targetId === this._gameObject?.id) {
                this.takeDamage(event.payload.amount, event.payload.damageType);
            }
        });

        // Listen for healing events
        this.subscribe('apply_healing', (event) => {
            if (event.payload?.targetId === this._gameObject?.id) {
                this.heal(event.payload.amount);
            }
        });
    }

    // Override takeDamage to emit health change events
    public takeDamage(amount: number, damageType: 'kinetic' | 'explosive' | 'energy' | 'fire' | 'cold' | 'toxic' | 'radiation' = 'kinetic'): number {
        const oldHealth = this.getHealth();
        const actualDamage = super.takeDamage(amount, damageType);
        const newHealth = this.getHealth();
        
        if (actualDamage > 0) {
            // Emit to siblings on same GameObject
            this.emitToSiblings('health_changed', {
                health: newHealth,
                maxHealth: this.getMaxHealth(),
                healthPercentage: this.getHealthPercentage(),
                damageAmount: actualDamage,
                damageType: damageType
            });
            
            // Emit global health change event
            this.emit('entity_damaged', {
                entityId: this._gameObject?.id,
                entityType: this._gameObject?.type,
                health: newHealth,
                damageAmount: actualDamage,
                damageType: damageType
            });
            
            if (newHealth <= 0) {
                this.emit('entity_destroyed', {
                    entityId: this._gameObject?.id,
                    entityType: this._gameObject?.type,
                    lastDamageType: damageType
                });
            }
        }
        
        return actualDamage;
    }

    // Override heal to emit healing events
    public heal(amount: number): number {
        const oldHealth = this.getHealth();
        const actualHealing = super.heal(amount);
        
        if (actualHealing > 0) {
            this.emitToSiblings('health_changed', {
                health: this.getHealth(),
                maxHealth: this.getMaxHealth(),
                healthPercentage: this.getHealthPercentage(),
                healingAmount: actualHealing
            });
        }
        
        return actualHealing;
    }
}

/**
 * Enhanced StationPerimeterComponent with breach detection
 */
export class EventDrivenStationPerimeter extends StationPerimeterComponent {
    
    constructor() {
        super();
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for enemy movements near the perimeter
        this.subscribe('entity_moved', (event) => {
            if (event.payload?.entityType === 'enemy') {
                this.checkForPerimeterBreach(event.payload.position, event.payload.entityId);
            }
        });
    }

    private checkForPerimeterBreach(position: any, entityId: string): void {
        if (this.isWithinPerimeter(position)) {
            Logger.log(LogCategory.SYSTEM, `Perimeter breach detected: enemy ${entityId}`);
            
            // Emit breach event for other components to handle
            this.emit('perimeter_breached', {
                stationId: this._gameObject?.id,
                breachType: 'enemy_intrusion',
                entityId: entityId,
                position: position,
                severity: 'high'
            });
        }
    }
}

/**
 * Example usage showing autonomous component communication
 */
export function demonstrateComponentEvents(): void {
    Logger.log(LogCategory.SYSTEM, '=== Demonstrating Component-Level Events ===');
    
    // This would be set up automatically when components are added to GameObjects
    // The components would communicate without any coordination from the GameObject
    
    Logger.log(LogCategory.SYSTEM, 'Components can now:');
    Logger.log(LogCategory.SYSTEM, '1. Subscribe to events from any other component globally');
    Logger.log(LogCategory.SYSTEM, '2. Subscribe specifically to sibling components on the same GameObject');
    Logger.log(LogCategory.SYSTEM, '3. Subscribe to events from specific component types');
    Logger.log(LogCategory.SYSTEM, '4. Emit events that other components can react to');
    Logger.log(LogCategory.SYSTEM, '5. Automatically clean up subscriptions when disposed');
    
    Logger.log(LogCategory.SYSTEM, '=== Benefits ===');
    Logger.log(LogCategory.SYSTEM, '• Loose coupling between components');
    Logger.log(LogCategory.SYSTEM, '• Autonomous behavior without GameObject orchestration');
    Logger.log(LogCategory.SYSTEM, '• Easy to add reactive behaviors');
    Logger.log(LogCategory.SYSTEM, '• Automatic memory management');
    Logger.log(LogCategory.SYSTEM, '• Debugging support with source tracking');
}
