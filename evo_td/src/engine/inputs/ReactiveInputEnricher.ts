// src/engine/input/ReactiveInputEnricher.ts - Minimal TypeScript Fixes

import { Scene, Vector3, PickingInfo, PointerEventTypes, PointerInfo } from '@babylonjs/core';
import { InputStateEntity } from './InputStateEntity';

export class ReactiveInputEnricher {
    private scene: Scene;
    private inputState: InputStateEntity;
    private canvas: HTMLCanvasElement;
    
    // DOM event listeners for cleanup
    private eventListeners: Array<() => void> = [];
    
    // ✅ FIX: Babylon.js observer for cleanup
    private babylonObservers: Array<() => void> = [];
    
    // Performance tracking
    private pickingPerformanceCounter = 0;
    private lastPerformanceUpdate = Date.now();
    
    // Continuous picking state
    private continuousPickingEnabled = true;
    private lastPickingUpdate = 0;
    private readonly PICKING_THROTTLE_MS = 16;

    constructor(scene: Scene, inputState: InputStateEntity) {
        this.scene = scene;
        this.inputState = inputState;
        
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            throw new Error('ReactiveInputEnricher requires a valid canvas');
        }
        this.canvas = canvas;
        
        // ✅ MINIMAL FIX: Use Babylon.js pointer events + DOM keyboard
        this.setupBabylonPointerEvents();
        this.setupDOMKeyboardEvents();
        this.setupContinuousEnrichment();
        
        console.log('🎮 ReactiveInputEnricher initialized - Babylon.js Pointer Events + DOM Keyboard');
    }

    // ========================================================================
    // ✅ MINIMAL FIX: Use Babylon.js scene pointer events
    // ========================================================================

    private setupBabylonPointerEvents(): void {
        console.log('🖱️ Setting up Babylon.js pointer events...');
        
        // ✅ MAIN FIX: Use scene.onPointerObservable
        const pointerObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            this.handleBabylonPointerEvent(pointerInfo);
        });
        
        this.babylonObservers.push(() => {
            this.scene.onPointerObservable.remove(pointerObserver);
        });
        
        // Still need DOM mousemove for continuous position tracking
        const onMouseMove = (event: MouseEvent) => {
            const screenPos = this.getScreenPosition(event);
            this.inputState.updateMouseContext(
                screenPos,
                Vector3.Zero()
            );
        };
        
        const onContextMenu = (event: Event) => {
            event.preventDefault();
        };
        
        this.addEventListener('mousemove', onMouseMove);
        this.addEventListener('contextmenu', onContextMenu);
        
        console.log('✅ Babylon.js pointer events registered');
    }
    
    /**
     * ✅ MINIMAL FIX: Handle pointer events with proper types
     */
    private handleBabylonPointerEvent(pointerInfo: PointerInfo): void {
        const { type, event, pickInfo } = pointerInfo;
        
        switch (type) {
            case PointerEventTypes.POINTERDOWN:
                this.handlePointerDown(event, pickInfo);
                break;
                
            case PointerEventTypes.POINTERUP:
                this.handlePointerUp(event, pickInfo);
                break;
                
            case PointerEventTypes.POINTERTAP:
                this.handlePointerTap(event, pickInfo);
                break;
        }
    }
    
    // ✅ FIX: Use proper event types
    private handlePointerDown(event: any, _pickInfo?: PickingInfo): void {
        console.log(`🖱️ POINTER DOWN: button ${event.button}`);
        this.inputState.updateMouseButton(event.button, true);
    }
    
    private handlePointerUp(event: any, _pickInfo?: PickingInfo): void {
        console.log(`🖱️ POINTER UP: button ${event.button}`);
        this.inputState.updateMouseButton(event.button, false);
    }
    
    private handlePointerTap(event: any, pickInfo?: PickingInfo): void {
        console.log(`🖱️ POINTER TAP: button ${event.button}`);
        
        if (pickInfo) {
            this.updateContextFromPickInfo(pickInfo);
        }
        
        const modifierKeys = this.getModifierKeys(event);
        this.inputState.addClickEvent(event.button, modifierKeys);
        
        console.log(`🖱️ Click event created`);
    }
    
    /**
     * ✅ MINIMAL: Update context from PickingInfo
     */
    private updateContextFromPickInfo(pickInfo: PickingInfo): void {
        if (pickInfo.hit && pickInfo.pickedPoint) {
            const screenPos = this.inputState.getVectorProperty('mouseScreenPosition')?.getValue() || Vector3.Zero();
            
            let pickedEntityId: string | undefined;
            if (pickInfo.pickedMesh) {
                const meshName = pickInfo.pickedMesh.name;
                if (meshName.startsWith('entity_')) {
                    pickedEntityId = meshName.replace('entity_', '');
                } else if (meshName.includes('player')) {
                    pickedEntityId = meshName;
                }
            }
            
            this.inputState.updateMouseContext(
                screenPos,
                pickInfo.pickedPoint.clone(),
                pickedEntityId,
                undefined,
                pickInfo.getNormal ? pickInfo.getNormal(true, true) : new Vector3(0, 1, 0),
                pickInfo.distance
            );
        }
    }

    // ========================================================================
    // ✅ EXISTING: DOM keyboard events (no changes)
    // ========================================================================

    private setupDOMKeyboardEvents(): void {
        const onKeyDown = (event: KeyboardEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, true, modifierKeys);
        };
        
        const onKeyUp = (event: KeyboardEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, false, modifierKeys);
        };
        
        this.addEventListener('keydown', onKeyDown);
        this.addEventListener('keyup', onKeyUp);
        
        if (this.canvas.tabIndex < 0) {
            this.canvas.tabIndex = 0;
        }
        
        const onCanvasClick = () => {
            this.canvas.focus();
        };
        this.addEventListener('click', onCanvasClick);
        
        console.log('⌨️ DOM keyboard event capture registered');
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
    // ✅ EXISTING: Continuous enrichment (no changes)
    // ========================================================================

    private setupContinuousEnrichment(): void {
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.continuousPickingEnabled) return;
            
            const now = performance.now();
            if (now - this.lastPickingUpdate < this.PICKING_THROTTLE_MS) return;
            this.lastPickingUpdate = now;
            
            this.updateEnrichedContext();
        });
        
        this.babylonObservers.push(() => {
            this.scene.onBeforeRenderObservable.remove(observer);
        });
    }
    
    private updateEnrichedContext(): void {
        const startTime = performance.now();
        
        try {
            const screenPos = this.inputState.getVectorProperty('mouseScreenPosition')?.getValue();
            if (!screenPos) return;
            
            const enrichedContext = this.performScenePicking(screenPos);
            
            this.inputState.updateMouseContext(
                screenPos,
                enrichedContext.worldPosition,
                enrichedContext.pickedEntityId,
                enrichedContext.pickedUIElement,
                enrichedContext.surfaceNormal,
                enrichedContext.raycastDistance
            );
            
            this.pickingPerformanceCounter++;
            this.updatePerformanceMetrics(performance.now() - startTime);
            
        } catch (error) {
            console.error('Error in continuous context enrichment:', error);
        }
    }

    /**
     * ✅ EXISTING: Scene picking (no changes)
     */
    private performScenePicking(screenPosition: Vector3): {
        worldPosition: Vector3;
        pickedEntityId?: string;
        pickedUIElement?: string;
        surfaceNormal?: Vector3;
        raycastDistance?: number;
    } {
        const { x, y } = screenPosition;
        
        const canvasX = x * this.canvas.width;
        const canvasY = y * this.canvas.height;

        const pickInfo: PickingInfo = this.scene.pick(canvasX, canvasY);

        if (pickInfo.hit && pickInfo.pickedPoint) {
            const result = {
                worldPosition: pickInfo.pickedPoint.clone(),
                raycastDistance: pickInfo.distance,
                surfaceNormal: pickInfo.getNormal ? pickInfo.getNormal(true, true) : new Vector3(0, 1, 0)
            };
            
            if (pickInfo.pickedMesh) {
                const meshName = pickInfo.pickedMesh.name;
                
                if (meshName.startsWith('entity_')) {
                    return {
                        ...result,
                        pickedEntityId: meshName.replace('entity_', '')
                    };
                } else if (meshName.includes('player')) {
                    return {
                        ...result,
                        pickedEntityId: meshName
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
            return {
                worldPosition: this.screenToWorldPosition(x, y)
            };
        }
    }

    /**
     * ✅ MINIMAL FIX: Simple screen-to-world projection
     */
    private screenToWorldPosition(screenX: number, screenY: number): Vector3 {
        // Simple fallback projection
        const worldX = (screenX - 0.5) * 20;
        const worldZ = (screenY - 0.5) * 20;
        
        return new Vector3(worldX, 0, worldZ);
    }

    // ========================================================================
    // ✅ EXISTING: Utility methods (no changes)
    // ========================================================================

    private getScreenPosition(event: MouseEvent): Vector3 {
        const rect = this.canvas.getBoundingClientRect();
        
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        return new Vector3(x, y, 0);
    }
    
    private getModifierKeys(event: KeyboardEvent | any): string[] {
        const modifiers: string[] = [];
        
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('meta');
        
        return modifiers;
    }
    
    private updatePerformanceMetrics(pickingTime: number): void {
        const now = Date.now();
        if (now - this.lastPerformanceUpdate > 1000) {
            const pickingRate = this.pickingPerformanceCounter;
            this.pickingPerformanceCounter = 0;
            this.lastPerformanceUpdate = now;
            
            this.inputState.getNumericProperty('pickingPerformance')?.set(pickingRate, 'performance_tracking');
            
            if (pickingRate > 100) {
                console.warn(`🐌 High picking rate detected: ${pickingRate}/sec (avg ${pickingTime.toFixed(2)}ms/pick)`);
            }
        }
    }

    // ========================================================================
    // ✅ EXISTING: Control methods (no changes)
    // ========================================================================

    setContinuousPickingEnabled(enabled: boolean): void {
        this.continuousPickingEnabled = enabled;
        console.log(`🎯 Continuous picking ${enabled ? 'enabled' : 'disabled'}`);
    }
    
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

    forcePicking(): void {
        this.updateEnrichedContext();
        console.log('🎯 Forced picking update');
    }

    // ========================================================================
    // ✅ EXISTING: Cleanup (enhanced)
    // ========================================================================

    dispose(): void {
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
        
        this.babylonObservers.forEach(cleanup => cleanup());
        this.babylonObservers = [];
        
        console.log('🧹 ReactiveInputEnricher disposed');
    }
}