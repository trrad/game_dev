// src/engine/core/DecoratedEntity.ts

import { ExtendableEntity } from './ExtendableEntity';
import { getDecoratorMetadata } from './ReactiveDecorators';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole } from '../networking/NetworkTypes';
import { TickFrequencyConfig } from './TickFrequency';

/**
 * DecoratedEntity - Base class that automatically wires up decorator metadata
 * 
 * Handles:
 * - @OnPropertyChange automatic observer registration
 * - @EveryTick automatic tick handler registration
 * - @ClientOnly/@ServerOnly method availability
 * 
 * @example
 * ```typescript
 * @Entity('player')
 * export class PlayerEntity extends DecoratedEntity {
 *     @OnPropertyChange('health')
 *     onHealthChanged(newValue: number, oldValue: number): void {
 *         console.log(`Health: ${oldValue} -> ${newValue}`);
 *     }
 *     
 *     @EveryTick('gameLogic')
 *     update(deltaTime: number): void {
 *         // Called automatically at gameLogic frequency
 *     }
 * }
 * ```
 */
export abstract class DecoratedEntity extends ExtendableEntity {
    private propertyObserverCleanup: (() => void)[] = [];
    private registeredTickFrequencies: Set<keyof TickFrequencyConfig> = new Set();
    
    constructor(
        entityType: string,
        networkId: string,
        scene: Scene | null,
        role: NetworkRole,
        initialPosition?: Vector3
    ) {
        super(entityType, networkId, scene, role, initialPosition);
        
        // Wire up decorators after construction
        this.registerDecoratedMethods();
        
        console.log(`🎭 ${this.getExtensionType()} DecoratedEntity created: ${networkId}`);
    }

    /**
     * Automatically register methods decorated with @OnPropertyChange and @EveryTick
     */
    private registerDecoratedMethods(): void {
        const metadata = getDecoratorMetadata(this);
        if (!metadata) {
            console.log(`No decorator metadata found for ${this.type}`);
            return;
        }
        
        // Register property observers
        this.registerPropertyObservers(metadata);
        
        // Register tick handlers
        this.registerTickHandlers(metadata);
        
        console.log(`🎯 Registered decorators for ${this.getNetworkId()}:`, {
            propertyObservers: metadata.propertyObservers.size,
            tickHandlers: metadata.tickHandlers.size
        });
    }

    /**
     * Wire up @OnPropertyChange decorators
     */
    private registerPropertyObservers(metadata: any): void {
        metadata.propertyObservers.forEach((methodNames: string[], propertyName: string) => {
            const property = this.getProperty(propertyName);
            
            if (!property) {
                console.warn(`Property '${propertyName}' not found for @OnPropertyChange on ${this.type}`);
                return;
            }
            
            methodNames.forEach(methodName => {
                const method = (this as any)[methodName];
                if (typeof method !== 'function') {
                    console.warn(`Method '${methodName}' not found for @OnPropertyChange on ${this.type}`);
                    return;
                }
                
                // Register the observer
                const cleanup = property.onChange((event) => {
                    // Call the decorated method with old and new values
                    method.call(this, event.to, event.from, event.source);
                });
                
                this.propertyObserverCleanup.push(() => cleanup.remove());
                
                console.log(`📡 Wired @OnPropertyChange('${propertyName}') to ${methodName}`);
            });
        });
    }

    /**
     * Wire up @EveryTick decorators
     */
    private registerTickHandlers(metadata: any): void {
        metadata.tickHandlers.forEach((methodNames: string[], frequency: string) => {
            // Store which frequencies this entity needs
            this.registeredTickFrequencies.add(frequency as keyof TickFrequencyConfig);
            
            methodNames.forEach(methodName => {
                const method = (this as any)[methodName];
                if (typeof method !== 'function') {
                    console.warn(`Method '${methodName}' not found for @EveryTick on ${this.type}`);
                    return;
                }
                
                // Store the frequency on the method for later execution
                method._tickFrequency = frequency;
                
                console.log(`⏰ Registered @EveryTick('${frequency}') for ${methodName}`);
            });
        });
    }

    /**
     * Get all tick frequencies this entity is registered for
     */
    public getTickFrequencies(): Set<keyof TickFrequencyConfig> {
        return this.registeredTickFrequencies;
    }

    /**
     * Run all tick handlers for a specific frequency
     * Called by GameWorld during its update cycle
     */
    public runTickHandlers(frequency: keyof TickFrequencyConfig, deltaTime: number): void {
        const metadata = getDecoratorMetadata(this);
        if (!metadata) return;
        
        const handlers = metadata.tickHandlers.get(frequency);
        if (!handlers) return;
        
        handlers.forEach(methodName => {
            const method = (this as any)[methodName];
            if (typeof method === 'function') {
                method.call(this, deltaTime);
            }
        });
    }

    /**
     * Override updateGameLogic to use decorated tick handlers
     */
    public updateGameLogic(deltaTime: number): void {
        // Run any @EveryTick('gameLogic') handlers
        this.runTickHandlers('gameLogic', deltaTime);
        
        // Still call parent for backwards compatibility
        super.updateGameLogic(deltaTime);
    }

    /**
     * Check if this entity has a tick handler for a specific frequency
     */
    public hasTickHandler(frequency: keyof TickFrequencyConfig): boolean {
        return this.registeredTickFrequencies.has(frequency);
    }

    /**
     * Debug utility to inspect decorated methods
     */
    public debugDecorators(): void {
        const metadata = getDecoratorMetadata(this);
        if (!metadata) {
            console.log(`No decorator metadata for ${this.type}`);
            return;
        }
        
        console.log(`🎭 Decorators on ${this.type} (${this.getNetworkId()}):`);
        
        // Property observers
        metadata.propertyObservers.forEach((methods, property) => {
            console.log(`  @OnPropertyChange('${property}'): ${methods.join(', ')}`);
        });
        
        // Tick handlers
        metadata.tickHandlers.forEach((methods, frequency) => {
            console.log(`  @EveryTick('${frequency}'): ${methods.join(', ')}`);
        });
        
        // Client/Server only
        if (metadata.clientOnlyMethods.size > 0) {
            console.log(`  @ClientOnly: ${Array.from(metadata.clientOnlyMethods).join(', ')}`);
        }
        if (metadata.serverOnlyMethods.size > 0) {
            console.log(`  @ServerOnly: ${Array.from(metadata.serverOnlyMethods).join(', ')}`);
        }
    }

    /**
     * Clean up decorator-registered observers
     */
    dispose(): void {
        // Clean up property observers
        this.propertyObserverCleanup.forEach(cleanup => cleanup());
        this.propertyObserverCleanup = [];
        
        // Clear registered frequencies
        this.registeredTickFrequencies.clear();
        
        super.dispose();
        
        console.log(`🧹 DecoratedEntity disposed: ${this.getNetworkId()}`);
    }
}