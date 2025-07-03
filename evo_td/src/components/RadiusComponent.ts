/**
 * RadiusComponent - Generic spatial component for collision detection, proximity triggers, and LOD
 * Provides a flexible foundation for all spatial calculations in the game
 */

import { Component } from '../engine/core/Component';
import { Vector3 } from '@babylonjs/core';
import { SceneNodeComponent } from '../engine/scene/SceneNodeComponent';
import { SceneEvents } from '../engine/scene/SceneGraphEventSystem';

export interface RadiusComponentData {
    radius: number;
    type: 'collision' | 'interaction' | 'detection' | 'render' | 'custom';
    enabled: boolean;
    customType?: string;  // For custom radius types
}

export interface RadiusFilter {
    radiusType?: string;
    excludeSelf?: boolean;
    includeDisabled?: boolean;
    customFilter?: (node: SceneNodeComponent, radius: RadiusComponent) => boolean;
}

/**
 * Generic RadiusComponent for spatial calculations
 * Can be extended for various purposes:
 * - CollisionRadius (physical collisions)
 * - DetectionRadius (enemy AI awareness)
 * - InteractionRadius (UI interaction zones)
 * - RenderRadius (LOD cutoff distances)
 */
export class RadiusComponent extends Component<RadiusComponentData> {
    public readonly type = 'radius';
    
    private _radius: number;
    private _radiusType: string;
    private _radiusEnabled: boolean;
    private _customType?: string;
    
    constructor(radius: number, radiusType: string = 'collision', customType?: string) {
        super();
        
        this._radius = Math.max(0, radius);
        this._radiusType = radiusType;
        this._radiusEnabled = true;
        this._customType = customType;
    }
    
    // ============================================================
    // Properties
    // ============================================================
    
    getRadius(): number {
        return this._radius;
    }
    
    setRadius(radius: number): void {
        this._radius = Math.max(0, radius);
    }
    
    getRadiusType(): string {
        return this._customType || this._radiusType;
    }
    
    setRadiusType(type: string): void {
        this._radiusType = type;
    }
    
    getCustomType(): string | undefined {
        return this._customType;
    }
    
    setCustomType(customType: string): void {
        this._customType = customType;
    }
    
    isEnabled(): boolean {
        return this._radiusEnabled;
    }
    
    setEnabled(enabled: boolean): void {
        this._radiusEnabled = enabled;
    }
    
    // ============================================================
    // Spatial Calculations
    // ============================================================
    
    /**
     * Check if another radius component is within range
     */
    isInRange(other: RadiusComponent): boolean {
        if (!this._radiusEnabled || !other._radiusEnabled) return false;
        
        const distance = this.getDistanceTo(other);
        const combinedRadius = this._radius + other._radius;
        
        return distance <= combinedRadius;
    }
    
    /**
     * Get distance to another radius component
     */
    getDistanceTo(other: RadiusComponent): number {
        const thisPos = this.getWorldPosition();
        const otherPos = other.getWorldPosition();
        
        if (!thisPos || !otherPos) return Infinity;
        
        return Vector3.Distance(thisPos, otherPos);
    }
    
    /**
     * Get overlap amount with another radius component
     */
    getOverlap(other: RadiusComponent): number {
        if (!this.isInRange(other)) return 0;
        
        const distance = this.getDistanceTo(other);
        const combinedRadius = this._radius + other._radius;
        
        return Math.max(0, combinedRadius - distance);
    }
    
    /**
     * Check collision with another radius component
     */
    checkCollision(other: RadiusComponent): boolean {
        return this.isInRange(other) && this.getOverlap(other) > 0;
    }
    
    /**
     * Check proximity to another radius component within threshold
     */
    checkProximity(other: RadiusComponent, threshold: number): boolean {
        const distance = this.getDistanceTo(other);
        return distance <= threshold;
    }
    
    // ============================================================
    // Scene Graph Integration
    // ============================================================
    
    /**
     * Get world position from attached GameObject's SceneNodeComponent
     */
    private getWorldPosition(): Vector3 | null {
        if (!this._gameObject) return null;
        
        const sceneNode = this._gameObject.getComponent<SceneNodeComponent>('sceneNode');
        return sceneNode ? sceneNode.getWorldPosition() : null;
    }
    
    /**
     * Get all scene nodes within this radius
     */
    getNodesInRadius(filter?: (node: SceneNodeComponent) => boolean): SceneNodeComponent[] {
        const position = this.getWorldPosition();
        if (!position) return [];
        
        return SceneEvents.getNodesInRadius(position, this._radius, filter);
    }
    
    /**
     * Get all other RadiusComponents within this radius
     */
    getRadiusComponentsInRange(filter?: RadiusFilter): RadiusComponent[] {
        const nodes = this.getNodesInRadius();
        const result: RadiusComponent[] = [];
        
        for (const node of nodes) {
            if (!node.gameObject) continue;
            
            const radiusComp = node.gameObject.getComponent<RadiusComponent>('radius');
            if (!radiusComp) continue;
            
            // Apply filters
            if (filter) {
                if (filter.radiusType && radiusComp.getRadiusType() !== filter.radiusType) continue;
                if (filter.excludeSelf && radiusComp === this) continue;
                if (!filter.includeDisabled && !radiusComp.isEnabled()) continue;
                if (filter.customFilter && !filter.customFilter(node, radiusComp)) continue;
            }
            
            result.push(radiusComp);
        }
        
        return result;
    }
    
    // ============================================================
    // Event Integration
    // ============================================================
    
    /**
     * Emit event to all nodes within radius
     */
    emitToRadius(eventType: string, payload?: any, filter?: RadiusFilter): void {
        if (!this._radiusEnabled) return;
        
        const position = this.getWorldPosition();
        if (!position) return;
        
        const nodeFilter = (node: SceneNodeComponent): boolean => {
            if (!filter) return true;
            
            const radiusComp = node.gameObject?.getComponent<RadiusComponent>('radius');
            if (!radiusComp && filter.radiusType) return false;
            
            if (filter.excludeSelf && radiusComp === this) return false;
            if (filter.radiusType && radiusComp?.getRadiusType() !== filter.radiusType) return false;
            if (!filter.includeDisabled && radiusComp && !radiusComp.isEnabled()) return false;
            if (filter.customFilter && radiusComp && !filter.customFilter(node, radiusComp)) return false;
            
            return true;
        };
        
        SceneEvents.emitToRadius(eventType, payload, position, this._radius, nodeFilter);
    }
    
    // ============================================================
    // Collision Detection Helpers
    // ============================================================
    
    /**
     * Find all colliding radius components
     */
    findCollisions(filter?: RadiusFilter): RadiusComponent[] {
        const inRange = this.getRadiusComponentsInRange(filter);
        return inRange.filter(other => this.checkCollision(other));
    }
    
    /**
     * Find nearest radius component
     */
    findNearest(filter?: RadiusFilter): RadiusComponent | null {
        const inRange = this.getRadiusComponentsInRange(filter);
        if (inRange.length === 0) return null;
        
        let nearest = inRange[0];
        let nearestDistance = this.getDistanceTo(nearest);
        
        for (let i = 1; i < inRange.length; i++) {
            const distance = this.getDistanceTo(inRange[i]);
            if (distance < nearestDistance) {
                nearest = inRange[i];
                nearestDistance = distance;
            }
        }
        
        return nearest;
    }
    
    /**
     * Check if point is within radius
     */
    containsPoint(point: Vector3): boolean {
        if (!this._radiusEnabled) return false;
        
        const position = this.getWorldPosition();
        if (!position) return false;
        
        const distance = Vector3.Distance(position, point);
        return distance <= this._radius;
    }
    
    // ============================================================
    // Serialization
    // ============================================================
    
    serialize(): RadiusComponentData {
        return {
            radius: this._radius,
            type: this._radiusType as any,
            enabled: this._radiusEnabled,
            customType: this._customType
        };
    }
    
    deserialize(data: RadiusComponentData): void {
        this._radius = data.radius;
        this._radiusType = data.type;
        this._radiusEnabled = data.enabled;
        this._customType = data.customType;
    }
    
    // ============================================================
    // Component Lifecycle
    // ============================================================
    
    dispose(): void {
        // Clean up any event listeners or references
        super.dispose();
    }
}

// ============================================================
// Helper Functions for Common Use Cases
// ============================================================

/**
 * Create a collision radius component
 */
export function createCollisionRadius(radius: number): RadiusComponent {
    return new RadiusComponent(radius, 'collision');
}

/**
 * Create a detection radius component for AI
 */
export function createDetectionRadius(radius: number): RadiusComponent {
    return new RadiusComponent(radius, 'detection');
}

/**
 * Create an interaction radius component for UI
 */
export function createInteractionRadius(radius: number): RadiusComponent {
    return new RadiusComponent(radius, 'interaction');
}

/**
 * Create a render radius component for LOD
 */
export function createRenderRadius(radius: number): RadiusComponent {
    return new RadiusComponent(radius, 'render');
}
