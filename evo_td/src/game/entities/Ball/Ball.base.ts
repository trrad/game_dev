// src/game/entities/Ball/Ball.base.ts

import { ExtendableEntity } from '../../../engine/core/ExtendableEntity';
import { Vector3, StandardMaterial, Color3, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { EntitySchema } from '../../../engine/networking/NetworkTypes';
import { BALL_SCHEMA } from './Ball.schema';

/**
 * BaseBall - Shared game logic for Ball entities
 * 
 * Contains all the reactive behaviors that work identically on client and server.
 * Visual differences are handled by client/server extensions.
 */
export abstract class Ball extends ExtendableEntity {
    // Material is typed for better IDE support
    public material: StandardMaterial | null = null;

    /**
     * Return the Ball schema
     */
    protected getSchema(): EntitySchema {
        return BALL_SCHEMA;
    }

    /**
     * Set up shared reactive behaviors
     * These work the same on both client and server
     */
    protected setupSharedBehaviors(): void {
        // ✅ SHARED: Position changes update mesh
        this.observePosition();

        // ✅ SHARED: Color state changes update visual
        this.observeProperty<number>('colorState', 
            (newState, oldState, source) => {
                this.updateColor();
            }, 
            true // Log changes
        );

        // ✅ SHARED: Hover state changes update visual
        this.observeProperty<boolean>('isHovered',
            (isHovered, wasHovered, source) => {
                this.updateColor();
            },
            true // Log changes
        );

        // ✅ SHARED: Target position changes trigger movement
        const targetPosition = this.getVectorProperty('targetPosition');
        targetPosition?.onChange((event) => {
            this.getBooleanProperty('isMoving')?.setTrue('movement_start');
            console.log(`🎯 ${this.getExtensionType()} target: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        });

        // NOTE: Movement update is NOT set up here anymore
        // It will be called by the game loop (client render loop or server tick)
    }

    /**
     * Update game logic - called by game loop
     * This is the main update method for all game logic that needs to run every frame/tick
     * 
     * @param deltaTime - Time since last update in seconds
     */
    public updateGameLogic(deltaTime: number): void {

        // ADD ENTRY LOGGING
        console.log(`🎮 BaseBall.updateGameLogic called with deltaTime: ${deltaTime}`);
        console.log(`  Entity: ${this.getNetworkId()}, Type: ${this.getExtensionType()}`);

        // Update movement - this is the core game logic
        this.updateMovement(deltaTime);
        
        // Future: Add other game logic updates here
        console.log(`  Movement update completed`);
    }

    /**
     * Movement interpolation logic
     * Core game logic that runs on both client and server
     * 
     * @param deltaTime - Time since last update in seconds
     */
    private updateMovement(deltaTime: number): void {
        const isMoving = this.getBooleanProperty('isMoving');
        const position = this.getVectorProperty('position');
        const targetPosition = this.getVectorProperty('targetPosition');
        const moveSpeed = this.getNumericProperty('moveSpeed');

        // Add this helper function to BaseBall if it doesn't exist
        function formatVector(v: Vector3): string {
            return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
        }                

        console.log(`🔍 updateMovement called: deltaTime=${deltaTime}`);
        console.log(`  isMoving: ${isMoving?.getValue()}`);
        console.log(`  hasPosition: ${!!position}`);
        console.log(`  hasTargetPosition: ${!!targetPosition}`);
        console.log(`  moveSpeed: ${moveSpeed?.getValue()}`);

        if (!isMoving?.isTrue() || !position || !targetPosition || !moveSpeed) return;

        const currentPos = position.getValue();
        const targetPos = targetPosition.getValue();
        const speed = moveSpeed.getValue();

        console.log(`  currentPos: ${formatVector(currentPos)}`);
        console.log(`  targetPos: ${formatVector(targetPos)}`);
        console.log(`  speed: ${speed}`);

        const direction = targetPos.subtract(currentPos);
        const distance = direction.length();

        console.log(`  direction: ${formatVector(direction)}`);
        console.log(`  distance: ${distance}`);

        if (distance < 0.1) {
            // Reached target
            isMoving.setFalse('movement_complete');
            position.set(targetPos, 'movement_complete');
            console.log(`🏁 ${this.getExtensionType()} reached target`);
        } else {
            // Move towards target
            const movement = direction.normalize().scale(speed * deltaTime);
            const newPos = currentPos.add(movement);
            
            console.log(`  movement: ${formatVector(movement)}`);
            console.log(`  newPos: ${formatVector(newPos)}`);
            
            position.set(newPos, 'movement_interpolation');
            console.log(`  position.set() called`);
        }
    }
    /**
     * Set up mesh action handlers
     * Called by extensions after creating their mesh
     */
    protected setupMeshActions(): void {
        if (!this.mesh || !this.scene) return;

        this.mesh.actionManager = new ActionManager(this.scene);
        
        // Click to cycle colors
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnLeftPickTrigger,
            () => this.handleColorCycleClick()
        ));
        
        // Hover effects
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOverTrigger,
            () => this.handleHoverEnter()
        ));
        
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOutTrigger,
            () => this.handleHoverExit()
        ));
    }

    /**
     * Handle color cycle click
     * Updates color state through reactive property
     */
    private handleColorCycleClick(): void {
        const colorState = this.getNumericProperty('colorState');
        if (!colorState) return;
        
        const currentState = colorState.getValue() || 0;
        const newState = (currentState + 1) % 3;
        
        // Natural sync handles authority automatically
        colorState.set(newState, `click_color_${this.getExtensionType()}`);
        console.log(`🎨 ${this.getExtensionType()} color clicked: ${currentState} → ${newState}`);
    }

    /**
     * Handle mouse hover enter
     */
    private handleHoverEnter(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setTrue(`hover_enter_${this.getExtensionType()}`);
        }
    }

    /**
     * Handle mouse hover exit
     */
    private handleHoverExit(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setFalse(`hover_exit_${this.getExtensionType()}`);
        }
    }

    /**
     * Update material color based on state
     * Extensions can override for custom color schemes
     */
    protected updateColor(): void {
        if (!this.material) return;

        const colorState = this.getNumericProperty('colorState')?.getValue() || 0;
        const isHovered = this.getBooleanProperty('isHovered')?.isTrue() || false;

        const baseColor = this.getColorForState(colorState);
        
        if (isHovered) {
            // Brighten on hover
            this.material.diffuseColor = baseColor.add(new Color3(0.3, 0.3, 0.3));
        } else {
            this.material.diffuseColor = baseColor;
        }
        
        this.material.emissiveColor = this.material.diffuseColor.scale(0.3);
        this.material.markDirty();
    }

    /**
     * Get color for a given state
     * Override in extensions for different color schemes
     */
    protected abstract getColorForState(state: number): Color3;


    // ============================================================
    // PUBLIC API
    // ============================================================

    /**
     * Move the ball to a target position
     */
    public moveTo(target: Vector3, source: string): void {
        this.getVectorProperty('targetPosition')?.set(target, source);
    }

    /**
     * Cycle through color states
     */
    public cycleColor(source: string): void {
        const colorState = this.getNumericProperty('colorState');
        const currentState = colorState?.getValue() || 0;
        const newState = (currentState + 1) % 3;
        colorState?.set(newState, source);
    }

    /**
     * Get current position
     */
    public getPosition(): Vector3 {
        return this.getVectorProperty('position')?.getValue() || Vector3.Zero();
    }

    /**
     * Check if entity is currently moving
     */
    public isMoving(): boolean {
        return this.getBooleanProperty('isMoving')?.isTrue() || false;
    }
}