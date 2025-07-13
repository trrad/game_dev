// src/game/entities/Player/PlayerEntity.ts

import { DecoratedEntity } from '@engine/core/DecoratedEntity';
import { Entity, OnPropertyChange, EveryTick, ClientOnly, ServerOnly } from '@engine/core/ReactiveDecorators';
import { EntitySchema } from '@engine/networking/NetworkTypes';
import { Vector3, Scene, MeshBuilder, StandardMaterial, Color3, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { MovementComponent } from '@game/components/MovementComponent';

/**
 * Player entity with reactive properties and decorator-based behaviors
 * 
 * Demonstrates:
 * - Shared game logic (movement)
 * - Client-only input handling
 * - Server-only validation
 * - Property observers with decorators
 * - Tick handlers with decorators
 */
@Entity('player')
export class PlayerEntity extends DecoratedEntity {
    // Components
    private movement?: MovementComponent;
    
    // Client-only mesh reference
    private playerMesh?: any;
    
    // Server-only validation data
    private lastValidatedPosition?: Vector3;
    private validationChecksum?: string;
    
    protected getSchema(): EntitySchema {
        return {
            entityType: 'player',
            properties: [
                // Server authoritative
                { name: 'position', type: 'vector', defaultValue: Vector3.Zero(), networkSync: true, authority: 'server' },
                { name: 'health', type: 'number', defaultValue: 100, networkSync: true, authority: 'server', constraints: { min: 0, max: 100 } },
                { name: 'isAlive', type: 'boolean', defaultValue: true, networkSync: true, authority: 'server' },
                
                // Client authoritative
                { name: 'targetPosition', type: 'vector', defaultValue: Vector3.Zero(), networkSync: true, authority: 'client' },
                { name: 'targetEntityId', type: 'string', defaultValue: '', networkSync: true, authority: 'client' },
                { name: 'inputSequence', type: 'number', defaultValue: 0, networkSync: true, authority: 'client' },
                
                // Local only
                { name: 'moveSpeed', type: 'number', defaultValue: 5, networkSync: false, authority: 'client' }
            ]
        };
    }
    
    // ============================================================
    // SHARED: Core game logic
    // ============================================================
    
    protected setupSharedBehaviors(): void {
        // Movement component handles position interpolation
        this.movement = new MovementComponent();
        this.addComponent(this.movement);
        
        // Visual representation (exists on both for debugging)
        this.createVisual();
        
        console.log(`👤 Player ${this.getNetworkId()} shared behaviors initialized`);
    }
    
    protected createVisual(): void {
        if (!this.scene) return;
        
        // Create player mesh
        this.playerMesh = MeshBuilder.CreateCapsule(`player_${this.getNetworkId()}`, {
            height: 2,
            radius: 0.5
        }, this.scene);
        
        // Material
        const material = new StandardMaterial(`player_mat_${this.getNetworkId()}`, this.scene);
        material.diffuseColor = this.getRole().ownedByThisClient ? 
            new Color3(0.2, 0.6, 1) : // Blue for owned player
            new Color3(0.8, 0.8, 0.8); // Gray for other players
        
        this.playerMesh.material = material;
        
        // Set as main mesh
        this.mesh = this.playerMesh;
        
        // Sync initial position
        const pos = this.getVectorProperty('position')?.getValue();
        if (pos && this.mesh) {
            this.mesh.position.copyFrom(pos);
        }
    }
    
    // ============================================================
    // SHARED: Reactive property observers
    // ============================================================
    
    @OnPropertyChange('health')
    protected onHealthChanged(newHealth: number, oldHealth: number, source: string): void {
        console.log(`💚 Player ${this.getNetworkId()} health: ${oldHealth} → ${newHealth} [${source}]`);
        
        // Check if dead
        if (newHealth <= 0 && oldHealth > 0) {
            this.getBooleanProperty('isAlive')?.set(false, 'health_depleted');
        }
        
        // Visual feedback
        this.updateHealthVisual(newHealth);
    }
    
    @OnPropertyChange('isAlive')
    protected onAliveChanged(isAlive: boolean, wasAlive: boolean): void {
        if (!isAlive && wasAlive) {
            console.log(`💀 Player ${this.getNetworkId()} died!`);
            this.onDeath();
        } else if (isAlive && !wasAlive) {
            console.log(`✨ Player ${this.getNetworkId()} respawned!`);
            this.onRespawn();
        }
    }
    
    @OnPropertyChange('targetPosition')
    protected onTargetPositionChanged(newTarget: Vector3, oldTarget: Vector3, source: string): void {
        // Movement component will handle the actual movement
        // This is just for logging/effects
        if (this.getRole().isClient) {
            console.log(`🎯 Player ${this.getNetworkId()} target: ${this.formatVector(newTarget)} [${source}]`);
        }
    }
    
    // ============================================================
    // SHARED: Tick handlers
    // ============================================================
    
    @EveryTick('gameLogic')
    protected updateGameLogic(deltaTime: number): void {
        // Movement component handles position updates
        if (this.movement) {
            this.movement.update(deltaTime);
        }
        
        // Server-specific validation happens in server-only methods
        // Client-specific prediction happens automatically
    }
    
    @EveryTick('healthRegen')
    protected updateHealthRegen(deltaTime: number): void {
        const health = this.getNumericProperty('health');
        const isAlive = this.getBooleanProperty('isAlive');
        
        if (health && isAlive?.getValue() && health.getValue() < 100) {
            // Regen 2 HP per second when alive
            health.addValue(2 * deltaTime, 'regen');
        }
    }
    
    // ============================================================
    // CLIENT: Input handling and visual feedback
    // ============================================================
    
    @ClientOnly
    protected setupClientBehaviors(): void {
        if (this.isOwnedByThisClient()) {
            this.setupInputHandling();
            console.log(`🎮 Player ${this.getNetworkId()} input handling enabled`);
        }
        
        this.setupVisualEffects();
    }
    
    @ClientOnly
    private setupInputHandling(): void {
        if (!this.scene) return;
        
        // Ground clicking for movement
        const ground = this.scene.getMeshByName('ground');
        if (ground) {
            ground.isPickable = true;
            ground.actionManager = new ActionManager(this.scene);
            
            ground.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPickTrigger,
                    (evt) => {
                        const pickInfo = evt.sourceEvent;
                        if (pickInfo.pickedPoint) {
                            this.setMoveTarget(pickInfo.pickedPoint);
                        }
                    }
                )
            );
        }
    }
    
    @ClientOnly
    private setMoveTarget(position: Vector3): void {
        const targetPos = this.getVectorProperty('targetPosition');
        const inputSeq = this.getNumericProperty('inputSequence');
        
        if (targetPos && inputSeq) {
            targetPos.set(position.clone(), 'player_input');
            inputSeq.increment('input');
            
            // Visual feedback
            this.showTargetMarker(position);
        }
    }
    
    @ClientOnly
    private setupVisualEffects(): void {
        // Add glow effect when selected, particle effects, etc.
        console.log(`✨ Player ${this.getNetworkId()} visual effects ready`);
    }
    
    @ClientOnly
    private showTargetMarker(position: Vector3): void {
        // Create a temporary marker at click position
        const marker = MeshBuilder.CreateSphere('targetMarker', {
            diameter: 0.3
        }, this.scene);
        
        marker.position.copyFrom(position);
        marker.material = new StandardMaterial('markerMat', this.scene);
        (marker.material as StandardMaterial).emissiveColor = new Color3(0, 1, 0);
        
        // Fade out and remove
        setTimeout(() => marker.dispose(), 1000);
    }
    
    @ClientOnly
    private updateHealthVisual(health: number): void {
        if (!this.playerMesh) return;
        
        const material = this.playerMesh.material as StandardMaterial;
        if (material) {
            // Lerp to red as health decreases
            const healthPercent = health / 100;
            material.emissiveColor = new Color3(
                1 - healthPercent, // More red as health decreases
                healthPercent * 0.2, // Less green
                0
            );
        }
    }
    
    // ============================================================
    // SERVER: Validation and authority
    // ============================================================
    
    @ServerOnly
    protected setupServerBehaviors(): void {
        // Initialize validation data
        this.lastValidatedPosition = this.getVectorProperty('position')?.getValue();
        this.validationChecksum = this.generateChecksum();
        
        console.log(`🔒 Player ${this.getNetworkId()} server validation enabled`);
    }
    
    @ServerOnly
    @EveryTick('gameLogic')
    private validateMovement(): void {
        const currentPos = this.getVectorProperty('position')?.getValue();
        if (!currentPos || !this.lastValidatedPosition) return;
        
        // Check for impossible movement
        const distance = Vector3.Distance(currentPos, this.lastValidatedPosition);
        const maxDistance = 10; // Max units per gameLogic tick
        
        if (distance > maxDistance) {
            console.warn(`⚠️ Player ${this.getNetworkId()} moved too fast: ${distance.toFixed(2)} units`);
            // Revert position
            this.getVectorProperty('position')?.set(this.lastValidatedPosition, 'validation_revert');
        } else {
            this.lastValidatedPosition = currentPos.clone();
        }
    }
    
    @ServerOnly
    private generateChecksum(): string {
        // Generate anti-cheat checksum
        return `chk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    @ServerOnly
    public getValidationData(): { checksum: string; lastValid: Vector3 | undefined } {
        return {
            checksum: this.validationChecksum || '',
            lastValid: this.lastValidatedPosition
        };
    }
    
    // ============================================================
    // SHARED: Helper methods
    // ============================================================
    
    private onDeath(): void {
        // Shared death logic
        if (this.playerMesh) {
            // Visual: fall over
            this.playerMesh.rotation.z = Math.PI / 2;
        }
    }
    
    private onRespawn(): void {
        // Shared respawn logic
        this.getNumericProperty('health')?.set(100, 'respawn');
        this.getVectorProperty('position')?.set(Vector3.Zero(), 'respawn');
        
        if (this.playerMesh) {
            this.playerMesh.rotation.z = 0;
        }
    }
    
    private formatVector(v: Vector3): string {
        return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
    }
    
    // ============================================================
    // LIFECYCLE
    // ============================================================
    
    dispose(): void {
        if (this.playerMesh && !this.playerMesh.isDisposed()) {
            this.playerMesh.dispose();
        }
        
        super.dispose();
    }
}