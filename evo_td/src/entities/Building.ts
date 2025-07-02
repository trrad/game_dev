/**
 * Building - Represents a building entity within a station
 * Follows proper ECS pattern by extending GameObject and using PositionComponent
 */
import { GameObject } from "../core/GameObject";
import { PositionComponent } from "../components/PositionComponent";
import { HealthComponent } from "../components/HealthComponent";
import { Vector3 } from "@babylonjs/core";
import { Logger, LogCategory } from "../utils/Logger";
import { GeometryUtils, BoundingBox } from "../utils/GeometryUtils";

export enum BuildingType {
    CARGO_WAREHOUSE = 'cargo_warehouse',
    DECORATIVE_TOWER = 'decorative_tower',
    DECORATIVE_SHOP = 'decorative_shop',
    DECORATIVE_BUILDING = 'decorative_building'
}

export interface BuildingConfig {
    buildingType: BuildingType;
    position: Vector3;
    size?: Vector3;
    health?: number;
    name?: string;
}

export interface BuildingState {
    buildingType: BuildingType;
    size: Vector3;
    isOperational: boolean;
}

export class Building extends GameObject {
    private _buildingType: BuildingType;
    private _size: Vector3;
    private _isOperational: boolean = true;

    constructor(config: BuildingConfig) {
        super(config.name || `building_${config.buildingType}`);
        
        this._buildingType = config.buildingType;
        this._size = config.size ? config.size.clone() : new Vector3(5, 3, 5); // Default size
        
        // Add required ECS components
        this.addComponent(new PositionComponent());
        this.getComponent<PositionComponent>('position')?.setPosition({
            x: config.position.x,
            y: config.position.y,
            z: config.position.z
        });
        
        // Add health component
        const healthPoints = config.health || (config.buildingType === BuildingType.CARGO_WAREHOUSE ? 500 : 300);
        this.addComponent(new HealthComponent(healthPoints, 0)); // No regen
        
        Logger.log(LogCategory.SYSTEM, `Building entity created: ${this._buildingType} at (${config.position.x}, ${config.position.y}, ${config.position.z})`);
    }

    // Getters
    get buildingType(): BuildingType { return this._buildingType; }
    get size(): Vector3 { return this._size.clone(); }
    get isOperational(): boolean { return this._isOperational; }

    /**
     * Get the building's current world position from PositionComponent
     */
    getPosition(): Vector3 {
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const pos = positionComponent.getPosition();
            return new Vector3(pos.x, pos.y, pos.z);
        }
        return Vector3.Zero();
    }

    /**
     * Get the building's bounding box for collision detection
     */
    getBounds(): BoundingBox {
        const position = this.getPosition();
        return GeometryUtils.createBounds(position, this._size);
    }

    /**
     * Check if a position overlaps with this building
     */
    overlaps(position: Vector3, radius: number = 0): boolean {
        const bounds = this.getBounds();
        return GeometryUtils.pointOverlapsBounds(position, bounds, radius);
    }

    /**
     * Set building operational status (e.g., when damaged)
     */
    setOperational(operational: boolean): void {
        this._isOperational = operational;
        Logger.log(LogCategory.SYSTEM, `Building ${this._buildingType} operational status: ${operational}`);
    }

    serialize(): BuildingConfig & BuildingState {
        const position = this.getPosition();
        const health = this.getComponent<HealthComponent>('health');
        
        return {
            buildingType: this._buildingType,
            position: position,
            size: this._size,
            health: health?.getMaxHealth() || 300,
            name: this.id,
            isOperational: this._isOperational
        };
    }

    deserialize(data: BuildingConfig & BuildingState): void {
        this._buildingType = data.buildingType;
        this._size = data.size ? data.size.clone() : this._size;
        this._isOperational = data.isOperational;
        
        // Update position component
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent && data.position) {
            positionComponent.setPosition({
                x: data.position.x,
                y: data.position.y,
                z: data.position.z
            });
        }
        
        // Update health component
        const healthComponent = this.getComponent<HealthComponent>('health');
        if (healthComponent && data.health) {
            healthComponent.setMaxHealth(data.health);
        }
    }
}
