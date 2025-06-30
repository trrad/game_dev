import { Mesh } from "@babylonjs/core";

export interface Weapon {
    id: string;
    mesh: Mesh;
    carIndex: number;
    damage: number;
    range: number;
    fireRate: number;
    lastFired: number;
}
