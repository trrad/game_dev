/**
 * Compatibility layer for transitioning from old logging systems to UnifiedLogger
 * Provides backward compatibility while encouraging migration to new system
 */

import { logger, EventCategory, LogLevel } from './UnifiedLogger';

/**
 * Legacy Logger compatibility
 * Redirects old Logger.log calls to the new unified system
 */
export class LegacyLoggerCompat {
    /**
     * Legacy log method - maps to unified logger
     */
    static log(category: EventCategory, message: string, context?: any): void {
        logger.info(category, 'legacy_log', message, context, 'LegacyLogger');
    }

    /**
     * Legacy error method - maps to unified logger
     */
    static error(category: EventCategory, message: string, error: Error | any): void {
        const context = {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        };
        logger.error(category, 'legacy_error', message, context, 'LegacyLogger');
    }

    /**
     * Legacy warn method - maps to unified logger
     */
    static warn(category: EventCategory, message: string, context?: any): void {
        logger.warn(category, 'legacy_warn', message, context, 'LegacyLogger');
    }

    /**
     * Legacy debug method - maps to unified logger
     */
    static debug(category: EventCategory, message: string, context?: any): void {
        logger.debug(category, 'legacy_debug', message, context, 'LegacyLogger');
    }

    /**
     * Legacy file export - maps to unified logger
     */
    static async exportLogsToFile(): Promise<void> {
        await logger.exportLogs();
    }

    /**
     * Legacy save on exit - maps to unified logger
     */
    static async saveLogsOnExit(): Promise<void> {
        await logger.exportLogs();
    }

    /**
     * Legacy synchronous save - maps to unified logger
     */
    static saveLogsOnExitSync(): void {
        // For sync operations, we'll just export asynchronously
        logger.exportLogs();
    }

    /**
     * Legacy clear method - maps to unified logger
     */
    static clearAllLogs(): void {
        logger.clearLogs();
    }

    /**
     * Legacy history getter - maps to unified logger
     */
    static getHistory(): any[] {
        return logger.getLogBuffer().map(entry => ({
            timestamp: entry.timestamp,
            category: entry.category,
            level: entry.level === LogLevel.INFO ? 'INFO' : 
                   entry.level === LogLevel.WARN ? 'WARN' :
                   entry.level === LogLevel.ERROR ? 'ERROR' : 'DEBUG',
            message: entry.message,
            context: entry.context
        }));
    }

    /**
     * Legacy enabled categories setter
     */
    static setEnabledCategories(categories: EventCategory[]): void {
        logger.updateConfig({
            enabledCategories: new Set(categories)
        });
    }

    /**
     * Legacy file logging initialization
     */
    static async initializeFileLogging(): Promise<void> {
        logger.updateConfig({ fileLoggingEnabled: true });
        logger.info(EventCategory.SYSTEM, 'logging_init', 'Legacy file logging compatibility initialized');
    }
}

/**
 * Enhanced EventStack compatibility
 * Provides unified interface for both events and logging
 */
export class UnifiedEventStack {
    private gameEvents: Array<{ type: string; execute: () => void; payload?: any }> = [];

    /**
     * Push a game event (executable)
     */
    push(event: { type: string; execute: () => void; payload?: any; category?: EventCategory; message?: string }): void {
        this.gameEvents.push(event);
        
        // Log the event being pushed
        logger.debug(
            event.category || EventCategory.SYSTEM,
            'event_pushed',
            event.message || `Game event pushed: ${event.type}`,
            event.payload,
            'EventStack'
        );
    }

    /**
     * Process all game events
     */
    processAll(): void {
        let processedCount = 0;
        while (this.gameEvents.length > 0) {
            const event = this.gameEvents.shift();
            if (event) {
                try {
                    event.execute();
                    processedCount++;
                    
                    logger.verbose(
                        EventCategory.SYSTEM,
                        'event_executed',
                        `Event executed: ${event.type}`,
                        event.payload,
                        'EventStack'
                    );
                } catch (error) {
                    logger.error(
                        EventCategory.ERROR,
                        'event_execution_error',
                        `Error executing event ${event.type}`,
                        { originalEvent: event.type, error: error.toString() },
                        'EventStack'
                    );
                }
            }
        }

        if (processedCount > 0) {
            logger.verbose(
                EventCategory.SYSTEM,
                'events_processed',
                `Processed ${processedCount} game events`,
                { count: processedCount },
                'EventStack'
            );
        }
    }

    /**
     * Check if event stack is empty
     */
    isEmpty(): boolean {
        return this.gameEvents.length === 0;
    }

    /**
     * Log an event directly (non-executable)
     * This is the main method that should be used for logging
     */
    logEvent(category: EventCategory, type: string, message: string, payload?: any, level: LogLevel = LogLevel.INFO): void {
        logger.log(category, level, type, message, payload, 'EventStack');
    }

    /**
     * Convenience methods for different log levels
     */
    logInfo(category: EventCategory, type: string, message: string, payload?: any): void {
        this.logEvent(category, type, message, payload, LogLevel.INFO);
    }

    logDebug(category: EventCategory, type: string, message: string, payload?: any): void {
        this.logEvent(category, type, message, payload, LogLevel.DEBUG);
    }

    logWarn(category: EventCategory, type: string, message: string, payload?: any): void {
        this.logEvent(category, type, message, payload, LogLevel.WARN);
    }

    logError(category: EventCategory, type: string, message: string, payload?: any): void {
        this.logEvent(category, type, message, payload, LogLevel.ERROR);
    }

    logVerbose(category: EventCategory, type: string, message: string, payload?: any): void {
        this.logEvent(category, type, message, payload, LogLevel.VERBOSE);
    }

    /**
     * Subscribe to log events for UI display
     */
    addLogListener(callback: (entry: any) => void): void {
        logger.addListener((entry) => {
            // Convert to EventStack format for compatibility
            callback({
                timestamp: entry.timestamp,
                category: entry.category,
                type: entry.type,
                message: entry.message,
                payload: entry.context
            });
        });
    }

    /**
     * Get current log entries for UI display
     */
    getEventLog(): any[] {
        return logger.getLogBuffer().map(entry => ({
            timestamp: entry.timestamp,
            category: entry.category,
            type: entry.type,
            message: entry.message,
            payload: entry.context
        }));
    }
}

// Create global compatibility instances
export const Logger = LegacyLoggerCompat;
export const EventStack = UnifiedEventStack;
