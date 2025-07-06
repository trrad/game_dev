// src/engine/scene/ObservableFactory.ts

import { Scene, Observable, Observer, Vector3 } from '@babylonjs/core';
import { GameNodeObject } from '../core/GameNodeObject';
import { NodeComponent } from '../components/NodeComponent';
import { RadiusComponent } from '../components/RadiusComponent';
import { 
    ReactiveProperty, 
    BooleanProperty, 
    NumericProperty, 
    CollectionProperty,
    ReactivePropertiesComponent
} from '../components/ReactivePropertyComponent';

export interface SpatialTracker {
    observable: Observable<any>;
    cleanup: () => void;
    isActive: boolean;
    trackerId: string;
}

export interface TrackerConfig {
    updateFrequency?: number; // Hz, default 30 for spatial calculations
    enabled?: boolean;
    debugMode?: boolean;
}

/**
 * ObservableFactory creates frame-based spatial tracking systems that automatically
 * update ReactiveProperty components. Focuses on spatial calculations and automatic
 * state synchronization rather than creating individual properties.
 * 
 * Responsibilities:
 * - Frame-based spatial calculations (distance, collision, proximity)
 * - Automatic ReactiveProperty updates based on spatial conditions
 * - Performance-optimized Observable usage for game loops
 * - Cleanup and memory management for spatial trackers
 */
export class ObservableFactory {
    private static activeTrackers: Map<string, SpatialTracker> = new Map();
    private static trackerIdCounter = 0;
    private static performanceMetrics = {
        frameCalculations: 0,
        trackerCount: 0,
        lastFrameTime: 0
    };

    /**
     * Create a distance tracker that automatically updates a BooleanProperty
     * when entities move within/out of range
     */
    static createDistanceTracker(
        source: GameNodeObject,
        target: GameNodeObject,
        threshold: number,
        scene: Scene,
        propertyName: string = 'near_target',
        config: TrackerConfig = {}
    ): SpatialTracker {
        const trackerId = `distance_${++this.trackerIdCounter}`;
        const finalConfig = { updateFrequency: 30, enabled: true, debugMode: false, ...config };
        
        // Get or create the reactive property on the source entity
        let property = this.getOrCreateBooleanProperty(source, propertyName, false);
        if (!property) {
            console.error(`Failed to create distance tracker: could not access property ${propertyName} on ${source.id}`);
            return this.createNullTracker(trackerId);
        }

        // Create observable for distance calculation results
        const observable = new Observable<{ 
            distance: number; 
            withinThreshold: boolean; 
            changed: boolean;
            sourceId: string;
            targetId: string;
        }>();
        
        // Frame-based distance calculation with performance optimization
        const updateInterval = 1000 / finalConfig.updateFrequency;
        let lastUpdateTime = 0;
        let lastDistance = Infinity;
        
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!finalConfig.enabled) return;
            
            const currentTime = performance.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            lastUpdateTime = currentTime;
            
            try {
                const sourceNode = source.getNodeComponent();
                const targetNode = target.getNodeComponent();
                
                if (sourceNode && targetNode) {
                    const distance = Vector3.Distance(
                        sourceNode.getWorldPosition(),
                        targetNode.getWorldPosition()
                    );
                    
                    // Only update if distance changed significantly (hysteresis)
                    const withinThreshold = distance <= threshold;
                    const changed = property.update(withinThreshold, `distance_check:${trackerId}`);
                    
                    // Update performance metrics
                    this.performanceMetrics.frameCalculations++;
                    
                    // Emit to observable with full context
                    observable.notifyObservers({ 
                        distance, 
                        withinThreshold, 
                        changed,
                        sourceId: source.id,
                        targetId: target.id
                    });
                    
                    if (finalConfig.debugMode && changed) {
                        console.log(`[${trackerId}] Distance ${source.id} -> ${target.id}: ${distance.toFixed(2)} (threshold: ${threshold})`);
                    }
                    
                    lastDistance = distance;
                }
            } catch (error) {
                console.error(`Error in distance tracker ${trackerId}:`, error);
            }
        });
        
        const spatialTracker: SpatialTracker = {
            observable,
            isActive: true,
            trackerId,
            cleanup: () => {
                spatialTracker.isActive = false;
                scene.onBeforeRenderObservable.remove(observer);
                observable.clear();
                this.activeTrackers.delete(trackerId);
                this.performanceMetrics.trackerCount--;
                
                if (finalConfig.debugMode) {
                    console.log(`[${trackerId}] Distance tracker cleaned up`);
                }
            }
        };
        
        this.activeTrackers.set(trackerId, spatialTracker);
        this.performanceMetrics.trackerCount++;
        return spatialTracker;
    }
    
    /**
     * Create collision tracker using RadiusComponent that updates a BooleanProperty
     */
    static createCollisionTracker(
        source: GameNodeObject,
        scene: Scene,
        propertyName: string = 'has_collision',
        config: TrackerConfig = {}
    ): SpatialTracker {
        const trackerId = `collision_${++this.trackerIdCounter}`;
        const finalConfig = { updateFrequency: 60, enabled: true, debugMode: false, ...config };
        
        const sourceRadius = source.getComponent<RadiusComponent>('radius');
        if (!sourceRadius) {
            console.warn(`Source entity ${source.id} must have RadiusComponent for collision tracking`);
            return this.createNullTracker(trackerId);
        }
        
        let property = this.getOrCreateBooleanProperty(source, propertyName, false);
        if (!property) {
            console.error(`Failed to create collision tracker: could not access property ${propertyName} on ${source.id}`);
            return this.createNullTracker(trackerId);
        }

        const observable = new Observable<{ 
            hasCollision: boolean; 
            collisionCount: number; 
            changed: boolean;
            collisions: RadiusComponent[];
        }>();
        
        const updateInterval = 1000 / finalConfig.updateFrequency;
        let lastUpdateTime = 0;
        
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!finalConfig.enabled) return;
            
            const currentTime = performance.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            lastUpdateTime = currentTime;
            
            try {
                const collisions = sourceRadius.findCollisions();
                const hasCollision = collisions.length > 0;
                
                // Update property and get change status
                const changed = property.update(hasCollision, `collision_check:${trackerId}`);
                
                // Update performance metrics
                this.performanceMetrics.frameCalculations++;
                
                // Emit to observable
                observable.notifyObservers({ 
                    hasCollision, 
                    collisionCount: collisions.length, 
                    changed,
                    collisions
                });
                
                if (finalConfig.debugMode && changed) {
                    console.log(`[${trackerId}] Collision ${source.id}: ${hasCollision} (${collisions.length} collisions)`);
                }
            } catch (error) {
                console.error(`Error in collision tracker ${trackerId}:`, error);
            }
        });
        
        const spatialTracker: SpatialTracker = {
            observable,
            isActive: true,
            trackerId,
            cleanup: () => {
                spatialTracker.isActive = false;
                scene.onBeforeRenderObservable.remove(observer);
                observable.clear();
                this.activeTrackers.delete(trackerId);
                this.performanceMetrics.trackerCount--;
            }
        };
        
        this.activeTrackers.set(trackerId, spatialTracker);
        this.performanceMetrics.trackerCount++;
        return spatialTracker;
    }
    
    /**
     * Create movement progress tracker that coordinates multiple ReactiveProperties
     */
    static createMovementProgressTracker(
        entity: GameNodeObject,
        pathPoints: Vector3[],
        scene: Scene,
        config: TrackerConfig = {}
    ): {
        updateProgress: (progress: number) => void;
        cleanup: () => void;
        progressObservable: Observable<{ progress: number; atDestination: boolean; changed: boolean }>;
    } {
        const finalConfig = { updateFrequency: 60, enabled: true, debugMode: false, ...config };
        
        // Get or create progress and destination properties
        const progressProperty = this.getOrCreateNumericProperty(entity, 'movement_progress', 0, 0, 1);
        const destinationProperty = this.getOrCreateBooleanProperty(entity, 'at_destination', false);
        
        if (!progressProperty || !destinationProperty) {
            console.error(`Failed to create movement trackers for ${entity.id}`);
            return {
                updateProgress: () => {},
                cleanup: () => {},
                progressObservable: new Observable()
            };
        }
        
        const progressObservable = new Observable<{ progress: number; atDestination: boolean; changed: boolean }>();
        
        // Monitor progress changes and automatically update destination property
        const progressObserver = progressProperty.onChange((event) => {
            const atDestination = event.to >= 1.0;
            const destinationChanged = destinationProperty.update(atDestination, 'progress_complete');
            
            // Emit combined state
            progressObservable.notifyObservers({ 
                progress: event.to, 
                atDestination,
                changed: event.changed || destinationChanged
            });
            
            if (finalConfig.debugMode && (event.changed || destinationChanged)) {
                console.log(`[movement] ${entity.id}: progress=${event.to.toFixed(3)}, atDestination=${atDestination}`);
            }
        });
        
        return {
            updateProgress: (progress: number) => {
                if (finalConfig.enabled) {
                    progressProperty.update(Math.max(0, Math.min(1, progress)), 'movement_system');
                }
            },
            cleanup: () => {
                progressObserver.remove();
                progressObservable.clear();
            },
            progressObservable
        };
    }
    
    /**
     * Create multi-target proximity tracker that updates multiple BooleanProperties
     */
    static createProximityTracker(
        source: GameNodeObject,
        targets: GameNodeObject[],
        ranges: { name: string; distance: number }[],
        scene: Scene,
        config: TrackerConfig = {}
    ): SpatialTracker {
        const trackerId = `proximity_${++this.trackerIdCounter}`;
        const finalConfig = { updateFrequency: 20, enabled: true, debugMode: false, ...config };
        
        // Create properties for each range
        const rangeProperties = new Map<string, BooleanProperty>();
        ranges.forEach(range => {
            const property = this.getOrCreateBooleanProperty(source, `proximity_${range.name}`, false);
            if (property) {
                rangeProperties.set(range.name, property);
            }
        });
        
        const observable = new Observable<{ 
            proximityStates: Map<string, boolean>; 
            closestTarget?: { id: string; distance: number };
            anyChanged: boolean;
        }>();
        
        const updateInterval = 1000 / finalConfig.updateFrequency;
        let lastUpdateTime = 0;
        
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!finalConfig.enabled) return;
            
            const currentTime = performance.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            lastUpdateTime = currentTime;
            
            try {
                const sourceNode = source.getNodeComponent();
                if (!sourceNode) return;
                
                const sourcePos = sourceNode.getWorldPosition();
                const proximityStates = new Map<string, boolean>();
                let closestTarget: { id: string; distance: number } | undefined;
                let minDistance = Infinity;
                
                // Check each target against all ranges
                targets.forEach(target => {
                    const targetNode = target.getNodeComponent();
                    if (!targetNode) return;
                    
                    const distance = Vector3.Distance(sourcePos, targetNode.getWorldPosition());
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestTarget = { id: target.id, distance };
                    }
                    
                    // Update range states
                    ranges.forEach(range => {
                        const withinRange = distance <= range.distance;
                        const currentState = proximityStates.get(range.name) || false;
                        proximityStates.set(range.name, currentState || withinRange);
                    });
                });
                
                // Update properties and track changes
                let anyChanged = false;
                proximityStates.forEach((withinRange, rangeName) => {
                    const property = rangeProperties.get(rangeName);
                    if (property) {
                        const changed = property.update(withinRange, `proximity_check:${trackerId}`);
                        anyChanged = anyChanged || changed;
                    }
                });
                
                // Update performance metrics
                this.performanceMetrics.frameCalculations++;
                
                // Emit to observable
                observable.notifyObservers({ proximityStates, closestTarget, anyChanged });
                
                if (finalConfig.debugMode && anyChanged) {
                    console.log(`[${trackerId}] Proximity ${source.id}: ${Array.from(proximityStates.entries())}`);
                }
            } catch (error) {
                console.error(`Error in proximity tracker ${trackerId}:`, error);
            }
        });
        
        const spatialTracker: SpatialTracker = {
            observable,
            isActive: true,
            trackerId,
            cleanup: () => {
                spatialTracker.isActive = false;
                scene.onBeforeRenderObservable.remove(observer);
                observable.clear();
                this.activeTrackers.delete(trackerId);
                this.performanceMetrics.trackerCount--;
            }
        };
        
        this.activeTrackers.set(trackerId, spatialTracker);
        this.performanceMetrics.trackerCount++;
        return spatialTracker;
    }
    
    // ============================================================
    // ReactivePropertiesComponent Integration Helpers
    // ============================================================
    
    /**
     * Get or create a BooleanProperty using ReactivePropertiesComponent
     */
    private static getOrCreateBooleanProperty(
        entity: GameNodeObject,
        name: string,
        defaultValue: boolean
    ): BooleanProperty | null {
        // Get or create the unified properties component
        let properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!properties) {
            properties = new ReactivePropertiesComponent();
            entity.addComponent(properties);
        }
        
        // Try to get existing boolean property
        let property = properties.getBooleanProperty(name);
        if (!property) {
            // Create new property and add to component
            property = new BooleanProperty(name, defaultValue);
            properties.addProperty(property);
        }
        
        return property;
    }
    
    /**
     * Get or create a NumericProperty using ReactivePropertiesComponent
     */
    private static getOrCreateNumericProperty(
        entity: GameNodeObject,
        name: string,
        defaultValue: number,
        min?: number,
        max?: number
    ): NumericProperty | null {
        // Get or create the unified properties component
        let properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!properties) {
            properties = new ReactivePropertiesComponent();
            entity.addComponent(properties);
        }
        
        // Try to get existing numeric property
        let property = properties.getNumericProperty(name);
        if (!property) {
            // Create new property and add to component
            property = new NumericProperty(name, defaultValue, min, max);
            properties.addProperty(property);
        }
        
        return property;
    }
    
    /**
     * Get any reactive property by name using ReactivePropertiesComponent
     */
    private static getReactiveProperty<T>(entity: GameNodeObject, name: string): ReactiveProperty<T> | null {
        const properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        return properties?.getProperty<T>(name) || null;
    }
    
    /**
     * Create a null tracker for error cases
     */
    private static createNullTracker(trackerId: string): SpatialTracker {
        return {
            observable: new Observable(),
            isActive: false,
            trackerId,
            cleanup: () => {}
        };
    }
    
    // ============================================================
    // Management and Utilities
    // ============================================================
    
    /**
     * Clean up all active trackers (for shutdown)
     */
    static cleanupAllTrackers(): void {
        const trackerIds = Array.from(this.activeTrackers.keys());
        trackerIds.forEach(id => {
            const tracker = this.activeTrackers.get(id);
            if (tracker) {
                tracker.cleanup();
            }
        });
        
        console.log(`Cleaned up ${trackerIds.length} spatial trackers`);
        this.performanceMetrics.trackerCount = 0;
    }
    
    /**
     * Get performance statistics about spatial tracking
     */
    static getPerformanceStats(): {
        activeTrackers: number;
        frameCalculations: number;
        averageCalculationsPerFrame: number;
        memoryUsage: number;
    } {
        const activeCount = Array.from(this.activeTrackers.values()).filter(t => t.isActive).length;
        return {
            activeTrackers: activeCount,
            frameCalculations: this.performanceMetrics.frameCalculations,
            averageCalculationsPerFrame: activeCount > 0 ? this.performanceMetrics.frameCalculations / 60 : 0, // Rough estimate
            memoryUsage: this.activeTrackers.size * 1024 // Rough estimate in bytes
        };
    }
    
    /**
     * Get detailed tracker information for debugging
     */
    static getTrackerStats(): { 
        active: number; 
        trackers: Array<{ id: string; isActive: boolean; type: string }> 
    } {
        const trackers = Array.from(this.activeTrackers.entries()).map(([id, tracker]) => ({
            id,
            isActive: tracker.isActive,
            type: id.split('_')[0] // Extract type from ID
        }));
        
        return {
            active: trackers.filter(t => t.isActive).length,
            trackers
        };
    }
    
    /**
     * Enable/disable all trackers for performance testing
     */
    static setGlobalTrackingEnabled(enabled: boolean): void {
        // This would require storing config references, but provides concept
        console.log(`Global tracking ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// ============================================================
// Advanced Observable Utilities (Based on Research)
// ============================================================

/**
 * Connect any Babylon.js Observable to a ReactiveProperty component
 */
export function connectObservableToReactiveProperty<T, S>(
    observable: Observable<T>,
    reactiveProperty: ReactiveProperty<S>,
    transform: (value: T) => S,
    source: string = 'observable_connection'
): Observer<T> {
    return observable.add((value: T) => {
        const transformedValue = transform(value);
        reactiveProperty.update(transformedValue, source);
    });
}

/**
 * Create a bi-directional sync between two ReactiveProperties
 */
export function syncReactiveProperties<T>(
    property1: ReactiveProperty<T>,
    property2: ReactiveProperty<T>,
    source1: string = 'sync_from_1',
    source2: string = 'sync_from_2'
): () => void {
    const observer1 = property1.onChange(event => {
        if (event.source !== source2) {
            property2.update(event.to, source1);
        }
    });
    
    const observer2 = property2.onChange(event => {
        if (event.source !== source1) {
            property1.update(event.to, source2);
        }
    });
    
    return () => {
        observer1.remove();
        observer2.remove();
    };
}

/**
 * Combine multiple ReactiveProperty observables into a single observable
 */
export function combineReactiveProperties<T extends Record<string, any>>(
    properties: { [K in keyof T]: ReactiveProperty<T[K]> },
    combineFunction?: (values: T) => any
): Observable<T | any> {
    const combined = new Observable<T | any>();
    const currentValues = {} as T;
    const observers: Observer<any>[] = [];
    
    // Subscribe to each property
    Object.entries(properties).forEach(([key, property]) => {
        currentValues[key as keyof T] = property.getValue();
        
        const observer = property.onChange(event => {
            currentValues[key as keyof T] = event.to;
            const result = combineFunction ? combineFunction(currentValues) : currentValues;
            combined.notifyObservers(result);
        });
        
        observers.push(observer);
    });
    
    // Add cleanup method
    (combined as any).cleanup = () => {
        observers.forEach(observer => observer.remove());
        combined.clear();
    };
    
    return combined;
}