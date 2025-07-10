// src/engine/core/EntityFactory.ts - Extracted from your BallFactory pattern

import { ExtendableEntity } from './ExtendableEntity';
import { Scene, Vector3 } from '@babylonjs/core';
import { NetworkRole } from '../networking/NetworkTypes';

/**
 * EntityFactory - Creates appropriate entity extensions based on role
 * 
 * Extracted from your BallFactory pattern in ecs-app.ts
 * In production builds, this will be compile-time resolved:
 * - CLIENT BUNDLE: Only includes client constructors
 * - SERVER BUNDLE: Only includes server constructors
 * 
 * @example
 * ```typescript
 * // Register entity types
 * EntityFactory.registerEntity('train', ClientTrain, ServerTrain);
 * EntityFactory.registerEntity('station', ClientStation, ServerStation);
 * 
 * // Create entity based on role
 * const entity = EntityFactory.create(
 *     'train',
 *     'train_1',
 *     scene,
 *     clientRole,
 *     startPosition
 * );
 * ```
 */
export class EntityFactory {
    // Separate registries for client and server constructors
    private static clientConstructors = new Map<string, new (...args: any[]) => ExtendableEntity>();
    private static serverConstructors = new Map<string, new (...args: any[]) => ExtendableEntity>();
    
    // Track registered types for debugging
    private static registeredTypes = new Set<string>();

    /**
     * Register an entity type with its client and server constructors
     * 
     * @param entityType - The entity type identifier (e.g., 'train', 'station')
     * @param clientClass - The client extension class
     * @param serverClass - The server extension class
     */
    static registerEntity(
        entityType: string,
        clientClass: new (...args: any[]) => ExtendableEntity,
        serverClass: new (...args: any[]) => ExtendableEntity
    ): void {
        this.clientConstructors.set(entityType, clientClass);
        this.serverConstructors.set(entityType, serverClass);
        this.registeredTypes.add(entityType);
        
        console.log(`🏭 EntityFactory: Registered '${entityType}' with client and server extensions`);
    }

    /**
     * Create an entity instance based on role
     * 
     * @param entityType - The entity type to create
     * @param networkId - Unique network identifier
     * @param scene - Babylon scene (can be null for server)
     * @param role - Network role determining which extension to use
     * @param args - Additional constructor arguments
     * @returns The created entity instance
     */
    static create(
        entityType: string,
        networkId: string,
        scene: Scene | null,
        role: NetworkRole,
        ...args: any[]
    ): ExtendableEntity {
        // Select appropriate constructor based on role
        const ConstructorClass = role.isClient 
            ? this.clientConstructors.get(entityType)
            : this.serverConstructors.get(entityType);
            
        if (!ConstructorClass) {
            throw new Error(
                `EntityFactory: No constructor found for '${entityType}' with role ${role.isClient ? 'CLIENT' : 'SERVER'}. ` +
                `Registered types: ${Array.from(this.registeredTypes).join(', ')}`
            );
        }
        
        // Create the entity instance
        const entity = new ConstructorClass(networkId, scene, role, ...args);
        
        console.log(
            `🏗️ EntityFactory: Created ${role.isClient ? 'CLIENT' : 'SERVER'} '${entityType}' ` +
            `with id '${networkId}'`
        );
        
        return entity;
    }

    /**
     * Create multiple entities at once
     * Useful for batch creation during level loading
     */
    static createBatch(
        configs: Array<{
            entityType: string;
            networkId: string;
            position?: Vector3;
            additionalArgs?: any[];
        }>,
        scene: Scene | null,
        role: NetworkRole
    ): ExtendableEntity[] {
        console.log(`🏭 EntityFactory: Creating batch of ${configs.length} entities...`);
        
        return configs.map(config => {
            const args = config.additionalArgs || [];
            if (config.position) {
                args.unshift(config.position);
            }
            
            return this.create(
                config.entityType,
                config.networkId,
                scene,
                role,
                ...args
            );
        });
    }

    /**
     * Check if an entity type is registered
     */
    static isRegistered(entityType: string): boolean {
        return this.registeredTypes.has(entityType);
    }

    /**
     * Get all registered entity types
     */
    static getRegisteredTypes(): string[] {
        return Array.from(this.registeredTypes);
    }

    /**
     * Clear all registrations (useful for testing)
     */
    static clearRegistrations(): void {
        this.clientConstructors.clear();
        this.serverConstructors.clear();
        this.registeredTypes.clear();
        
        console.log('🧹 EntityFactory: Cleared all registrations');
    }

    /**
     * Get debug information about the factory state
     */
    static getDebugInfo(): {
        registeredTypes: string[];
        clientConstructors: string[];
        serverConstructors: string[];
    } {
        return {
            registeredTypes: Array.from(this.registeredTypes),
            clientConstructors: Array.from(this.clientConstructors.keys()),
            serverConstructors: Array.from(this.serverConstructors.keys())
        };
    }
}

// ============================================================
// BUILD-TIME OPTIMIZATION NOTES
// ============================================================

/*
In the webpack build configuration, we'll use DefinePlugin and tree-shaking
to ensure that:

1. CLIENT BUILDS only include:
   - Client constructor registrations
   - Client extension classes
   - No server validation logic

2. SERVER BUILDS only include:
   - Server constructor registrations
   - Server extension classes
   - No rendering code

Example webpack config:
```javascript
// webpack.client.js
new webpack.DefinePlugin({
    'process.env.BUILD_TARGET': JSON.stringify('client')
}),
new webpack.optimize.ConditionalPlugin({
    'process.env.BUILD_TARGET === "server"': false
})

// This allows code like:
if (process.env.BUILD_TARGET !== 'server') {
    EntityFactory.registerEntity('train', ClientTrain, null);
}
```
*/