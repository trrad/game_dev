# System Communication Patterns

## Overview

This guide establishes best practices for communication between systems in the ECS architecture, focusing on event-driven patterns that maintain loose coupling and system independence.

## Communication Methods

### 1. Event-Driven Communication (Primary)

**Use for**: System notifications, state changes, user actions

```typescript
// systems/TrainSystem.ts
export class TrainSystem {
    private eventStack: EventStack;
    
    startJourney(trainId: string, railId: string): void {
        // Perform the action
        const success = this.initiateTrainMovement(trainId, railId);
        
        if (success) {
            // Notify other systems via events
            this.eventStack.logEvent(LogCategory.TRAIN, 'journey_started', 
                `Train ${trainId} started journey`, {
                    trainId,
                    railId,
                    timestamp: performance.now()
                });
        }
    }
}

// systems/EnemySystem.ts
export class EnemySystem {
    constructor(private eventStack: EventStack) {
        // Listen for train events to trigger enemy spawning
        this.eventStack.subscribe('journey_started', (event) => {
            this.onTrainJourneyStarted(event.data);
        });
    }
    
    private onTrainJourneyStarted(data: any): void {
        Logger.log(LogCategory.ENEMY, 'Train journey detected, increasing spawn rate');
        this.increaseSpawnRate(data.trainId);
    }
}
```

### 2. Direct System References (Secondary)

**Use for**: Required dependencies, performance-critical operations

```typescript
// ECS App setup - establish direct references for core dependencies
export class ECSApp {
    private trainSystem: TrainSystem;
    private enemySystem: EnemySystem;
    
    initializeSystems(): void {
        // Create systems
        this.trainSystem = new TrainSystem();
        this.enemySystem = new EnemySystem(this.enemyRenderer);
        
        // Set up required direct references
        this.enemySystem.setTrainSystem(this.trainSystem);  // Enemy needs train locations
        this.trainSystem.setTimeManager(this.timeManager);  // Train needs time scaling
        
        // Event-based communication for everything else
        this.enemySystem.setEventStack(this.eventStack);
        this.trainSystem.setEventStack(this.eventStack);
    }
}

// systems/EnemySystem.ts
export class EnemySystem {
    private trainSystem: TrainSystem | null = null;
    
    setTrainSystem(trainSystem: TrainSystem): void {
        this.trainSystem = trainSystem;
    }
    
    update(deltaTime: number): void {
        if (this.trainSystem) {
            // Direct access for performance-critical data
            const activeTrains = this.trainSystem.getActiveTrains();
            this.updateEnemyTargeting(activeTrains);
        }
    }
}
```

### 3. Shared Data Services (Specialized)

**Use for**: Global state, configuration, caching

```typescript
// services/GameStateService.ts
export class GameStateService {
    private static instance: GameStateService;
    private gameState: GameState;
    
    static getInstance(): GameStateService {
        if (!GameStateService.instance) {
            GameStateService.instance = new GameStateService();
        }
        return GameStateService.instance;
    }
    
    getActiveTrains(): Train[] {
        return this.gameState.trains.filter(train => train.isActive);
    }
    
    updateTrainPosition(trainId: string, position: Position3D): void {
        const train = this.gameState.trains.find(t => t.id === trainId);
        if (train) {
            train.position = position;
            this.notifyStateChange('train_position_updated', { trainId, position });
        }
    }
}

// Usage in systems
export class RenderSystem {
    update(): void {
        const gameState = GameStateService.getInstance();
        const trains = gameState.getActiveTrains();
        this.updateTrainVisuals(trains);
    }
}
```

## Event System Patterns

### Event Categories and Naming

```typescript
// Establish clear event naming conventions
export const EventTypes = {
    // System lifecycle
    SYSTEM_INITIALIZED: 'system_initialized',
    SYSTEM_SHUTDOWN: 'system_shutdown',
    
    // Train events
    TRAIN_CREATED: 'train_created',
    TRAIN_JOURNEY_STARTED: 'train_journey_started',
    TRAIN_JOURNEY_COMPLETED: 'train_journey_completed',
    TRAIN_DAMAGED: 'train_damaged',
    
    // Enemy events
    ENEMY_SPAWNED: 'enemy_spawned',
    ENEMY_DEFEATED: 'enemy_defeated',
    ENEMY_ATTACK: 'enemy_attack',
    
    // UI events
    UI_BUTTON_CLICKED: 'ui_button_clicked',
    UI_PANEL_OPENED: 'ui_panel_opened',
    
    // Game state events
    GAME_PAUSED: 'game_paused',
    GAME_RESUMED: 'game_resumed',
    TIME_SPEED_CHANGED: 'time_speed_changed'
} as const;
```

### Event Data Standards

```typescript
// Standard event data structure
export interface GameEvent {
    type: string;
    category: LogCategory;
    timestamp: number;
    source: string;        // Which system/component generated the event
    data: any;            // Event-specific data
    metadata?: {          // Optional debugging/analysis data
        performance?: number;
        stackTrace?: string;
        userAction?: boolean;
    };
}

// Event creation helper
export function createEvent(
    type: string, 
    category: LogCategory, 
    source: string, 
    data: any, 
    metadata?: any
): GameEvent {
    return {
        type,
        category,
        timestamp: performance.now(),
        source,
        data,
        metadata
    };
}
```

### Event Handling Patterns

```typescript
// Pattern 1: Simple event listeners
export class UISystem {
    constructor(private eventStack: EventStack) {
        this.eventStack.subscribe(EventTypes.TRAIN_DAMAGED, (event) => {
            this.showDamageIndicator(event.data.trainId, event.data.damage);
        });
    }
}

// Pattern 2: Event filtering and batching
export class AudioSystem {
    private pendingAudioEvents: GameEvent[] = [];
    
    constructor(private eventStack: EventStack) {
        // Batch process audio events for performance
        this.eventStack.subscribe(['enemy_attack', 'train_damaged', 'explosion'], (event) => {
            this.pendingAudioEvents.push(event);
        });
        
        // Process batched events every frame
        setInterval(() => this.processPendingAudio(), 16); // ~60fps
    }
    
    private processPendingAudio(): void {
        const eventsToProcess = this.pendingAudioEvents.splice(0);
        
        // Group similar events to avoid audio spam
        const groupedEvents = this.groupEventsByType(eventsToProcess);
        groupedEvents.forEach(group => this.playGroupedAudio(group));
    }
}

// Pattern 3: Conditional event handling
export class TutorialSystem {
    private tutorialEnabled: boolean = true;
    
    constructor(private eventStack: EventStack) {
        this.eventStack.subscribe('*', (event) => {
            if (this.tutorialEnabled && this.isTutorialRelevant(event)) {
                this.handleTutorialEvent(event);
            }
        });
    }
}
```

## Anti-Patterns to Avoid

### ❌ Don't: Tight Coupling

```typescript
// BAD: System directly manipulating another system
export class BadTrainSystem {
    constructor(private enemySystem: EnemySystem, private uiSystem: UISystem) {}
    
    startJourney(trainId: string): void {
        // BAD: Direct manipulation of other systems
        this.enemySystem.increaseSpawnRate();
        this.uiSystem.showJourneyStartedMessage(trainId);
        this.enemySystem.setTargetTrain(trainId);
    }
}
```

### ❌ Don't: Circular Dependencies

```typescript
// BAD: Systems referencing each other
export class BadEnemySystem {
    constructor(private trainSystem: TrainSystem) {
        // This creates a circular dependency if TrainSystem also references EnemySystem
    }
}

export class BadTrainSystem {
    constructor(private enemySystem: EnemySystem) {
        // Circular dependency!
    }
}
```

### ❌ Don't: Event Spam

```typescript
// BAD: Emitting events every frame
export class BadMovementSystem {
    update(deltaTime: number): void {
        entities.forEach(entity => {
            const oldPosition = entity.position;
            entity.position = this.calculateNewPosition(entity, deltaTime);
            
            // BAD: This fires hundreds of events per second
            this.eventStack.logEvent('entity_moved', { entityId: entity.id });
        });
    }
}
```

## ✅ Recommended Patterns

### Event Debouncing

```typescript
// GOOD: Debounce frequent events
export class MovementSystem {
    private positionChangeDebouncer = new Map<string, number>();
    
    update(deltaTime: number): void {
        entities.forEach(entity => {
            const oldPosition = entity.position;
            entity.position = this.calculateNewPosition(entity, deltaTime);
            
            // Only emit event if entity moved significantly
            const distance = Vector3.Distance(oldPosition, entity.position);
            if (distance > 0.5) { // Threshold for "significant" movement
                this.emitMovementEvent(entity);
            }
        });
    }
}
```

### System Lifecycle Management

```typescript
// GOOD: Proper system initialization and cleanup
export class SystemManager {
    private systems: Map<string, System> = new Map();
    private eventStack: EventStack;
    
    initializeSystem<T extends System>(
        name: string, 
        systemClass: new (deps: any) => T, 
        dependencies: any
    ): T {
        const system = new systemClass(dependencies);
        this.systems.set(name, system);
        
        // Notify other systems
        this.eventStack.logEvent(EventTypes.SYSTEM_INITIALIZED, {
            systemName: name,
            systemType: systemClass.name
        });
        
        return system;
    }
    
    shutdownSystem(name: string): void {
        const system = this.systems.get(name);
        if (system) {
            system.dispose?.(); // Call cleanup if available
            this.systems.delete(name);
            
            this.eventStack.logEvent(EventTypes.SYSTEM_SHUTDOWN, {
                systemName: name
            });
        }
    }
}
```

### Performance-Conscious Event Handling

```typescript
// GOOD: Efficient event processing
export class PerformantEventHandler {
    private eventQueue: GameEvent[] = [];
    private processingBudget: number = 5; // Max 5ms per frame for event processing
    
    processEvents(): void {
        const startTime = performance.now();
        
        while (this.eventQueue.length > 0 && 
               (performance.now() - startTime) < this.processingBudget) {
            
            const event = this.eventQueue.shift()!;
            this.handleEvent(event);
        }
        
        // Log if we're falling behind on event processing
        if (this.eventQueue.length > 100) {
            Logger.log(LogCategory.PERFORMANCE, 
                'Event queue backlog detected', { queueLength: this.eventQueue.length });
        }
    }
}
```

## System Integration Examples

### Train-Enemy Interaction

```typescript
// Good example of loose coupling with clear interfaces
export class TrainSystem {
    private eventStack: EventStack;
    
    completeJourney(trainId: string): void {
        const train = this.trains.get(trainId);
        if (train) {
            train.setStatus('docked');
            
            // Event-driven notification
            this.eventStack.logEvent(EventTypes.TRAIN_JOURNEY_COMPLETED, {
                trainId,
                stationId: train.currentStation,
                cargo: train.getCargo(),
                duration: train.journeyDuration
            });
        }
    }
}

export class EnemySystem {
    constructor(private eventStack: EventStack) {
        this.eventStack.subscribe(EventTypes.TRAIN_JOURNEY_COMPLETED, (event) => {
            // Reduce enemy activity when trains are docked
            this.reduceSpawnRate(event.data.stationId);
        });
    }
}
```

### UI-System Integration

```typescript
export class UISystem {
    constructor(private eventStack: EventStack) {
        // Listen for game events to update UI
        this.eventStack.subscribe([
            EventTypes.TRAIN_DAMAGED,
            EventTypes.ENEMY_DEFEATED,
            EventTypes.TIME_SPEED_CHANGED
        ], (event) => {
            this.handleGameEvent(event);
        });
    }
    
    private handleGameEvent(event: GameEvent): void {
        switch (event.type) {
            case EventTypes.TRAIN_DAMAGED:
                this.updateHealthBar(event.data.trainId, event.data.newHealth);
                break;
            case EventTypes.ENEMY_DEFEATED:
                this.showEnemyDefeatedEffect(event.data.enemyId);
                break;
            case EventTypes.TIME_SPEED_CHANGED:
                this.updateTimeSpeedDisplay(event.data.newSpeed);
                break;
        }
    }
}
```

## Summary Guidelines

1. **Primary**: Use event-driven communication for most inter-system interactions
2. **Secondary**: Use direct references only for core dependencies and performance-critical data
3. **Avoid**: Circular dependencies and tight coupling between systems
4. **Debounce**: Frequent events to prevent performance issues
5. **Structure**: Events with consistent naming and data formats
6. **Monitor**: Event queue performance and processing times
7. **Document**: System dependencies and communication patterns clearly
