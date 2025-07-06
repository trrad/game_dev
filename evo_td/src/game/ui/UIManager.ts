/**
 * UI Manager
 * Coordinates all UI components and manages CSS loading
 * 
 * NOTE: This UIManager is fully implemented but not currently used in the main ECS app.
 * The main app (ecs-app.ts) creates UI components directly instead of using this manager.
 * This could be integrated in the future to centralize UI management.
 */

import { GameNodeObject } from '../../engine/core/GameNodeObject';
import { Scene } from '@babylonjs/core';
import { UIFactory } from './UIFactory';
import { Logger, LogCategory } from '../../engine/utils/Logger';
import { EventLogUI } from './EventLogUI';
import { CSSLoader } from './CSSLoader';

export class UIManager extends GameNodeObject {
    private uiFactory: UIFactory;
    private domRoot: HTMLElement;
    private eventLogUI: EventLogUI | null = null;
    private exitButton: HTMLElement | null = null;
    // Add more UI element refs as needed

    constructor(scene: Scene, parentNode?: any) {
        super('ui-manager', scene, parentNode);
        this.uiFactory = new UIFactory();
        this.domRoot = document.createElement('div');
        this.domRoot.id = 'ui-root';
        this.domRoot.style.position = 'absolute';
        this.domRoot.style.top = '0';
        this.domRoot.style.left = '0';
        this.domRoot.style.width = '100vw';
        this.domRoot.style.height = '100vh';
        this.domRoot.style.pointerEvents = 'none'; // UI children will override as needed
        document.body.appendChild(this.domRoot);
    }

    /**
     * Create and setup all UI components
     */
    public async createUI(): Promise<void> {
        // Dynamically load UI CSS (event-log and main)
        // TODO: Integrate with future ResourceManager
        await CSSLoader.getInstance().loadMultipleCSS([
            'main.css',
            'event-log.css'
        ]);

        // Event Log UI (pure DOM, managed by UIManager)
        this.eventLogUI = new EventLogUI();
        this.domRoot.appendChild(this.eventLogUI.htmlElement);

        // Example: Exit Button
        this.exitButton = this.uiFactory.createExitButton(() => this.handleExitRequest(), {
            style: { position: 'absolute', top: '10px', right: '10px', pointerEvents: 'auto' }
        });
        this.domRoot.appendChild(this.exitButton);

        // Wire up DOM events to ECS events
        if (this.exitButton) {
            this.exitButton.addEventListener('click', () => {
                this.node.emit('ui:exit', { source: 'exitButton' });
            });
        }
    }

    /**
     * Listen for ECS/node log events and update the event log UI
     */
    public listenForLogEvents(rootNode: any): void {
        if (!rootNode) return;
        rootNode.addEventListener('event:log', (evt: any) => {
            if (this.eventLogUI) {
                this.eventLogUI.addLogEntry(evt.payload);
            }
        });
    }

    /**
     * Clean up all UI DOM elements
     */
    public dispose(): void {
        if (this.domRoot.parentNode) {
            this.domRoot.parentNode.removeChild(this.domRoot);
        }
        if (this.eventLogUI) {
            this.eventLogUI.dispose();
        }
        super.dispose();
    }
}
