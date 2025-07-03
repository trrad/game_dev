/**
 * Mathematical utility functions for common operations across the codebase
 */
import { Vector3 } from '@babylonjs/core';
import { GeometryUtils } from './GeometryUtils';

export type Position3D = { x: number; y: number; z: number };

/**
 * Utility class for mathematical operations
 */
export class MathUtils {
    /**
     * Calculate the Euclidean distance between two 3D positions
     */
    static calculateDistance(pos1: Position3D, pos2: Position3D): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Calculate the 2D distance between two positions (ignoring Y axis)
     * Useful for ground-based distance calculations
     */
    static calculateDistance2D(pos1: Position3D, pos2: Position3D): number {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * Calculate squared distance (avoids sqrt for performance when only comparing distances)
     */
    static calculateDistanceSquared(pos1: Position3D, pos2: Position3D): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Check if two positions are within a certain distance
     */
    static isWithinDistance(pos1: Position3D, pos2: Position3D, maxDistance: number): boolean {
        return this.calculateDistanceSquared(pos1, pos2) <= maxDistance * maxDistance;
    }

    /**
     * Normalize a 3D vector
     */
    static normalize(vector: Position3D): Position3D {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        
        return {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
    }

    /**
     * Calculate direction vector from one position to another
     */
    static calculateDirection(from: Position3D, to: Position3D): Position3D {
        return {
            x: to.x - from.x,
            y: to.y - from.y,
            z: to.z - from.z
        };
    }

    /**
     * Calculate normalized direction vector from one position to another
     */
    static calculateNormalizedDirection(from: Position3D, to: Position3D): Position3D {
        const direction = this.calculateDirection(from, to);
        return this.normalize(direction);
    }

    /**
     * Linearly interpolate between two positions
     */
    static lerp(pos1: Position3D, pos2: Position3D, t: number): Position3D {
        return {
            x: pos1.x + (pos2.x - pos1.x) * t,
            y: pos1.y + (pos2.y - pos1.y) * t,
            z: pos1.z + (pos2.z - pos1.z) * t
        };
    }

    /**
     * Generate a random position within a given radius from a center point
     */
    static getRandomPositionInRadius(center: Position3D, radius: number): Position3D {
        const distance = Math.random() * radius;
        const angle = Math.random() * 2 * Math.PI;
        
        return {
            x: center.x + Math.cos(angle) * distance,
            y: center.y,
            z: center.z + Math.sin(angle) * distance
        };
    }

    /**
     * Convert a Position3D to a Babylon.js Vector3
     */
    static toVector3(pos: Position3D): Vector3 {
        return new Vector3(pos.x, pos.y, pos.z);
    }

    /**
     * Convert a Babylon.js Vector3 to a Position3D
     */
    static fromVector3(vector: Vector3): Position3D {
        return { x: vector.x, y: vector.y, z: vector.z };
    }

    /**
     * Clamp a value between min and max
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Check if a position is within a bounding box
     * For more advanced geometric operations, see GeometryUtils
     */
    static isWithinBounds(position: Position3D, bounds: { min: Position3D; max: Position3D }): boolean {
        const vector3Pos = new Vector3(position.x, position.y, position.z);
        const boundsObj = {
            min: new Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
            max: new Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
        };
        return GeometryUtils.pointOverlapsBounds(vector3Pos, boundsObj);
    }
}
