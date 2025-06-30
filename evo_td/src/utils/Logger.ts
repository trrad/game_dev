/**
 * Structured logging system with categories and context.
 * Supports debug levels, metrics tracking, and error reporting.
 */

export enum LogCategory {
    TRAIN = 'train',
    ENEMY = 'enemy',
    NETWORK = 'network',
    ECONOMY = 'economy',
    ATTACHMENT = 'attachment',
    PERFORMANCE = 'performance',
    SYSTEM = 'system',
    UI = 'ui',
    RENDERING = 'rendering',
    ERROR = 'error',
    DEBUG = 'debug'
}

export interface LogEntry {
    timestamp: number;
    category: LogCategory;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    context?: any;
}

/**
 * Central logging system that supports structured logging with categories and context.
 */
export class Logger {
    private static enabledCategories: Set<LogCategory> = new Set([
        LogCategory.TRAIN,
        LogCategory.ENEMY,
        LogCategory.UI,
        LogCategory.NETWORK,
        LogCategory.ECONOMY,
        LogCategory.ATTACHMENT,
        LogCategory.PERFORMANCE,
        LogCategory.SYSTEM,
        LogCategory.RENDERING
    ]);
    private static logHistory: LogEntry[] = [];
    private static readonly MAX_HISTORY = 1000;

    /**
     * Enable specific logging categories.
     */
    static setEnabledCategories(categories: LogCategory[]): void {
        this.enabledCategories = new Set(categories);
    }

    /**
     * Log an info message.
     */
    static log(category: LogCategory, message: string, context?: any): void {
        if (!this.enabledCategories.has(category)) return;

        const entry: LogEntry = {
            timestamp: performance.now(),
            category,
            level: 'INFO',
            message,
            context
        };

        console.log(`[${category.toUpperCase()}] ${message}`, context ?? '');
        this.addToHistory(entry);
    }

    /**
     * Log an error message.
     */
    static error(category: LogCategory, message: string, error: Error | any): void {
        const entry: LogEntry = {
            timestamp: performance.now(),
            category,
            level: 'ERROR',
            message,
            context: {
                name: error?.name,
                message: error?.message,
                stack: error?.stack
            }
        };

        console.error(`[${category.toUpperCase()}] ERROR: ${message}`, error);
        this.addToHistory(entry);
    }

    /**
     * Log a warning message.
     */
    static warn(category: LogCategory, message: string, context?: any): void {
        const entry: LogEntry = {
            timestamp: performance.now(),
            category,
            level: 'WARN',
            message,
            context
        };

        console.warn(`[${category.toUpperCase()}] WARN: ${message}`, context ?? '');
        this.addToHistory(entry);
    }

    /**
     * Log a debug message.
     */
    static debug(category: LogCategory, message: string, context?: any): void {
        if (!this.enabledCategories.has(category)) return;

        const entry: LogEntry = {
            timestamp: performance.now(),
            category,
            level: 'DEBUG',
            message,
            context
        };

        console.debug(`[${category.toUpperCase()}] DEBUG: ${message}`, context ?? '');
        this.addToHistory(entry);
    }

    /**
     * Get recent log history.
     */
    static getHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    /**
     * Clear log history.
     */
    static clearHistory(): void {
        this.logHistory = [];
    }

    private static addToHistory(entry: LogEntry): void {
        this.logHistory.push(entry);
        if (this.logHistory.length > this.MAX_HISTORY) {
            this.logHistory.shift();
        }
    }
}
