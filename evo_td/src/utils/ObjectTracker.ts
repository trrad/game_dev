/**
 * Tracks all active game objects for debugging and memory management.
 * Helps identify memory leaks and track object lifecycles.
 */
import type { GameObject } from '../core/GameObject';
import { Logger, LogCategory } from './Logger';

export class ObjectTracker {
    private static objects: Map<string, GameObject> = new Map();
    private static typeCount: Map<string, number> = new Map();

    /**
     * Register a new GameObject.
     */
    static register(obj: GameObject): void {
        this.objects.set(obj.id, obj);
        const count = (this.typeCount.get(obj.type) ?? 0) + 1;
        this.typeCount.set(obj.type, count);

        Logger.debug(LogCategory.SYSTEM, `Object registered: ${obj.id}`, {
            type: obj.type,
            totalCount: this.objects.size,
            typeCount: count
        });
    }

    /**
     * Unregister a disposed GameObject.
     */
    static unregister(obj: GameObject): void {
        if (this.objects.delete(obj.id)) {
            const count = (this.typeCount.get(obj.type) ?? 1) - 1;
            this.typeCount.set(obj.type, count);

            Logger.debug(LogCategory.SYSTEM, `Object unregistered: ${obj.id}`, {
                type: obj.type,
                totalCount: this.objects.size,
                typeCount: count
            });
        }
    }

    /**
     * Get count of active objects by type.
     */
    static getTypeCount(type: string): number {
        return this.typeCount.get(type) ?? 0;
    }

    /**
     * Get all active objects of a specific type.
     */
    static getObjectsByType(type: string): GameObject[] {
        return Array.from(this.objects.values())
            .filter(obj => obj.type === type);
    }

    /**
     * Get total count of active objects.
     */
    static getTotalCount(): number {
        return this.objects.size;
    }

    /**
     * Get object by ID.
     */
    static getById(id: string): GameObject | undefined {
        return this.objects.get(id);
    }

    /**
     * Get summary of active objects.
     */
    static getStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        this.typeCount.forEach((count, type) => {
            stats[type] = count;
        });
        return stats;
    }

    /**
     * Clear all tracking data.
     * Should only be used when resetting the game state.
     */
    static clear(): void {
        this.objects.clear();
        this.typeCount.clear();
        Logger.debug(LogCategory.SYSTEM, 'ObjectTracker cleared');
    }
}
