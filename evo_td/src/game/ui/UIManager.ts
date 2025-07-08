// src/game/ui/UIManager.ts - Fixed for Reactive System
// NOTE: This appears to be a UI management component that needs updating for the new reactive system

import { GameNodeObject } from '../../engine/core/GameNodeObject';
import { ReactivePropertiesComponent, BooleanProperty } from '../../engine/components/ReactivePropertyComponent';
import { Scene } from '@babylonjs/core';

export class UIManager extends GameNodeObject {
    private uiProperties: ReactivePropertiesComponent;
    private isExitRequested: BooleanProperty;
    private isVisible: BooleanProperty;

    constructor(scene: Scene) {
        super('ui-manager', scene);
        
        // Set up reactive properties for UI state
        this.uiProperties = new ReactivePropertiesComponent();
        this.addComponent(this.uiProperties);
        
        // Create UI state properties
        this.isExitRequested = new BooleanProperty('exit_requested', false);
        this.isVisible = new BooleanProperty('ui_visible', true);
        
        this.uiProperties.addProperty(this.isExitRequested);
        this.uiProperties.addProperty(this.isVisible);
        
        this.setupUIBehaviors();
    }

    private setupUIBehaviors(): void {
        // React to exit requests
        this.isExitRequested.onChange((event) => {
            if (event.to === true) {
                console.log('UI exit requested:', event.source);
                this.handleExitRequest(event.source);
            }
        });

        // React to visibility changes
        this.isVisible.onChange((event) => {
            console.log('UI visibility changed:', event.to, 'source:', event.source);
            this.updateUIVisibility(event.to);
        });
    }

    // FIXED: Replace emit calls with reactive property updates
    public requestExit(source: string = 'unknown'): void {
        // OLD: this.node.emit('ui:exit', { source: 'exitButton' });
        // NEW: Use reactive property
        this.isExitRequested.setTrue(source);
    }

    public requestExitConfirmation(source: string = 'unknown'): void {
        // OLD: this.node.emit('ui:exit_requested', { source });
        // NEW: Use reactive property with different handling
        console.log('Exit confirmation requested from:', source);
        this.isExitRequested.setTrue(`confirmation_${source}`);
    }

    private handleExitRequest(source: string): void {
        if (source === 'exitButton') {
            // Handle direct exit button press
            this.showExitConfirmation();
        } else if (source.startsWith('confirmation_')) {
            // Handle confirmed exit
            this.performExit();
        } else {
            // Handle other exit sources
            console.log('Exit requested from unknown source:', source);
        }
    }

    private showExitConfirmation(): void {
        // Implementation for showing exit confirmation dialog
        console.log('Showing exit confirmation dialog');
        // This would typically show a modal or confirmation UI
    }

    private performExit(): void {
        // Implementation for actual exit logic
        console.log('Performing exit...');
        // This would typically trigger application shutdown or scene change
    }

    private updateUIVisibility(visible: boolean): void {
        // Implementation for updating UI visibility
        console.log('Updating UI visibility:', visible);
        // This would typically show/hide UI elements
    }

    // Public API methods
    public show(): void {
        this.isVisible.setTrue('programmatic_show');
    }

    public hide(): void {
        this.isVisible.setFalse('programmatic_hide');
    }

    public toggle(): void {
        this.isVisible.toggle('programmatic_toggle');
    }

    public isUIVisible(): boolean {
        return this.isVisible.isTrue();
    }

    public isExitPending(): boolean {
        return this.isExitRequested.isTrue();
    }

    // Reset exit state
    public cancelExit(): void {
        this.isExitRequested.setFalse('cancelled');
    }

    serialize(): any {
        return {
            isVisible: this.isVisible.getValue(),
            isExitRequested: this.isExitRequested.getValue()
        };
    }

    deserialize(data: any): void {
        if (typeof data.isVisible === 'boolean') {
            this.isVisible.set(data.isVisible, 'deserialize');
        }
        if (typeof data.isExitRequested === 'boolean') {
            this.isExitRequested.set(data.isExitRequested, 'deserialize');
        }
    }
}

// Example usage:
/*
const uiManager = new UIManager(scene);

// Listen for exit requests
uiManager.isExitRequested.onChange((event) => {
    if (event.to) {
        console.log('Application should exit:', event.source);
    }
});

// Request exit from button
uiManager.requestExit('exitButton');

// Request exit with confirmation
uiManager.requestExitConfirmation('menuOption');
*/