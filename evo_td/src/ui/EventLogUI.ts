/**
 * Event Log UI Component
 * Provides a toggleable event/console log window for game events
 */

import { EventStack, EventLogEntry, EventCategory } from "../core/EventStack";
import { LogCategory } from "../utils/Logger";
import { CSS_CLASSES, defaultUIConfig } from "./assets/ui-config";

export class EventLogUI {
    private eventStack: EventStack;
    private container: HTMLElement;
    private content: HTMLElement;
    private header: HTMLElement;
    private toggleButton: HTMLElement;
    private footer: HTMLElement;
    private isCollapsed: boolean = false;
    private autoScroll: boolean = true;
    private maxEntries: number = 100;
    private unsubscribeEventLog?: () => void;
    
    // Event filtering configuration
    private showAllEvents: boolean = false;
    private visibleCategories: Set<LogCategory> = new Set([
        LogCategory.TRAIN,
        LogCategory.ENEMY,
        LogCategory.ECONOMY,
        LogCategory.ERROR
    ]);
    private filterButton: HTMLElement;

    constructor(eventStack: EventStack) {
        this.eventStack = eventStack;
        this.maxEntries = defaultUIConfig.eventLog.maxEntries;
        this.autoScroll = defaultUIConfig.eventLog.autoScroll;
        this.isCollapsed = defaultUIConfig.eventLog.collapsed;
        
        this.createUI();
        this.subscribeToEvents();
        this.populateExistingEvents();
    }

    private createUI(): void {
        // Main container
        this.container = document.createElement('div');
        this.container.className = CSS_CLASSES.eventLog.panel;
        
        // Header with title and controls
        this.header = document.createElement('div');
        this.header.className = CSS_CLASSES.eventLog.header;
        
        const title = document.createElement('div');
        title.className = CSS_CLASSES.eventLog.title;
        title.textContent = 'Event Log';
        
        // Filter toggle button
        this.filterButton = document.createElement('button');
        this.filterButton.className = CSS_CLASSES.eventLog.toggle;
        this.filterButton.textContent = this.showAllEvents ? 'ALL' : 'FILTERED';
        this.filterButton.title = this.showAllEvents ? 'Showing all events - click to filter' : 'Showing important events only - click to show all';
        this.filterButton.onclick = () => this.toggleFilter();
        this.filterButton.style.marginRight = '4px';
        
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = CSS_CLASSES.eventLog.toggle;
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
        this.toggleButton.title = this.isCollapsed ? 'Show event log' : 'Hide event log';
        this.toggleButton.onclick = () => this.toggle();
        
        this.header.appendChild(title);
        this.header.appendChild(this.filterButton);
        this.header.appendChild(this.toggleButton);
        
        // Content area
        this.content = document.createElement('div');
        this.content.className = this.isCollapsed ? CSS_CLASSES.eventLog.contentCollapsed : CSS_CLASSES.eventLog.content;
        
        // Footer with controls
        this.footer = document.createElement('div');
        this.footer.className = CSS_CLASSES.eventLog.footer;
        this.updateFooter();
        
        // Assemble the UI
        this.container.appendChild(this.header);
        this.container.appendChild(this.content);
        this.container.appendChild(this.footer);
        
        document.body.appendChild(this.container);
    }

    private subscribeToEvents(): void {
        this.unsubscribeEventLog = this.eventStack.onEventLog((entry: EventLogEntry) => {
            this.addEventEntry(entry);
        });
    }

    private populateExistingEvents(): void {
        const existingEvents = this.eventStack.getRecentEventLog(this.maxEntries);
        existingEvents.forEach(entry => this.addEventEntry(entry, false));
        this.scrollToBottom();
    }

    private addEventEntry(entry: EventLogEntry, shouldScroll: boolean = true): void {
        // Apply filtering - skip events that don't match current filter settings
        if (!this.shouldShowEvent(entry)) {
            return;
        }
        
        const entryElement = document.createElement('div');
        entryElement.className = CSS_CLASSES.eventLog.entry;
        
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = timestamp;
        
        const categorySpan = document.createElement('span');
        categorySpan.className = `category ${entry.category.toUpperCase()}`;
        categorySpan.textContent = `[${entry.category.toUpperCase()}]`;
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'message';
        messageSpan.textContent = entry.message;
        
        entryElement.appendChild(timestampSpan);
        entryElement.appendChild(categorySpan);
        entryElement.appendChild(messageSpan);
        
        this.content.appendChild(entryElement);
        
        // Limit number of entries
        while (this.content.children.length > this.maxEntries) {
            this.content.removeChild(this.content.firstChild!);
        }
        
        // Auto-scroll to bottom if enabled and not collapsed
        if (shouldScroll && this.autoScroll && !this.isCollapsed) {
            this.scrollToBottom();
        }
        
        this.updateFooter();
    }

    /**
     * Determine if an event should be shown based on current filter settings.
     */
    private shouldShowEvent(entry: EventLogEntry): boolean {
        if (this.showAllEvents) {
            return true;
        }
        
        // Show events that match visible categories
        return this.visibleCategories.has(entry.category as LogCategory);
    }

    /**
     * Toggle between showing all events and filtered events.
     */
    private toggleFilter(): void {
        this.showAllEvents = !this.showAllEvents;
        this.filterButton.textContent = this.showAllEvents ? 'ALL' : 'FILTERED';
        this.filterButton.title = this.showAllEvents ? 'Showing all events - click to filter' : 'Showing important events only - click to show all';
        
        // Refresh the display
        this.refreshEventDisplay();
    }

    /**
     * Refresh the event display based on current filter settings.
     */
    private refreshEventDisplay(): void {
        // Clear current display
        this.content.innerHTML = '';
        
        // Re-populate with filtered events
        const allEvents = this.eventStack.getEventLog();
        allEvents.forEach(entry => this.addEventEntry(entry, false));
        
        // Scroll to bottom if needed
        if (this.autoScroll && !this.isCollapsed) {
            this.scrollToBottom();
        }
    }

    private scrollToBottom(): void {
        this.content.scrollTop = this.content.scrollHeight;
    }

    private updateFooter(): void {
        const entryCount = this.content.children.length;
        const scrollInfo = this.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF';
        const filterInfo = this.showAllEvents ? 'All events' : 'Filtered';
        this.footer.textContent = `${entryCount}/${this.maxEntries} entries • ${filterInfo} • ${scrollInfo}`;
        
        // Add click handler to toggle auto-scroll
        this.footer.onclick = () => {
            this.autoScroll = !this.autoScroll;
            this.updateFooter();
        };
        this.footer.style.cursor = 'pointer';
        this.footer.title = 'Click to toggle auto-scroll';
    }

    /**
     * Toggle the event log visibility
     */
    public toggle(): void {
        this.isCollapsed = !this.isCollapsed;
        this.content.className = this.isCollapsed ? CSS_CLASSES.eventLog.contentCollapsed : CSS_CLASSES.eventLog.content;
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
        this.toggleButton.title = this.isCollapsed ? 'Show event log' : 'Hide event log';
        
        if (!this.isCollapsed && this.autoScroll) {
            this.scrollToBottom();
        }
    }

    /**
     * Clear all event log entries
     */
    public clear(): void {
        this.content.innerHTML = '';
        this.eventStack.clearEventLog();
        this.updateFooter();
    }

    /**
     * Map LogCategory to EventCategory for EventStack compatibility.
     */
    private mapToEventCategory(logCategory: LogCategory): EventCategory {
        switch (logCategory) {
            case LogCategory.TRAIN:
                return EventCategory.TRAIN;
            case LogCategory.ENEMY:
                return EventCategory.ENEMY;
            case LogCategory.UI:
                return EventCategory.UI;
            case LogCategory.ECONOMY:
                return EventCategory.ECONOMY;
            case LogCategory.ATTACHMENT:
                return EventCategory.ATTACHMENT;
            case LogCategory.RENDERING:
                return EventCategory.RENDERING;
            case LogCategory.ERROR:
                return EventCategory.ERROR;
            case LogCategory.GAME:
                return EventCategory.GAME;
            case LogCategory.STATION:
                return EventCategory.STATION;
            case LogCategory.COMBAT:
                return EventCategory.COMBAT;
            case LogCategory.SYSTEM:
            case LogCategory.NETWORK:
            case LogCategory.PERFORMANCE:
            case LogCategory.DEBUG:
            default:
                return EventCategory.SYSTEM;
        }
    }

    /**
     * Add a custom event to the log
     */
    public logEvent(category: LogCategory, message: string, payload?: any): void {
        const eventCategory = this.mapToEventCategory(category);
        this.eventStack.info(eventCategory, 'ui_event', message, payload, 'EventLogUI');
    }

    /**
     * Set maximum number of entries to display
     */
    public setMaxEntries(max: number): void {
        this.maxEntries = max;
        
        // Trim existing entries if needed
        while (this.content.children.length > this.maxEntries) {
            this.content.removeChild(this.content.firstChild!);
        }
        
        this.updateFooter();
    }

    /**
     * Get the collapsed state
     */
    public getCollapsedState(): boolean {
        return this.isCollapsed;
    }

    /**
     * Dispose of the event log UI
     */
    public dispose(): void {
        if (this.unsubscribeEventLog) {
            this.unsubscribeEventLog();
        }
        
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
