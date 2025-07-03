/**
 * Event & Logging System
 * Simple fancy print messages with categories and levels
 */

export enum EventCategory {
    // Game/User events (visible to players) - ALWAYS enabled by default
    GAME = 'game',
    TRAIN = 'train',
    ENEMY = 'enemy',
    COMBAT = 'combat',
    ECONOMY = 'economy',
    STATION = 'station',
    
    // Technical/Debug events (for developers) - disabled by default, enable as needed
    RENDERING = 'rendering',
    ATTACHMENT = 'attachment',
    SYSTEM = 'system',
    UI = 'ui',
    
    // Error events - ALWAYS enabled
    ERROR = 'error'
}

/**
 * Categories that are enabled by default (game events + errors)
 */
export const DEFAULT_ENABLED_CATEGORIES: EventCategory[] = [
    EventCategory.GAME,
    EventCategory.TRAIN,
    EventCategory.ENEMY,
    EventCategory.COMBAT,
    EventCategory.ECONOMY,
    EventCategory.STATION,
    EventCategory.ERROR
];

/**
 * Debug categories that can be enabled for specific development tasks
 */
export const DEBUG_CATEGORIES: EventCategory[] = [
    EventCategory.RENDERING,
    EventCategory.ATTACHMENT,
    EventCategory.SYSTEM,
    EventCategory.UI
];

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

export interface EventEntry {
    id: string;
    timestamp: number;
    category: EventCategory;
    level: LogLevel;
    type: string;
    message: string;
    context?: any;
    source?: string;
    isVerbose?: boolean; // High-frequency tick events
}

export interface EventStackConfig {
    // Buffer management
    maxBufferSize: number;
    
    // Output controls
    consoleOutputEnabled: boolean;
    fileLoggingEnabled: boolean;
    
    // Filtering
    enabledCategories: Set<EventCategory>;
    minLogLevel: LogLevel;
    showVerboseEvents: boolean; // Toggle for high-frequency events
}

export type EventListener = (entry: EventEntry) => void;

/**
 * Event Stack - handles all logging and events
 */
export class EventStack {
    private config: EventStackConfig;
    private eventBuffer: EventEntry[] = [];
    private listeners: EventListener[] = [];
    private eventIdCounter = 0;
    
    // Executable events (for game state changes)
    private gameEvents: Array<{ type: string; execute: () => void; payload?: any }> = [];

    // Subscribers for specific game events
    private eventSubscribers: Map<string, Array<(event: any) => void>> = new Map();

    constructor(config: Partial<EventStackConfig> = {}) {
        this.config = {
            maxBufferSize: 1000,
            consoleOutputEnabled: false, // Off by default as requested
            fileLoggingEnabled: true,
            enabledCategories: new Set(DEFAULT_ENABLED_CATEGORIES), // Only game events + errors by default
            minLogLevel: LogLevel.INFO,
            showVerboseEvents: false, // Simple boolean for high-frequency events
            ...config
        };

        this.info(EventCategory.SYSTEM, 'eventstack_init', 'Event Stack initialized', {
            showVerboseEvents: this.config.showVerboseEvents,
            minLogLevel: LogLevel[this.config.minLogLevel],
            enabledCategories: Array.from(this.config.enabledCategories),
            debugCategoriesAvailable: DEBUG_CATEGORIES
        });
    }

    /**
     * Core logging method - all other methods route through here
     */
    logEvent(
        category: EventCategory,
        level: LogLevel,
        type: string,
        message: string,
        context?: any,
        source?: string,
        isVerbose: boolean = false
    ): void {
        // Check if this event should be logged
        if (!this.shouldLogEvent(category, level, isVerbose)) {
            return;
        }

        const entry: EventEntry = {
            id: `evt_${++this.eventIdCounter}`,
            timestamp: Date.now(),
            category,
            level,
            type,
            message,
            context,
            source,
            isVerbose
        };

        this.addToBuffer(entry);

        // Output to console if enabled
        if (this.config.consoleOutputEnabled) {
            this.outputToConsole(entry);
        }

        // Notify listeners
        this.notifyListeners(entry);
    }

    /**
     * Convenience methods for different log levels
     */
    error(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.ERROR, type, message, context, source, isVerbose);
    }

    warn(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.WARN, type, message, context, source, isVerbose);
    }

    info(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.INFO, type, message, context, source, isVerbose);
    }

    debug(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.DEBUG, type, message, context, source, isVerbose);
    }

    /**
     * Game event management (executable events for state changes)
     */
    pushGameEvent(event: { type: string; execute: () => void; payload?: any; category?: EventCategory; message?: string }): void {
        this.gameEvents.push(event);
        
        this.debug(
            event.category || EventCategory.SYSTEM,
            'game_event_pushed',
            event.message || `Game event queued: ${event.type}`,
            event.payload,
            'GameEventQueue'
        );
    }

    processGameEvents(): void {
        let processedCount = 0;
        const startTime = performance.now();

        while (this.gameEvents.length > 0) {
            const event = this.gameEvents.shift();
            if (event) {
                try {
                    event.execute();
                    processedCount++;
                    
                    this.debug(
                        EventCategory.SYSTEM,
                        'game_event_executed',
                        `Game event executed: ${event.type}`,
                        event.payload,
                        'GameEventProcessor',
                        true // verbose = true for high frequency
                    );
                } catch (error) {
                    this.error(
                        EventCategory.ERROR,
                        'game_event_error',
                        `Error executing game event ${event.type}`,
                        { eventType: event.type, error: error.toString() },
                        'GameEventProcessor'
                    );
                }
            }
        }

        const processingTime = performance.now() - startTime;
        if (processedCount > 0) {
            this.debug(
                EventCategory.SYSTEM,
                'game_events_processed',
                `Processed ${processedCount} game events in ${processingTime.toFixed(2)}ms`,
                { count: processedCount, timeMs: processingTime },
                'GameEventProcessor',
                true // verbose = true for high frequency
            );
        }
    }

    isGameEventQueueEmpty(): boolean {
        return this.gameEvents.length === 0;
    }

    /**
     * Emit a game event (not a log event) that other systems can subscribe to
     */
    emit(event: { type: string; payload?: any; source?: string }): void {
        // Add to game events queue for processing
        this.pushGameEvent({
            type: event.type,
            execute: () => {
                // Notify specific event subscribers
                this.notifyEventSubscribers(event.type, event);
            },
            payload: event.payload
        });
        
        // Also log it as a debug event
        this.debug(
            EventCategory.GAME,
            'game_event_emitted',
            `Game event emitted: ${event.type}`,
            event.payload,
            event.source || 'Unknown'
        );
    }

    /**
     * Subscribe to specific game event types
     */
    subscribe(eventType: string, callback: (event: any) => void): () => void {
        if (!this.eventSubscribers.has(eventType)) {
            this.eventSubscribers.set(eventType, []);
        }
        
        this.eventSubscribers.get(eventType)!.push(callback);
        
        this.debug(
            EventCategory.SYSTEM,
            'event_subscription',
            `Subscribed to event type: ${eventType}`,
            { eventType },
            'EventStack'
        );
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.eventSubscribers.get(eventType);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Notify subscribers of specific event types
     */
    private notifyEventSubscribers(eventType: string, event: any): void {
        const callbacks = this.eventSubscribers.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    this.error(
                        EventCategory.ERROR,
                        'event_callback_error',
                        `Error in event subscriber for ${eventType}`,
                        { eventType, error: error.toString() },
                        'EventStack'
                    );
                }
            });
        }
    }

    /**
     * Buffer management
     */
    private addToBuffer(entry: EventEntry): void {
        this.eventBuffer.push(entry);
        this.trimBuffer();
    }

    private trimBuffer(): void {
        // Remove old entries by size only
        while (this.eventBuffer.length > this.config.maxBufferSize) {
            this.eventBuffer.shift();
        }
    }

    /**
     * Filtering logic
     */
    private shouldLogEvent(category: EventCategory, level: LogLevel, isVerbose: boolean = false): boolean {
        if (!this.config.enabledCategories.has(category)) {
            return false;
        }

        if (level > this.config.minLogLevel) {
            return false;
        }

        // Filter out verbose events if showVerboseEvents is false
        if (isVerbose && !this.config.showVerboseEvents) {
            return false;
        }

        return true;
    }

    /**
     * Output methods
     */
    private outputToConsole(entry: EventEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const levelStr = LogLevel[entry.level];
        const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
        const sourceStr = entry.source ? ` [${entry.source}]` : '';
        const verboseStr = entry.isVerbose ? ' [VERBOSE]' : '';
        
        const logMessage = `[${timestamp}] [${levelStr}] [${entry.category.toUpperCase()}]${verboseStr} ${entry.message}${sourceStr}${contextStr}`;

        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(logMessage);
                break;
            case LogLevel.WARN:
                console.warn(logMessage);
                break;
            case LogLevel.DEBUG:
                console.debug(logMessage);
                break;
            default:
                console.log(logMessage);
                break;
        }
    }

    /**
     * Event listeners for UI integration
     */
    addListener(listener: EventListener): void {
        this.listeners.push(listener);
    }

    removeListener(listener: EventListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Subscribe to event log entries (UI compatibility method)
     * Returns an unsubscribe function
     */
    onEventLog(callback: (entry: EventEntry) => void): () => void {
        this.addListener(callback);
        return () => this.removeListener(callback);
    }

    private notifyListeners(entry: EventEntry): void {
        this.listeners.forEach(listener => {
            try {
                listener(entry);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    /**
     * Data access methods
     */
    getAllEvents(): EventEntry[] {
        return [...this.eventBuffer].sort((a, b) => a.timestamp - b.timestamp);
    }

    getEventsByCategory(category: EventCategory): EventEntry[] {
        return this.getAllEvents().filter(entry => entry.category === category);
    }

    getEventsByLevel(level: LogLevel): EventEntry[] {
        return this.getAllEvents().filter(entry => entry.level === level);
    }

    getRecentEvents(maxCount: number = 100): EventEntry[] {
        return this.getAllEvents().slice(-maxCount);
    }

    /**
     * Get recent event log entries (UI compatibility method)
     */
    getRecentEventLog(maxCount: number = 100): EventEntry[] {
        return this.getRecentEvents(maxCount);
    }

    /**
     * Configuration management
     */
    updateConfig(updates: Partial<EventStackConfig>): void {
        this.config = { ...this.config, ...updates };
        
        this.info(EventCategory.SYSTEM, 'config_updated', 'Event stack configuration updated', {
            updates: Object.keys(updates)
        });
    }

    getConfig(): Readonly<EventStackConfig> {
        return { ...this.config };
    }

    toggleConsoleOutput(): boolean {
        this.config.consoleOutputEnabled = !this.config.consoleOutputEnabled;
        this.info(EventCategory.SYSTEM, 'console_output_toggled', 
            `Console output ${this.config.consoleOutputEnabled ? 'enabled' : 'disabled'}`);
        return this.config.consoleOutputEnabled;
    }

    /**
     * Toggle verbose mode (high-frequency events) at runtime
     */
    toggleVerboseMode(): boolean {
        this.config.showVerboseEvents = !this.config.showVerboseEvents;
        
        this.info(EventCategory.SYSTEM, 'verbose_mode_toggled', 
            `Verbose mode (high-frequency events) ${this.config.showVerboseEvents ? 'enabled' : 'disabled'}`);
        return this.config.showVerboseEvents;
    }

    /**
     * File export functionality
     */
    async exportLogs(): Promise<void> {
        if (!this.config.fileLoggingEnabled) {
            this.warn(EventCategory.SYSTEM, 'export_disabled', 'File logging is disabled');
            return;
        }

        const allEvents = this.getAllEvents();
        if (allEvents.length === 0) {
            this.warn(EventCategory.SYSTEM, 'export_empty', 'No events to export');
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `game_events_${timestamp}.txt`;
            
            const logContent = this.formatEventsForExport(allEvents);
            
            if (typeof window !== 'undefined') {
                // Browser environment - download file
                const blob = new Blob([logContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.info(EventCategory.SYSTEM, 'logs_exported', `Events exported to ${filename}`, {
                    eventCount: allEvents.length,
                    filename
                });
            } else {
                // Node.js environment - write to file system
                const fs = require('fs');
                const path = require('path');
                
                const logDir = path.join(process.cwd(), 'src', 'utils', 'log_output');
                const logPath = path.join(logDir, filename);
                
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                
                fs.writeFileSync(logPath, logContent);
                this.info(EventCategory.SYSTEM, 'logs_exported', `Events exported to ${logPath}`, {
                    eventCount: allEvents.length,
                    path: logPath
                });
            }
        } catch (error) {
            this.error(EventCategory.ERROR, 'export_failed', 'Failed to export logs', { error: error.toString() });
        }
    }

    private formatEventsForExport(events: EventEntry[]): string {
        const header = `=== Game Event Log Export ===\n`;
        const metadata = `Export Time: ${new Date().toISOString()}\n`;
        const stats = `Total Events: ${events.length}\n`;
        const config = `Config: ${JSON.stringify(this.config, null, 2)}\n`;
        const separator = `${'='.repeat(50)}\n\n`;
        
        const eventLines = events.map(entry => {
            const timestamp = new Date(entry.timestamp).toISOString();
            const level = LogLevel[entry.level];
            const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
            const sourceStr = entry.source ? ` [${entry.source}]` : '';
            
            return `[${timestamp}] [${level}] [${entry.category.toUpperCase()}] [${entry.type}] ${entry.message}${sourceStr}${contextStr}`;
        }).join('\n');
        
        return header + metadata + stats + config + separator + eventLines;
    }

    /**
     * Cleanup methods
     */
    clearLogs(): void {
        const totalCleared = this.eventBuffer.length;
        this.eventBuffer = [];
        
        this.info(EventCategory.SYSTEM, 'logs_cleared', `Cleared ${totalCleared} events`);
    }

    dispose(): void {
        this.clearLogs();
        this.listeners = [];
        this.gameEvents = [];
        this.info(EventCategory.SYSTEM, 'eventstack_disposed', 'Event stack disposed');
    }

    /**
     * Scene-level debug category management
     */
    
    /**
     * Enable a debug category for development work
     */
    enableDebugCategory(category: EventCategory): boolean {
        if (!DEBUG_CATEGORIES.includes(category)) {
            this.warn(EventCategory.SYSTEM, 'invalid_debug_category', 
                `Cannot enable ${category} - not a debug category`, 
                { category, availableDebugCategories: DEBUG_CATEGORIES });
            return false;
        }
        
        const wasEnabled = this.config.enabledCategories.has(category);
        this.config.enabledCategories.add(category);
        
        if (!wasEnabled) {
            this.info(EventCategory.SYSTEM, 'debug_category_enabled', 
                `Debug category '${category}' enabled for this session`, 
                { category, totalEnabledCategories: this.config.enabledCategories.size });
        }
        
        return true;
    }
    
    /**
     * Disable a debug category to reduce log noise
     */
    disableDebugCategory(category: EventCategory): boolean {
        if (category === EventCategory.ERROR) {
            this.warn(EventCategory.SYSTEM, 'cannot_disable_errors', 
                'Cannot disable ERROR category - errors are always logged');
            return false;
        }
        
        const wasEnabled = this.config.enabledCategories.has(category);
        this.config.enabledCategories.delete(category);
        
        if (wasEnabled) {
            this.info(EventCategory.SYSTEM, 'debug_category_disabled', 
                `Debug category '${category}' disabled for this session`, 
                { category, totalEnabledCategories: this.config.enabledCategories.size });
        }
        
        return true;
    }
    
    /**
     * Enable multiple debug categories at once
     */
    enableDebugCategories(categories: EventCategory[]): EventCategory[] {
        const enabled: EventCategory[] = [];
        categories.forEach(category => {
            if (this.enableDebugCategory(category)) {
                enabled.push(category);
            }
        });
        
        if (enabled.length > 0) {
            this.info(EventCategory.SYSTEM, 'multiple_debug_categories_enabled', 
                `Enabled ${enabled.length} debug categories`, 
                { enabledCategories: enabled });
        }
        
        return enabled;
    }
    
    /**
     * Disable multiple debug categories at once
     */
    disableDebugCategories(categories: EventCategory[]): EventCategory[] {
        const disabled: EventCategory[] = [];
        categories.forEach(category => {
            if (this.disableDebugCategory(category)) {
                disabled.push(category);
            }
        });
        
        if (disabled.length > 0) {
            this.info(EventCategory.SYSTEM, 'multiple_debug_categories_disabled', 
                `Disabled ${disabled.length} debug categories`, 
                { disabledCategories: disabled });
        }
        
        return disabled;
    }
    
    /**
     * Enable all debug categories (for comprehensive debugging)
     */
    enableAllDebugCategories(): void {
        const previouslyEnabled = Array.from(this.config.enabledCategories);
        DEBUG_CATEGORIES.forEach(category => {
            this.config.enabledCategories.add(category);
        });
        
        this.info(EventCategory.SYSTEM, 'all_debug_categories_enabled', 
            'All debug categories enabled for comprehensive debugging', 
            { 
                previouslyEnabled,
                nowEnabled: Array.from(this.config.enabledCategories),
                debugCategoriesEnabled: DEBUG_CATEGORIES
            });
    }
    
    /**
     * Reset to default categories (game events + errors only)
     */
    resetToDefaultCategories(): void {
        const previousCategories = Array.from(this.config.enabledCategories);
        this.config.enabledCategories = new Set(DEFAULT_ENABLED_CATEGORIES);
        
        this.info(EventCategory.SYSTEM, 'categories_reset_to_default', 
            'Event categories reset to default (game events + errors only)', 
            { 
                previousCategories,
                defaultCategories: DEFAULT_ENABLED_CATEGORIES,
                disabledDebugCategories: DEBUG_CATEGORIES
            });
    }
    
    /**
     * Get current category status
     */
    getCategoryStatus(): { enabled: EventCategory[], disabled: EventCategory[], debugAvailable: EventCategory[] } {
        const allCategories = Object.values(EventCategory);
        const enabled = allCategories.filter(cat => this.config.enabledCategories.has(cat));
        const disabled = allCategories.filter(cat => !this.config.enabledCategories.has(cat));
        
        return {
            enabled,
            disabled,
            debugAvailable: DEBUG_CATEGORIES
        };
    }
}

// Create and export the global eventStack instance
export const eventStack = new EventStack();

// Type alias for backward compatibility with UI
export type EventLogEntry = EventEntry;

// =============================================================================
// GLOBAL CONVENIENCE FUNCTIONS for Debug Category Management
// =============================================================================

/**
 * Quick functions for enabling debug categories during development
 * These can be called from anywhere in the codebase or browser console
 */

// Enable specific debug categories
export const enableRenderingDebug = () => eventStack.enableDebugCategory(EventCategory.RENDERING);
export const enableSystemDebug = () => eventStack.enableDebugCategory(EventCategory.SYSTEM);
export const enableUIDebug = () => eventStack.enableDebugCategory(EventCategory.UI);
export const enableAttachmentDebug = () => eventStack.enableDebugCategory(EventCategory.ATTACHMENT);

// Disable specific debug categories
export const disableRenderingDebug = () => eventStack.disableDebugCategory(EventCategory.RENDERING);
export const disableSystemDebug = () => eventStack.disableDebugCategory(EventCategory.SYSTEM);
export const disableUIDebug = () => eventStack.disableDebugCategory(EventCategory.UI);
export const disableAttachmentDebug = () => eventStack.disableDebugCategory(EventCategory.ATTACHMENT);

// Bulk operations
export const enableAllDebugCategories = () => eventStack.enableAllDebugCategories();
export const resetToGameEventsOnly = () => eventStack.resetToDefaultCategories();

// Status checking
export const getDebugCategoryStatus = () => eventStack.getCategoryStatus();

// Quick debug category combinations for common development scenarios
export const enableCombatDebug = () => {
    eventStack.enableDebugCategories([EventCategory.ATTACHMENT, EventCategory.SYSTEM]);
    eventStack.info(EventCategory.SYSTEM, 'combat_debug_enabled', 
        'Combat debug mode enabled - showing attachment and system events');
};

export const enableVisualDebug = () => {
    eventStack.enableDebugCategories([EventCategory.RENDERING, EventCategory.UI]);
    eventStack.info(EventCategory.SYSTEM, 'visual_debug_enabled', 
        'Visual debug mode enabled - showing rendering and UI events');
};

export const enableTrainDebug = () => {
    eventStack.enableDebugCategories([EventCategory.SYSTEM]);
    eventStack.info(EventCategory.SYSTEM, 'train_debug_enabled', 
        'Train debug mode enabled - showing system events for train operations');
};
