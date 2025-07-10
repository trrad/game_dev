// src/game/entities/Ball/Ball.server.ts

import { BaseBall } from './Ball.base';
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole } from '@engine/networking/NetworkTypes';

/**
 * ServerBall - Server-side extension of Ball entity
 * 
 * Handles:
 * - Validation and anti-cheat
 * - Authoritative state management
 * - AI behavior (future)
 * - Debug visualization (green cube)
 */
export class ServerBall extends BaseBall {
    // Validation bounds
    private readonly MAX_POSITION = 20;
    private readonly MAX_MOVE_DISTANCE = 10;

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
    protected getExtensionType(): 'SERVER' {
        return 'SERVER';
    }

    /**
     * Create server-specific visual (green cube)
     * Only created when running server with debug visualization
     */
    protected createVisual(): void {
        if (!this.scene) return; // Server often runs headless

        // SERVER: Cube with larger size, semi-transparent
        this.mesh = MeshBuilder.CreateBox(
            `server_ball_${this.getNetworkId()}`, 
            { 
                size: 1.2 
            }, 
            this.scene
        );

        // Set mesh name for entity picking
        this.mesh.name = `entity_${this.getNetworkId()}`;
        
        // Create material with server color scheme
        this.material = new StandardMaterial(`server_material_${this.getNetworkId()}`, this.scene);
        this.material.alpha = 0.7; // Semi-transparent for debug visibility
        this.material.specularColor = new Color3(0.1, 0.3, 0.1);
        this.mesh.material = this.material;
        
        // Set up interaction handlers (for debug server)
        this.setupMeshActions();
        
        // Initial color update
        this.updateColor();
        
        console.log(`🟩 SERVER visual created: CUBE (1.2, alpha=0.7) for ${this.getNetworkId()}`);
    }

    /**
     * Get color for state - Server uses green color family
     */
    protected getColorForState(state: number): Color3 {
        switch (state) {
            case 0: return new Color3(0.2, 0.8, 0.2);  // Green
            case 1: return new Color3(0.8, 0.8, 0.2);  // Yellow
            case 2: return new Color3(0.8, 0.2, 0.2);  // Red
            default: return Color3.Gray();
        }
    }

    /**
     * Server-specific behaviors
     */
    protected setupServerBehaviors(): void {
        super.setupServerBehaviors();
        
        // Set up validation rules
        this.setupValidation();
        
        // Set up AI behavior (if not player-controlled)
        this.setupAIBehavior();
        
        // Set up anti-cheat monitoring
        this.setupAntiCheat();
    }

    /**
     * Set up validation for state changes
     */
    private setupValidation(): void {
        // Validate position changes
        const position = this.getVectorProperty('position');
        position?.onChange((event) => {
            if (!this.isValidPosition(event.to)) {
                console.warn(`🚫 SERVER: Invalid position blocked for ${this.getNetworkId()}`);
                // Revert to previous valid position
                position.set(event.from, 'validation_revert');
            }
        });
        
        console.log(`⚖️ SERVER validation active for ${this.getNetworkId()}`);
    }

    /**
     * Set up AI behavior for non-player entities
     */
    private setupAIBehavior(): void {
        // TODO: Implement AI behaviors
        // - Patrol patterns
        // - Player following
        // - Obstacle avoidance
        
        if (!this.getRole().ownedByThisClient) {
            console.log(`🤖 SERVER AI ready for ${this.getNetworkId()}`);
        }
    }

    /**
     * Set up anti-cheat monitoring
     */
    private setupAntiCheat(): void {
        // Track movement speed
        let lastPosition = this.getPosition();
        let lastTime = Date.now();
        
        const checkMovementSpeed = () => {
            const currentPosition = this.getPosition();
            const currentTime = Date.now();
            
            const distance = Vector3.Distance(lastPosition, currentPosition);
            const timeDelta = (currentTime - lastTime) / 1000; // Convert to seconds
            
            if (timeDelta > 0) {
                const speed = distance / timeDelta;
                const maxSpeed = this.getNumericProperty('moveSpeed')?.getValue() || 3.0;
                
                if (speed > maxSpeed * 1.5) { // 50% tolerance
                    console.warn(`⚠️ SERVER: Suspicious movement speed detected for ${this.getNetworkId()}: ${speed.toFixed(2)} units/s`);
                }
            }
            
            lastPosition = currentPosition;
            lastTime = currentTime;
        };
        
        // Check periodically
        if (this.scene) {
            const interval = setInterval(checkMovementSpeed, 1000);
            this.addCleanupFunction(() => clearInterval(interval));
        }
    }

    /**
     * Enhanced movement with validation
     */
    public moveTo(target: Vector3, source: string): void {
        // Validate move target
        if (!this.isValidMoveTarget(target)) {
            console.warn(`🚫 SERVER rejected invalid move to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
            return;
        }
        
        console.log(`⚖️ SERVER authority: Validated move to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
        super.moveTo(target, source);
    }

    /**
     * Validate position is within world bounds
     */
    private isValidPosition(position: Vector3): boolean {
        return Math.abs(position.x) <= this.MAX_POSITION && 
               Math.abs(position.z) <= this.MAX_POSITION &&
               position.y >= 0 && position.y <= 10; // Reasonable Y bounds
    }

    /**
     * Validate move target
     */
    private isValidMoveTarget(target: Vector3): boolean {
        // Check bounds
        if (!this.isValidPosition(target)) {
            return false;
        }
        
        // Check move distance
        const currentPos = this.getPosition();
        const distance = Vector3.Distance(currentPos, target);
        
        if (distance > this.MAX_MOVE_DISTANCE) {
            console.warn(`🚫 Move distance ${distance.toFixed(2)} exceeds maximum ${this.MAX_MOVE_DISTANCE}`);
            return false;
        }
        
        // TODO: Add more validation
        // - Line of sight checks
        // - Collision with obstacles
        // - Valid terrain checks
        
        return true;
    }

    /**
     * Server-side game logic update
     */
    public updateGameLogic(deltaTime: number): void {
        // TODO: Server-specific updates
        // - AI movement
        // - State transitions
        // - Event triggers
    }

    /**
     * Get state for saving/persistence
     */
    public getPersistentState(): any {
        return {
            networkId: this.getNetworkId(),
            position: this.getPosition(),
            colorState: this.getNumericProperty('colorState')?.getValue(),
            // Add other persistent state
        };
    }

    /**
     * Restore from saved state
     */
    public restoreFromState(state: any): void {
        if (state.position) {
            this.getVectorProperty('position')?.set(state.position, 'state_restore');
        }
        if (state.colorState !== undefined) {
            this.getNumericProperty('colorState')?.set(state.colorState, 'state_restore');
        }
    }
}