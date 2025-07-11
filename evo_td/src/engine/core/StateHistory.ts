// src/engine/core/StateHistory.ts

/**
 * StateHistory - Efficient time-based state recording for lag compensation
 * 
 * Uses a ring buffer to store property changes over time, allowing
 * entities to be rewound to any point within the history window.
 * 
 * @example
 * ```typescript
 * const history = new StateHistory(1000); // 1 second buffer
 * 
 * // Record changes
 * history.record('position', new Vector3(5, 0, 5), Date.now());
 * history.record('health', 80, Date.now());
 * 
 * // Get state at specific time
 * const stateAt500msAgo = history.getStateAt(Date.now() - 500);
 * ```
 */
export class StateHistory {
    private changes: Array<StateChange> = [];
    private maxAge: number;
    private maxEntries: number;
    private lastCleanup: number = Date.now();
    private readonly CLEANUP_INTERVAL = 100; // ms
    
    // Performance tracking
    private stats = {
        totalRecorded: 0,
        totalCleanups: 0,
        averageChangeRate: 0
    };

    constructor(maxAge: number = 1000, maxEntries: number = 10000) {
        this.maxAge = maxAge;
        this.maxEntries = maxEntries;
    }

    /**
     * Record a property change
     */
    record(propertyName: string, value: any, timestamp: number = Date.now()): void {
        // Clone certain types to avoid reference issues
        const clonedValue = this.cloneValue(value);
        
        this.changes.push({
            timestamp,
            propertyName,
            value: clonedValue
        });
        
        this.stats.totalRecorded++;
        
        // Periodic cleanup to maintain performance
        if (Date.now() - this.lastCleanup > this.CLEANUP_INTERVAL) {
            this.cleanup();
        }
    }

    /**
     * Get complete state at a specific timestamp
     * Returns a Map of property name -> value at that point in time
     */
    getStateAt(timestamp: number): Map<string, any> {
        const state = new Map<string, any>();
        
        // Binary search for efficiency with large histories
        const startIndex = this.findFirstChangeAfter(timestamp - this.maxAge);
        
        // Apply all changes up to the requested timestamp
        for (let i = startIndex; i < this.changes.length; i++) {
            const change = this.changes[i];
            if (change.timestamp > timestamp) break;
            
            state.set(change.propertyName, change.value);
        }
        
        return state;
    }

    /**
     * Get the value of a specific property at a timestamp
     * More efficient than getStateAt if you only need one property
     */
    getPropertyAt(propertyName: string, timestamp: number): any {
        // Search backwards for most recent change before timestamp
        for (let i = this.changes.length - 1; i >= 0; i--) {
            const change = this.changes[i];
            if (change.propertyName === propertyName && change.timestamp <= timestamp) {
                return change.value;
            }
        }
        return undefined;
    }

    /**
     * Get all changes between two timestamps
     * Useful for debugging or replay visualization
     */
    getChangesBetween(startTime: number, endTime: number): StateChange[] {
        const startIndex = this.findFirstChangeAfter(startTime);
        const changes: StateChange[] = [];
        
        for (let i = startIndex; i < this.changes.length; i++) {
            const change = this.changes[i];
            if (change.timestamp > endTime) break;
            if (change.timestamp >= startTime) {
                changes.push(change);
            }
        }
        
        return changes;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.changes = [];
        this.lastCleanup = Date.now();
    }

    /**
     * Get current memory usage statistics
     */
    getStats(): StateHistoryStats {
        return {
            ...this.stats,
            currentEntries: this.changes.length,
            oldestEntry: this.changes[0]?.timestamp || 0,
            newestEntry: this.changes[this.changes.length - 1]?.timestamp || 0,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Clean up old entries
     */
    private cleanup(): void {
        const cutoffTime = Date.now() - this.maxAge;
        const cutoffIndex = this.findFirstChangeAfter(cutoffTime);
        
        if (cutoffIndex > 0) {
            this.changes = this.changes.slice(cutoffIndex);
        }
        
        // Also enforce max entries limit
        if (this.changes.length > this.maxEntries) {
            this.changes = this.changes.slice(-this.maxEntries);
        }
        
        this.lastCleanup = Date.now();
        this.stats.totalCleanups++;
    }

    /**
     * Binary search for first change after timestamp
     */
    private findFirstChangeAfter(timestamp: number): number {
        let left = 0;
        let right = this.changes.length - 1;
        let result = 0;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.changes[mid].timestamp >= timestamp) {
                result = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        
        return result;
    }

    /**
     * Clone value to avoid reference mutations
     */
    private cloneValue(value: any): any {
        if (value === null || value === undefined) return value;
        
        // Primitives
        if (typeof value !== 'object') return value;
        
        // Vector3
        if (value.clone && typeof value.clone === 'function') {
            return value.clone();
        }
        
        // Arrays
        if (Array.isArray(value)) {
            return [...value];
        }
        
        // Plain objects
        if (value.constructor === Object) {
            return { ...value };
        }
        
        // Maps
        if (value instanceof Map) {
            return new Map(value);
        }
        
        // Sets
        if (value instanceof Set) {
            return new Set(value);
        }
        
        // Default: return as-is (might be a class instance)
        return value;
    }

    /**
     * Estimate memory usage in bytes
     */
    private estimateMemoryUsage(): number {
        // Rough estimate: 50 bytes per change average
        return this.changes.length * 50;
    }
}

/**
 * Interface for a single state change
 */
export interface StateChange {
    timestamp: number;
    propertyName: string;
    value: any;
}

/**
 * Statistics about the state history
 */
export interface StateHistoryStats {
    totalRecorded: number;
    totalCleanups: number;
    currentEntries: number;
    oldestEntry: number;
    newestEntry: number;
    memoryUsage: number;
    averageChangeRate: number;
}