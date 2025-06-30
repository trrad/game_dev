/**
 * Enhanced Event Stack for scheduling and processing game events
 * Also provides event logging capabilities for the UI event log
 */

import { LogCategory } from "../utils/Logger";

export interface GameEvent {
    type: string;
    category?: LogCategory;
    payload?: any;
    execute: () => void;
    timestamp?: number;
    message?: string;
}

export interface EventLogEntry {
    timestamp: number;
    category: LogCategory;
    type: string;
    message: string;
    payload?: any;
}

export type EventLogListener = (entry: EventLogEntry) => void;

export class EventStack {
    private stack: GameEvent[] = [];
    private eventLog: EventLogEntry[] = [];
    private logListeners: Set<EventLogListener> = new Set();
    private maxLogEntries: number = 100;

    public push(event: GameEvent) {
        // Add timestamp if not provided
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }

        this.stack.push(event);
        
        // Add to event log
        this.addToEventLog({
            timestamp: event.timestamp,
            category: event.category || LogCategory.SYSTEM,
            type: event.type,
            message: event.message || `Event: ${event.type}`,
            payload: event.payload
        });
    }

    public processAll() {
        while (this.stack.length > 0) {
            const event = this.stack.shift();
            if (event) {
                try {
                    event.execute();
                } catch (error) {
                    this.addToEventLog({
                        timestamp: Date.now(),
                        category: LogCategory.ERROR,
                        type: 'event_execution_error',
                        message: `Error executing event ${event.type}: ${error}`,
                        payload: { originalEvent: event.type, error: error.toString() }
                    });
                }
            }
        }
    }

    public isEmpty() {
        return this.stack.length === 0;
    }

    /**
     * Add an entry directly to the event log (for non-executable events)
     */
    public logEvent(category: LogCategory, type: string, message: string, payload?: any) {
        this.addToEventLog({
            timestamp: Date.now(),
            category,
            type,
            message,
            payload
        });
    }

    /**
     * Get the event log entries
     */
    public getEventLog(): EventLogEntry[] {
        return [...this.eventLog];
    }

    /**
     * Get recent event log entries
     */
    public getRecentEventLog(count: number = 20): EventLogEntry[] {
        return this.eventLog.slice(-count);
    }

    /**
     * Clear the event log
     */
    public clearEventLog() {
        this.eventLog = [];
        this.notifyLogListeners();
    }

    /**
     * Subscribe to event log changes
     */
    public onEventLog(listener: EventLogListener): () => void {
        this.logListeners.add(listener);
        return () => this.logListeners.delete(listener);
    }

    /**
     * Set maximum number of log entries to keep
     */
    public setMaxLogEntries(max: number) {
        this.maxLogEntries = max;
        this.trimEventLog();
    }

    private addToEventLog(entry: EventLogEntry) {
        this.eventLog.push(entry);
        this.trimEventLog();
        this.notifyLogListeners(entry);
    }

    private trimEventLog() {
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog = this.eventLog.slice(-this.maxLogEntries);
        }
    }

    private notifyLogListeners(newEntry?: EventLogEntry) {
        this.logListeners.forEach(listener => {
            try {
                if (newEntry) {
                    listener(newEntry);
                }
            } catch (error) {
                console.error('Error in event log listener:', error);
            }
        });
    }
}
