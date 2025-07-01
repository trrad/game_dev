/**
 * Unified Event & Logging System
 * Simple fancy print messages with categories and levels
 */

export enum EventCategory {
    // Game/User events (visible to players)
    GAME = 'game',
    TRAIN = 'train',
    ENEMY = 'enemy',
    COMBAT = 'combat',
    ECONOMY = 'economy',
    STATION = 'station',
    
    // Technical/Debug events (for developers)
    RENDERING = 'rendering',
    ATTACHMENT = 'attachment',
    SYSTEM = 'system',
    UI = 'ui',
    ERROR = 'error'
}

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
 * Unified Event Stack - handles all logging and events
 */
export class UnifiedEventStack {
    private config: EventStackConfig;
    private eventBuffer: EventEntry[] = [];
    private listeners: EventListener[] = [];
    private eventIdCounter = 0;
    
    // Executable events (for game state changes)
    private gameEvents: Array<{ type: string; execute: () => void; payload?: any }> = [];

    constructor(config: Partial<EventStackConfig> = {}) {
        this.config = {
            maxBufferSize: 1000,
            consoleOutputEnabled: false, // Off by default as requested
            fileLoggingEnabled: true,
            enabledCategories: new Set(Object.values(EventCategory)),
            minLogLevel: LogLevel.INFO,
            showVerboseEvents: false, // Simple boolean for high-frequency events
            ...config
        };

        this.info(EventCategory.SYSTEM, 'eventstack_init', 'Unified Event Stack initialized', {
            showVerboseEvents: this.config.showVerboseEvents,
            minLogLevel: LogLevel[this.config.minLogLevel],
            enabledCategories: Array.from(this.config.enabledCategories)
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
}

// Create and export a global instance
export const eventStack = new UnifiedEventStack();
