// Handles global time ticks, tick rate voting, and tick event dispatching
export type TimeSpeed = 1 | 4 | 8 | 16 | 32;

export interface TimeState {
    gameTime: number; // Total game time elapsed (in game seconds)
    realTime: number; // Total real time elapsed (in milliseconds)
    speed: TimeSpeed;
    isPaused: boolean;
}

export class TimeManager {
    private tickInterval: number = 16; // ms, default 60Hz
    private currentSpeed: TimeSpeed = 1;
    private votes: Map<string, TimeSpeed> = new Map(); // playerId -> speed
    private tickListeners: Array<(deltaTime: number, gameTime: number) => void> = [];
    private speedChangeListeners: Array<(newSpeed: TimeSpeed, oldSpeed: TimeSpeed) => void> = [];
    private tickTimer: any = null;
    private lastTickTime: number = 0;
    private gameTime: number = 0; // Total elapsed game time
    private realTime: number = 0; // Total elapsed real time
    private isPaused: boolean = false;
    private previousSpeed: TimeSpeed | undefined;

    constructor() {
        // Always use 16ms base tick for now
        this.setSpeed(1);
        this.lastTickTime = performance.now();
    }

    public vote(playerId: string, speed: TimeSpeed) {
        this.votes.set(playerId, speed);
        this.recalculateSpeed();
    }

    public clearVote(playerId: string) {
        this.votes.delete(playerId);
        this.recalculateSpeed();
    }

    public getSpeed(): TimeSpeed {
        return this.isPaused ? 0 as TimeSpeed : this.currentSpeed;
    }

    public getRawSpeed(): TimeSpeed {
        return this.currentSpeed;
    }

    /**
     * Set time speed directly (for single player or admin control)
     */
    public setTimeSpeed(speed: TimeSpeed): void {
        if (speed !== this.currentSpeed) {
            const oldSpeed = this.currentSpeed;
            this.setSpeed(speed);
            
            // Notify listeners of speed change
            this.speedChangeListeners.forEach(listener => listener(speed, oldSpeed));
        }
    }

    /**
     * Pause/unpause time
     */
    public setPaused(paused: boolean): void {
        if (this.isPaused !== paused) {
            this.isPaused = paused;
            if (!paused) {
                // Reset last tick time when unpausing to avoid large delta
                this.lastTickTime = performance.now();
            }
        }
    }

    public isPausedState(): boolean {
        return this.isPaused;
    }

    /**
     * Store current speed and set to 1x (for entering stations)
     */
    public storeSpeedAndSetNormal(): void {
        if (this.currentSpeed !== 1) {
            this.previousSpeed = this.currentSpeed;
            this.setTimeSpeed(1);
        }
    }

    /**
     * Restore previously stored speed (for leaving stations)
     */
    public restorePreviousSpeed(): void {
        if (this.previousSpeed && this.currentSpeed === 1) {
            this.setTimeSpeed(this.previousSpeed);
            this.previousSpeed = undefined;
        }
    }

    public onTick(listener: (deltaTime: number, gameTime: number) => void) {
        this.tickListeners.push(listener);
    }

    public onSpeedChange(listener: (newSpeed: TimeSpeed, oldSpeed: TimeSpeed) => void) {
        this.speedChangeListeners.push(listener);
    }

    public getState(): TimeState {
        return {
            gameTime: this.gameTime,
            realTime: this.realTime,
            speed: this.getSpeed(),
            isPaused: this.isPaused
        };
    }

    public start() {
        this.stop();
        this.lastTickTime = performance.now();
        this.scheduleNextTick();
    }

    public stop() {
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
    }

    private scheduleNextTick() {
        this.tickTimer = setTimeout(() => {
            const currentTime = performance.now();
            const realDelta = currentTime - this.lastTickTime;
            this.lastTickTime = currentTime;
            this.realTime += realDelta;

            if (!this.isPaused) {
                // Calculate game time delta using time speed
                const gameDelta = (realDelta / 1000) * this.currentSpeed;
                this.gameTime += gameDelta;

                // Notify tick listeners with both real delta and game time
                this.tickListeners.forEach(fn => fn(realDelta / 1000, this.gameTime));
            }

            this.scheduleNextTick();
        }, this.tickInterval);
    }

    private setSpeed(speed: TimeSpeed) {
        this.currentSpeed = speed;
        // Always use 16ms base tick for now, but keep speed for time scaling
        this.tickInterval = 16;
        if (this.tickTimer) {
            this.start(); // restart with new interval
        }
    }

    private recalculateSpeed() {
        // Voting: use the minimum (slowest) speed voted for by any player
        if (this.votes.size === 0) {
            this.setSpeed(1);
            return;
        }
        const speeds = Array.from(this.votes.values());
        const minSpeed = Math.min(...speeds) as TimeSpeed;
        this.setSpeed(minSpeed);
    }
}
