// src/game/entities/Ball/Ball.client.ts

import { BaseBall } from './Ball.base';
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole } from '../../../engine/networking/NetworkTypes';

/**
 * ClientBall - Client-side extension of Ball entity
 * 
 * Handles:
 * - 3D mesh creation (blue sphere)
 * - Client-specific visual effects
 * - Input prediction (future)
 * - Audio feedback (future)
 */
export class ClientBall extends BaseBall {
    constructor(
        networkId: string,
        scene: Scene | null,
        role: NetworkRole,
        startPos?: Vector3
    ) {
        super('ball', networkId, scene, role, startPos);
    }

    /**
     * Get extension type for debugging
     */
    protected getExtensionType(): 'CLIENT' {
        return 'CLIENT';
    }

    /**
     * Create client-specific visual (blue sphere)
     */
    protected createVisual(): void {
        if (!this.scene) return;

        // CLIENT: Sphere with smaller size
        this.mesh = MeshBuilder.CreateSphere(
            `client_ball_${this.getNetworkId()}`, 
            { 
                diameter: 0.8,
                segments: 16 
            }, 
            this.scene
        );

        // Set mesh name for entity picking
        this.mesh.name = `entity_${this.getNetworkId()}`;
        
        // Create material with client color scheme
        this.material = new StandardMaterial(`client_material_${this.getNetworkId()}`, this.scene);
        this.material.specularColor = new Color3(0.2, 0.2, 0.3);
        this.mesh.material = this.material;
        
        // Set up interaction handlers
        this.setupMeshActions();
        
        // Initial color update
        this.updateColor();
        
        console.log(`🔵 CLIENT visual created: SPHERE (0.8) for ${this.getNetworkId()}`);
    }

    /**
     * Get color for state - Client uses blue color family
     */
    protected getColorForState(state: number): Color3 {
        switch (state) {
            case 0: return new Color3(0.2, 0.2, 0.8);  // Blue
            case 1: return new Color3(0, 0.7, 0.9);    // Cyan
            case 2: return new Color3(0.5, 0.2, 0.8);  // Purple
            default: return Color3.White();
        }
    }

    /**
     * Client-specific behaviors
     */
    protected setupClientBehaviors(): void {
        super.setupClientBehaviors();

        // Set up client render loop update
        if (this.scene) {
            this.scene.onBeforeRenderObservable.add(() => {
                this.updateGameLogic(0.016); // ~60fps
            });
        }        
        
        // Future: Add client prediction
        this.setupClientPrediction();
        
        // Future: Add audio feedback
        this.setupAudioFeedback();
        
        // Future: Add particle effects
        this.setupVisualEffects();
    }

    /**
     * Set up client-side prediction for smoother movement
     */
    private setupClientPrediction(): void {
        // TODO: Implement client-side prediction
        // - Store predicted positions
        // - Reconcile with server updates
        // - Smooth corrections
        
        console.log(`🔮 CLIENT prediction ready for ${this.getNetworkId()}`);
    }

    /**
     * Set up audio feedback for interactions
     */
    private setupAudioFeedback(): void {
        // TODO: Implement audio system
        // - Click sounds
        // - Movement sounds
        // - Hover feedback
        
        if (false) { // Audio system not implemented yet
            console.log(`🔊 CLIENT audio ready for ${this.getNetworkId()}`);
        }
    }

    /**
     * Set up visual effects (particles, trails, etc.)
     */
    private setupVisualEffects(): void {
        // TODO: Implement particle effects
        // - Movement trails
        // - Click effects
        // - Hover glow
        
        if (false) { // Effects system not implemented yet
            console.log(`✨ CLIENT effects ready for ${this.getNetworkId()}`);
        }
    }

    /**
     * Enhanced movement with client prediction
     */
    public moveTo(target: Vector3, source: string): void {
        console.log(`🎮 CLIENT prediction: Moving to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
        
        // TODO: Add immediate visual feedback before server confirmation
        // - Start movement animation immediately
        // - Store predicted state
        // - Reconcile when server update arrives
        
        super.moveTo(target, source);
    }

    /**
     * Clean up client-specific resources
     */
    dispose(): void {
        // Clean up any client-specific resources
        // - Audio sources
        // - Particle systems
        // - Prediction buffers
        
        super.dispose();
    }
}