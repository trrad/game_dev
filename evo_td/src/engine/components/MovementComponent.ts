/**
 * Handles movement and speed calculations for game objects.
 * Provides basic movement properties for free-moving entities (enemies, projectiles, etc.).
 * For rail-constrained movement, use RailMovementComponent instead.
 */
import { Component } from "./Component";
import type { GameObject } from "../core/GameObject";
export interface MovementState {
    speed: number;
    direction?: { x: number; y: number; z: number };
}
export class MovementComponent extends Component<MovementState> {
    public readonly type = 'movement';
    private _speed: number;
    private _direction: { x: number; y: number; z: number } = { x: 0, y: 0, z: -1 }; // Default direction (forward)
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
            direction: this._direction
        };
    }
    deserialize(data: MovementState): void {
        this._speed = data.speed;
        if (data.direction) {
            this._direction = data.direction;
        }
    }
}

