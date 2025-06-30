/**
 * Event Log UI Component
 * Provides a toggleable event/console log window for game events
 */

import { EventStack, EventLogEntry } from "../core/EventStack";
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
        
        // Header with title and toggle
        this.header = document.createElement('div');
        this.header.className = CSS_CLASSES.eventLog.header;
        
        const title = document.createElement('div');
        title.className = CSS_CLASSES.eventLog.title;
        title.textContent = 'Event Log';
        
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = CSS_CLASSES.eventLog.toggle;
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
        this.toggleButton.title = this.isCollapsed ? 'Show event log' : 'Hide event log';
        this.toggleButton.onclick = () => this.toggle();
        
        this.header.appendChild(title);
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

    private scrollToBottom(): void {
        this.content.scrollTop = this.content.scrollHeight;
    }

    private updateFooter(): void {
        const entryCount = this.content.children.length;
        const scrollInfo = this.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF';
        this.footer.textContent = `${entryCount}/${this.maxEntries} entries • ${scrollInfo}`;
        
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
     * Add a custom event to the log
     */
    public logEvent(category: LogCategory, message: string, payload?: any): void {
        this.eventStack.logEvent(category, 'ui_event', message, payload);
    }

    /**
     * Set maximum number of entries to display
     */
    public setMaxEntries(max: number): void {
        this.maxEntries = max;
        this.eventStack.setMaxLogEntries(max);
        
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
