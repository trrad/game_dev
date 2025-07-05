/**
 * RailMovementComponent - Manages movement behavior for rail-constrained entities.
 * This component handles speed, acceleration, and movement state for entities moving along rails.
 */
import { Component } from '../../engine/components/Component';
import type { GameObject } from '../../engine/core/GameObject';
import { Logger, LogCategory } from '../../engine/utils/Logger';
import { NodeComponent } from '../../engine/components/NodeComponent';
import { RailPositionComponent } from './RailPositionComponent';
import { RailPathComponent } from './RailPathComponent';
import type { GameNodeObject } from '../../engine/core/GameNodeObject';

export interface RailMovementState {
    /** Current movement speed (units per second) */
    speed: number;
    /** Maximum speed for this entity */
    maxSpeed: number;
    /** Rate of acceleration */
    acceleration: number;
    /** Rate of deceleration when stopping */
    deceleration: number;
    /** Whether the entity is currently moving */
    isMoving: boolean;
    /** Whether the entity is accelerating */
    isAccelerating: boolean;
    /** Whether the entity is decelerating */
    isDecelerating: boolean;
    /** Target speed when accelerating/decelerating */
    targetSpeed: number;
    /** ID of the destination station */
    targetStationId: string | null;
}

/**
 * Component that manages rail-specific movement behavior including acceleration,
 * deceleration, and journey management for trains and train cars.
 */
export class RailMovementComponent extends Component<RailMovementState> {
    public readonly type = 'railMovement';
    
    private _speed: number = 0;
    private _maxSpeed: number = 1.0;
    private _acceleration: number = 0.5;
    private _deceleration: number = 0.8;
    private _isMoving: boolean = false;
    private _isAccelerating: boolean = false;
    private _isDecelerating: boolean = false;
    private _targetSpeed: number = 0;
    private _targetStationId: string | null = null;

    constructor(gameObject: GameObject, maxSpeed: number = 1.0, acceleration: number = 0.5) {
        super();
        this.attachTo(gameObject);
        this._maxSpeed = maxSpeed;
        this._acceleration = acceleration;
        this._deceleration = acceleration * 1.5; // Faster deceleration by default
        
        Logger.log(LogCategory.SYSTEM, `RailMovementComponent created for ${gameObject.id}`, {
            maxSpeed,
            acceleration,
            deceleration: this._deceleration
        });
    }

    /**
     * Start a journey to a specific station
     */
    startJourney(targetStationId: string, targetSpeed?: number): void {
        this._targetStationId = targetStationId;
        this._targetSpeed = targetSpeed || this._maxSpeed;
        this._isMoving = true;
        this._isAccelerating = true;
        this._isDecelerating = false;
        
        Logger.log(LogCategory.TRAIN, `Journey started`, {
            entityId: this._gameObject?.id,
            targetStationId,
            targetSpeed: this._targetSpeed
        });
    }

    /**
     * Stop the current journey
     */
    stopJourney(): void {
        this._isMoving = false;
        this._isAccelerating = false;
        this._isDecelerating = true;
        this._targetSpeed = 0;
        
        Logger.log(LogCategory.TRAIN, `Journey stopped`, {
            entityId: this._gameObject?.id,
            currentSpeed: this._speed
        });
    }

    /**
     * Begin deceleration for approaching destination
     */
    beginDeceleration(finalSpeed: number = 0): void {
        this._isAccelerating = false;
        this._isDecelerating = true;
        this._targetSpeed = finalSpeed;
        
        Logger.log(LogCategory.TRAIN, `Deceleration started`, {
            entityId: this._gameObject?.id,
            currentSpeed: this._speed,
            targetSpeed: this._targetSpeed
        });
    }

    /**
     * Update the entity's node transform to match its position along the rail path
     * Should be called after progress changes
     */
    updateNodeTransform(railEntities: Map<string, GameNodeObject>): void {
        if (!this._gameObject) return;
        const railPos = this._gameObject.getComponent('railPosition') as RailPositionComponent | undefined;
        const node = this._gameObject.getComponent('Node') as NodeComponent | undefined;
        if (!railPos || !node) return;
        if (!railPos.isOnRail()) return;
        const railId = railPos.getRailId();
        if (!railId) return;
        const railEntity = railEntities.get(railId);
        if (!railEntity) return;
        const railPath = railEntity.getComponent('rail_path') as RailPathComponent | undefined;
        if (!railPath) return;

        // Get effective progress (with offset)
        const progress = railPos.getEffectiveProgress();
        const position = railPath.getPositionAt(progress);
        const tangent = railPath.getTangentAt(progress);

        // Set position
        node.setLocalPositionFromVector(position);
        // Set orientation: look along tangent (forward)
        const lookTarget = position.add(tangent);
        node.lookAt(lookTarget);
    }

    /**
     * Update movement state based on time passed
     * (Refactored: also updates node transform after progress changes)
     * @param deltaTime Time step
     * @param railEntities Map of railId to rail entity (must be provided by system)
     */
    updateMovement(deltaTime: number, railEntities: Map<string, GameNodeObject>): void {
        if (!this._isMoving && !this._isDecelerating) return;

        const oldSpeed = this._speed;

        if (this._isAccelerating) {
            // Accelerate towards target speed
            this._speed = Math.min(this._targetSpeed, this._speed + this._acceleration * deltaTime);
            
            if (this._speed >= this._targetSpeed) {
                this._isAccelerating = false;
            }
        } else if (this._isDecelerating) {
            // Decelerate towards target speed
            this._speed = Math.max(this._targetSpeed, this._speed - this._deceleration * deltaTime);
            
            if (this._speed <= this._targetSpeed) {
                this._isDecelerating = false;
                if (this._targetSpeed === 0) {
                    this._isMoving = false;
                    this._targetStationId = null;
                    
                    Logger.log(LogCategory.TRAIN, `Journey completed`, {
                        entityId: this._gameObject?.id
                    });
                }
            }
        }

        // Log significant speed changes
        if (Math.abs(this._speed - oldSpeed) > 0.1) {
            Logger.log(LogCategory.TRAIN, `Speed updated`, {
                entityId: this._gameObject?.id,
                oldSpeed: oldSpeed.toFixed(3),
                newSpeed: this._speed.toFixed(3),
                isAccelerating: this._isAccelerating,
                isDecelerating: this._isDecelerating
            });
        }

        // === NEW: Update progress and node transform ===
        const railPos = this._gameObject?.getComponent('railPosition') as RailPositionComponent | undefined;
        if (railPos && railPos.isOnRail()) {
            // Find current rail entity and its length
            const railId = railPos.getRailId();
            const railEntity = railId ? railEntities.get(railId) : undefined;
            const railPath = railEntity?.getComponent('rail_path') as RailPathComponent | undefined;
            const railLength = railPath ? railPath.path3d.length() : 1;
            // Calculate progress delta
            const deltaProgress = this.calculateProgressDelta(deltaTime, railLength);
            railPos.updateProgress(deltaProgress);
            // Update node transform to match new position
            this.updateNodeTransform(railEntities);
        }
    }

    /**
     * Calculate progress delta for this frame based on current speed
     */
    calculateProgressDelta(deltaTime: number, railLength: number): number {
        if (!this._isMoving && !this._isDecelerating) return 0;
        
        return (this._speed * deltaTime) / railLength;
    }

    /**
     * Emergency stop - immediate halt
     */
    emergencyStop(): void {
        this._speed = 0;
        this._targetSpeed = 0;
        this._isMoving = false;
        this._isAccelerating = false;
        this._isDecelerating = false;
        this._targetStationId = null;
        
        Logger.log(LogCategory.TRAIN, `Emergency stop activated`, {
            entityId: this._gameObject?.id
        });
    }

    /**
     * Set movement parameters
     */
    setMovementParameters(maxSpeed: number, acceleration?: number, deceleration?: number): void {
        this._maxSpeed = maxSpeed;
        if (acceleration !== undefined) {
            this._acceleration = acceleration;
        }
        if (deceleration !== undefined) {
            this._deceleration = deceleration;
        }
        
        // Adjust current target speed if it exceeds new max speed
        if (this._targetSpeed > this._maxSpeed) {
            this._targetSpeed = this._maxSpeed;
        }
    }

    /**
     * Check if the entity should start decelerating based on remaining distance
     */
    shouldStartDeceleration(remainingDistance: number): boolean {
        if (!this._isMoving || this._isDecelerating) return false;
        
        // Calculate stopping distance needed at current speed
        const stoppingDistance = (this._speed * this._speed) / (2 * this._deceleration);
        
        return remainingDistance <= stoppingDistance * 1.5; // Add safety margin
    }

    // Getters
    getSpeed(): number { return this._speed; }
    getMaxSpeed(): number { return this._maxSpeed; }
    getAcceleration(): number { return this._acceleration; }
    getDeceleration(): number { return this._deceleration; }
    isMoving(): boolean { return this._isMoving; }
    isAccelerating(): boolean { return this._isAccelerating; }
    isDecelerating(): boolean { return this._isDecelerating; }
    getTargetSpeed(): number { return this._targetSpeed; }
    getTargetStationId(): string | null { return this._targetStationId; }

    serialize(): RailMovementState {
        return {
            speed: this._speed,
            maxSpeed: this._maxSpeed,
            acceleration: this._acceleration,
            deceleration: this._deceleration,
            isMoving: this._isMoving,
            isAccelerating: this._isAccelerating,
            isDecelerating: this._isDecelerating,
            targetSpeed: this._targetSpeed,
            targetStationId: this._targetStationId
        };
    }

    deserialize(data: RailMovementState): void {
        this._speed = data.speed;
        this._maxSpeed = data.maxSpeed;
        this._acceleration = data.acceleration;
        this._deceleration = data.deceleration;
        this._isMoving = data.isMoving;
        this._isAccelerating = data.isAccelerating;
        this._isDecelerating = data.isDecelerating;
        this._targetSpeed = data.targetSpeed;
        this._targetStationId = data.targetStationId;
    }
}
