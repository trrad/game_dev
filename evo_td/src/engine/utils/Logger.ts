/**
 * COMPATIBILITY WRAPPER - Logger/LogCategory for existing codebase
 * This file now forwards all logging calls to the new EventStack system
 * All calls are translated and forwarded to src/core/EventStack.ts
 */

import { eventStack, EventCategory } from "../core/EventStack";

/**
 * Legacy LogCategory enum for backward compatibility
 * Maps old categories to new EventCategory values
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
    NETWORK = 'network',  // Maps to SYSTEM
    PERFORMANCE = 'performance',  // Maps to SYSTEM
    DEBUG = 'debug'  // Maps to SYSTEM
}

/**
 * Logger compatibility wrapper - maintains exact same API as old Logger
 * All calls are forwarded to the new EventStack system
 */
export class Logger {
    /**
     * Legacy log method - translates to EventStack.info
     */
    static log(category: LogCategory | string, message: any, context?: any): void {
        // Map legacy categories to new EventCategory
        const eventCategory = Logger.mapCategory(category);
        
        // Ensure message is a string - stringify objects/arrays if needed
        const messageStr = Logger.stringifyMessage(message);
        
        // Generate a simple type from the message
        const type = Logger.generateType(messageStr);
        
        // Forward to eventStack.info
        eventStack.info(eventCategory, type, messageStr, context, 'Logger');
    }
    
    /**
     * Legacy warn method - translates to EventStack.warn
     */
    static warn(category: LogCategory | string, message: any, context?: any): void {
        const eventCategory = Logger.mapCategory(category);
        const messageStr = Logger.stringifyMessage(message);
        const type = Logger.generateType(messageStr);
        eventStack.warn(eventCategory, type, messageStr, context, 'Logger');
    }
    
    /**
     * Legacy error method - translates to EventStack.error
     */
    static error(category: LogCategory | string, message: any, context?: any): void {
        const eventCategory = Logger.mapCategory(category);
        const messageStr = Logger.stringifyMessage(message);
        const type = Logger.generateType(messageStr);
        eventStack.error(eventCategory, type, messageStr, context, 'Logger');
    }
    
    /**
     * Legacy debug method - translates to EventStack.debug
     */
    static debug(category: LogCategory | string, message: any, context?: any): void {
        const eventCategory = Logger.mapCategory(category);
        const messageStr = Logger.stringifyMessage(message);
        const type = Logger.generateType(messageStr);
        eventStack.debug(eventCategory, type, messageStr, context, 'Logger');
    }
    
    /**
     * Map legacy LogCategory to new EventCategory
     */
    private static mapCategory(category: LogCategory | string): EventCategory {
        let categoryStr: string;
        
        if (typeof category === 'string') {
            categoryStr = category;
        } else {
            // LogCategory enum values are already strings
            categoryStr = category as string;
        }
        
        switch (categoryStr.toLowerCase()) {
            case 'system': return EventCategory.SYSTEM;
            case 'rendering': return EventCategory.RENDERING;
            case 'ui': return EventCategory.UI;
            case 'train': return EventCategory.TRAIN;
            case 'enemy': return EventCategory.ENEMY;
            case 'combat': return EventCategory.COMBAT;
            case 'economy': return EventCategory.ECONOMY;
            case 'station': return EventCategory.STATION;
            case 'attachment': return EventCategory.ATTACHMENT;
            case 'error': return EventCategory.ERROR;
            case 'game': return EventCategory.GAME;
            case 'network': return EventCategory.SYSTEM;  // Map to SYSTEM
            case 'performance': return EventCategory.SYSTEM;  // Map to SYSTEM
            case 'debug': return EventCategory.SYSTEM;  // Map to SYSTEM
            default: return EventCategory.SYSTEM;  // Default fallback
        }
    }
    
    /**
     * Stringify message if it's an object or array, otherwise return as string
     */
    private static stringifyMessage(message: any): string {
        if (typeof message === 'string') {
            return message;
        }
        if (typeof message === 'number' || typeof message === 'boolean') {
            return message.toString();
        }
        if (message === null || message === undefined) {
            return String(message);
        }
        
        // For objects and arrays, stringify them
        try {
            return JSON.stringify(message, null, 2);
        } catch (error) {
            // Fallback if JSON.stringify fails (circular references, etc.)
            return String(message);
        }
    }
    
    /**
     * Generate a simple event type from the message
     */
    private static generateType(message: string): string {
        // Simple type generation - take first few words and make snake_case
        const words = message.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
            .split(/\s+/)  // Split on whitespace
            .filter(word => word.length > 0)  // Remove empty
            .slice(0, 3);  // Take first 3 words
        
        return words.join('_') || 'log_event';
    }
}

