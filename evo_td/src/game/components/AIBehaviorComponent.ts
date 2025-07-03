/**
 * Handles AI behavior for enemy entities
 */
import { Component } from '../../engine/components/Component';
import { Vector3 } from '@babylonjs/core';

export enum AIState {
    WANDERING = 'wandering',
    ATTACKING = 'attacking',
    PURSUING = 'pursuing',
    RETREATING = 'retreating',
    PAUSED = 'paused'
}

export enum SocialBehavior {
    SOLITARY = 'solitary',
    PACK = 'pack',
    SWARM = 'swarm',
    HIVE = 'hive'
}

export enum HuntingStrategy {
    AMBUSH = 'ambush',
    PURSUIT = 'pursuit',
    PATROL = 'patrol',
    SCAVENGER = 'scavenger',
    TERRITORIAL = 'territorial'
}

export interface AIBehaviorState {
    // Current behavior state
    currentState: AIState;
    targetPosition: { x: number; y: number; z: number } | null;
    lastStateChange: number;

    // AI characteristics
    aggressionLevel: number;    // 0.0-1.0
    intelligence: number;       // 0.0-1.0
    sightRange: number;         // Detection range in units
    attackRange: number;        // Range to start attacking
    fearThreshold: number;      // 0.0-1.0, health % when to retreat

    // Behavior patterns
    socialBehavior: SocialBehavior;
    huntingStrategy: HuntingStrategy;

    // Movement patterns
    wanderRadius: number;       // How far to wander from spawn
    wanderTarget: { x: number; y: number; z: number } | null;
    lastWanderChange: number;

    // Growth and evolution
    spawnTime: number;
    lastGrowthTime: number;
    evolutionPoints: number;    // Accumulated from successful actions
}

export class AIBehaviorComponent extends Component<AIBehaviorState> {
    public readonly type = 'aiBehavior';

    private _currentState: AIState = AIState.WANDERING;
    private _targetPosition: Vector3 | null = null;
    private _lastStateChange: number = 0;

    // AI characteristics
    private _aggressionLevel: number;
    private _intelligence: number;
    private _sightRange: number;
    private _attackRange: number;
    private _fearThreshold: number;

    // Behavior patterns
    private _socialBehavior: SocialBehavior;
    private _huntingStrategy: HuntingStrategy;

    // Movement patterns
    private _wanderRadius: number;
    private _wanderTarget: Vector3 | null = null;
    private _lastWanderChange: number = 0;

    // Growth and evolution
    private _spawnTime: number;
    private _lastGrowthTime: number;
    private _evolutionPoints: number = 0;

    constructor(config: {
        aggressionLevel?: number;
        intelligence?: number;
        sightRange?: number;
        attackRange?: number;
        fearThreshold?: number;
        socialBehavior?: SocialBehavior;
        huntingStrategy?: HuntingStrategy;
        wanderRadius?: number;
    } = {}) {
        super();

        this._aggressionLevel = config.aggressionLevel ?? 0.5;
        this._intelligence = config.intelligence ?? 0.3;
        this._sightRange = config.sightRange ?? 12;
        this._attackRange = config.attackRange ?? 1.5;
        this._fearThreshold = config.fearThreshold ?? 0.2;
        this._socialBehavior = config.socialBehavior ?? SocialBehavior.SOLITARY;
        this._huntingStrategy = config.huntingStrategy ?? HuntingStrategy.PURSUIT;
        this._wanderRadius = config.wanderRadius ?? 8;

        this._spawnTime = performance.now();
        this._lastGrowthTime = this._spawnTime;
        this._lastStateChange = this._spawnTime;
        this._lastWanderChange = this._spawnTime;
    }

    /**
     * Change the AI state
     */
    public setState(newState: AIState, targetPosition?: Vector3): void {
        if (this._currentState !== newState) {
            this._currentState = newState;
            this._lastStateChange = performance.now();

            if (targetPosition) {
                this._targetPosition = targetPosition.clone();
            }
        }
    }

    /**
     * Set a new wander target
     */
    public setWanderTarget(target: Vector3): void {
        this._wanderTarget = target.clone();
        this._lastWanderChange = performance.now();
    }

    /**
     * Award evolution points for successful actions
     */
    public awardEvolutionPoints(points: number): void {
        this._evolutionPoints += points;
    }

    /**
     * Check if enemy should grow/evolve
     */
    public shouldEvolve(): boolean {
        const timeSinceLastGrowth = (performance.now() - this._lastGrowthTime) / 1000;
        return this._evolutionPoints >= 10 || timeSinceLastGrowth >= 30; // Every 30 seconds or 10 points
    }

    /**
     * Process evolution/growth
     */
    public processEvolution(): void {
        this._lastGrowthTime = performance.now();
        this._evolutionPoints = Math.max(0, this._evolutionPoints - 10);
    }

    // Getters
    public getCurrentState(): AIState { return this._currentState; }
    public getTargetPosition(): Vector3 | null { return this._targetPosition?.clone() ?? null; }
    public getAggressionLevel(): number { return this._aggressionLevel; }
    public getIntelligence(): number { return this._intelligence; }
    public getSightRange(): number { return this._sightRange; }
    public getAttackRange(): number { return this._attackRange; }
    public getFearThreshold(): number { return this._fearThreshold; }
    public getSocialBehavior(): SocialBehavior { return this._socialBehavior; }
    public getHuntingStrategy(): HuntingStrategy { return this._huntingStrategy; }
    public getWanderRadius(): number { return this._wanderRadius; }
    public getWanderTarget(): Vector3 | null { return this._wanderTarget?.clone() ?? null; }
    public getSpawnTime(): number { return this._spawnTime; }
    public getEvolutionPoints(): number { return this._evolutionPoints; }
    public getTimeSinceStateChange(): number { return (performance.now() - this._lastStateChange) / 1000; }
    public getTimeSinceWanderChange(): number { return (performance.now() - this._lastWanderChange) / 1000; }

    // Component interface implementation
    public serialize(): AIBehaviorState {
        return {
            currentState: this._currentState,
            targetPosition: this._targetPosition ? {
                x: this._targetPosition.x,
                y: this._targetPosition.y,
                z: this._targetPosition.z
            } : null,
            lastStateChange: this._lastStateChange,
            aggressionLevel: this._aggressionLevel,
            intelligence: this._intelligence,
            sightRange: this._sightRange,
            attackRange: this._attackRange,
            fearThreshold: this._fearThreshold,
            socialBehavior: this._socialBehavior,
            huntingStrategy: this._huntingStrategy,
            wanderRadius: this._wanderRadius,
            wanderTarget: this._wanderTarget ? {
                x: this._wanderTarget.x,
                y: this._wanderTarget.y,
                z: this._wanderTarget.z
            } : null,
            lastWanderChange: this._lastWanderChange,
            spawnTime: this._spawnTime,
            lastGrowthTime: this._lastGrowthTime,
            evolutionPoints: this._evolutionPoints
        };
    }

    public deserialize(data: AIBehaviorState): void {
        this._currentState = data.currentState;
        this._targetPosition = data.targetPosition ? new Vector3(data.targetPosition.x, data.targetPosition.y, data.targetPosition.z) : null;
        this._lastStateChange = data.lastStateChange;
        this._aggressionLevel = data.aggressionLevel;
        this._intelligence = data.intelligence;
        this._sightRange = data.sightRange;
        this._attackRange = data.attackRange;
        this._fearThreshold = data.fearThreshold;
        this._socialBehavior = data.socialBehavior;
        this._huntingStrategy = data.huntingStrategy;
        this._wanderRadius = data.wanderRadius;
        this._wanderTarget = data.wanderTarget ? new Vector3(data.wanderTarget.x, data.wanderTarget.y, data.wanderTarget.z) : null;
        this._lastWanderChange = data.lastWanderChange;
        this._spawnTime = data.spawnTime;
        this._lastGrowthTime = data.lastGrowthTime;
        this._evolutionPoints = data.evolutionPoints;
    }
}