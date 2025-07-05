/**
 * EventStack (Scene Graph Logger)
 *
 * ROLE (2025+):
 *   - EventStack is a scene graph event logger/observer, NOT an event bus.
 *   - It extends GameNodeObject and subscribes to the root node of the scene graph.
 *   - It logs all node-based events it receives (to buffer, UI, file, or console as needed).
 *   - It maintains backward compatibility for Logger-style direct log calls (info, error, etc.),
 *     but all new event logging should flow through the node event system.
 *   - It does NOT re-implement event emission or subscription; it uses node event system methods.
 *
 * ARCHITECTURE PATTERN:
 *   - EventStack is the only component that listens to the root node for all events.
 *   - It provides a normalized log stream to UI and other subscribers via addListener/removeListener.
 *   - UI components (e.g., EventLogUI) should subscribe to EventStack for log updates, NOT to the scene graph directly.
 *   - This ensures log state is centralized, normalized, and decoupled from UI logic.
 *
 *   - Do NOT use EventStack as a general event bus or pass it as a logger to other systems.
 *   - Always emit events on nodes and let EventStack observe and log them.
 *
 *   - If you need to add a new log type or filter, update EventStack, not the UI.
 *
 * See EventLogUI.ts for the intended UI integration pattern.
 */

import { GameNodeObject } from './GameNodeObject';

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
export class EventStack extends GameNodeObject {
    private config: EventStackConfig;
    private eventBuffer: EventEntry[] = [];
    private listeners: EventListener[] = [];
    private eventIdCounter = 0;
    private maxBufferSize = 1000;

    constructor(scene: import('@babylonjs/core').Scene, config: Partial<EventStackConfig> = {}) {
        super('eventStack', scene);
        this.config = {
            maxBufferSize: 1000,
            consoleOutputEnabled: false,
            fileLoggingEnabled: true,
            enabledCategories: new Set(DEFAULT_ENABLED_CATEGORIES),
            minLogLevel: LogLevel.INFO,
            showVerboseEvents: false,
            ...config
        };
        this.info(EventCategory.SYSTEM, 'eventstack_init', 'Event Stack initialized (scene graph observer)', {
            showVerboseEvents: this.config.showVerboseEvents,
            minLogLevel: LogLevel[this.config.minLogLevel],
            enabledCategories: Array.from(this.config.enabledCategories),
            debugCategoriesAvailable: DEBUG_CATEGORIES
        });
    }

    /**
     * Subscribe to the root node of the scene graph to log all events.
     * @param rootNode The root NodeComponent of the scene graph
     */
    subscribeToSceneRoot(rootNode: any) {
        rootNode.addEventListener('*', this.handleSceneEvent, { capture: true });
    }

    /**
     * Handle all scene graph events and log them.
     * @param event The SceneGraphEvent
     */
    handleSceneEvent = (event: any) => {
        // Log to buffer
        this.eventBuffer.push({
            id: `evt_${++this.eventIdCounter}`,
            timestamp: Date.now(),
            category: EventCategory.SYSTEM,
            level: LogLevel.INFO,
            type: event.type,
            message: '[SceneEvent] ' + (event.payload?.message || ''),
            context: event.payload,
            source: event.source,
            isVerbose: false
        });
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }
        // Optionally, forward to EventLogUI or other sinks
        // Optionally, log to console for debugging
        // console.log('[EventStack] Scene event:', event.type, event);
    };

    // --- Legacy Logger compatibility (for now) ---
    info(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.INFO, type, message, context, source, isVerbose);
    }
    error(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.ERROR, type, message, context, source, isVerbose);
    }
    warn(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.WARN, type, message, context, source, isVerbose);
    }
    debug(category: EventCategory, type: string, message: string, context?: any, source?: string, isVerbose: boolean = false): void {
        this.logEvent(category, LogLevel.DEBUG, type, message, context, source, isVerbose);
    }

    private logEvent(
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
        this.eventBuffer.push(entry);
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }
        // Optionally, output to console or notify listeners
    }

    private shouldLogEvent(category: EventCategory, level: LogLevel, isVerbose: boolean = false): boolean {
        if (!this.config.enabledCategories.has(category)) return false;
        if (level > this.config.minLogLevel) return false;
        if (isVerbose && !this.config.showVerboseEvents) return false;
        return true;
    }

    // --- UI/Export compatibility ---
    exportLogs() { return this.eventBuffer.slice(); }
    clearLogs() { this.eventBuffer = []; }
    getAllEvents(): EventEntry[] { return [...this.eventBuffer]; }
    getRecentEvents(maxCount: number = 100): EventEntry[] { return this.getAllEvents().slice(-maxCount); }

    /**
     * Export all logs as a formatted string (for download or debugging)
     * This is used by the Generate Logs button and for manual export.
     */
    exportLogsToText(): string {
        const events = this.getAllEvents();
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

    // --- Debug category management (legacy compatibility, still useful for UI/tools) ---
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

    /**
     * Add a listener for new log entries (UI integration)
     */
    public addListener(listener: EventListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove a previously added log listener
     */
    public removeListener(listener: EventListener): void {
        const idx = this.listeners.indexOf(listener);
        if (idx !== -1) this.listeners.splice(idx, 1);
    }

    // --- Deprecated: Event bus features (do not use in new code) ---
    // ...existing code (pushGameEvent, emit, subscribe, etc.)...
    // Marked as deprecated and to be removed after migration.
}

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
