/**
 * Enhanced Event Log UI for the Unified Event Stack
 * Provides rich filtering, console output toggle, and event visualization
 */

import { eventStack, EventEntry, EventCategory, LogLevel } from '../core/EventStack';

export class EnhancedEventLogUI {
    private container: HTMLElement;
    private content: HTMLElement;
    private header: HTMLElement;
    private toggleButton: HTMLElement;
    private footer: HTMLElement;
    private isCollapsed: boolean = false;
    private autoScroll: boolean = true;
    private maxEntries: number = 100;
    
    // Controls
    private consoleToggleButton: HTMLElement;
    private verboseToggleButton: HTMLElement;
    private filterButton: HTMLElement;
    private clearButton: HTMLElement;
    private exportButton: HTMLElement;
    
    // Filtering
    private showAllEvents: boolean = false;
    private visibleCategories: Set<EventCategory> = new Set([
        EventCategory.TRAIN,
        EventCategory.ENEMY,
        EventCategory.ECONOMY,
        EventCategory.COMBAT,
        EventCategory.UI,
        EventCategory.ERROR
    ]);
    private minVisibleLevel: LogLevel = LogLevel.INFO;

    constructor() {
        this.createUI();
        this.subscribeToEventStack();
        this.populateExistingEvents();
        this.injectCSS();
    }

    private createUI(): void {
        // Main container
        this.container = document.createElement('div');
        this.container.className = 'event-log-container';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 60vh;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #333;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: white;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        // Header
        this.header = document.createElement('div');
        this.header.className = 'event-log-header';
        this.header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            border-radius: 8px 8px 0 0;
        `;

        const title = document.createElement('span');
        title.textContent = 'Event Log';
        title.style.fontWeight = 'bold';

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '5px';

        // Console toggle button
        this.consoleToggleButton = document.createElement('button');
        this.consoleToggleButton.textContent = '📺';
        this.consoleToggleButton.title = 'Toggle console output';
        this.consoleToggleButton.style.cssText = this.getButtonStyle();
        this.consoleToggleButton.addEventListener('click', () => this.toggleConsoleOutput());

        // Verbose toggle button
        this.verboseToggleButton = document.createElement('button');
        this.verboseToggleButton.textContent = '📈';
        this.verboseToggleButton.title = 'Toggle verbose events';
        this.verboseToggleButton.style.cssText = this.getButtonStyle();
        this.verboseToggleButton.addEventListener('click', () => this.toggleVerboseMode());

        // Filter toggle button
        this.filterButton = document.createElement('button');
        this.filterButton.textContent = '🔍';
        this.filterButton.title = 'Toggle event filtering';
        this.filterButton.style.cssText = this.getButtonStyle();
        this.filterButton.addEventListener('click', () => this.toggleEventFilter());

        // Clear button
        this.clearButton = document.createElement('button');
        this.clearButton.textContent = '🗑️';
        this.clearButton.title = 'Clear all logs';
        this.clearButton.style.cssText = this.getButtonStyle();
        this.clearButton.addEventListener('click', () => this.clearLog());

        // Export button (Generate Logs)
        this.exportButton = document.createElement('button');
        this.exportButton.textContent = '💾';
        this.exportButton.title = 'Generate Logs (export to file)';
        this.exportButton.style.cssText = this.getButtonStyle();
        this.exportButton.addEventListener('click', () => this.exportLogs());

        // Collapse toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = '▼';
        this.toggleButton.title = 'Toggle event log';
        this.toggleButton.style.cssText = this.getButtonStyle();
        this.toggleButton.addEventListener('click', () => this.toggle());

        controls.appendChild(this.consoleToggleButton);
        controls.appendChild(this.verboseToggleButton);
        controls.appendChild(this.filterButton);
        controls.appendChild(this.clearButton);
        controls.appendChild(this.exportButton);
        controls.appendChild(this.toggleButton);

        this.header.appendChild(title);
        this.header.appendChild(controls);

        // Content area
        this.content = document.createElement('div');
        this.content.className = 'event-log-content';
        this.content.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            padding: 8px;
            background: #0a0a0a;
        `;
        this.content.style.display = this.isCollapsed ? 'none' : 'block';

        // Footer with stats
        this.footer = document.createElement('div');
        this.footer.className = 'event-log-footer';
        this.footer.style.cssText = `
            padding: 4px 8px;
            background: #1a1a1a;
            border-top: 1px solid #333;
            font-size: 10px;
            color: #888;
        `;
        this.footer.style.display = this.isCollapsed ? 'none' : 'block';
        this.updateFooter();

        // Add all elements to container
        this.container.appendChild(this.header);
        this.container.appendChild(this.content);
        this.container.appendChild(this.footer);

        // Add to page
        document.body.appendChild(this.container);
    }

    private getButtonStyle(): string {
        return `
            background: #333;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        `;
    }

    private subscribeToEventStack(): void {
        eventStack.addListener((entry: EventEntry) => {
            this.addEventEntry(entry);
        });
    }

    private populateExistingEvents(): void {
        const existingLogs = eventStack.getAllEvents();
        existingLogs.forEach(entry => this.addEventEntry(entry));
    }

    private shouldShowEvent(entry: EventEntry): boolean {
        // Check level filter (higher level number means lower priority)
        if (entry.level > this.minVisibleLevel) {
            return false;
        }

        // Filter out verbose events if not enabled
        if (entry.isVerbose && !eventStack.getConfig().showVerboseEvents) {
            return false;
        }
        
        // If showing all events, don't filter by category
        if (this.showAllEvents) {
            return true;
        }
        
        // Check category filter
        return this.visibleCategories.has(entry.category);
    }

    private addEventEntry(entry: EventEntry): void {
        if (!this.shouldShowEvent(entry)) {
            return;
        }
        
        const eventElement = document.createElement('div');
        eventElement.className = 'event-log-entry';
        eventElement.style.cssText = `
            padding: 4px 0;
            border-bottom: 1px solid #222;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            align-items: center;
        `;
        
        // Add level-specific styling
        const levelClass = this.getLevelClass(entry.level);
        eventElement.classList.add(levelClass);
        
        // Add verbose indicator if applicable
        if (entry.isVerbose) {
            eventElement.classList.add('verbose-event');
            eventElement.style.opacity = '0.8';
        }
        
        // Format timestamp
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        
        // Create event content
        const levelIndicator = this.getLevelIndicator(entry.level);
        const categoryBadge = `<span class="event-category" style="background: #333; padding: 1px 4px; border-radius: 2px; font-size: 10px;">${entry.category.toUpperCase()}</span>`;
        const sourceInfo = entry.source ? `<span class="source" style="font-size: 10px; opacity: 0.7;">[${entry.source}]</span>` : '';
        const verboseFlag = entry.isVerbose ? '<span class="verbose-flag" title="High-frequency event">📈</span>' : '';
        
        eventElement.innerHTML = `
            <span class="timestamp" style="font-size: 10px; opacity: 0.7;">${timestamp}</span>
            <span class="level">${levelIndicator}</span>
            ${categoryBadge}
            ${sourceInfo}
            ${verboseFlag}
            <span class="message" style="flex: 1;">${entry.message}</span>
        `;
        
        // Add context as collapsible details if present
        if (entry.context && Object.keys(entry.context).length > 0) {
            const detailsElement = document.createElement('details');
            detailsElement.style.cssText = `
                margin-top: 5px;
                font-size: 11px;
                opacity: 0.8;
                width: 100%;
            `;
            
            const summaryElement = document.createElement('summary');
            summaryElement.textContent = 'Details';
            summaryElement.style.cursor = 'pointer';
            
            const contextElement = document.createElement('pre');
            contextElement.textContent = JSON.stringify(entry.context, null, 2);
            contextElement.style.cssText = `
                margin-top: 5px;
                padding: 5px;
                background-color: rgba(0,0,0,0.3);
                border-radius: 3px;
                font-size: 10px;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            
            detailsElement.appendChild(summaryElement);
            detailsElement.appendChild(contextElement);
            eventElement.appendChild(detailsElement);
        }
        
        this.content.appendChild(eventElement);
        
        // Limit number of entries
        while (this.content.children.length > this.maxEntries) {
            this.content.removeChild(this.content.firstChild!);
        }
        
        // Auto-scroll to bottom
        if (this.autoScroll && !this.isCollapsed) {
            this.content.scrollTop = this.content.scrollHeight;
        }
        
        this.updateFooter();
    }

    private getLevelClass(level: LogLevel): string {
        switch (level) {
            case LogLevel.ERROR: return 'log-error';
            case LogLevel.WARN: return 'log-warn';
            case LogLevel.INFO: return 'log-info';
            case LogLevel.DEBUG: return 'log-debug';
            default: return 'log-info';
        }
    }

    private getLevelIndicator(level: LogLevel): string {
        switch (level) {
            case LogLevel.ERROR: return '❌';
            case LogLevel.WARN: return '⚠️';
            case LogLevel.INFO: return 'ℹ️';
            case LogLevel.DEBUG: return '🔧';
            default: return 'ℹ️';
        }
    }

    private toggleConsoleOutput(): void {
        const enabled = eventStack.toggleConsoleOutput();
        this.consoleToggleButton.style.backgroundColor = enabled ? '#4a9eff' : '#333';
        this.consoleToggleButton.title = `Console output: ${enabled ? 'ON' : 'OFF'}`;
    }

    private toggleVerboseMode(): void {
        const enabled = eventStack.toggleVerboseMode();
        this.verboseToggleButton.style.backgroundColor = enabled ? '#4a9eff' : '#333';
        this.verboseToggleButton.title = `Verbose events: ${enabled ? 'ON' : 'OFF'}`;
        this.refreshDisplay();
    }

    private toggleEventFilter(): void {
        this.showAllEvents = !this.showAllEvents;
        this.filterButton.style.backgroundColor = this.showAllEvents ? '#4a9eff' : '#333';
        this.filterButton.title = `Filtering: ${this.showAllEvents ? 'OFF (showing all)' : 'ON (filtered)'}`;
        this.refreshDisplay();
    }

    private clearLog(): void {
        this.content.innerHTML = '';
        eventStack.clearLogs();
        this.updateFooter();
    }

    private async exportLogs(): Promise<void> {
        await eventStack.exportLogs();
    }

    private refreshDisplay(): void {
        // Clear current display
        this.content.innerHTML = '';
        
        // Re-populate with current logs
        const logs = eventStack.getAllEvents();
        logs.forEach(entry => this.addEventEntry(entry));
    }

    private toggle(): void {
        this.isCollapsed = !this.isCollapsed;
        this.content.style.display = this.isCollapsed ? 'none' : 'block';
        this.footer.style.display = this.isCollapsed ? 'none' : 'block';
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
    }

    private updateFooter(): void {
        const totalLogs = eventStack.getAllEvents().length;
        const visibleLogs = this.content.children.length;
        const config = eventStack.getConfig();
        
        this.footer.innerHTML = `
            Events: ${visibleLogs}/${totalLogs} | 
            Console: ${config.consoleOutputEnabled ? 'ON' : 'OFF'} | 
            Verbose: ${config.showVerboseEvents ? 'ON' : 'OFF'} | 
            Filter: ${this.showAllEvents ? 'OFF' : 'ON'}
        `;
    }

    private injectCSS(): void {
        // Add CSS styles for log levels
        const levelStyles = `
            .log-error { 
                border-left: 3px solid #dc3545; 
                background-color: rgba(220, 53, 69, 0.1); 
            }
            .log-warn { 
                border-left: 3px solid #ffc107; 
                background-color: rgba(255, 193, 7, 0.1); 
            }
            .log-info { 
                border-left: 3px solid #17a2b8; 
                background-color: rgba(23, 162, 184, 0.1); 
            }
            .log-debug { 
                border-left: 3px solid #6c757d; 
                background-color: rgba(108, 117, 125, 0.1); 
            }
            .verbose-event { 
                border-left: 3px solid #6f42c1; 
                background-color: rgba(111, 66, 193, 0.05);
            }
            .event-log-container button:hover {
                background-color: #555 !important;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = levelStyles;
        document.head.appendChild(style);
    }

    public dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
