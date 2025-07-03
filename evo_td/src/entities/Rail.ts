import { Vector3, Mesh } from "@babylonjs/core";
import { GameObject } from "../engine/core/GameObject";
import { Logger, LogCategory } from "../engine/utils/Logger";

export interface RailConfig {
    id: string;
    name: string;
    stationA: string;
    stationB: string;
    trackPoints: Vector3[];
    isOperational: boolean;
    efficiency?: number; // Optional efficiency modifier (1.0 is normal)
}

export interface RailState {
    isOperational: boolean;
    efficiency: number;
    totalDistance: number;
    meshCreated: boolean;
}

/**
 * Rail represents a connection between two stations.
 * Rails provide path information for trains and can affect their performance.
 */
export class Rail extends GameObject {
    private _config: RailConfig;
    private _state: RailState;
    private _mesh?: Mesh;

    constructor(config: RailConfig) {
        super('rail');
        this._config = config;
        
        const totalDistance = this.calculateTotalLength();
        this._state = {
            isOperational: config.isOperational,
            efficiency: config.efficiency || 1.0,
            totalDistance: totalDistance,
            meshCreated: false
        };

        // Set up metrics (numeric only)
        this.metrics.set('distance', totalDistance);
        this.metrics.set('efficiency', this._state.efficiency);
        this.metrics.set('is_operational', config.isOperational ? 1 : 0);
        this.metrics.set('segments', config.trackPoints.length - 1);

        Logger.log(LogCategory.SYSTEM, `Rail created`, {
            id: config.id,
            name: config.name,
            distance: totalDistance
        });
    }

    get railId(): string {
        return this._config.id;
    }

    get name(): string {
        return this._config.name;
    }

    get stationA(): string {
        return this._config.stationA;
    }

    get stationB(): string {
        return this._config.stationB;
    }

    get trackPoints(): Vector3[] {
        return this._config.trackPoints;
    }

    get isOperational(): boolean {
        return this._state.isOperational;
    }

    get efficiency(): number {
        return this._state.efficiency;
    }

    get totalDistance(): number {
        return this._state.totalDistance;
    }

    get mesh(): Mesh | undefined {
        return this._mesh;
    }

    set mesh(value: Mesh | undefined) {
        this._mesh = value;
        this._state.meshCreated = value !== undefined;
    }

    /**
     * Gets a position along the rail at a given progress value (0-1) using linear interpolation
     */
    getPositionAt(progress: number): Vector3 {
        if (progress <= 0) return this.trackPoints[0].clone();
        if (progress >= 1) return this.trackPoints[this.trackPoints.length - 1].clone();
        
        // Use simple linear interpolation between track points (matches original app.ts logic)
        const totalSegments = this.trackPoints.length - 1;
        const scaledProgress = progress * totalSegments;
        const currentSegment = Math.floor(scaledProgress);
        const segmentProgress = scaledProgress - currentSegment;
        
        if (currentSegment >= totalSegments) {
            return this.trackPoints[this.trackPoints.length - 1].clone();
        }
        
        const startPoint = this.trackPoints[currentSegment];
        const endPoint = this.trackPoints[currentSegment + 1];
        
        return Vector3.Lerp(startPoint, endPoint, segmentProgress);
    }

    /**
     * Gets the direction vector at a given progress value (0-1)
     */
    getDirectionAt(progress: number): Vector3 | null {
        if (progress <= 0 || progress >= 1) return null;
        
        const totalSegments = this.trackPoints.length - 1;
        const scaledProgress = progress * totalSegments;
        const currentSegment = Math.floor(scaledProgress);
        
        if (currentSegment >= totalSegments) return null;
        
        const startPoint = this.trackPoints[currentSegment];
        const endPoint = this.trackPoints[currentSegment + 1];
        
        return endPoint.subtract(startPoint).normalize();
    }

    /**
     * Set operational status and update metrics
     */
    setOperational(isOperational: boolean): void {
        this._state.isOperational = isOperational;
        this.metrics.set('is_operational', isOperational ? 1 : 0);

        Logger.log(LogCategory.SYSTEM, `Rail operational status changed`, {
            id: this.railId,
            isOperational
        });
    }

    /**
     * Set efficiency modifier and update metrics
     */
    setEfficiency(efficiency: number): void {
        this._state.efficiency = Math.max(0.1, Math.min(2.0, efficiency));
        this.metrics.set('efficiency', this._state.efficiency);

        Logger.log(LogCategory.SYSTEM, `Rail efficiency changed`, {
            id: this.railId,
            efficiency: this._state.efficiency
        });
    }

    /**
     * Calculate total rail length based on track points
     */
    private calculateTotalLength(): number {
        let length = 0;
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            length += this.trackPoints[i + 1].subtract(this.trackPoints[i]).length();
        }
        return length || 1; // Avoid division by zero
    }

    /**
     * Get segment number and progress within that segment
     */
    getSegmentInfo(progress: number): { segmentIndex: number, segmentProgress: number } {
        const totalSegments = this.trackPoints.length - 1;
        const clampedProgress = Math.min(Math.max(0, progress), 1);
        
        if (clampedProgress === 1) {
            // Special case for end of track
            return {
                segmentIndex: totalSegments - 1,
                segmentProgress: 1
            };
        }
        
        const scaledProgress = clampedProgress * totalSegments;
        const segmentIndex = Math.floor(scaledProgress);
        const segmentProgress = scaledProgress - segmentIndex;
        
        return {
            segmentIndex: Math.min(segmentIndex, totalSegments - 1),
            segmentProgress: segmentProgress
        };
    }

    // Override GameObject serialization to include Rail-specific data
    protected getEntityState(): any {
        return {
            config: {
                ...this._config,
                trackPoints: this._config.trackPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
            },
            state: this._state
        };
    }

    protected setEntityState(state: any): void {
        if (state?.config) {
            this._config = {
                ...state.config,
                trackPoints: state.config.trackPoints.map((p: any) => new Vector3(p.x, p.y, p.z))
            };
        }
        if (state?.state) {
            this._state = { ...this._state, ...state.state };
        }
    }

    // Legacy serialization methods for compatibility
    getRailData(): RailConfig & RailState {
        return {
            ...this._config,
            trackPoints: this._config.trackPoints.map(p => p.clone()),
            ...this._state
        };
    }

    setRailData(data: RailConfig & Partial<RailState>): void {
        this._config = {
            ...data,
            trackPoints: data.trackPoints.map(p => new Vector3(p.x, p.y, p.z))
        };

        // Keep existing state values if not provided
        this._state = {
            isOperational: data.isOperational ?? this._state.isOperational,
            efficiency: data.efficiency ?? this._state.efficiency,
            totalDistance: data.totalDistance ?? this.calculateTotalLength(),
            meshCreated: data.meshCreated ?? this._state.meshCreated
        };

        // Update metrics
        this.metrics.set('distance', this._state.totalDistance);
        this.metrics.set('efficiency', this._state.efficiency);
        this.metrics.set('is_operational', this._state.isOperational ? 1 : 0);
        this.metrics.set('segments', this._config.trackPoints.length - 1);
    }

    dispose(): void {
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = undefined;
        }
        super.dispose();
    }
}
