import { Mesh, Vector3 } from "@babylonjs/core";

export interface Enemy {
    id: string;
    mesh: Mesh;
    health: number;
    maxHealth: number;
    speed: number;
    targetPosition: Vector3;
    damage: number;
    state: 'wandering' | 'attacking' | 'paused';
    wanderTarget: Vector3;
    sightRange: number;
    isPaused: boolean;
    spawnTime: number;
    lastGrowthTime: number;
}
