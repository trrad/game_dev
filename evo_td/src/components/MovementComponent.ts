/**
 * Handles movement and speed calculations for game objects.
 * Supports both free movement and rail-based movement for trains.
 */
import { Component } from '../core/Component';
import type { GameObject } from '../core/GameObject';

export interface MovementState {
    speed: number;
    direction?: { x: number; y: number; z: number };
    // Rail movement properties
    railId?: string;
    railProgress?: number;
    isMoving?: boolean;
    travelDirection?: 'forward' | 'reverse';
    targetStationId?: string;
}

export class MovementComponent extends Component<MovementState> {
    public readonly type = 'movement';
    private _speed: number;
    private _direction: { x: number; y: number; z: number } = { x: 0, y: 0, z: -1 }; // Default direction (forward)
    
    // Rail movement properties
    private _railId: string | null = null;
    private _railProgress: number = 0; // 0 to 1 along the rail
    private _isMoving: boolean = false;
    private _travelDirection: 'forward' | 'reverse' = 'forward';
    private _targetStationId: string | null = null;

    constructor(
        gameObject: GameObject,
        baseSpeed: number = 0.1
    ) {
        super();
        this.attachTo(gameObject);
        this._speed = baseSpeed;
    }

    getSpeed(): number {
        return this._speed;
    }

    setSpeed(speed: number): void {
        this._speed = speed;
    }
    
    /**
     * Get the current movement direction
     */
    getDirection(): { x: number; y: number; z: number } {
        return this._direction;
    }
    
    /**
     * Set the movement direction
     */
    setDirection(direction: { x: number; y: number; z: number }): void {
        this._direction = direction;
    }

    serialize(): MovementState {
        return {
            speed: this._speed,
            direction: this._direction,
            railId: this._railId || undefined,
            railProgress: this._railProgress,
            isMoving: this._isMoving,
            travelDirection: this._travelDirection,
            targetStationId: this._targetStationId || undefined
        };
    }

    deserialize(data: MovementState): void {
        this._speed = data.speed;
        if (data.direction) {
            this._direction = data.direction;
        }
        this._railId = data.railId || null;
        this._railProgress = data.railProgress || 0;
        this._isMoving = data.isMoving || false;
        this._travelDirection = data.travelDirection || 'forward';
        this._targetStationId = data.targetStationId || null;
    }

    /**
     * Start movement along a rail
     */
    startRailMovement(railId: string, targetStationId: string, direction: 'forward' | 'reverse'): void {
        this._railId = railId;
        this._targetStationId = targetStationId;
        this._travelDirection = direction;
        this._railProgress = direction === 'forward' ? 0 : 1;
        this._isMoving = true;
    }
    
    /**
     * Stop rail movement
     */
    stopRailMovement(): void {
        this._isMoving = false;
        this._railId = null;
        this._targetStationId = null;
        this._railProgress = 0;
    }
    
    /**
     * Update rail progress
     */
    updateRailProgress(deltaProgress: number): void {
        if (!this._isMoving || !this._railId) return;
        
        if (this._travelDirection === 'forward') {
            this._railProgress = Math.min(1, this._railProgress + deltaProgress);
        } else {
            this._railProgress = Math.max(0, this._railProgress - deltaProgress);
        }
    }
    
    /**
     * Check if movement is complete
     */
    isMovementComplete(): boolean {
        if (!this._isMoving) return false;
        return this._travelDirection === 'forward' ? this._railProgress >= 1 : this._railProgress <= 0;
    }
    
    // Rail movement getters
    getRailId(): string | null { return this._railId; }
    getRailProgress(): number { return this._railProgress; }
    isRailMoving(): boolean { return this._isMoving; }
    getTravelDirection(): 'forward' | 'reverse' { return this._travelDirection; }
    getTargetStationId(): string | null { return this._targetStationId; }
}
