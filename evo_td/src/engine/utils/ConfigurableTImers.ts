import { Scene } from '@babylonjs/core';
// FIXED: Import missing types from TickFrequency.ts
import { TickFrequencyConfig, DEFAULT_TICK_FREQUENCIES } from '../core/TickFrequency';

export type TickFrequencyType = keyof TickFrequencyConfig;

export class ConfigurableTimers {
    private static config: TickFrequencyConfig = DEFAULT_TICK_FREQUENCIES;
    private static activeTimers: Map<string, () => void> = new Map();

    static setConfig(newConfig: Partial<TickFrequencyConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('🎛️ Updated tick frequencies:', this.config);
    }

    static getFrequency(type: TickFrequencyType): number {
        return this.config[type];
    }

    static getIntervalMs(type: TickFrequencyType): number {
        const frequency = this.config[type];
        return frequency > 0 ? 1000 / frequency : 1000; // Avoid division by zero
    }

    /**
     * Create a timer with configured frequency
     */
    static createTimer(
        scene: Scene,
        frequencyType: TickFrequencyType,
        callback: () => void,
        timerName?: string
    ): () => void {
        const intervalMs = this.getIntervalMs(frequencyType);
        
        let isActive = true;
        let lastCallTime = 0;

        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!isActive) return;

            const currentTime = performance.now();
            if (currentTime - lastCallTime >= intervalMs) {
                callback();
                lastCallTime = currentTime;
            }
        });

        const cleanup = () => {
            isActive = false;
            scene.onBeforeRenderObservable.remove(observer);
            if (timerName) {
                this.activeTimers.delete(timerName);
            }
        };

        if (timerName) {
            // Clean up any existing timer with same name
            const existing = this.activeTimers.get(timerName);
            if (existing) existing();
            
            this.activeTimers.set(timerName, cleanup);
        }

        return cleanup;
    }

    /**
     * Create a one-shot timer (fires once after delay)
     */
    static createOneShotTimer(
        scene: Scene,
        delayMs: number,
        callback: () => void
    ): () => void {
        let isActive = true;
        const startTime = performance.now();

        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!isActive) return;

            const currentTime = performance.now();
            if (currentTime - startTime >= delayMs) {
                callback();
                isActive = false;
                scene.onBeforeRenderObservable.remove(observer);
            }
        });

        return () => {
            isActive = false;
            scene.onBeforeRenderObservable.remove(observer);
        };
    }

    /**
     * Create a repeating timer (fires repeatedly at interval)
     */
    static createRepeatingTimer(
        scene: Scene,
        intervalMs: number,
        callback: () => void
    ): () => void {
        let isActive = true;
        let lastCallTime = 0;

        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!isActive) return;

            const currentTime = performance.now();
            if (currentTime - lastCallTime >= intervalMs) {
                callback();
                lastCallTime = currentTime;
            }
        });

        return () => {
            isActive = false;
            scene.onBeforeRenderObservable.remove(observer);
        };
    }

    /**
     * Create multiple timers for different frequency needs
     */
    static createMultiFrequencyTimers(
        scene: Scene,
        callbacks: Partial<Record<TickFrequencyType, () => void>>,
        namePrefix: string = ''
    ): () => void {
        const cleanupFunctions: (() => void)[] = [];

        Object.entries(callbacks).forEach(([type, callback]) => {
            if (callback) {
                const timerName = namePrefix ? `${namePrefix}_${type}` : undefined;
                const cleanup = this.createTimer(
                    scene, 
                    type as TickFrequencyType, 
                    callback,
                    timerName
                );
                cleanupFunctions.push(cleanup);
            }
        });

        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }

    /**
     * Get debug info about active timers
     */
    static getDebugInfo(): { 
        config: TickFrequencyConfig; 
        activeTimers: string[];
        frequencyMs: Record<string, number>;
    } {
        const frequencyMs: Record<string, number> = {};
        Object.keys(this.config).forEach(key => {
            frequencyMs[key] = this.getIntervalMs(key as TickFrequencyType);
        });

        return {
            config: this.config,
            activeTimers: Array.from(this.activeTimers.keys()),
            frequencyMs
        };
    }

    /**
     * Cleanup all named timers
     */
    static cleanupAll(): void {
        this.activeTimers.forEach(cleanup => cleanup());
        this.activeTimers.clear();
        console.log('🧹 Cleaned up all configurable timers');
    }
}