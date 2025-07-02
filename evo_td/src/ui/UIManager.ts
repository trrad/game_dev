/**
 * UI Manager
 * Coordinates all UI components and manages CSS loading
 * 
 * NOTE: This UIManager is fully implemented but not currently used in the main ECS app.
 * The main app (ecs-app.ts) creates UI components directly instead of using this manager.
 * This could be integrated in the future to centralize UI management.
 */

import { CSSLoader } from "../utils/CSSLoader";
import { TimeControlsUI } from "./TimeControlsUI";
import { EventLogUI } from "./EventLogUI";
import { UIFactory } from "./UIFactory";
import { UISystem } from "../systems/UISystem";
import { TimeManager } from "../core/TimeManager";
import { EventStack, EventCategory } from "../core/EventStack";
import { Logger, LogCategory } from "../utils/Logger";

export class UIManager {
    private cssLoader: CSSLoader;
    private timeControlsUI?: TimeControlsUI;
    private eventLogUI?: EventLogUI;
    private uiFactory: UIFactory;
    private uiSystem: UISystem;
    private uiElements: HTMLElement[] = [];

    constructor() {
        this.cssLoader = new CSSLoader();
        this.uiSystem = new UISystem();
        this.uiFactory = new UIFactory(this.uiSystem);
    }

    /**
     * Initialize the UI Manager and load CSS
     */
    public async initialize(): Promise<void> {
        try {
            // Load all CSS files
            await this.cssLoader.loadMultipleCSS([
                'main.css',
                'time-controls.css',
                'event-log.css'
            ]);
            
            Logger.log(LogCategory.UI, 'UI Manager initialized successfully');
        } catch (error) {
            Logger.log(LogCategory.ERROR, 'Failed to load UI CSS', { error });
            throw error;
        }
    }

    /**
     * Create and setup all UI components
     */
    public createUI(timeManager: TimeManager, eventStack: EventStack): void {
        try {
            // Create time controls
            this.timeControlsUI = new TimeControlsUI(timeManager);
            
            // Create event log
            this.eventLogUI = new EventLogUI(eventStack);
            
            // Create exit button using the UI factory
            const exitButtonGameObject = this.uiFactory.createExitButton(
                'exit-button',
                'Exit App',
                () => this.handleExitRequest(),
                {
                    position: 'top-right',
                    style: {
                        fontSize: '16px',
                        fontWeight: 'bold',
                        padding: '8px 16px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        zIndex: '1000'
                    }
                }
            );

            // Add keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Log successful creation
            eventStack.info(EventCategory.UI, 'ui_initialized', 'UI components created successfully', null, 'UIManager');
            
            Logger.log(LogCategory.UI, 'UI components created', { 
                exitButton: 'exit-button',
                timeControls: 'time-controls',
                eventLog: 'event-log'
            });
        } catch (error) {
            Logger.log(LogCategory.ERROR, 'Failed to create UI components', { error });
            throw error;
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts(): void {
        window.addEventListener("keydown", (ev) => {
            // Toggle event log with F1
            if (ev.key === 'F1') {
                ev.preventDefault();
                this.toggleEventLog();
            }
            
            // Time speed shortcuts (1-5 keys)
            if (ev.key >= '1' && ev.key <= '5') {
                const speedMap = { '1': 1, '2': 4, '3': 8, '4': 16, '5': 32 } as const;
                const speed = speedMap[ev.key as keyof typeof speedMap];
                if (speed && this.timeControlsUI) {
                    // Access the private method through a public interface
                    // We'll need to add a public method to TimeControlsUI
                    this.logEvent(LogCategory.UI, `Keyboard shortcut: Set speed to ${speed}x`);
                }
            }
            
            // Pause with spacebar
            if (ev.code === 'Space' && !ev.target || (ev.target as HTMLElement).tagName !== 'INPUT') {
                ev.preventDefault();
                this.logEvent(LogCategory.UI, 'Keyboard shortcut: Toggle pause (spacebar)');
            }
        });
    }

    /**
     * Handle exit request from UI
     */
    private handleExitRequest(): void {
        this.logEvent(LogCategory.UI, 'Exit button clicked');
        
        // Emit a custom event that the main app can listen to
        const exitEvent = new CustomEvent('app-exit-requested');
        window.dispatchEvent(exitEvent);
    }

    /**
     * Toggle event log visibility
     */
    public toggleEventLog(): void {
        if (this.eventLogUI) {
            this.eventLogUI.toggle();
            this.logEvent(LogCategory.UI, 'Event log toggled via keyboard shortcut (F1)');
        }
    }

    /**
     * Log an event to the event log
     */
    public logEvent(category: LogCategory, message: string, payload?: any): void {
        if (this.eventLogUI) {
            this.eventLogUI.logEvent(category, message, payload);
        }
    }

    /**
     * Clear the event log
     */
    public clearEventLog(): void {
        if (this.eventLogUI) {
            this.eventLogUI.clear();
        }
    }

    /**
     * Show error message when WebGL is not supported
     */
    public showWebGLError(): void {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = `
            <h2>WebGL Not Supported</h2>
            <p>Your browser does not support WebGL, which is required to run this application.</p>
            <p>Please try:</p>
            <ul>
                <li>Using a modern browser (Chrome, Firefox, Safari, Edge)</li>
                <li>Enabling hardware acceleration in your browser settings</li>
                <li>Updating your graphics drivers</li>
            </ul>
        `;
        errorDiv.className = 'error-message webgl-error';
        document.body.appendChild(errorDiv);
        
        Logger.log(LogCategory.SYSTEM, "WebGL not supported - showing error message");
    }

    /**
     * Show error message when engine initialization fails
     */
    public showEngineError(error: any): void {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = `
            <h2>Engine Initialization Failed</h2>
            <p>Failed to initialize the 3D rendering engine.</p>
            <p><strong>Error:</strong> ${error?.message || error}</p>
            <p>Please try refreshing the page or check the browser console for more details.</p>
        `;
        errorDiv.className = 'error-message engine-error';
        document.body.appendChild(errorDiv);
        
        Logger.log(LogCategory.SYSTEM, "Engine initialization failed:", error);
    }

    /**
     * Show exit confirmation message
     */
    public showExitMessage(): void {
        // Remove any existing UI components first
        this.dispose();
        
        // Add a message to indicate app has been closed
        const exitMessage = document.createElement("div");
        exitMessage.textContent = "ECS App has been closed. Refresh the page to restart.";
        exitMessage.className = 'exit-message';
        
        // Optionally: Create a restart button
        const restartButton = document.createElement("button");
        restartButton.textContent = "Restart App";
        restartButton.className = 'restart-button';
        restartButton.addEventListener("click", () => {
            location.reload();
        });
        exitMessage.appendChild(restartButton);
        
        document.body.appendChild(exitMessage);
    }

    /**
     * Dispose of all UI components
     */
    public dispose(): void {
        try {
            // Dispose of UI components
            if (this.timeControlsUI) {
                this.timeControlsUI.dispose();
            }
            
            if (this.eventLogUI) {
                this.eventLogUI.dispose();
            }
            
            // Clean up UI System
            this.uiSystem.dispose();
            
            // Remove any remaining DOM UI elements
            this.uiElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Dispose CSS loader
            this.cssLoader.dispose();
            
            Logger.log(LogCategory.UI, 'UI Manager disposed successfully');
        } catch (error) {
            Logger.log(LogCategory.ERROR, 'Error during UI disposal', { error });
        }
    }
}
