// src/engine/core/ReactiveDecorators.ts

import { TickFrequencyConfig } from './TickFrequency';

/**
 * Metadata storage for decorated methods and properties
 */
const DECORATOR_METADATA = new WeakMap<any, DecoratorMetadata>();

interface DecoratorMetadata {
    propertyObservers: Map<string, string[]>; // propertyName -> [methodNames]
    tickHandlers: Map<string, string[]>; // frequency -> [methodNames]
    clientOnlyMethods: Set<string>;
    serverOnlyMethods: Set<string>;
}

function getMetadata(target: any): DecoratorMetadata {
    if (!DECORATOR_METADATA.has(target)) {
        DECORATOR_METADATA.set(target, {
            propertyObservers: new Map(),
            tickHandlers: new Map(),
            clientOnlyMethods: new Set(),
            serverOnlyMethods: new Set()
        });
    }
    return DECORATOR_METADATA.get(target)!;
}

/**
 * Decorator to observe reactive property changes
 * 
 * @example
 * ```typescript
 * @OnPropertyChange('health')
 * handleHealthChange(newValue: number, oldValue: number): void {
 *     console.log(`Health changed from ${oldValue} to ${newValue}`);
 * }
 * ```
 */
export function OnPropertyChange(propertyName: string) {
    return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
        const metadata = getMetadata(target);
        
        if (!metadata.propertyObservers.has(propertyName)) {
            metadata.propertyObservers.set(propertyName, []);
        }
        
        metadata.propertyObservers.get(propertyName)!.push(methodName);
        
        // Mark the method so DecoratedEntity can find it
        descriptor.value._isPropertyObserver = true;
        descriptor.value._observedProperty = propertyName;
        
        return descriptor;
    };
}

/**
 * Decorator to register methods for specific tick frequencies
 * 
 * @example
 * ```typescript
 * @EveryTick('gameLogic')
 * update(deltaTime: number): void {
 *     // Called at gameLogic frequency (20Hz by default)
 * }
 * ```
 */
export function EveryTick(frequency: keyof TickFrequencyConfig) {
    return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
        const metadata = getMetadata(target);
        
        if (!metadata.tickHandlers.has(frequency)) {
            metadata.tickHandlers.set(frequency, []);
        }
        
        metadata.tickHandlers.get(frequency)!.push(methodName);
        
        // Mark the method so DecoratedEntity can find it
        descriptor.value._isTickHandler = true;
        descriptor.value._tickFrequency = frequency;
        
        return descriptor;
    };
}

/**
 * Decorator to mark methods as client-only
 * These methods will be stripped from server builds
 * 
 * @example
 * ```typescript
 * @ClientOnly
 * setupInputHandling(): void {
 *     // This method only exists in client builds
 * }
 * ```
 */
export function ClientOnly(target: any, key: string, descriptor?: PropertyDescriptor): any {
    // For webpack DefinePlugin and dead code elimination
    if (process.env.BUILD_TARGET === 'server') {
        // In server builds, replace the method with a no-op
        if (descriptor) {
            descriptor.value = function() {};
        }
        return descriptor;
    }
    
    // In client builds, mark the method
    const metadata = getMetadata(target);
    metadata.clientOnlyMethods.add(key);
    
    if (descriptor) {
        descriptor.value._isClientOnly = true;
    }
    
    return descriptor;
}

/**
 * Decorator to mark methods as server-only
 * These methods will be stripped from client builds
 * 
 * @example
 * ```typescript
 * @ServerOnly
 * validateMovement(position: Vector3): boolean {
 *     // Server-side validation logic
 * }
 * ```
 */
export function ServerOnly(target: any, key: string, descriptor?: PropertyDescriptor): any {
    // For webpack DefinePlugin and dead code elimination
    if (process.env.BUILD_TARGET === 'client') {
        // In client builds, replace the method with a no-op
        if (descriptor) {
            descriptor.value = function() {};
        }
        return descriptor;
    }
    
    // In server builds, mark the method
    const metadata = getMetadata(target);
    metadata.serverOnlyMethods.add(key);
    
    if (descriptor) {
        descriptor.value._isServerOnly = true;
    }
    
    return descriptor;
}

/**
 * Decorator to mark an entity class for registration
 * 
 * @example
 * ```typescript
 * @Entity('player')
 * export class PlayerEntity extends DecoratedEntity {
 *     // ...
 * }
 * ```
 */
export function Entity(entityType: string) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        // Store entity type on the constructor
        (constructor as any)._entityType = entityType;
        
        // Auto-register with EntityFactory if available
        if ((globalThis as any).EntityFactory) {
            const factory = (globalThis as any).EntityFactory;
            
            // Register the base class for both client and server
            // The decorators will handle stripping methods appropriately
            factory.registerEntity(entityType, constructor, constructor);
            
            console.log(`🏭 @Entity: Auto-registered '${entityType}'`);
        }
        
        return constructor;
    };
}

/**
 * Utility to get all decorator metadata for a class instance
 */
export function getDecoratorMetadata(instance: any): DecoratorMetadata | undefined {
    const prototype = Object.getPrototypeOf(instance);
    return DECORATOR_METADATA.get(prototype);
}

/**
 * Utility to check if a method has a specific decorator
 */
export function hasDecorator(instance: any, methodName: string, decoratorType: 'client' | 'server' | 'tick' | 'property'): boolean {
    const metadata = getDecoratorMetadata(instance);
    if (!metadata) return false;
    
    switch (decoratorType) {
        case 'client':
            return metadata.clientOnlyMethods.has(methodName);
        case 'server':
            return metadata.serverOnlyMethods.has(methodName);
        case 'tick':
            return Array.from(metadata.tickHandlers.values()).some(methods => methods.includes(methodName));
        case 'property':
            return Array.from(metadata.propertyObservers.values()).some(methods => methods.includes(methodName));
        default:
            return false;
    }
}

/**
 * Debug utility to log all decorators on an instance
 */
export function debugDecorators(instance: any): void {
    const metadata = getDecoratorMetadata(instance);
    if (!metadata) {
        console.log('No decorator metadata found');
        return;
    }
    
    console.log('🎭 Decorator Metadata:');
    console.log('  Property Observers:', Array.from(metadata.propertyObservers.entries()));
    console.log('  Tick Handlers:', Array.from(metadata.tickHandlers.entries()));
    console.log('  Client-Only Methods:', Array.from(metadata.clientOnlyMethods));
    console.log('  Server-Only Methods:', Array.from(metadata.serverOnlyMethods));
}

// Global registration helper for entity auto-registration
declare global {
    var EntityFactory: any;
}