// src/engine/core/Game.ts - Fixed Version

import { TimeManager } from "./TimeManager";
import { EventStack } from "./EventStack";
import { SceneManager } from "../scene/SceneManager";
import { Logger, LogCategory } from "../utils/Logger";

// This class will be the main game logic entry point for tick-based updates
export class Game {
    private timeManager: TimeManager;
    private eventStack: EventStack;
    private tickHandlers: Array<() => void> = [];
    private sceneManager: SceneManager | null = null;

    constructor() {
        this.timeManager = new TimeManager();
        // Create a stub scene for EventStack - we'll improve this later
        const stubCanvas = document.createElement('canvas');
        const stubSceneManager = new SceneManager(stubCanvas);
        this.eventStack = new EventStack(stubSceneManager.scene);
    }

    /**
     * Initialize SceneManager with canvas (fixed signature)
     */
    public initSceneManager(canvas: HTMLCanvasElement): SceneManager {
        this.sceneManager = new SceneManager(canvas);
        Logger.log(LogCategory.SYSTEM, "SceneManager initialized");
        return this.sceneManager;
    }

    /**
     * Get the scene manager instance
     */
    public getSceneManager(): SceneManager | null {
        return this.sceneManager;
    }

    public start() {
        // Use basic TimeManager for now (SceneManager doesn't have TimeManager)
        this.timeManager.onTick(() => this.onTick());
        this.timeManager.start();
        
        if (this.sceneManager) {
            this.sceneManager.start();
        }
    }

    public stop() {
        this.timeManager.stop();
        // SceneManager doesn't have stop method, just log
        Logger.log(LogCategory.SYSTEM, "Game stopped");
    }

    // Simplified event system for now
    public queueEvent(event: { type: string; execute: () => void; payload?: any }) {
        Logger.log(LogCategory.SYSTEM, `Event queued: ${event.type}`);
        // Execute immediately for now instead of using EventStack.pushGameEvent
        event.execute();
    }

    public registerTickHandler(handler: () => void) {
        this.tickHandlers.push(handler);
    }

    private onTick() {
        // Call all registered tick handlers (e.g., from App)
        this.tickHandlers.forEach(fn => fn());
        // Skip processGameEvents for now since EventStack doesn't have it
        Logger.debug(LogCategory.SYSTEM, "Tick processed");
    }

    public voteTimeSpeed(playerId: string, speed: 1 | 4 | 8 | 16) {
        // Use basic TimeManager since SceneManager doesn't have getTimeManager
        this.timeManager.vote(playerId, speed);
    }

    public getCurrentSpeed() {
        // Use basic TimeManager
        return this.timeManager.getSpeed();
    }
}