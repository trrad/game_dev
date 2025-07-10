// src/engine/core/ExtendableEntity.ts - Extracted from your BaseBall pattern

import { NetworkReactiveEntity } from '../networking/NetworkReactiveEntity';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole, EntitySchema } from '../networking/NetworkTypes';

/**
 * ExtendableEntity - Base class for entities with client/server extensions
 * 
 * Extracted from your excellent BaseBall pattern in ecs-app.ts
 * Provides the extension pattern for all game entities
 * 
 * @example
 * ```typescript
 * // Base class with shared logic
 * abstract class BaseTrain extends ExtendableEntity {
 *     protected setupSharedBehaviors() {
 *         // Movement, cargo, etc.
 *     }
 * }
 * 
 * // Client extension with rendering
 * class ClientTrain extends BaseTrain {
 *     protected getExtensionType() { return 'CLIENT'; }
 *     protected createVisual() { // 3D model }
 * }
 * 
 * // Server extension with validation
 * class ServerTrain extends BaseTrain {
 *     protected getExtensionType() { return 'SERVER'; }
 *     protected validateMovement() { // Anti-cheat }
 * }
 * ```
 */
export abstract class ExtendableEntity extends NetworkReactiveEntity {
    // Visual/mesh components (may be null on server)
    public mesh: any;
    public material: any;
    protected scene: Scene | null;

    constructor(
        entityType: string,
        networkId: string,
        scene: Scene | null,
        role: NetworkRole,
        initialPosition?: Vector3
    ) {
        super(entityType, networkId, scene, role);
        
        this.scene = scene;
        
        // ✅ Create properties from entity's schema
        this.createPropertiesFromSchema(this.getSchema());
        
        // ✅ Set up visuals (if applicable)
        if (this.shouldCreateVisual()) {
            this.createVisual();
        }
        
        // ✅ Set up shared game logic
        this.setupSharedBehaviors();
        
        // ✅ Set up role-specific behaviors (client vs server)
        this.setupRoleSpecificBehaviors();
        
        // ✅ Apply initial position if provided
        if (initialPosition) {
            this.getVectorProperty('position')?.set(initialPosition, 'initial_setup');
            
            // Also set target position to avoid immediate movement
            const targetProp = this.getVectorProperty('targetPosition');
            if (targetProp) {
                targetProp.set(initialPosition, 'initial_setup');
            }
        }
        
        console.log(`🎮 ${this.getExtensionType()} ${entityType} created: ${networkId}`);
    }

    // ============================================================
    // ABSTRACT METHODS - Must be implemented by entity classes
    // ============================================================

    /**
     * Get the entity's schema definition
     */
    protected abstract getSchema(): EntitySchema;

    /**
     * Set up shared behaviors that work the same on client and server
     * This is where your core game logic goes
     */
    protected abstract setupSharedBehaviors(): void;

    /**
     * Get the extension type for debugging and logging
     */
    protected abstract getExtensionType(): 'CLIENT' | 'SERVER';

    // ============================================================
    // VIRTUAL METHODS - Can be overridden for customization
    // ============================================================

    /**
     * Create visual representation (mesh, materials, etc.)
     * Override in client/server extensions as needed
     */
    protected createVisual(): void {
        // Default: no visual
        // Client extensions will create meshes
        // Server extensions might create debug visuals
    }

    /**
     * Determine if this entity should create visuals
     * Can be overridden to disable visuals even on client
     */
    protected shouldCreateVisual(): boolean {
        // By default, create visuals if we have a scene
        return this.scene !== null;
    }

    /**
     * Update visual representation based on state changes
     * Called by reactive property observers
     */
    protected updateVisual(): void {
        // Override in extensions that have visuals
    }

    // ============================================================
    // EXTENSION SYSTEM - Role-specific behavior setup
    // ============================================================

    /**
     * Set up role-specific behaviors based on extension type
     * Automatically called during construction
     */
    protected setupRoleSpecificBehaviors(): void {
        if (this.getRole().isServer) {
            this.setupServerBehaviors();
        }
        if (this.getRole().isClient) {
            this.setupClientBehaviors();
        }
        if (this.getRole().ownedByThisClient) {
            this.setupInputHandling();
        }
    }

    /**
     * Override NetworkReactiveEntity's setupBehaviors to use our extension system
     */
    protected setupBehaviors(): void {
        // This is called by NetworkReactiveEntity constructor
        // We handle setup in setupSharedBehaviors and setupRoleSpecificBehaviors
    }

    /**
     * Server-specific setup (validation, AI, etc.)
     * Override in server extensions
     */
    protected setupServerBehaviors(): void {
        // Default: no server-specific behavior
        console.log(`🖥️ ${this.getExtensionType()} server behaviors ready for ${this.getNetworkId()}`);
    }

    /**
     * Client-specific setup (rendering, audio, etc.)
     * Override in client extensions
     */
    protected setupClientBehaviors(): void {
        // Default: no client-specific behavior
        console.log(`💻 ${this.getExtensionType()} client behaviors ready for ${this.getNetworkId()}`);
    }

    /**
     * Input handling for entities owned by this client
     * Override to add input controls
     */
    protected setupInputHandling(): void {
        // Default: no input handling
        if (this.getRole().ownedByThisClient) {
            console.log(`🎮 ${this.getExtensionType()} input handling ready for ${this.getNetworkId()}`);
        }
    }

    // ============================================================
    // COMMON REACTIVE PATTERNS - Frequently used state observers
    // ============================================================

    /**
     * Set up position change observer with visual update
     */
    protected observePosition(
        callback?: (newPos: Vector3, oldPos: Vector3, source: string) => void
    ): void {
        const position = this.getVectorProperty('position');
        position?.onChange((event) => {
            // Update mesh position if we have one
            if (this.mesh) {
                this.mesh.position.copyFrom(event.to);
            }
            
            // Call custom callback if provided
            if (callback) {
                callback(event.to, event.from, event.source);
            }
            
            // Log significant position changes
            if (event.from.subtract(event.to).length() > 0.1) {
                console.log(`📍 ${this.getExtensionType()} moved to (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
            }
        });
    }

    /**
     * Set up generic property observer with logging
     */
    protected observeProperty<T>(
        propertyName: string,
        callback: (newValue: T, oldValue: T, source: string) => void,
        logChanges: boolean = false
    ): void {
        const property = this.getProperty<T>(propertyName);
        property?.onChange((event) => {
            callback(event.to, event.from, event.source);
            
            if (logChanges) {
                console.log(`🔄 ${this.getExtensionType()} ${propertyName}: ${event.from} → ${event.to} [${event.source}]`);
            }
        });
    }

    // ============================================================
    // LIFECYCLE
    // ============================================================

    dispose(): void {
        // Clean up mesh if we have one
        if (this.mesh && !this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
        
        // Clean up material if we have one
        if (this.material && !this.material.isDisposed()) {
            this.material.dispose();
        }
        
        super.dispose();
        
        console.log(`🧹 ${this.getExtensionType()} ${this.type} disposed: ${this.getNetworkId()}`);
    }
}