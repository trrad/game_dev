/**
 * Time Controls UI Component
 * Handles the time management interface (speed controls, pause, game time display)
 */

import { TimeManager, TimeSpeed } from "../core/TimeManager";
import { Logger, LogCategory } from "../utils/Logger";
import { CSS_CLASSES, defaultUIConfig } from "./assets/ui-config";

export class TimeControlsUI {
    private timeManager: TimeManager;
    private container: HTMLElement;
    private timeLabel: HTMLElement;
    private timeButtonsDiv: HTMLElement;
    private pauseButton: HTMLElement;
    private gameTimeDiv: HTMLElement;
    private speedButtons: HTMLButtonElement[] = [];
    private updateInterval?: number;

    constructor(timeManager: TimeManager) {
        this.timeManager = timeManager;
        this.createUI();
        this.setupEventListeners();
        this.startTimeDisplay();
    }

    private createUI(): void {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'time-controls';
        this.container.className = CSS_CLASSES.timeControls.container;

        // Time speed label
        this.timeLabel = document.createElement('div');
        this.timeLabel.id = 'time-speed-label';
        this.timeLabel.className = CSS_CLASSES.timeControls.label;
        
        // Time control buttons container
        this.timeButtonsDiv = document.createElement('div');
        this.timeButtonsDiv.className = CSS_CLASSES.timeControls.buttons;

        // Create speed buttons
        this.createSpeedButtons();

        // Pause button
        this.pauseButton = document.createElement('button');
        this.pauseButton.textContent = 'PAUSE';
        this.pauseButton.className = CSS_CLASSES.timeControls.pauseButton;
        this.pauseButton.onclick = () => this.togglePause();

        // Game time display
        this.gameTimeDiv = document.createElement('div');
        this.gameTimeDiv.id = 'game-time';
        this.gameTimeDiv.className = CSS_CLASSES.timeControls.gameTime;

        // Assemble the time control panel
        this.container.appendChild(this.timeLabel);
        this.container.appendChild(this.timeButtonsDiv);
        this.container.appendChild(this.pauseButton);
        this.container.appendChild(this.gameTimeDiv);
        
        document.body.appendChild(this.container);
    }

    private createSpeedButtons(): void {
        const timeOptions = defaultUIConfig.timeControls.speedOptions;
        
        timeOptions.forEach((speed) => {
            const timeButton = document.createElement('button');
            timeButton.textContent = `${speed}x`;
            timeButton.className = CSS_CLASSES.timeControls.button;
            
            timeButton.onclick = () => {
                this.setTimeSpeed(speed);
            };
            
            timeButton.onmouseenter = () => {
                if (!timeButton.classList.contains('active')) {
                    timeButton.style.backgroundColor = '#555';
                }
            };
            
            timeButton.onmouseleave = () => {
                if (!timeButton.classList.contains('active')) {
                    timeButton.style.backgroundColor = '';
                }
            };
            
            this.speedButtons.push(timeButton);
            this.timeButtonsDiv.appendChild(timeButton);
        });
    }

    private setupEventListeners(): void {
        // Listen for speed changes from other sources (like voting)
        this.timeManager.onSpeedChange((_newSpeed, _oldSpeed) => {
            this.updateDisplay();
        });
    }

    private startTimeDisplay(): void {
        this.updateDisplay();
        
        // Set up periodic updates for game time display
        this.updateInterval = window.setInterval(() => {
            this.updateGameTimeDisplay();
        }, defaultUIConfig.timeControls.updateInterval);
    }

    private setTimeSpeed(speed: TimeSpeed): void {
        this.timeManager.setTimeSpeed(speed);
        if (this.timeManager.isPausedState()) {
            this.timeManager.setPaused(false);
        }
        this.updateDisplay();
        Logger.log(LogCategory.UI, `Time speed changed to ${speed}x`);
    }

    private togglePause(): void {
        const wasPaused = this.timeManager.isPausedState();
        this.timeManager.setPaused(!wasPaused);
        this.updateDisplay();
        Logger.log(LogCategory.UI, `Game ${wasPaused ? 'unpaused' : 'paused'}`);
    }

    private updateDisplay(): void {
        this.updateSpeedDisplay();
        this.updatePauseButton();
    }

    private updateSpeedDisplay(): void {
        const currentSpeed = this.timeManager.getSpeed();
        const isPaused = this.timeManager.isPausedState();
        
        if (isPaused) {
            this.timeLabel.textContent = 'Time Speed: PAUSED';
        } else {
            this.timeLabel.textContent = `Time Speed: ${currentSpeed}x`;
        }
        
        // Update button appearances
        this.speedButtons.forEach((button, index) => {
            const speed = defaultUIConfig.timeControls.speedOptions[index];
            button.className = (speed === currentSpeed && !isPaused) 
                ? CSS_CLASSES.timeControls.buttonActive 
                : CSS_CLASSES.timeControls.button;
        });
    }

    private updatePauseButton(): void {
        const isPaused = this.timeManager.isPausedState();
        this.pauseButton.textContent = isPaused ? 'RESUME' : 'PAUSE';
        this.pauseButton.className = isPaused 
            ? `${CSS_CLASSES.timeControls.pauseButton} paused` 
            : CSS_CLASSES.timeControls.pauseButton;
    }

    private updateGameTimeDisplay(): void {
        const state = this.timeManager.getState();
        const gameMinutes = Math.floor(state.gameTime / 60);
        const gameSeconds = Math.floor(state.gameTime % 60);
        this.gameTimeDiv.innerHTML = `
            Game Time: ${gameMinutes}:${gameSeconds.toString().padStart(2, '0')}<br>
            Real Time: ${Math.floor(state.realTime / 1000)}s
        `;
    }

    /**
     * Dispose of the time controls UI
     */
    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
