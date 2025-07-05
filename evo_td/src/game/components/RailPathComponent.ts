// Update the import path below if the actual location of Component is different
import { Component } from '../../engine/components/Component';
import { Vector3, Path3D } from '@babylonjs/core';
import { GameNodeObject } from '../../engine/core/GameNodeObject';

export interface RailPathComponentConfig {
    points: Vector3[];
}

/**
 * RailPathComponent encapsulates a Babylon.js Path3D for rail movement.
 * Provides methods to sample positions, tangents, and orientation along the path.
 */
export class RailPathComponent extends Component<RailPathComponentConfig> {
    public readonly type = 'rail_path';
    private _path3d: Path3D;
    private _points: Vector3[];

    constructor(config: RailPathComponentConfig) {
        super();
        this._points = config.points;
        this._path3d = new Path3D(this._points);
    }

    /**
     * Get the Path3D instance
     */
    get path3d(): Path3D {
        return this._path3d;
    }

    /**
     * Sample a position along the path (progress: 0-1)
     */
    getPositionAt(progress: number): Vector3 {
        const curve = this._path3d.getCurve();
        if (progress <= 0) return curve[0].clone();
        if (progress >= 1) return curve[curve.length - 1].clone();
        const idx = Math.floor(progress * (curve.length - 1));
        const nextIdx = Math.min(idx + 1, curve.length - 1);
        const t = (progress * (curve.length - 1)) - idx;
        return Vector3.Lerp(curve[idx], curve[nextIdx], t);
    }

    /**
     * Sample tangent (direction) at a given progress (0-1)
     */
    getTangentAt(progress: number): Vector3 {
        const tangents = this._path3d.getTangents();
        const idx = Math.floor(progress * (tangents.length - 1));
        return tangents[idx].clone();
    }

    /**
     * Sample binormal at a given progress (0-1)
     */
    getBinormalAt(progress: number): Vector3 {
        const binormals = this._path3d.getBinormals();
        const idx = Math.floor(progress * (binormals.length - 1));
        return binormals[idx].clone();
    }

    /**
     * Sample normal at a given progress (0-1)
     */
    getNormalAt(progress: number): Vector3 {
        const normals = this._path3d.getNormals();
        const idx = Math.floor(progress * (normals.length - 1));
        return normals[idx].clone();
    }

    /**
     * Serializes the component's data to a RailPathComponentConfig object.
     */
    serialize(): RailPathComponentConfig {
        return {
            points: this._points.map(p => p.clone())
        };
    }

    /**
     * Deserializes the component's data from a RailPathComponentConfig object.
     */
    deserialize(data: RailPathComponentConfig): void {
        this._points = data.points.map(p => p.clone());
        this._path3d = new Path3D(this._points);
    }
}
