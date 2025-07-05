/**
 * COMPATIBILITY WRAPPER - Logger/LogCategory for existing codebase
 * This file now logs directly to the console (EventStack removed for migration).
 */

/**
 * Legacy LogCategory enum for backward compatibility
 */
export enum LogCategory {
    SYSTEM = 'system',
    RENDERING = 'rendering',
    UI = 'ui',
    TRAIN = 'train',
    ENEMY = 'enemy',
    COMBAT = 'combat',
    ECONOMY = 'economy',
    STATION = 'station',
    ATTACHMENT = 'attachment',
    ERROR = 'error',
    GAME = 'game',
    NETWORK = 'network',
    PERFORMANCE = 'performance',
    DEBUG = 'debug'
}

/**
 * Logger compatibility wrapper - maintains exact same API as old Logger
 * All calls now log to the console only.
 */
export class Logger {
    /**
     * Legacy log method - now logs to console
     */
    static log(category: LogCategory | string, message: any, context?: any): void {
        const cat = Logger.mapCategory(category);
        const msg = Logger.stringifyMessage(message);
        if (context) {
            console.log(`[${cat}]`, msg, context);
        } else {
            console.log(`[${cat}]`, msg);
        }
    }
    
    /**
     * Legacy warn method - now logs to console
     */
    static warn(category: LogCategory | string, message: any, context?: any): void {
        const cat = Logger.mapCategory(category);
        const msg = Logger.stringifyMessage(message);
        if (context) {
            console.warn(`[${cat}]`, msg, context);
        } else {
            console.warn(`[${cat}]`, msg);
        }
    }
    
    /**
     * Legacy error method - now logs to console
     */
    static error(category: LogCategory | string, message: any, context?: any): void {
        const cat = Logger.mapCategory(category);
        const msg = Logger.stringifyMessage(message);
        if (context) {
            console.error(`[${cat}]`, msg, context);
        } else {
            console.error(`[${cat}]`, msg);
        }
    }
    
    /**
     * Legacy debug method - now logs to console
     */
    static debug(category: LogCategory | string, message: any, context?: any): void {
        const cat = Logger.mapCategory(category);
        const msg = Logger.stringifyMessage(message);
        if (context) {
            console.debug(`[${cat}]`, msg, context);
        } else {
            console.debug(`[${cat}]`, msg);
        }
    }
    
    /**
     * Map legacy LogCategory to string
     */
    private static mapCategory(category: LogCategory | string): string {
        if (typeof category === 'string') return category;
        return category as string;
    }
    
    /**
     * Stringify message if it's an object or array, otherwise return as string
     */
    private static stringifyMessage(message: any): string {
        if (typeof message === 'string') return message;
        if (typeof message === 'number' || typeof message === 'boolean') return message.toString();
        if (message === null || message === undefined) return String(message);
        try {
            return JSON.stringify(message, null, 2);
        } catch {
            return String(message);
        }
    }
}
