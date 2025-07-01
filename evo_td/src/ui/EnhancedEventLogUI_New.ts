/**
 * Enhanced Event Log UI for the Unified Event Stack
 * Provides rich filtering, console output toggle, and event visualization
 */

import { eventStack, EventEntry, EventCategory, LogLevel } from '../core/UnifiedEventStack';
import { CSSLoader } from '../utils/CSSLoader';

export interface EventLogUIConfig {
    maxDisplayEvents: number;
    refreshIntervalMs: number;
    enabledCategories: Set<EventCategory>;
    minDisplayLevel: LogLevel;
    autoScroll: boolean;
    showTimestamps: boolean;
    showContext: boolean;
}

export class EnhancedEventLogUI {
    private container: HTMLDivElement;
    private logContainer: HTMLDivElement;
    private config: EventLogUIConfig;
    private refreshTimer: number | null = null;
    private isVisible = true;
    
    // UI Controls
    private toggleVisibilityButton: HTMLButtonElement;
    private consoleOutputToggle: HTMLInputElement;
    private categoryFilters: Map<EventCategory, HTMLInputElement> = new Map();
    private levelFilter: HTMLSelectElement;
    private clearButton: HTMLButtonElement;
    private exportButton: HTMLButtonElement;
    private autoScrollToggle: HTMLInputElement;

    constructor(config: Partial<EventLogUIConfig> = {}) {
        this.config = {
            maxDisplayEvents: 100,
            refreshIntervalMs: 500,
            enabledCategories: new Set(Object.values(EventCategory)),
            minDisplayLevel: LogLevel.INFO,
            autoScroll: true,
            showTimestamps: true,
            showContext: false,
            ...config
        };

        // Apply verbose mode settings if enabled
        const globalConfig = eventStack.getConfig();
        if (globalConfig.verboseMode) {
            this.config.minDisplayLevel = LogLevel.VERBOSE;
            this.config.enabledCategories.add(EventCategory.DEBUG);
            this.config.enabledCategories.add(EventCategory.VERBOSE);
        }

        this.createUI();
        this.setupEventListener();
        this.startRefreshTimer();
        
        eventStack.info(EventCategory.UI, 'eventlog_ui_init', 'Enhanced Event Log UI initialized', {
            verboseMode: globalConfig.verboseMode,
            displayLevel: LogLevel[this.config.minDisplayLevel]
        });
    }

    private createUI(): void {
        // Load CSS styles
        CSSLoader.injectCSS(`
            .event-log-container {
                position: absolute;
                bottom: 10px;
                left: 10px;
                width: 600px;
                max-height: 400px;
                background-color: rgba(0, 0, 0, 0.85);
                border: 1px solid #444;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 1000;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .event-log-header {
                background-color: rgba(40, 40, 40, 0.95);
                padding: 8px;
                border-bottom: 1px solid #666;
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .event-log-header h3 {
                margin: 0;
                color: #fff;
                font-size: 14px;
                font-weight: bold;
            }

            .event-log-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .event-log-controls label {
                color: #ccc;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .event-log-controls input, .event-log-controls select, .event-log-controls button {
                font-size: 11px;
                padding: 2px 6px;
                border: 1px solid #666;
                border-radius: 3px;
                background-color: #333;
                color: #fff;
            }

            .event-log-controls button {
                cursor: pointer;
                background-color: #555;
            }

            .event-log-controls button:hover {
                background-color: #666;
            }

            .event-log-content {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
                max-height: 300px;
            }

            .event-log-entry {
                margin-bottom: 4px;
                padding: 4px 6px;
                border-left: 3px solid #666;
                border-radius: 3px;
                background-color: rgba(20, 20, 20, 0.5);
                word-wrap: break-word;
            }

            .event-log-entry.error {
                border-left-color: #ff4444;
                background-color: rgba(255, 68, 68, 0.1);
            }

            .event-log-entry.warn {
                border-left-color: #ffaa44;
                background-color: rgba(255, 170, 68, 0.1);
            }

            .event-log-entry.info {
                border-left-color: #44aaff;
                background-color: rgba(68, 170, 255, 0.1);
            }

            .event-log-entry.debug {
                border-left-color: #44ff44;
                background-color: rgba(68, 255, 68, 0.1);
            }

            .event-log-entry.verbose {
                border-left-color: #aa44ff;
                background-color: rgba(170, 68, 255, 0.1);
            }

            .event-timestamp {
                color: #888;
                font-size: 10px;
            }

            .event-category {
                color: #aaf;
                font-weight: bold;
                text-transform: uppercase;
            }

            .event-level {
                color: #faa;
                font-weight: bold;
                font-size: 10px;
            }

            .event-message {
                color: #fff;
                margin-left: 8px;
            }

            .event-context {
                color: #aaa;
                font-size: 10px;
                margin-top: 2px;
                margin-left: 8px;
                font-style: italic;
            }

            .event-log-hidden {
                height: 30px;
                width: 200px;
            }

            .event-log-hidden .event-log-content {
                display: none;
            }

            .category-filters {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-top: 4px;
            }

            .toggle-visibility {
                background-color: #666 !important;
                font-weight: bold;
            }
        `);

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'event-log-container';
        
        // Create header with controls
        const header = document.createElement('div');
        header.className = 'event-log-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Event Log';
        header.appendChild(title);

        // Toggle visibility button
        this.toggleVisibilityButton = document.createElement('button');
        this.toggleVisibilityButton.textContent = '▼';
        this.toggleVisibilityButton.className = 'toggle-visibility';
        this.toggleVisibilityButton.title = 'Toggle event log visibility';
        this.toggleVisibilityButton.addEventListener('click', () => this.toggleVisibility());
        header.appendChild(this.toggleVisibilityButton);

        // Create controls container
        const controls = document.createElement('div');
        controls.className = 'event-log-controls';

        // Console output toggle
        const consoleLabel = document.createElement('label');
        consoleLabel.innerHTML = 'Console: ';
        this.consoleOutputToggle = document.createElement('input');
        this.consoleOutputToggle.type = 'checkbox';
        this.consoleOutputToggle.checked = eventStack.getConfig().consoleOutputEnabled;
        this.consoleOutputToggle.addEventListener('change', () => {
            eventStack.toggleConsoleOutput();
        });
        consoleLabel.appendChild(this.consoleOutputToggle);
        controls.appendChild(consoleLabel);

        // Verbose mode toggle (for high-frequency events)
        const verboseLabel = document.createElement('label');
        verboseLabel.innerHTML = 'Verbose: ';
        const verboseToggle = document.createElement('input');
        verboseToggle.type = 'checkbox';
        verboseToggle.checked = eventStack.getConfig().verboseMode;
        verboseToggle.title = 'Toggle high-frequency debug events (performance, tick-based events)';
        verboseToggle.addEventListener('change', () => {
            const isEnabled = eventStack.toggleVerboseMode();
            // Update our local config to reflect the change
            if (isEnabled) {
                this.config.minDisplayLevel = LogLevel.VERBOSE;
                this.config.enabledCategories.add(EventCategory.VERBOSE);
            } else {
                this.config.minDisplayLevel = LogLevel.DEBUG;
                this.config.enabledCategories.delete(EventCategory.VERBOSE);
            }
            this.refreshDisplay();
        });
        verboseLabel.appendChild(verboseToggle);
        controls.appendChild(verboseLabel);

        // Level filter
        const levelLabel = document.createElement('label');
        levelLabel.innerHTML = 'Level: ';
        this.levelFilter = document.createElement('select');
        Object.values(LogLevel).filter(v => typeof v === 'number').forEach(level => {
            const option = document.createElement('option');
            option.value = level.toString();
            option.textContent = LogLevel[level as number];
            option.selected = level === this.config.minDisplayLevel;
            this.levelFilter.appendChild(option);
        });
        this.levelFilter.addEventListener('change', () => {
            this.config.minDisplayLevel = parseInt(this.levelFilter.value) as LogLevel;
            this.refreshDisplay();
        });
        levelLabel.appendChild(this.levelFilter);
        controls.appendChild(levelLabel);

        // Auto-scroll toggle
        const autoScrollLabel = document.createElement('label');
        autoScrollLabel.innerHTML = 'Auto-scroll: ';
        this.autoScrollToggle = document.createElement('input');
        this.autoScrollToggle.type = 'checkbox';
        this.autoScrollToggle.checked = this.config.autoScroll;
        this.autoScrollToggle.addEventListener('change', () => {
            this.config.autoScroll = this.autoScrollToggle.checked;
        });
        autoScrollLabel.appendChild(this.autoScrollToggle);
        controls.appendChild(autoScrollLabel);

        // Clear button
        this.clearButton = document.createElement('button');
        this.clearButton.textContent = 'Clear';
        this.clearButton.addEventListener('click', () => {
            eventStack.clearLogs();
            this.refreshDisplay();
        });
        controls.appendChild(this.clearButton);

        // Export button
        this.exportButton = document.createElement('button');
        this.exportButton.textContent = 'Export';
        this.exportButton.addEventListener('click', () => {
            eventStack.exportLogs();
        });
        controls.appendChild(this.exportButton);

        header.appendChild(controls);

        // Create category filters
        const categoryFiltersContainer = document.createElement('div');
        categoryFiltersContainer.className = 'category-filters';
        
        Object.values(EventCategory).forEach(category => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.config.enabledCategories.has(category);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.config.enabledCategories.add(category);
                } else {
                    this.config.enabledCategories.delete(category);
                }
                this.refreshDisplay();
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(category.toUpperCase()));
            categoryFiltersContainer.appendChild(label);
            this.categoryFilters.set(category, checkbox);
        });

        header.appendChild(categoryFiltersContainer);
        this.container.appendChild(header);

        // Create log content area
        this.logContainer = document.createElement('div');
        this.logContainer.className = 'event-log-content';
        this.container.appendChild(this.logContainer);

        // Add to page
        document.body.appendChild(this.container);
    }

    private setupEventListener(): void {
        // Listen for new events
        eventStack.addListener((entry: EventEntry) => {
            if (this.shouldDisplayEvent(entry)) {
                this.addEventToDisplay(entry);
            }
        });
    }

    private shouldDisplayEvent(entry: EventEntry): boolean {
        if (!this.config.enabledCategories.has(entry.category)) {
            return false;
        }

        if (entry.level > this.config.minDisplayLevel) {
            return false;
        }

        return true;
    }

    private addEventToDisplay(entry: EventEntry): void {
        const eventElement = this.createEventElement(entry);
        this.logContainer.appendChild(eventElement);

        // Remove old events if we exceed max display count
        while (this.logContainer.children.length > this.config.maxDisplayEvents) {
            this.logContainer.removeChild(this.logContainer.firstChild!);
        }

        // Auto-scroll if enabled
        if (this.config.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    private createEventElement(entry: EventEntry): HTMLDivElement {
        const element = document.createElement('div');
        element.className = `event-log-entry ${LogLevel[entry.level].toLowerCase()}`;

        let content = '';

        // Timestamp
        if (this.config.showTimestamps) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            content += `<span class="event-timestamp">[${time}]</span> `;
        }

        // Level and category
        content += `<span class="event-level">[${LogLevel[entry.level]}]</span> `;
        content += `<span class="event-category">[${entry.category.toUpperCase()}]</span> `;

        // Message
        content += `<span class="event-message">${this.escapeHtml(entry.message)}</span>`;

        // Context (if enabled and present)
        if (this.config.showContext && entry.context) {
            const contextStr = typeof entry.context === 'string' 
                ? entry.context 
                : JSON.stringify(entry.context, null, 2);
            content += `<div class="event-context">${this.escapeHtml(contextStr)}</div>`;
        }

        element.innerHTML = content;
        return element;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private refreshDisplay(): void {
        // Clear current display
        this.logContainer.innerHTML = '';

        // Get filtered events
        const events = eventStack.getRecentEvents(this.config.maxDisplayEvents)
            .filter(entry => this.shouldDisplayEvent(entry));

        // Add events to display
        events.forEach(entry => {
            const element = this.createEventElement(entry);
            this.logContainer.appendChild(element);
        });

        // Auto-scroll if enabled
        if (this.config.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    private startRefreshTimer(): void {
        this.refreshTimer = window.setInterval(() => {
            this.refreshDisplay();
        }, this.config.refreshIntervalMs);
    }

    private stopRefreshTimer(): void {
        if (this.refreshTimer) {
            window.clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private toggleVisibility(): void {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.container.classList.remove('event-log-hidden');
            this.toggleVisibilityButton.textContent = '▼';
            this.startRefreshTimer();
        } else {
            this.container.classList.add('event-log-hidden');
            this.toggleVisibilityButton.textContent = '▲';
            this.stopRefreshTimer();
        }

        eventStack.debug(EventCategory.UI, 'eventlog_visibility_toggled', 
            `Event log ${this.isVisible ? 'shown' : 'hidden'}`);
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<EventLogUIConfig>): void {
        this.config = { ...this.config, ...updates };
        this.refreshDisplay();
        
        eventStack.debug(EventCategory.UI, 'eventlog_config_updated', 
            'Event log UI configuration updated', updates);
    }

    /**
     * Public API methods
     */
    show(): void {
        if (!this.isVisible) {
            this.toggleVisibility();
        }
    }

    hide(): void {
        if (this.isVisible) {
            this.toggleVisibility();
        }
    }

    setLevel(level: LogLevel): void {
        this.config.minDisplayLevel = level;
        this.levelFilter.value = level.toString();
        this.refreshDisplay();
    }

    enableCategory(category: EventCategory): void {
        this.config.enabledCategories.add(category);
        const checkbox = this.categoryFilters.get(category);
        if (checkbox) {
            checkbox.checked = true;
        }
        this.refreshDisplay();
    }

    disableCategory(category: EventCategory): void {
        this.config.enabledCategories.delete(category);
        const checkbox = this.categoryFilters.get(category);
        if (checkbox) {
            checkbox.checked = false;
        }
        this.refreshDisplay();
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.stopRefreshTimer();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        eventStack.debug(EventCategory.UI, 'eventlog_disposed', 'Event log UI disposed');
    }
}
