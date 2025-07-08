// src/engine/scene/ObservableFactory.ts - Corrected (Keeping Future-Use Parameters)

import { Scene, Observable, Observer, Vector3 } from '@babylonjs/core';
import { GameNodeObject } from '../core/GameNodeObject';
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
 * update ReactiveProperty components. Uses your existing reactive properties for
 * all spatial data - no separate components needed.
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
        
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!finalConfig.enabled) return;
            
            const currentTime = performance.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            lastUpdateTime = currentTime;
            
            try {
                // Use your existing reactive position properties
                const sourcePos = source.worldPosition.getValue();
                const targetPos = target.worldPosition.getValue();
                
                const distance = Vector3.Distance(sourcePos, targetPos);
                const withinThreshold = distance <= threshold;
                
                // Update the reactive property (with loop prevention built in)
                const changed = property.set(withinThreshold, `distance_check:${trackerId}`);
                
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
     * Create collision tracker using entity radius reactive properties
     */
    static createCollisionTracker(
        source: GameNodeObject,
        targets: GameNodeObject[],
        scene: Scene,
        propertyName: string = 'has_collision',
        config: TrackerConfig = {}
    ): SpatialTracker {
        const trackerId = `collision_${++this.trackerIdCounter}`;
        const finalConfig = { updateFrequency: 60, enabled: true, debugMode: false, ...config };
        
        let property = this.getOrCreateBooleanProperty(source, propertyName, false);
        let collisionsProperty = this.getOrCreateCollectionProperty(source, 'current_collisions');
        
        if (!property || !collisionsProperty) {
            console.error(`Failed to create collision tracker for ${source.id}`);
            return this.createNullTracker(trackerId);
        }

        const observable = new Observable<{ 
            hasCollision: boolean; 
            collisionCount: number; 
            changed: boolean;
            collisions: string[];
        }>();
        
        const updateInterval = 1000 / finalConfig.updateFrequency;
        let lastUpdateTime = 0;
        
        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!finalConfig.enabled) return;
            
            const currentTime = performance.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            lastUpdateTime = currentTime;
            
            try {
                const sourcePos = source.worldPosition.getValue();
                const sourceRadius = this.getEntityRadius(source);
                const collisions: string[] = [];
                
                // Check collisions with targets using their reactive properties
                targets.forEach(target => {
                    if (target === source) return;
                    
                    const targetPos = target.worldPosition.getValue();
                    const targetRadius = this.getEntityRadius(target);
                    const distance = Vector3.Distance(sourcePos, targetPos);
                    
                    if (distance <= (sourceRadius + targetRadius)) {
                        collisions.push(target.id);
                    }
                });
                
                const hasCollision = collisions.length > 0;
                
                // Update reactive properties
                const hasCollisionChanged = property.set(hasCollision, `collision_check:${trackerId}`);
                
                // Update collisions collection
                const newCollisions = new Map<string, string>();
                collisions.forEach(id => newCollisions.set(id, id));
                const collisionsChanged = collisionsProperty.set(newCollisions, `collision_update:${trackerId}`);
                
                const changed = hasCollisionChanged || collisionsChanged;
                
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
     * Get entity radius from reactive properties (defaults to 1.0)
     */
    private static getEntityRadius(entity: GameNodeObject): number {
        const properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        const radiusProperty = properties?.getNumericProperty('radius');
        return radiusProperty?.getValue() || 1.0;
    }
    
    /**
     * Create movement progress tracker that coordinates multiple ReactiveProperties
     * Keep pathPoints and scene parameters - they're for future extensibility
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
        
        // Validate parameters for future use and satisfy TypeScript
        if (pathPoints.length === 0 && finalConfig.debugMode) {
            console.warn('Empty pathPoints array provided to movement tracker');
        }
        if (!scene && finalConfig.debugMode) {
            console.warn('Invalid scene provided to movement tracker');
        }
        
        // TODO: Future enhancements will use these parameters for:
        // - pathPoints: waypoint validation and segment-based progress
        // - scene: performance optimizations and collision detection
        
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
            const destinationChanged = destinationProperty.set(atDestination, 'progress_complete');
            
            // Emit combined state
            progressObservable.notifyObservers({ 
                progress: event.to, 
                atDestination,
                changed: event.changed || destinationChanged
            });
            
            if (finalConfig.debugMode && (event.changed || destinationChanged)) {
                console.log(`[movement] ${entity.id}: progress=${event.to.toFixed(3)}, atDestination=${atDestination}`);
                // Future enhancement: Could validate against pathPoints for waypoint systems
                // Future enhancement: Could use scene for performance optimizations
            }
        });
        
        return {
            updateProgress: (progress: number) => {
                if (finalConfig.enabled) {
                    progressProperty.set(Math.max(0, Math.min(1, progress)), 'movement_system');
                    // Future: pathPoints could be used for segment-based progress validation
                    // Future: scene could be used for collision detection during movement
                }
            },
            cleanup: () => {
                progressObserver.remove();
                progressObservable.clear();
            },
            progressObservable
        };
    }
    
    // ============================================================
    // ReactivePropertiesComponent Integration Helpers (UNCHANGED)
    // ============================================================
    
    private static getOrCreateBooleanProperty(
        entity: GameNodeObject,
        name: string,
        defaultValue: boolean
    ): BooleanProperty | null {
        let properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!properties) {
            properties = new ReactivePropertiesComponent();
            entity.addComponent(properties);
        }
        
        let property = properties.getBooleanProperty(name);
        if (!property) {
            property = new BooleanProperty(name, defaultValue);
            properties.addProperty(property);
        }
        
        return property;
    }
    
    private static getOrCreateNumericProperty(
        entity: GameNodeObject,
        name: string,
        defaultValue: number,
        min?: number,
        max?: number
    ): NumericProperty | null {
        let properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!properties) {
            properties = new ReactivePropertiesComponent();
            entity.addComponent(properties);
        }
        
        let property = properties.getNumericProperty(name);
        if (!property) {
            property = new NumericProperty(name, defaultValue, min, max);
            properties.addProperty(property);
        }
        
        return property;
    }
    
    private static getOrCreateCollectionProperty<T>(
        entity: GameNodeObject,
        name: string
    ): CollectionProperty<T> | null {
        let properties = entity.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!properties) {
            properties = new ReactivePropertiesComponent();
            entity.addComponent(properties);
        }
        
        let property = properties.getCollectionProperty<T>(name);
        if (!property) {
            property = new CollectionProperty<T>(name);
            properties.addProperty(property);
        }
        
        return property;
    }
    
    private static createNullTracker(trackerId: string): SpatialTracker {
        return {
            observable: new Observable(),
            isActive: false,
            trackerId,
            cleanup: () => {}
        };
    }
    
    // ============================================================
    // Management and Utilities (UNCHANGED)
    // ============================================================
    
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
            averageCalculationsPerFrame: activeCount > 0 ? this.performanceMetrics.frameCalculations / 60 : 0,
            memoryUsage: this.activeTrackers.size * 1024
        };
    }
    
    static getTrackerStats(): { 
        active: number; 
        trackers: Array<{ id: string; isActive: boolean; type: string }> 
    } {
        const trackers = Array.from(this.activeTrackers.entries()).map(([id, tracker]) => ({
            id,
            isActive: tracker.isActive,
            type: id.split('_')[0]
        }));
        
        return {
            active: trackers.filter(t => t.isActive).length,
            trackers
        };
    }
}