// src/engine/input/ReactiveInputEnricher.ts - Client-side reactive input state management

import { Scene, Vector3, PickingInfo } from '@babylonjs/core';
import { InputStateEntity } from './InputStateEntity';

/**
 * ReactiveInputEnricher: Client-side input state management using reactive properties
 * 
 * ROLE: Transform DOM events into reactive property updates on InputStateEntity
 * WHY CLIENT-SIDE: Server doesn't have 3D meshes, materials, or GPU for picking
 * 
 * PHILOSOPHY: Continuous state maintenance instead of event-time enrichment
 * - Mouse position continuously tracked and enriched with 3D context
 * - DOM events add discrete events to collections  
 * - All state flows through reactive properties with automatic network sync
 */
export class ReactiveInputEnricher {
    private scene: Scene;
    private inputState: InputStateEntity;
    private canvas: HTMLCanvasElement;
    
    // DOM event listeners for cleanup
    private eventListeners: Array<() => void> = [];
    
    // Performance tracking
    private pickingPerformanceCounter = 0;
    private lastPerformanceUpdate = Date.now();
    
    // Continuous picking state
    private continuousPickingEnabled = true;
    private lastPickingUpdate = 0;
    private readonly PICKING_THROTTLE_MS = 16; // ~60fps picking updates

    constructor(scene: Scene, inputState: InputStateEntity) {
        this.scene = scene;
        this.inputState = inputState;
        
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            throw new Error('ReactiveInputEnricher requires a valid canvas');
        }
        this.canvas = canvas;
        
        this.setupDOMEventCapture();
        this.setupContinuousEnrichment();
        
        console.log('🎮 ReactiveInputEnricher initialized - DOM events → Reactive Properties');
    }

    // ========================================================================
    // DOM EVENT CAPTURE → REACTIVE PROPERTIES
    // ========================================================================

    private setupDOMEventCapture(): void {
        // Mouse movement - continuously update screen position (triggers picking)
        const onMouseMove = (event: MouseEvent) => {
            const screenPos = this.getScreenPosition(event);
            this.inputState.updateMouseContext(
                screenPos,
                Vector3.Zero() // Will be enriched by continuous picking
            );
        };
        
        // Mouse clicks - add discrete click events
        const onClick = (event: MouseEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.addClickEvent(event.button, modifierKeys);
            
            console.log(`🖱️ Click captured: button ${event.button} with enriched context`);
        };
        
        // Mouse button press/release - update continuous state
        const onMouseDown = (event: MouseEvent) => {
            this.inputState.updateMouseButton(event.button, true);
        };
        
        const onMouseUp = (event: MouseEvent) => {
            this.inputState.updateMouseButton(event.button, false);
        };
        
        // Keyboard events - update key state and add discrete events
        const onKeyDown = (event: KeyboardEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, true, modifierKeys);
        };
        
        const onKeyUp = (event: KeyboardEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, false, modifierKeys);
        };
        
        // Context menu - prevent to allow right-click handling
        const onContextMenu = (event: Event) => {
            event.preventDefault();
        };
        
        // Register all event listeners
        this.addEventListener('mousemove', onMouseMove);
        this.addEventListener('click', onClick);
        this.addEventListener('mousedown', onMouseDown);
        this.addEventListener('mouseup', onMouseUp);
        this.addEventListener('keydown', onKeyDown);
        this.addEventListener('keyup', onKeyUp);
        this.addEventListener('contextmenu', onContextMenu);
        
        // Focus management for keyboard events
        if (this.canvas.tabIndex < 0) {
            this.canvas.tabIndex = 0; // Make canvas focusable
        }
        
        // Auto-focus canvas for keyboard input
        const onCanvasClick = () => {
            this.canvas.focus();
        };
        this.addEventListener('click', onCanvasClick);
        
        console.log('🖱️ DOM event capture registered for reactive input state');
    }
    
    private addEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any
    ): void {
        this.canvas.addEventListener(type, listener);
        this.eventListeners.push(() => {
            this.canvas.removeEventListener(type, listener);
        });
    }

    // ========================================================================
    // CONTINUOUS 3D CONTEXT ENRICHMENT
    // ========================================================================

    private setupContinuousEnrichment(): void {
        // Continuously enrich mouse position with 3D context
        // This replaces event-time picking with continuous state maintenance
        
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.continuousPickingEnabled) return;
            
            // Throttle picking updates for performance
            const now = performance.now();
            if (now - this.lastPickingUpdate < this.PICKING_THROTTLE_MS) return;
            this.lastPickingUpdate = now;
            
            this.updateEnrichedContext();
        });
        
        // Store cleanup for the render loop observer
        this.eventListeners.push(() => {
            this.scene.onBeforeRenderObservable.remove(observer);
        });
    }
    
    private updateEnrichedContext(): void {
        const startTime = performance.now();
        
        try {
            // Get current screen position from reactive state
            const screenPos = this.inputState.getVectorProperty('mouseScreenPosition')?.getValue();
            if (!screenPos) return;
            
            // Perform 3D picking at current mouse position
            const enrichedContext = this.performScenePicking(screenPos);
            
            // Update all enriched context properties
            this.inputState.updateMouseContext(
                screenPos,
                enrichedContext.worldPosition,
                enrichedContext.pickedEntityId,
                enrichedContext.pickedUIElement,
                enrichedContext.surfaceNormal,
                enrichedContext.raycastDistance
            );
            
            // Track performance
            this.pickingPerformanceCounter++;
            this.updatePerformanceMetrics(performance.now() - startTime);
            
        } catch (error) {
            console.error('Error in continuous context enrichment:', error);
        }
    }

    // ========================================================================
    // 3D SCENE PICKING (Same logic as original InputEnricher)
    // ========================================================================

    private performScenePicking(screenPosition: Vector3): {
        worldPosition: Vector3;
        pickedEntityId?: string;
        pickedUIElement?: string;
        surfaceNormal?: Vector3;
        raycastDistance?: number;
    } {
        const { x, y } = screenPosition;
        
        // Convert normalized screen coords to canvas pixels
        const canvasX = x * this.canvas.width;
        const canvasY = y * this.canvas.height;

        // BABYLON.JS 3D PICKING: Use GPU raycast
        const pickInfo: PickingInfo = this.scene.pick(canvasX, canvasY);

        if (pickInfo.hit && pickInfo.pickedPoint) {
            // Successfully picked something in 3D scene
            const result = {
                worldPosition: pickInfo.pickedPoint.clone(),
                raycastDistance: pickInfo.distance,
                surfaceNormal: pickInfo.getNormal ? pickInfo.getNormal(true, true) : undefined
            };
            
            // Determine what was picked using client-side scene knowledge
            if (pickInfo.pickedMesh) {
                const meshName = pickInfo.pickedMesh.name;
                
                if (meshName.startsWith('entity_')) {
                    return {
                        ...result,
                        pickedEntityId: meshName.replace('entity_', '')
                    };
                } else if (meshName.startsWith('ui_')) {
                    return {
                        ...result,
                        pickedUIElement: meshName.replace('ui_', '')
                    };
                }
            }
            
            return result;
        } else {
            // No hit - fallback to ground plane projection
            return {
                worldPosition: this.screenToWorldPosition(x, y)
            };
        }
    }

    /**
     * Simple screen-to-world projection for ground plane
     * Used when 3D picking isn't available or fails
     */
    private screenToWorldPosition(screenX: number, screenY: number): Vector3 {
        // Convert normalized screen coordinates to world coordinates
        // This is a simple projection - real games might use camera matrices
        const worldX = (screenX - 0.5) * 10; // -5 to +5 world units
        const worldZ = (screenY - 0.5) * 10; // -5 to +5 world units
        
        return new Vector3(worldX, 0, worldZ);
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    private getScreenPosition(event: MouseEvent): Vector3 {
        const rect = this.canvas.getBoundingClientRect();
        
        // Normalize to 0-1 range
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        return new Vector3(x, y, 0);
    }
    
    private getModifierKeys(event: KeyboardEvent | MouseEvent): string[] {
        const modifiers: string[] = [];
        
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('meta');
        
        return modifiers;
    }
    
    private updatePerformanceMetrics(pickingTime: number): void {
        // Update performance metrics periodically
        const now = Date.now();
        if (now - this.lastPerformanceUpdate > 1000) { // Every second
            const pickingRate = this.pickingPerformanceCounter;
            this.pickingPerformanceCounter = 0;
            this.lastPerformanceUpdate = now;
            
            // Update reactive property for monitoring
            this.inputState.getNumericProperty('pickingPerformance')?.set(pickingRate, 'performance_tracking');
            
            if (pickingRate > 100) { // More than 100 picks/second
                console.warn(`🐌 High picking rate detected: ${pickingRate}/sec (avg ${pickingTime.toFixed(2)}ms/pick)`);
            }
        }
    }

    // ========================================================================
    // CONTROL METHODS
    // ========================================================================

    /**
     * Enable/disable continuous picking (for performance tuning)
     */
    setContinuousPickingEnabled(enabled: boolean): void {
        this.continuousPickingEnabled = enabled;
        console.log(`🎯 Continuous picking ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get current picking performance stats
     */
    getPerformanceStats(): {
        pickingRate: number;
        continuousPickingEnabled: boolean;
        lastPickingUpdate: number;
    } {
        return {
            pickingRate: this.inputState.getNumericProperty('pickingPerformance')?.getValue() || 0,
            continuousPickingEnabled: this.continuousPickingEnabled,
            lastPickingUpdate: this.lastPickingUpdate
        };
    }

    /**
     * Force a picking update (useful for debugging)
     */
    forcePicking(): void {
        this.updateEnrichedContext();
        console.log('🎯 Forced picking update');
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    dispose(): void {
        // Remove all DOM event listeners
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
        
        console.log('🧹 ReactiveInputEnricher disposed');
    }
}

// ============================================================================
// USAGE PATTERN - Integrates with InputStateEntity
// ============================================================================

/*
CANONICAL USAGE PATTERN:

// Initialize the reactive input system
const inputState = new InputStateEntity('client_input', scene, { isClient: true, isServer: false });
const inputEnricher = new ReactiveInputEnricher(scene, inputState);

// Game entities can now observe input state changes directly
class ClientPlayerCharacter extends BasePlayerCharacter {
    setupInputObservers(): void {
        // Observe click events
        inputState.getCollectionProperty('recentClicks').itemAddedObservable.add((event) => {
            if (event.value.pickedEntityId === null) { // Clicked on ground
                this.targetPosition.set(event.value.worldPosition, 'click_move_prediction');
            }
        });
        
        // Observe key presses for movement
        inputState.getCollectionProperty('keysPressed').itemAddedObservable.add((event) => {
            if (event.value === 'w') this.movementInput.setY(1, 'key_input');
        });
        
        // Observe mouse hover for UI feedback
        inputState.getProperty('currentlyPickedEntity').onChange((event) => {
            this.hoveredEntity.set(event.to, 'mouse_hover');
        });
    }
}

This approach provides:
✅ Pure reactive input handling - no special event systems
✅ Automatic network sync of all input state
✅ Continuous 3D enrichment with performance management
✅ Clean separation between input capture and game logic
✅ Centralized communication through reactive properties
*/