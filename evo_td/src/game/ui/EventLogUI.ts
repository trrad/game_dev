/**
 * EventLogUI (Event Log User Interface)
 *
 * ROLE:
 *   - Pure display and user-interaction component for the event log.
 *   - Subscribes to EventStack for log updates; does NOT listen to the scene graph directly.
 *   - Does not manage or transform log state; all log normalization, filtering, and buffering is handled by EventStack.
 *   - Provides UI for filtering, toggling, and exporting logs, but does not mutate the underlying log buffer.
 *
 * ARCHITECTURE PATTERN:
 *   - EventStack is the middleware logger/observer: it listens to the root node of the scene graph and provides a normalized log stream.
 *   - EventLogUI subscribes to EventStack for log updates and displays them, applying only UI-level filtering (e.g., category, collapsed state).
 *   - This separation ensures the UI remains simple, testable, and decoupled from the event system and log state management.
 *
 *   - Do NOT have EventLogUI listen to the scene graph or emit log events directly; always go through EventStack.
 *
 *   - If you need to add a new log type or filter, update EventStack, not EventLogUI.
 *
 * See EventStack.ts for more details on the event logging architecture.
 */

/**
 * Event Log UI Component (ECS NodeObject)
 * Provides a toggleable event/console log window for game events, as an ECS node.
 */

import { EventStack, EventLogEntry, EventCategory } from "../../engine/core/EventStack";
import { LogCategory } from "../../engine/utils/Logger";
import { CSS_CLASSES, defaultUIConfig } from "./assets/ui-config";
import { Scene } from "@babylonjs/core";

export class EventLogUI {
    private content: HTMLElement;
    private header: HTMLElement;
    private footer: HTMLElement;
    private isCollapsed: boolean = false;
    private autoScroll: boolean = true;
    private maxEntries: number = 100;
    private showAllEvents: boolean = false;
    private visibleCategories: Set<string> = new Set(['TRAIN', 'ENEMY', 'ECONOMY', 'ERROR']);
    private filterButton: HTMLButtonElement;
    private toggleButton: HTMLButtonElement;
    public readonly htmlElement: HTMLElement;

    constructor(options?: { maxEntries?: number; autoScroll?: boolean; collapsed?: boolean; }) {
        this.maxEntries = options?.maxEntries ?? 100;
        this.autoScroll = options?.autoScroll ?? true;
        this.isCollapsed = options?.collapsed ?? false;
        this.htmlElement = document.createElement('div');
        this.htmlElement.className = 'event-log-panel';
        this.createUI();
    }

    private createUI(): void {
        // Header with title and controls
        this.header = document.createElement('div');
        this.header.className = 'event-log-header';
        const title = document.createElement('div');
        title.className = 'event-log-title';
        title.textContent = 'Event Log';

        // Filter toggle button
        this.filterButton = document.createElement('button');
        this.filterButton.className = 'event-log-toggle';
        this.filterButton.textContent = this.showAllEvents ? 'ALL' : 'FILTERED';
        this.filterButton.title = this.showAllEvents ? 'Showing all events - click to filter' : 'Showing important events only - click to show all';
        this.filterButton.onclick = () => this.toggleFilter();
        this.filterButton.style.marginRight = '4px';

        // Toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'event-log-toggle';
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
        this.toggleButton.title = this.isCollapsed ? 'Show event log' : 'Hide event log';
        this.toggleButton.onclick = () => this.toggle();

        this.header.appendChild(title);
        this.header.appendChild(this.filterButton);
        this.header.appendChild(this.toggleButton);

        // Content area
        this.content = document.createElement('div');
        this.content.className = this.isCollapsed ? 'event-log-content-collapsed' : 'event-log-content';

        // Footer
        this.footer = document.createElement('div');
        this.footer.className = 'event-log-footer';
        this.updateFooter();

        // Assemble the UI
        this.htmlElement.appendChild(this.header);
        this.htmlElement.appendChild(this.content);
        this.htmlElement.appendChild(this.footer);
    }

    public addLogEntry(entry: any): void {
        if (!this.shouldShowEvent(entry)) {
            return;
        }
        const entryElement = document.createElement('div');
        entryElement.className = 'event-log-entry';
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = timestamp;
        const categorySpan = document.createElement('span');
        categorySpan.className = `category ${entry.category?.toUpperCase?.()}`;
        categorySpan.textContent = `[${entry.category?.toUpperCase?.() ?? ''}]`;
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
        if (this.autoScroll && !this.isCollapsed) {
            this.scrollToBottom();
        }
        this.updateFooter();
    }

    private shouldShowEvent(entry: any): boolean {
        if (this.showAllEvents) {
            return true;
        }
        return this.visibleCategories.has(entry.category?.toUpperCase?.());
    }

    private toggleFilter(): void {
        this.showAllEvents = !this.showAllEvents;
        this.filterButton.textContent = this.showAllEvents ? 'ALL' : 'FILTERED';
        this.filterButton.title = this.showAllEvents ? 'Showing all events - click to filter' : 'Showing important events only - click to show all';
        this.refreshEventDisplay();
    }

    private refreshEventDisplay(): void {
        this.content.innerHTML = '';
        // No buffer here; UIManager should call addLogEntry for each entry if needed
        this.updateFooter();
    }

    private scrollToBottom(): void {
        this.content.scrollTop = this.content.scrollHeight;
    }

    private updateFooter(): void {
        const entryCount = this.content.children.length;
        const scrollInfo = this.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF';
        const filterInfo = this.showAllEvents ? 'All events' : 'Filtered';
        this.footer.textContent = `${entryCount}/${this.maxEntries} entries • ${filterInfo} • ${scrollInfo}`;
        this.footer.onclick = () => {
            this.autoScroll = !this.autoScroll;
            this.updateFooter();
        };
        this.footer.style.cursor = 'pointer';
        this.footer.title = 'Click to toggle auto-scroll';
    }

    public toggle(): void {
        this.isCollapsed = !this.isCollapsed;
        this.content.className = this.isCollapsed ? 'event-log-content-collapsed' : 'event-log-content';
        this.toggleButton.textContent = this.isCollapsed ? '▲' : '▼';
        this.toggleButton.title = this.isCollapsed ? 'Show event log' : 'Hide event log';
        if (!this.isCollapsed && this.autoScroll) {
            this.scrollToBottom();
        }
    }

    public clear(): void {
        this.content.innerHTML = '';
        this.updateFooter();
    }

    public setMaxEntries(max: number): void {
        this.maxEntries = max;
        while (this.content.children.length > this.maxEntries) {
            this.content.removeChild(this.content.firstChild!);
        }
        this.updateFooter();
    }

    public show(): void {
        this.htmlElement.style.display = 'block';
    }

    public dispose(): void {
        if (this.htmlElement && this.htmlElement.parentNode) {
            this.htmlElement.parentNode.removeChild(this.htmlElement);
        }
    }
}
