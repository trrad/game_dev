/**
 * BuildingComponent - Represents a building within a station
 */
import { Component } from "../core/Component";
import { Vector3 } from "@babylonjs/core";
import { Logger, LogCategory } from "../utils/Logger";

export interface BuildingData {
    buildingType: BuildingType;
    position: Vector3;
    size: Vector3;
    isOperational: boolean;
}

export enum BuildingType {
    CARGO_WAREHOUSE = 'cargo_warehouse',
    DECORATIVE_TOWER = 'decorative_tower',
    DECORATIVE_SHOP = 'decorative_shop',
    DECORATIVE_BUILDING = 'decorative_building'
}

export class BuildingComponent extends Component<BuildingData> {
    readonly type = 'building';

    public buildingType: BuildingType = BuildingType.DECORATIVE_BUILDING;
    public position: Vector3 = Vector3.Zero();
    public size: Vector3 = new Vector3(5, 3, 5); // Default 5x3x5 units
    public isOperational: boolean = true;

    /**
     * Initialize the building component
     */
    initialize(buildingType: BuildingType, position: Vector3, size?: Vector3): void {
        this.buildingType = buildingType;
        this.position = position.clone();
        if (size) {
            this.size = size.clone();
        }
        
        Logger.log(LogCategory.SYSTEM, `BuildingComponent initialized: ${buildingType} at (${position.x}, ${position.y}, ${position.z})`);
    }

    /**
     * Get the building's bounding box for collision detection
     */
    getBounds(): { min: Vector3, max: Vector3 } {
        const halfSize = this.size.scale(0.5);
        return {
            min: this.position.subtract(halfSize),
            max: this.position.add(halfSize)
        };
    }

    /**
     * Check if a position overlaps with this building
     */
    overlaps(position: Vector3, radius: number = 0): boolean {
        const bounds = this.getBounds();
        const expandedMin = bounds.min.subtract(new Vector3(radius, radius, radius));
        const expandedMax = bounds.max.add(new Vector3(radius, radius, radius));
        
        return position.x >= expandedMin.x && position.x <= expandedMax.x &&
               position.y >= expandedMin.y && position.y <= expandedMax.y &&
               position.z >= expandedMin.z && position.z <= expandedMax.z;
    }

    /**
     * Disable building functionality (e.g., when damaged)
     */
    setOperational(operational: boolean): void {
        this.isOperational = operational;
        Logger.log(LogCategory.SYSTEM, `Building ${this.buildingType} operational status: ${operational}`);
    }

    serialize(): BuildingData {
        return {
            buildingType: this.buildingType,
            position: this.position,
            size: this.size,
            isOperational: this.isOperational
        };
    }

    deserialize(data: BuildingData): void {
        this.buildingType = data.buildingType;
        this.position = data.position;
        this.size = data.size;
        this.isOperational = data.isOperational;
    }
}
