// src/engine/inputs/ReactiveInputEnricher.ts - Use Babylon's picking directly

import { Scene, Vector3, PointerEventTypes, PointerInfo, ActionManager } from '@babylonjs/core';
import { InputStateEntity } from './InputStateEntity';

export class ReactiveInputEnricher {
    private scene: Scene;
    private inputState: InputStateEntity;
    private canvas: HTMLCanvasElement;
    
    private babylonObservers: Array<() => void> = [];
    private domListeners: Array<() => void> = [];

    constructor(scene: Scene, inputState: InputStateEntity) {
        this.scene = scene;
        this.inputState = inputState;
        
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            throw new Error('ReactiveInputEnricher requires a valid canvas');
        }
        this.canvas = canvas;
        
        this.setupBabylonPointerEvents();
        this.setupKeyboardEvents();
        
        console.log('🎮 ReactiveInputEnricher initialized - Using Babylon picking');
    }

    /**
     * Use Babylon's pointer observable for all mouse/touch input
     */
    private setupBabylonPointerEvents(): void {
        // Pointer down/up for button state
        const downObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const event = pointerInfo.event as PointerEvent;
                this.inputState.updateMouseButton(event.button, true);
            }
        });

        const upObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                const event = pointerInfo.event as PointerEvent;
                this.inputState.updateMouseButton(event.button, false);
            }
        });

        // Pointer pick for clicks (Babylon handles the picking!)
        const pickObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERPICK && pointerInfo.pickInfo) {
                const event = pointerInfo.event as PointerEvent;
                const pickInfo = pointerInfo.pickInfo;
                
                // Get the network ID from the picked mesh
                let pickedNetworkId = '';
                if (pickInfo.pickedMesh && pickInfo.pickedMesh.name.startsWith('entity_')) {
                    pickedNetworkId = pickInfo.pickedMesh.name.replace('entity_', '');
                }
                
                // Get pick point or default to origin
                const pickedPoint = pickInfo.pickedPoint || Vector3.Zero();
                
                // Add click to input state
                this.inputState.addClick(
                    event.button,
                    event.clientX,
                    event.clientY,
                    pickedNetworkId,
                    pickedPoint
                );
            }
        });

        // Pointer move for hover detection
        const moveObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                const pickInfo = this.scene.pick(
                    this.scene.pointerX, 
                    this.scene.pointerY
                );
                
                let hoveredNetworkId = '';
                if (pickInfo.hit && pickInfo.pickedMesh && 
                    pickInfo.pickedMesh.name.startsWith('entity_')) {
                    hoveredNetworkId = pickInfo.pickedMesh.name.replace('entity_', '');
                }
                
                // Update hovered entity
                this.inputState.setHoveredEntity(hoveredNetworkId);
            }
        });

        // Store observers for cleanup
        this.babylonObservers.push(
            () => this.scene.onPointerObservable.remove(downObserver),
            () => this.scene.onPointerObservable.remove(upObserver),
            () => this.scene.onPointerObservable.remove(pickObserver),
            () => this.scene.onPointerObservable.remove(moveObserver)
        );

        console.log('✅ Babylon pointer events set up');
    }

    /**
     * Keyboard events still use DOM
     */
    private setupKeyboardEvents(): void {
        const onKeyDown = (event: KeyboardEvent) => {
            // Prevent browser defaults for game keys
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', ' '].includes(event.code)) {
                event.preventDefault();
            }
            
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, true, modifierKeys);
        };
        
        const onKeyUp = (event: KeyboardEvent) => {
            const modifierKeys = this.getModifierKeys(event);
            this.inputState.updateKeyPressed(event.code, false, modifierKeys);
        };
        
        this.canvas.addEventListener('keydown', onKeyDown);
        this.canvas.addEventListener('keyup', onKeyUp);
        
        this.domListeners.push(
            () => this.canvas.removeEventListener('keydown', onKeyDown),
            () => this.canvas.removeEventListener('keyup', onKeyUp)
        );
        
        // Ensure canvas can receive keyboard events
        if (this.canvas.tabIndex < 0) {
            this.canvas.tabIndex = 0;
        }
        
        console.log('✅ Keyboard events set up');
    }

    private getModifierKeys(event: KeyboardEvent): string[] {
        const modifiers: string[] = [];
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('meta');
        return modifiers;
    }

    dispose(): void {
        this.babylonObservers.forEach(cleanup => cleanup());
        this.domListeners.forEach(cleanup => cleanup());
        console.log('🧹 ReactiveInputEnricher disposed');
    }
}