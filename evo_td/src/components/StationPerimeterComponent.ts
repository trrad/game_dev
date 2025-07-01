/**
 * StationPerimeterComponent - Defines the boundary and scale of a station
 */
import { Component } from "../core/Component";
import { GameObject } from "../core/GameObject";
import { Vector3 } from "@babylonjs/core";
import { Logger, LogCategory } from "../utils/Logger";

export interface StationPerimeterData {
    center: Vector3;
    radius: number;
    shape: 'circular' | 'rectangular'; // Future expansion
    entrancePoints: Vector3[]; // Where trains can enter/exit
}

export class StationPerimeterComponent extends Component<StationPerimeterData> {
    readonly type = 'station_perimeter';

    public center: Vector3 = Vector3.Zero();
    public radius: number = 50;
    public shape: 'circular' | 'rectangular' = 'circular';
    public entrancePoints: Vector3[] = [];

    /**
     * Initialize the perimeter with center and radius
     */
    initialize(center: Vector3, radius: number = 50): void {
        this.center = center.clone();
        this.radius = radius;
        this.generateEntrancePoints();
        
        Logger.log(LogCategory.SYSTEM, `StationPerimeterComponent initialized: radius ${radius}`);
    }

    /**
     * Generate entrance points around the perimeter for train access
     */
    private generateEntrancePoints(): void {
        // For circular stations, create 4 entrance points (N, S, E, W)
        if (this.shape === 'circular') {
            const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // N, E, S, W
            this.entrancePoints = angles.map(angle => 
                new Vector3(
                    this.center.x + Math.cos(angle) * this.radius,
                    this.center.y,
                    this.center.z + Math.sin(angle) * this.radius
                )
            );
        }
    }

    /**
     * Check if a position is within the station perimeter
     */
    isWithinPerimeter(position: Vector3): boolean {
        if (this.shape === 'circular') {
            const distance = Vector3.Distance(position, this.center);
            return distance <= this.radius;
        }
        return false; // Rectangle implementation for future
    }

    /**
     * Get the closest entrance point to a given position
     */
    getClosestEntrance(position: Vector3): Vector3 {
        if (this.entrancePoints.length === 0) {
            return this.center.clone();
        }

        let closest = this.entrancePoints[0];
        let minDistance = Vector3.Distance(position, closest);

        for (let i = 1; i < this.entrancePoints.length; i++) {
            const distance = Vector3.Distance(position, this.entrancePoints[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closest = this.entrancePoints[i];
            }
        }

        return closest.clone();
    }

    /**
     * Generate a random position within the perimeter for building placement
     */
    getRandomPositionInside(minDistanceFromCenter: number = 0): Vector3 {
        if (this.shape === 'circular') {
            // Generate random position in circular area
            const angle = Math.random() * 2 * Math.PI;
            const maxRadius = this.radius - 5; // Keep some border space
            const radius = Math.sqrt(Math.random()) * (maxRadius - minDistanceFromCenter) + minDistanceFromCenter;
            
            return new Vector3(
                this.center.x + Math.cos(angle) * radius,
                this.center.y,
                this.center.z + Math.sin(angle) * radius
            );
        }
        return this.center.clone();
    }

    serialize(): StationPerimeterData {
        return {
            center: this.center,
            radius: this.radius,
            shape: this.shape,
            entrancePoints: this.entrancePoints
        };
    }

    deserialize(data: StationPerimeterData): void {
        this.center = data.center;
        this.radius = data.radius;
        this.shape = data.shape;
        this.entrancePoints = data.entrancePoints;
    }
}
