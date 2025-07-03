/**
 * GeometryUtils - Utility functions for geometric calculations, bounding boxes, and spatial operations
 */
import { Vector3 } from "@babylonjs/core";

export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

export class GeometryUtils {
    /**
     * Create a bounding box from a position and size
     */
    static createBounds(position: Vector3, size: Vector3): BoundingBox {
        const halfSize = size.scale(0.5);
        return {
            min: position.subtract(halfSize),
            max: position.add(halfSize)
        };
    }

    /**
     * Check if a point overlaps with a bounding box (with optional radius expansion)
     */
    static pointOverlapsBounds(point: Vector3, bounds: BoundingBox, radius: number = 0): boolean {
        const expandedMin = bounds.min.subtract(new Vector3(radius, radius, radius));
        const expandedMax = bounds.max.add(new Vector3(radius, radius, radius));
        
        return point.x >= expandedMin.x && point.x <= expandedMax.x &&
               point.y >= expandedMin.y && point.y <= expandedMax.y &&
               point.z >= expandedMin.z && point.z <= expandedMax.z;
    }

    /**
     * Check if two bounding boxes overlap
     */
    static boundsOverlap(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
        return bounds1.min.x <= bounds2.max.x && bounds1.max.x >= bounds2.min.x &&
               bounds1.min.y <= bounds2.max.y && bounds1.max.y >= bounds2.min.y &&
               bounds1.min.z <= bounds2.max.z && bounds1.max.z >= bounds2.min.z;
    }

    /**
     * Expand a bounding box by a given amount in all directions
     */
    static expandBounds(bounds: BoundingBox, expansion: number): BoundingBox {
        const expand = new Vector3(expansion, expansion, expansion);
        return {
            min: bounds.min.subtract(expand),
            max: bounds.max.add(expand)
        };
    }

    /**
     * Get the center point of a bounding box
     */
    static getBoundsCenter(bounds: BoundingBox): Vector3 {
        return bounds.min.add(bounds.max).scale(0.5);
    }

    /**
     * Get the size of a bounding box
     */
    static getBoundsSize(bounds: BoundingBox): Vector3 {
        return bounds.max.subtract(bounds.min);
    }

    /**
     * Check if a point is within a sphere
     */
    static pointInSphere(point: Vector3, sphereCenter: Vector3, radius: number): boolean {
        const distance = Vector3.Distance(point, sphereCenter);
        return distance <= radius;
    }

    /**
     * Check if two spheres overlap
     */
    static spheresOverlap(center1: Vector3, radius1: number, center2: Vector3, radius2: number): boolean {
        const distance = Vector3.Distance(center1, center2);
        return distance <= (radius1 + radius2);
    }
}
