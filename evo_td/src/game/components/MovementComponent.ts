// src/game/components/MovementComponent.ts

import { Component } from '@engine/components/Component';
import { GameObject } from '@engine/core/GameObject';
import { Vector3 } from '@babylonjs/core';
import { VectorProperty, BooleanProperty, NumericProperty } from '@engine/components/ReactivePropertyComponent';
import { NetworkReactiveEntity } from '@engine/networking/NetworkReactiveEntity';

export interface MovementComponentData {
    moveSpeed: number;
    rotationSpeed: number;
    arrivalThreshold: number;
}

/**
 * MovementComponent - Handles movement logic for entities
 * 
 * Works with reactive properties:
 * - position (current position)
 * - targetPosition (where we're moving to)
 * - isMoving (whether we're currently moving)
 * - moveSpeed (how fast we move)
 * 
 * This component runs the same on client and server!
 */
export class MovementComponent extends Component<MovementComponentData> {
    public readonly type = 'movement';
    
    // References to parent entity's reactive properties
    private position?: VectorProperty;
    private targetPosition?: VectorProperty;
    private isMoving?: BooleanProperty;
    private moveSpeed?: NumericProperty;
    
    // Component configuration
    private rotationSpeed: number = 5; // radians per second
    private arrivalThreshold: number = 0.1; // distance to consider "arrived"
    
    // Internal state
    private currentVelocity: Vector3 = Vector3.Zero();
    private isSetup: boolean = false;
    
    constructor(config?: Partial<MovementComponentData>) {
        super();
        
        if (config) {
            this.rotationSpeed = config.rotationSpeed ?? this.rotationSpeed;
            this.arrivalThreshold = config.arrivalThreshold ?? this.arrivalThreshold;
        }
    }
    
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        
        // Get reactive properties from the entity
        if (gameObject instanceof NetworkReactiveEntity) {
            this.position = gameObject.getVectorProperty('position');
            this.targetPosition = gameObject.getVectorProperty('targetPosition');
            this.isMoving = gameObject.getBooleanProperty('isMoving');
            this.moveSpeed = gameObject.getNumericProperty('moveSpeed');
            
            if (!this.position || !this.targetPosition) {
                console.error('MovementComponent requires position and targetPosition properties');
                return;
            }
            
            // Set up reactive observers
            this.setupPropertyObservers();
            this.isSetup = true;
            
            console.log(`🏃 MovementComponent attached to ${gameObject.id}`);
        }
    }
    
    private setupPropertyObservers(): void {
        // When target position changes, start moving
        this.targetPosition?.onChange((event) => {
            const currentPos = this.position?.getValue();
            const targetPos = event.to;
            
            if (currentPos && targetPos && !currentPos.equals(targetPos)) {
                this.isMoving?.set(true, 'target_changed');
                console.log(`🎯 Movement started to ${this.formatVector(targetPos)}`);
            }
        });
    }
    
    /**
     * Update movement - called every game logic tick
     * This runs identically on client and server!
     */
    update(deltaTime: number): void {
        if (!this.isSetup || !this.isMoving?.getValue()) {
            return;
        }
        
        const currentPos = this.position?.getValue();
        const targetPos = this.targetPosition?.getValue();
        const speed = this.moveSpeed?.getValue() ?? 5;
        
        if (!currentPos || !targetPos) return;
        
        // Calculate direction
        const direction = targetPos.subtract(currentPos);
        const distance = direction.length();
        
        // Check if we've arrived
        if (distance <= this.arrivalThreshold) {
            this.onArrival(targetPos);
            return;
        }
        
        // Normalize direction
        const normalizedDirection = direction.normalize();
        
        // Calculate movement for this frame
        const moveDistance = Math.min(speed * deltaTime, distance);
        const movement = normalizedDirection.scale(moveDistance);
        
        // Update position
        const newPosition = currentPos.add(movement);
        this.position?.set(newPosition, 'movement');
        
        // Update velocity for smooth interpolation
        this.currentVelocity = normalizedDirection.scale(speed);
        
        // Optional: Update rotation to face movement direction
        this.updateRotation(normalizedDirection, deltaTime);
    }
    
    private onArrival(targetPos: Vector3): void {
        // Snap to exact target position
        this.position?.set(targetPos.clone(), 'arrival');
        
        // Stop moving
        this.isMoving?.set(false, 'arrived');
        
        // Clear velocity
        this.currentVelocity = Vector3.Zero();
        
        console.log(`✅ Arrived at ${this.formatVector(targetPos)}`);
    }
    
    private updateRotation(direction: Vector3, deltaTime: number): void {
        // Only rotate in Y axis (yaw)
        if (Math.abs(direction.x) < 0.001 && Math.abs(direction.z) < 0.001) {
            return; // No horizontal movement
        }
        
        const targetYaw = Math.atan2(direction.x, direction.z);
        
        // Get current rotation from entity if available
        const entity = this._gameObject as NetworkReactiveEntity;
        const rotationProp = entity?.getVectorProperty?.('rotation');
        
        if (rotationProp) {
            const currentRotation = rotationProp.getValue();
            const currentYaw = currentRotation.y;
            
            // Smooth rotation
            let yawDiff = targetYaw - currentYaw;
            
            // Normalize angle difference to [-PI, PI]
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            
            // Apply rotation speed limit
            const maxRotation = this.rotationSpeed * deltaTime;
            const actualRotation = Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), maxRotation);
            
            const newYaw = currentYaw + actualRotation;
            
            // Update rotation
            rotationProp.set(
                new Vector3(currentRotation.x, newYaw, currentRotation.z),
                'movement_rotation'
            );
        }
    }
    
    // ============================================================
    // Public API
    // ============================================================
    
    /**
     * Stop current movement
     */
    stop(): void {
        this.isMoving?.set(false, 'stop_command');
        this.currentVelocity = Vector3.Zero();
        
        // Set target to current position
        const currentPos = this.position?.getValue();
        if (currentPos && this.targetPosition) {
            this.targetPosition.set(currentPos.clone(), 'stop_command');
        }
    }
    
    /**
     * Move to a specific position
     */
    moveTo(position: Vector3, source: string = 'movement_command'): void {
        this.targetPosition?.set(position.clone(), source);
    }
    
    /**
     * Move by a relative offset
     */
    moveBy(offset: Vector3, source: string = 'movement_command'): void {
        const currentTarget = this.targetPosition?.getValue();
        if (currentTarget) {
            this.targetPosition?.set(currentTarget.add(offset), source);
        }
    }
    
    /**
     * Get current velocity (for visual interpolation)
     */
    getVelocity(): Vector3 {
        return this.currentVelocity.clone();
    }
    
    /**
     * Get normalized movement progress (0-1)
     */
    getProgress(): number {
        const currentPos = this.position?.getValue();
        const targetPos = this.targetPosition?.getValue();
        
        if (!currentPos || !targetPos) return 0;
        
        const totalDistance = Vector3.Distance(currentPos, targetPos);
        if (totalDistance < this.arrivalThreshold) return 1;
        
        // This is a simplified progress - in practice you might track start position
        return 0;
    }
    
    /**
     * Check if currently moving
     */
    isCurrentlyMoving(): boolean {
        return this.isMoving?.getValue() ?? false;
    }
    
    // ============================================================
    // Helpers
    // ============================================================
    
    private formatVector(v: Vector3): string {
        return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
    }
    
    // ============================================================
    // Component lifecycle
    // ============================================================
    
    serialize(): MovementComponentData {
        return {
            moveSpeed: this.moveSpeed?.getValue() ?? 5,
            rotationSpeed: this.rotationSpeed,
            arrivalThreshold: this.arrivalThreshold
        };
    }
    
    deserialize(data: MovementComponentData): void {
        this.rotationSpeed = data.rotationSpeed ?? this.rotationSpeed;
        this.arrivalThreshold = data.arrivalThreshold ?? this.arrivalThreshold;
        
        // Move speed is handled by the reactive property
    }
    
    dispose(): void {
        this.isSetup = false;
        super.dispose();
    }
}