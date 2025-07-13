// src/game/entities/Ball/Ball.server.ts
import { Ball } from './Ball.base';
import { Color3, MeshBuilder, StandardMaterial, Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole } from '../../../engine/networking/NetworkTypes';

/**
 * ServerBall - Server-side extension
 * 
 * Just provides server-specific visuals and color scheme
 * All game logic is in the base class!
 */
export class ServerBall extends Ball {
    constructor(
        networkId: string,
        scene: Scene | null,
        role: NetworkRole,
        startPos?: Vector3
    ) {
        super('ball', networkId, scene, role, startPos);
    }

    protected getExtensionType(): 'SERVER' {
        return 'SERVER';
    }

    protected getColorForState(state: number): Color3 {
        // Server uses green color family
        switch (state) {
            case 0: return new Color3(0.2, 0.8, 0.2);  // Green
            case 1: return new Color3(0.8, 0.8, 0.2);  // Yellow
            case 2: return new Color3(0.8, 0.4, 0.2);  // Orange
            default: return Color3.White();
        }
    }

    protected createVisual(): void {
        if (!this.scene) return;

        // SERVER: Cube for debugging (production server wouldn't render)
        this.mesh = MeshBuilder.CreateBox(
            `server_ball_${this.getNetworkId()}`, 
            { size: 1 }, 
            this.scene
        );

        this.material = new StandardMaterial(`server_material_${this.getNetworkId()}`, this.scene);
        this.material.specularColor = new Color3(0.2, 0.3, 0.2);
        this.mesh.material = this.material;
        
        this.updateColor();
        
        console.log(`🟩 SERVER visual created: CUBE for ${this.getNetworkId()}`);
    }

    protected setupServerBehaviors(): void {
        console.log(`🖥️ SERVER behaviors ready for ${this.getNetworkId()}`);
    }
}