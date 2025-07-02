/**
 * Unified Logger System
 * A comprehensive logging system that combines traditional logging with event tracking
 * 
 * NOTE: This UnifiedLogger is fully implemented but not currently used in the main ECS app.
 * The main app uses the separate Logger (utils/Logger.ts) and EventStack (core/EventStack.ts) systems.
 * This unified system could replace both in the future for simplified logging architecture.
 */

export enum LogLevel {
    VERBOSE = 0,  // High-frequency events (tick-based, very detailed)
    DEBUG = 1,    // Technical debug info (object creation, state changes)
    INFO = 2,     // General gameplay events (train arrives, combat)
    WARN = 3,     // Warnings and non-critical issues
    ERROR = 4     // Errors and critical issues
}

export enum EventCategory {
    // Gameplay categories
    TRAIN = 'train',
    ENEMY = 'enemy',
    COMBAT = 'combat',
    ECONOMY = 'economy',
    UI = 'ui',
    
    // Technical categories
    RENDERING = 'rendering',
    ATTACHMENT = 'attachment',
    NETWORK = 'network',
    PERFORMANCE = 'performance',
    SYSTEM = 'system',
    ERROR = 'error',
    DEBUG = 'debug'
}

export interface UnifiedLogEntry {
    timestamp: number;
    category: EventCategory;
    level: LogLevel;
    type: string;           // Event type identifier
    message: string;        // Human-readable message
    context?: any;          // Additional data/payload
    source?: string;        // Component/system that generated the log
}

export interface LoggingConfig {
    // Display settings
    consoleOutput: boolean;
    showInEventLog: boolean;
    
    // Level filtering
    minLevel: LogLevel;
    verboseMode: boolean;
    
    // Category filtering
    enabledCategories: Set<EventCategory>;
    
    // Buffer settings
    maxBufferSize: number;
    bufferRetentionMinutes: number;
    
    // File export settings
    fileLoggingEnabled: boolean;
}

type LogListener = (entry: UnifiedLogEntry) => void;

/**
 * Unified logging system that handles all application logging
 */
export class UnifiedLogger {
    private static instance: UnifiedLogger;
    private config: LoggingConfig;
    private logBuffer: UnifiedLogEntry[] = [];
    private listeners: Set<LogListener> = new Set();
    private sessionId: string;

    private constructor() {
        this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Default configuration
        this.config = {
            consoleOutput: false,              // Off by default
            showInEventLog: true,              // Show in UI by default
            minLevel: LogLevel.DEBUG,          // Debug and above by default
            verboseMode: false,                // Verbose off by default
            enabledCategories: new Set([       // All categories enabled by default
                EventCategory.TRAIN,
                EventCategory.ENEMY,
                EventCategory.COMBAT,
                EventCategory.ECONOMY,
                EventCategory.UI,
                EventCategory.RENDERING,
                EventCategory.ATTACHMENT,
                EventCategory.NETWORK,
                EventCategory.PERFORMANCE,
                EventCategory.SYSTEM,
                EventCategory.ERROR,
                EventCategory.DEBUG
            ]),
            maxBufferSize: 2000,               // ~2-3 minutes of gameplay at moderate logging
            bufferRetentionMinutes: 5,         // Keep 5 minutes of logs
            fileLoggingEnabled: true
        };

        // Check for verbose mode from URL parameters or environment
        this.checkVerboseMode();
        
        console.log(`[UnifiedLogger] Initialized with session ID: ${this.sessionId}`);
        console.log(`[UnifiedLogger] Verbose mode: ${this.config.verboseMode}`);
        console.log(`[UnifiedLogger] Console output: ${this.config.consoleOutput}`);
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): UnifiedLogger {
        if (!UnifiedLogger.instance) {
            UnifiedLogger.instance = new UnifiedLogger();
        }
        return UnifiedLogger.instance;
    }

    /**
     * Check for verbose mode from URL parameters or environment
     */
    private checkVerboseMode(): void {
        // Check URL parameters for verbose flag
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('verbose') === 'true' || urlParams.get('v') === 'true') {
                this.config.verboseMode = true;
                this.config.minLevel = LogLevel.VERBOSE;
            }
        }
        
        // Check environment variables (Node.js)
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.VERBOSE === 'true' || process.env.npm_config_verbose === 'true') {
                this.config.verboseMode = true;
                this.config.minLevel = LogLevel.VERBOSE;
            }
        }
    }

    /**
     * Log an event with full context
     */
    log(
        category: EventCategory,
        level: LogLevel,
        type: string,
        message: string,
        context?: any,
        source?: string
    ): void {
        // Check if this log should be processed
        if (!this.shouldLog(category, level)) {
            return;
        }

        const entry: UnifiedLogEntry = {
            timestamp: Date.now(),
            category,
            level,
            type,
            message,
            context,
            source
        };

        // Add to buffer
        this.addToBuffer(entry);

        // Output to console if enabled
        if (this.config.consoleOutput) {
            this.outputToConsole(entry);
        }

        // Notify listeners (EventLogUI, etc.)
        this.notifyListeners(entry);
    }

    /**
     * Convenience methods for different log levels
     */
    verbose(category: EventCategory, type: string, message: string, context?: any, source?: string): void {
        this.log(category, LogLevel.VERBOSE, type, message, context, source);
    }

    debug(category: EventCategory, type: string, message: string, context?: any, source?: string): void {
        this.log(category, LogLevel.DEBUG, type, message, context, source);
    }

    info(category: EventCategory, type: string, message: string, context?: any, source?: string): void {
        this.log(category, LogLevel.INFO, type, message, context, source);
    }

    warn(category: EventCategory, type: string, message: string, context?: any, source?: string): void {
        this.log(category, LogLevel.WARN, type, message, context, source);
    }

    error(category: EventCategory, type: string, message: string, context?: any, source?: string): void {
        this.log(category, LogLevel.ERROR, type, message, context, source);
    }

    /**
     * Check if a log entry should be processed
     */
    private shouldLog(category: EventCategory, level: LogLevel): boolean {
        // Check category filter
        if (!this.config.enabledCategories.has(category)) {
            return false;
        }

        // Check level filter
        if (level < this.config.minLevel) {
            return false;
        }

        // Check verbose mode
        if (level === LogLevel.VERBOSE && !this.config.verboseMode) {
            return false;
        }

        return true;
    }

    /**
     * Add entry to buffer with size management
     */
    private addToBuffer(entry: UnifiedLogEntry): void {
        this.logBuffer.push(entry);

        // Remove old entries if buffer is too large
        if (this.logBuffer.length > this.config.maxBufferSize) {
            this.logBuffer.shift();
        }

        // Remove entries older than retention time
        const cutoffTime = Date.now() - (this.config.bufferRetentionMinutes * 60 * 1000);
        this.logBuffer = this.logBuffer.filter(e => e.timestamp > cutoffTime);
    }

    /**
     * Output to console with appropriate formatting
     */
    private outputToConsole(entry: UnifiedLogEntry): void {
        const timestamp = new Date(entry.timestamp).toISOString();
        const levelStr = LogLevel[entry.level].padEnd(7);
        const categoryStr = entry.category.toUpperCase().padEnd(10);
        const sourceStr = entry.source ? `[${entry.source}]` : '';
        const contextStr = entry.context ? JSON.stringify(entry.context) : '';

        const message = `[${timestamp}] [${levelStr}] [${categoryStr}] ${sourceStr} ${entry.message}`;
        
        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(message, contextStr);
                break;
            case LogLevel.WARN:
                console.warn(message, contextStr);
                break;
            case LogLevel.VERBOSE:
                console.debug(message, contextStr);
                break;
            default:
                console.log(message, contextStr);
                break;
        }
    }

    /**
     * Notify all registered listeners
     */
    private notifyListeners(entry: UnifiedLogEntry): void {
        this.listeners.forEach(listener => {
            try {
                listener(entry);
            } catch (error) {
                console.error('[UnifiedLogger] Error in listener:', error);
            }
        });
    }

    /**
     * Add a listener for log events
     */
    addListener(listener: LogListener): void {
        this.listeners.add(listener);
    }

    /**
     * Remove a listener for log events
     */
    removeListener(listener: LogListener): void {
        this.listeners.delete(listener);
    }

    /**
     * Update logging configuration
     */
    updateConfig(newConfig: Partial<LoggingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('[UnifiedLogger] Configuration updated:', newConfig);
    }

    /**
     * Toggle console output
     */
    toggleConsoleOutput(): boolean {
        this.config.consoleOutput = !this.config.consoleOutput;
        console.log(`[UnifiedLogger] Console output: ${this.config.consoleOutput}`);
        return this.config.consoleOutput;
    }

    /**
     * Toggle verbose mode
     */
    toggleVerboseMode(): boolean {
        this.config.verboseMode = !this.config.verboseMode;
        this.config.minLevel = this.config.verboseMode ? LogLevel.VERBOSE : LogLevel.DEBUG;
        console.log(`[UnifiedLogger] Verbose mode: ${this.config.verboseMode}`);
        return this.config.verboseMode;
    }

    /**
     * Get current log buffer
     */
    getLogBuffer(): UnifiedLogEntry[] {
        return [...this.logBuffer];
    }

    /**
     * Get current configuration
     */
    getConfig(): LoggingConfig {
        return { ...this.config };
    }

    /**
     * Export logs to file
     */
    async exportLogs(): Promise<void> {
        if (!this.config.fileLoggingEnabled) {
            console.warn('[UnifiedLogger] File logging is disabled');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `unified_logs_${timestamp}.txt`;
        
        const logContent = this.formatLogsForExport();
        
        // Browser environment - use download
        if (typeof window !== 'undefined') {
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
            
            console.log(`[UnifiedLogger] Logs exported as ${filename}`);
                const fs = require('fs');
                const path = require('path');
                
                const logDir = path.join(process.cwd(), 'src', 'utils', 'log_output');
                const logPath = path.join(logDir, filename);
                
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                
                fs.writeFileSync(logPath, logContent);
                console.log(`[UnifiedLogger] Logs saved to ${logPath}`);
            } catch (error) {
                console.error('[UnifiedLogger] Failed to save logs:', error);
            }
        }
    }

    /**
     * Format logs for export
     */
    private formatLogsForExport(): string {
        const header = `=== Unified Game Logs ===\nSession: ${this.sessionId}\nGenerated: ${new Date().toISOString()}\nTotal Entries: ${this.logBuffer.length}\n\n`;
        
        const logLines = this.logBuffer.map(entry => {
            const timestamp = new Date(entry.timestamp).toISOString();
            const level = LogLevel[entry.level].padEnd(7);
            const category = entry.category.toUpperCase().padEnd(10);
            const source = entry.source ? `[${entry.source}]` : '';
            const context = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
            
            return `[${timestamp}] [${level}] [${category}] ${source} ${entry.message}${context}`;
        });
        
        return header + logLines.join('\n');
    }

    /**
     * Clear log buffer
     */
    clearLogs(): void {
        this.logBuffer = [];
        console.log('[UnifiedLogger] Log buffer cleared');
    }
}

// Export singleton instance
export const logger = UnifiedLogger.getInstance();

// Backward compatibility exports
export { EventCategory as LogCategory };
