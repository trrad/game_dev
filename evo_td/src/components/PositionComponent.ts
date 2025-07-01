/**
 * Handles position and rotation for game objects.
 */
import { Component } from '../core/Component';

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface PositionState {
    position: Position3D;
    rotation: Position3D;
}

export class PositionComponent extends Component<PositionState> {
    public readonly type = 'position';
    private _position: Position3D = { x: 0, y: 0, z: 0 };
    private _rotation: Position3D = { x: 0, y: 0, z: 0 };

    setPosition(pos: Position3D): void {
        this._position = { ...pos };
    }

    getPosition(): Position3D {
        return { ...this._position };
    }

    setRotation(rot: Position3D): void {
        this._rotation = { ...rot };
    }

    getRotation(): Position3D {
        return { ...this._rotation };
    }

    serialize(): PositionState {
        return {
            position: { ...this._position },
            rotation: { ...this._rotation }
        };
    }

    deserialize(data: PositionState): void {
        if (data.position) this._position = { ...data.position };
        if (data.rotation) this._rotation = { ...data.rotation };
    }
}
