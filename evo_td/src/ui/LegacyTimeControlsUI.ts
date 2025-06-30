/**
 * Legacy Time Controls UI
 * This is the old inline implementation that we'll replace with the new TimeControlsUI component
 * This file serves as a reference for the refactoring process
 */

export class LegacyTimeControlsUI {
    private timeManager: any;
    private uiElements: HTMLElement[] = [];

    constructor(timeManager: any) {
        this.timeManager = timeManager;
    }

    /**
     * This is the original createTimeControls method from ecs-app.ts
     * We'll replace this with the new TimeControlsUI component
     */
    createTimeControls(): void {
        // Create main time control container
        const timeControlDiv = document.createElement('div');
        timeControlDiv.id = 'time-controls';
        timeControlDiv.className = 'time-controls'; // Use CSS class instead of inline styles
        
        // Time speed label
        const timeLabel = document.createElement('div');
        timeLabel.id = 'time-speed-label';
        timeLabel.className = 'time-speed-label'; // Use CSS class
        
        // Time control buttons container
        const timeButtonsDiv = document.createElement('div');
        timeButtonsDiv.className = 'time-buttons'; // Use CSS class

        // Create speed buttons
        const timeOptions = [1, 4, 8, 16, 32] as const;
        const speedButtons: HTMLButtonElement[] = [];
        
        const updateSpeedDisplay = () => {
            const currentSpeed = this.timeManager.getSpeed();
            const isPaused = this.timeManager.isPausedState();
            
            if (isPaused) {
                timeLabel.textContent = 'Time Speed: PAUSED';
            } else {
                timeLabel.textContent = `Time Speed: ${currentSpeed}x`;
            }
            
            // Update button appearances using CSS classes
            speedButtons.forEach((button, index) => {
                const speed = timeOptions[index];
                if (speed === currentSpeed && !isPaused) {
                    button.className = 'time-button active';
                } else {
                    button.className = 'time-button';
                }
            });
        };

        timeOptions.forEach((speed) => {
            const timeButton = document.createElement('button');
            timeButton.textContent = `${speed}x`;
            timeButton.className = 'time-button'; // Use CSS class instead of inline styles
            
            timeButton.onclick = () => {
                this.timeManager.setTimeSpeed(speed);
                if (this.timeManager.isPausedState()) {
                    this.timeManager.setPaused(false);
                }
                updateSpeedDisplay();
                // Logger.log(LogCategory.UI, `Time speed changed to ${speed}x`);
            };
            
            speedButtons.push(timeButton);
            timeButtonsDiv.appendChild(timeButton);
        });

        // Pause button
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'PAUSE';
        pauseButton.className = 'pause-button'; // Use CSS class
        
        pauseButton.onclick = () => {
            const wasPaused = this.timeManager.isPausedState();
            this.timeManager.setPaused(!wasPaused);
            updateSpeedDisplay();
            // Logger.log(LogCategory.UI, `Game ${wasPaused ? 'unpaused' : 'paused'}`);
        };

        // Game time display
        const gameTimeDiv = document.createElement('div');
        gameTimeDiv.id = 'game-time';
        gameTimeDiv.className = 'game-time-display'; // Use CSS class

        // Assemble the time control panel
        timeControlDiv.appendChild(timeLabel);
        timeControlDiv.appendChild(timeButtonsDiv);
        timeControlDiv.appendChild(pauseButton);
        timeControlDiv.appendChild(gameTimeDiv);
        document.body.appendChild(timeControlDiv);
        
        // Store reference for cleanup
        this.uiElements.push(timeControlDiv);

        // Set up periodic updates for game time display
        setInterval(() => {
            const state = this.timeManager.getState();
            const gameMinutes = Math.floor(state.gameTime / 60);
            const gameSeconds = Math.floor(state.gameTime % 60);
            gameTimeDiv.innerHTML = `
                Game Time: ${gameMinutes}:${gameSeconds.toString().padStart(2, '0')}<br>
                Real Time: ${Math.floor(state.realTime / 1000)}s
            `;
        }, 100);

        // Initialize display
        updateSpeedDisplay();
        
        // Listen for speed changes from other sources (like voting)
        this.timeManager.onSpeedChange((_newSpeed: any, _oldSpeed: any) => {
            updateSpeedDisplay();
        });
    }
}
