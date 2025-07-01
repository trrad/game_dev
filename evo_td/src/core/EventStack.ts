/**
 * Enhanced Event Stack for scheduling and processing game events
 * Also provides event logging capabilities for the UI event log
 * Now includes lightweight pub/sub for cross-entity communication
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

// Lightweight event for pub/sub communication
export interface CommunicationEvent {
    type: string;
    payload?: any;
    timestamp?: number;
    source?: string; // Entity/System that emitted the event
}

export type EventLogListener = (entry: EventLogEntry) => void;
export type CommunicationEventListener = (event: CommunicationEvent) => void;

export class EventStack {
    private stack: GameEvent[] = [];
    private eventLog: EventLogEntry[] = [];
    private logListeners: Set<EventLogListener> = new Set();
    private maxLogEntries: number = 100;
    
    // Pub/Sub system for cross-entity communication
    private subscribers: Map<string, Set<CommunicationEventListener>> = new Map();

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

    /**
     * Subscribe to a specific event type for cross-entity communication
     */
    public subscribe(eventType: string, listener: CommunicationEventListener): () => void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        
        this.subscribers.get(eventType)!.add(listener);
        
        // Return unsubscribe function
        return () => {
            const subscribers = this.subscribers.get(eventType);
            if (subscribers) {
                subscribers.delete(listener);
                if (subscribers.size === 0) {
                    this.subscribers.delete(eventType);
                }
            }
        };
    }

    /**
     * Emit an event for cross-entity communication
     */
    public emit(event: CommunicationEvent): void {
        // Add timestamp if not provided
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }

        // Notify all subscribers to this event type
        const subscribers = this.subscribers.get(event.type);
        if (subscribers) {
            subscribers.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    this.addToEventLog({
                        timestamp: Date.now(),
                        category: LogCategory.ERROR,
                        type: 'event_listener_error',
                        message: `Error in event listener for ${event.type}: ${error}`,
                        payload: { originalEvent: event.type, error: error.toString() }
                    });
                }
            });
        }

        // Also log the communication event for debugging
        this.addToEventLog({
            timestamp: event.timestamp,
            category: LogCategory.SYSTEM,
            type: event.type,
            message: `Event: ${event.type}${event.source ? ` from ${event.source}` : ''}`,
            payload: event.payload
        });
    }

    /**
     * Get all current subscribers (for debugging)
     */
    public getSubscriberCount(eventType?: string): number {
        if (eventType) {
            return this.subscribers.get(eventType)?.size || 0;
        }
        // Return total subscribers across all event types
        let total = 0;
        this.subscribers.forEach(subscribers => {
            total += subscribers.size;
        });
        return total;
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
