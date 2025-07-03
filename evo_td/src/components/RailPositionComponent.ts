/**
 * RailPositionComponent - Manages position along rail segments for rail-constrained entities.
 * This component handles position tracking specifically for entities that move along predefined rail paths.
 */
import { Component } from '../engine/core/Component';
import type { GameObject } from '../engine/core/GameObject';
import { Logger, LogCategory } from '../engine/utils/Logger';

export interface RailPositionState {
    /** ID of the current rail segment */
    railId: string | null;
    /** Progress along the rail (0.0 = start, 1.0 = end) */
    progress: number;
    /** Direction of travel along the rail */
    direction: 'forward' | 'reverse';
    /** Distance offset from the main rail line (for multi-car formations) */
    sideOffset: number;
    /** Distance offset along the rail (for car spacing in formations) */
    longitudinalOffset: number;
    /** Whether this entity is currently on a rail */
    isOnRail: boolean;
}

/**
 * Component that manages position along rail segments for trains and train cars.
 * Provides rail-specific positioning logic separate from general world positioning.
 */
export class RailPositionComponent extends Component<RailPositionState> {
    public readonly type = 'railPosition';
    
    private _railId: string | null = null;
    private _progress: number = 0;
    private _direction: 'forward' | 'reverse' = 'forward';
    private _sideOffset: number = 0;
    private _longitudinalOffset: number = 0;
    private _isOnRail: boolean = false;

    constructor(gameObject: GameObject) {
        super();
        this.attachTo(gameObject);
        
        Logger.log(LogCategory.SYSTEM, `RailPositionComponent created for ${gameObject.id}`);
    }

    /**
     * Place entity on a rail at a specific progress point
     */
    setRailPosition(railId: string, progress: number, direction: 'forward' | 'reverse' = 'forward'): void {
        this._railId = railId;
        this._progress = Math.max(0, Math.min(1, progress));
        this._direction = direction;
        this._isOnRail = true;
        
        Logger.log(LogCategory.SYSTEM, `Entity ${this._gameObject?.id} positioned on rail`, {
            railId,
            progress: this._progress,
            direction
        });
    }

    /**
     * Remove entity from rail
     */
    clearRailPosition(): void {
        const wasOnRail = this._isOnRail;
        this._railId = null;
        this._progress = 0;
        this._direction = 'forward';
        this._isOnRail = false;
        
        if (wasOnRail) {
            Logger.log(LogCategory.SYSTEM, `Entity ${this._gameObject?.id} removed from rail`);
        }
    }

    /**
     * Update progress along the current rail
     */
    updateProgress(deltaProgress: number): void {
        if (!this._isOnRail || !this._railId) return;
        
        const oldProgress = this._progress;
        
        if (this._direction === 'forward') {
            this._progress = Math.min(1, this._progress + deltaProgress);
        } else {
            this._progress = Math.max(0, this._progress - deltaProgress);
        }
        
        // Log significant progress changes
        if (Math.abs(this._progress - oldProgress) > 0.1) {
            Logger.log(LogCategory.SYSTEM, `Rail progress updated`, {
                entityId: this._gameObject?.id,
                railId: this._railId,
                oldProgress: oldProgress.toFixed(3),
                newProgress: this._progress.toFixed(3),
                direction: this._direction
            });
        }
    }

    /**
     * Set offset for multi-car formations
     */
    setFormationOffset(longitudinalOffset: number, sideOffset: number = 0): void {
        this._longitudinalOffset = longitudinalOffset;
        this._sideOffset = sideOffset;
    }

    /**
     * Check if the entity has reached the end of its current rail
     */
    hasReachedEnd(): boolean {
        if (!this._isOnRail) return false;
        return this._direction === 'forward' ? this._progress >= 1 : this._progress <= 0;
    }

    /**
     * Get the effective progress including formation offset
     */
    getEffectiveProgress(): number {
        if (!this._isOnRail) return 0;
        
        // Apply longitudinal offset based on direction
        let effectiveProgress = this._progress;
        if (this._direction === 'forward') {
            effectiveProgress -= this._longitudinalOffset;
        } else {
            effectiveProgress += this._longitudinalOffset;
        }
        
        return Math.max(0, Math.min(1, effectiveProgress));
    }

    /**
     * Reverse the direction of travel along the rail
     */
    reverseDirection(): void {
        this._direction = this._direction === 'forward' ? 'reverse' : 'forward';
        
        Logger.log(LogCategory.SYSTEM, `Rail direction reversed`, {
            entityId: this._gameObject?.id,
            railId: this._railId,
            newDirection: this._direction,
            progress: this._progress
        });
    }

    // Getters
    getRailId(): string | null { return this._railId; }
    getProgress(): number { return this._progress; }
    getDirection(): 'forward' | 'reverse' { return this._direction; }
    getSideOffset(): number { return this._sideOffset; }
    getLongitudinalOffset(): number { return this._longitudinalOffset; }
    isOnRail(): boolean { return this._isOnRail; }

    serialize(): RailPositionState {
        return {
            railId: this._railId,
            progress: this._progress,
            direction: this._direction,
            sideOffset: this._sideOffset,
            longitudinalOffset: this._longitudinalOffset,
            isOnRail: this._isOnRail
        };
    }

    deserialize(data: RailPositionState): void {
        this._railId = data.railId;
        this._progress = data.progress;
        this._direction = data.direction;
        this._sideOffset = data.sideOffset;
        this._longitudinalOffset = data.longitudinalOffset;
        this._isOnRail = data.isOnRail;
    }
}
