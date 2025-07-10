// src/engine/core/Game.ts - Fixed Version


import { SceneManager } from "../scene/SceneManager";
import { Logger, LogCategory } from "../utils/Logger";

// This class will be the main game logic entry point for tick-based updates
export class Game {
    private sceneManager: SceneManager | null = null;

    constructor() {
        // Create a stub scene for EventStack - we'll improve this later
        const stubCanvas = document.createElement('canvas');
        const stubSceneManager = new SceneManager(stubCanvas);
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

}