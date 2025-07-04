import { TimeManager } from "./TimeManager";
import { EventStack } from "./EventStack";
import { SceneManager } from "../scene/SceneManager";
import { Logger, LogCategory } from "../utils/Logger";
import { Engine } from "@babylonjs/core";

// This class will be the main game logic entry point for tick-based updates
export class Game {
    private timeManager: TimeManager;
    private eventStack: EventStack;
    private tickHandlers: Array<() => void> = [];
    private sceneManager: SceneManager | null = null;

    constructor() {
        this.timeManager = new TimeManager();
        this.eventStack = new EventStack();
    }

    /**
     * Initialize SceneManager with the provided Babylon.js engine
     * @param engine The Babylon.js engine instance
     * @param config Optional scene manager configuration
     */
    public initSceneManager(engine: Engine, config?: any): SceneManager {
        this.sceneManager = new SceneManager(engine, config);

        // Connect timeManager to sceneManager
        this.sceneManager.getTimeManager().onTick(() => {
            // Process game logic on each tick
            this.onTick();
        });

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
        // If SceneManager is initialized, use its TimeManager
        if (this.sceneManager) {
            this.sceneManager.start();
        } else {
            // Otherwise, use the default TimeManager
            this.timeManager.onTick(() => this.onTick());
            this.timeManager.start();
        }
    }

    public stop() {
        if (this.sceneManager) {
            this.sceneManager.stop();
        } else {
            this.timeManager.stop();
        }
    }

    public queueEvent(event: { type: string; execute: () => void; payload?: any }) {
        this.eventStack.pushGameEvent(event);
    }

    public registerTickHandler(handler: () => void) {
        this.tickHandlers.push(handler);
    }

    private onTick() {
        // Call all registered tick handlers (e.g., from App)
        this.tickHandlers.forEach(fn => fn());
        // Process all events for this tick
        this.eventStack.processGameEvents();
        // TODO: Add logic for recurring world events, movement, etc.
    }

    public voteTimeSpeed(playerId: string, speed: 1 | 4 | 8 | 16) {
        if (this.sceneManager) {
            this.sceneManager.getTimeManager().vote(playerId, speed);
        } else {
            this.timeManager.vote(playerId, speed);
        }
    }

    public getCurrentSpeed() {
        if (this.sceneManager) {
            return this.sceneManager.getTimeManager().getSpeed();
        }
        return this.timeManager.getSpeed();
    }
}
