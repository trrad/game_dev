# Train Trading Game - Coding Style & Architecture Guide

## Overview

This document establishes coding standards, architectural patterns, and design principles for the Train Trading Game project. These guidelines ensure consistent, maintainable, and scalable code as the project grows and multiple developers contribute.

## Core Architectural Principles

### 1. **Observable by Design**
Every class should include built-in observability from creation, not added as an afterthought.

```typescript
// ✅ GOOD: Built-in observability
export class TrainSystem extends SystemManager {
    constructor() {
        super('TrainSystem');
        this.metrics.set('trains_updated', 0);
        this.metrics.set('journeys_started', 0);
    }
    
    private updateTrain(train: Train): void {
        const startTime = performance.now();
        
        // ... update logic ...
        
        this.logMetric('trains_updated', 1);
        this.logMetric('update_time_ms', performance.now() - startTime);
    }
}

// ❌ BAD: No observability
export class TrainSystem {
    updateTrain(train: Train): void {
        // ... update logic with no metrics ...
    }
}
```

### 2. **Component-Entity-System Pattern**
Prefer composition over inheritance. Entities are data containers, components provide functionality.

```typescript
// ✅ GOOD: Composition-based design
export class Train extends GameObject {
    constructor(playerId: string) {
        super('train');
        this.addComponent(new PositionComponent(this));
        this.addComponent(new MovementComponent(this));
        this.addComponent(new InventoryComponent(this, 100));
    }
}

// ❌ BAD: Deep inheritance hierarchies
export class MovableTrain extends InventoryTrain extends BaseTrain {
    // Brittle inheritance chain
}
```

### 3. **Event-Driven Communication**
Systems communicate through events, not direct method calls, to maintain loose coupling.

```typescript
// ✅ GOOD: Event-driven
export class TrainSystem extends SystemManager {
    private startJourney(train: Train, railId: string): void {
        // ... journey logic ...
        
        this.emitEvent({
            type: 'journey_started',
            trainId: train.id,
            railId: railId,
            timestamp: performance.now()
        });
    }
}

// ❌ BAD: Direct coupling
export class TrainSystem {
    constructor(private uiManager: UIManager, private audioManager: AudioManager) {}
    
    private startJourney(train: Train, railId: string): void {
        // ... journey logic ...
        this.uiManager.showJourneyStarted(train.id); // Tight coupling
        this.audioManager.playTrainSound(); // Tight coupling
    }
}
```

### 4. **Deterministic Game Logic**
All game logic must be reproducible for network synchronization. Use seeded RNG, avoid Date.now() in game logic.

```typescript
// ✅ GOOD: Deterministic
export class EnemySpawner {
    constructor(private rng: SeededRNG) {}
    
    shouldSpawnEnemy(gameTime: number): boolean {
        return this.rng.random() < this.calculateSpawnChance(gameTime);
    }
}

// ❌ BAD: Non-deterministic
export class EnemySpawner {
    shouldSpawnEnemy(): boolean {
        return Math.random() < 0.1; // Different on each client
    }
}
```

### 5. **Mobile-First Responsive Design**
Design touch interfaces first, add mouse/keyboard as enhancements.

```typescript
// ✅ GOOD: Touch-first design
export class AttachmentInterface {
    constructor() {
        this.setupTouchHandlers(); // Primary interface
        this.setupMouseHandlers(); // Enhancement
    }
    
    private setupTouchHandlers(): void {
        // Large touch targets, gesture recognition
    }
    
    private setupMouseHandlers(): void {
        // Precise mouse interactions
    }
}
```

## TypeScript Coding Standards

### Type Safety
Use strict TypeScript settings. Avoid `any` except for well-documented edge cases.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}

// ✅ GOOD: Strict typing
export interface TrainConfig {
    maxSpeed: number;
    carSpacing: number;
    powerEfficiency: number;
}

export class Train extends GameObject {
    constructor(private config: TrainConfig) {
        super('train');
    }
}

// ❌ BAD: Loose typing
export class Train extends GameObject {
    constructor(config: any) { // Avoid any
        super('train');
    }
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
export class TrainSystem extends SystemManager {}

// Interfaces: PascalCase, descriptive
export interface PlayerInventory {}
export interface AttachmentConfiguration {}

// Constants: UPPER_SNAKE_CASE
export const MAX_TRAIN_CARS = 8;
export const DEFAULT_SPAWN_RATE = 0.1;

// Variables/Functions: camelCase
const trainCount = 5;
const isMoving = true;

function calculateDistance(pointA: Vector3, pointB: Vector3): number {}

// Private members: prefix with underscore
export class GameObject {
    private _components: Map<string, Component> = new Map();
    private _disposed: boolean = false;
}

// Generic type parameters: single uppercase letter
export interface Component<T = any> {
    serialize(): T;
    deserialize(data: T): void;
}
```

### Function Design

```typescript
// ✅ GOOD: Pure functions when possible
export function calculateProfit(
    baseValue: number, 
    distance: number, 
    demandMultiplier: number
): number {
    return Math.floor(baseValue * distance * demandMultiplier);
}

// ✅ GOOD: Clear parameter objects for complex functions
export interface JourneyOptions {
    trainId: string;
    railId: string;
    destinationId: string;
    powerSetting?: number;
}

export function startJourney(options: JourneyOptions): boolean {
    // Implementation
}

// ❌ BAD: Too many parameters
export function startJourney(
    trainId: string, 
    railId: string, 
    destinationId: string, 
    powerSetting: number, 
    playerId: string, 
    timestamp: number
): boolean {
    // Hard to call correctly
}
```

## Error Handling Patterns

### Graceful Degradation
Always provide fallbacks and meaningful error messages.

```typescript
// ✅ GOOD: Comprehensive error handling
export class AttachmentManager {
    attach(attachment: Attachment, position: AttachmentPosition3D): AttachmentResult {
        try {
            if (!this.validateAttachment(attachment)) {
                return {
                    success: false,
                    error: 'INVALID_ATTACHMENT',
                    message: `Attachment ${attachment.name} is not compatible with this car type`
                };
            }
            
            if (!this.canAttach(attachment, position)) {
                return {
                    success: false,
                    error: 'POSITION_OCCUPIED',
                    message: 'Selected position is already occupied'
                };
            }
            
            this.performAttachment(attachment, position);
            return { success: true };
            
        } catch (error) {
            Logger.error('AttachmentManager', 'Unexpected error during attachment', {
                attachmentId: attachment.id,
                position: position,
                error: error.message
            });
            
            return {
                success: false,
                error: 'SYSTEM_ERROR',
                message: 'An unexpected error occurred. Please try again.'
            };
        }
    }
}

// ❌ BAD: Silent failures
export class AttachmentManager {
    attach(attachment: Attachment, position: AttachmentPosition3D): boolean {
        if (!this.canAttach(attachment, position)) {
            return false; // No indication of why it failed
        }
        // ... rest of implementation
    }
}
```

### Result Types
Use Result types for operations that can fail gracefully.

```typescript
export type Result<T, E = string> = 
    | { success: true; data: T }
    | { success: false; error: E; message?: string };

export type AttachmentResult = Result<void, 'INVALID_ATTACHMENT' | 'POSITION_OCCUPIED' | 'SYSTEM_ERROR'>;
export type TradeResult = Result<TradeData, 'INSUFFICIENT_FUNDS' | 'INVALID_CARGO' | 'STATION_CLOSED'>;
```

## Performance Patterns

### Object Pooling
Pool frequently created/destroyed objects to reduce GC pressure.

```typescript
// ✅ GOOD: Object pooling for enemies
export class EnemyPool {
    private availableEnemies: Enemy[] = [];
    private activeEnemies: Set<Enemy> = new Set();
    
    acquire(): Enemy {
        let enemy = this.availableEnemies.pop();
        if (!enemy) {
            enemy = new Enemy();
        }
        this.activeEnemies.add(enemy);
        return enemy;
    }
    
    release(enemy: Enemy): void {
        if (this.activeEnemies.has(enemy)) {
            enemy.reset(); // Clear state
            this.activeEnemies.delete(enemy);
            this.availableEnemies.push(enemy);
        }
    }
}

// ❌ BAD: Creating new objects every frame
export class EnemySpawner {
    spawnEnemy(): Enemy {
        return new Enemy(); // GC pressure
    }
}
```

### Efficient Updates
Batch operations and avoid unnecessary work.

```typescript
// ✅ GOOD: Batch updates and early returns
export class TrainSystem extends SystemManager {
    update(deltaTime: number, gameState: GameState): void {
        if (!this.isEnabled || this.entities.size === 0) return;
        
        const movingTrains = Array.from(this.entities.values())
            .filter(entity => entity instanceof Train && entity.isMoving);
            
        if (movingTrains.length === 0) return;
        
        // Batch process only moving trains
        movingTrains.forEach(train => this.updateMovement(train, deltaTime));
    }
}

// ❌ BAD: Unnecessary work every frame
export class TrainSystem extends SystemManager {
    update(deltaTime: number, gameState: GameState): void {
        this.entities.forEach(entity => {
            if (entity instanceof Train) {
                // Always processes all trains, even stationary ones
                this.updateTrain(entity, deltaTime);
            }
        });
    }
}
```

## Memory Management

### Disposal Patterns
Implement consistent disposal patterns to prevent memory leaks.

```typescript
// ✅ GOOD: Comprehensive disposal
export class GameObject {
    private _disposed: boolean = false;
    
    dispose(): void {
        if (this._disposed) return;
        
        this.emitEvent({ type: 'object_disposing', objectId: this.id });
        
        // Dispose components
        this.components.forEach(component => component.dispose());
        this.components.clear();
        
        // Clear references
        this.eventHistory.length = 0;
        this.metrics.clear();
        
        // Unregister from tracking
        ObjectTracker.unregister(this);
        
        this._disposed = true;
    }
    
    isDisposed(): boolean {
        return this._disposed;
    }
}

// ❌ BAD: Incomplete disposal
export class GameObject {
    dispose(): void {
        // Doesn't clear all references, causes memory leaks
    }
}
```

### Weak References
Use weak references for observer patterns to prevent memory leaks.

```typescript
// ✅ GOOD: WeakSet for observers
export class EventEmitter {
    private observers: WeakSet<EventObserver> = new WeakSet();
    
    addObserver(observer: EventObserver): void {
        this.observers.add(observer);
    }
    
    // No need for removeObserver - WeakSet handles cleanup
}

// ❌ BAD: Strong references requiring manual cleanup
export class EventEmitter {
    private observers: EventObserver[] = [];
    
    addObserver(observer: EventObserver): void {
        this.observers.push(observer);
    }
    
    removeObserver(observer: EventObserver): void {
        // Manual cleanup required, often forgotten
        const index = this.observers.indexOf(observer);
        if (index >= 0) this.observers.splice(index, 1);
    }
}
```

## Configuration Management

### Environment-Based Configuration
Use environment-specific configuration files.

```typescript
// config/base.json
{
    "game": {
        "tickRate": 60,
        "maxPlayers": 6
    },
    "train": {
        "maxSpeed": 0.25,
        "carSpacing": 0.8
    }
}

// config/development.json
{
    "debug": {
        "enableLogging": true,
        "showPerformanceMetrics": true,
        "enableVisualDebug": true
    },
    "game": {
        "tickRate": 30  // Override for easier debugging
    }
}

// Config loading
export class ConfigManager {
    private static config: GameConfig;
    
    static async initialize(environment: 'development' | 'production' | 'test'): Promise<void> {
        const baseConfig = await import(`./config/base.json`);
        const envConfig = await import(`./config/${environment}.json`);
        
        this.config = this.mergeConfigs(baseConfig, envConfig);
    }
    
    static get<T>(path: string): T {
        return this.getNestedValue(this.config, path);
    }
}
```

### Type-Safe Configuration
Generate TypeScript interfaces from configuration schemas.

```typescript
// Generated from JSON schema
export interface GameConfig {
    game: {
        tickRate: number;
        maxPlayers: number;
    };
    train: {
        maxSpeed: number;
        carSpacing: number;
        maxCars: number;
    };
    debug?: {
        enableLogging: boolean;
        showPerformanceMetrics: boolean;
        enableVisualDebug: boolean;
    };
}

// Usage with type safety
const maxSpeed = ConfigManager.get<number>('train.maxSpeed');
const debugEnabled = ConfigManager.get<boolean>('debug.enableLogging') ?? false;
```

## Debugging & Development

### Structured Logging
Use structured logging with categories and context.

```typescript
export enum LogCategory {
    TRAIN = 'train',
    ENEMY = 'enemy',
    NETWORK = 'network',
    ECONOMY = 'economy',
    ATTACHMENT = 'attachment',
    PERFORMANCE = 'performance'
}

export class Logger {
    private static enabledCategories: Set<LogCategory> = new Set();
    
    static setEnabledCategories(categories: LogCategory[]): void {
        this.enabledCategories = new Set(categories);
    }
    
    static log(category: LogCategory, message: string, context?: any): void {
        if (!this.enabledCategories.has(category)) return;
        
        const logEntry = {
            timestamp: performance.now(),
            category,
            message,
            context: context || {}
        };
        
        console.log(`[${category.toUpperCase()}] ${message}`, context);
        
        // Store for debugging tools
        LogStore.add(logEntry);
    }
    
    static error(category: LogCategory, message: string, error: Error | any): void {
        const errorEntry = {
            timestamp: performance.now(),
            category,
            level: 'ERROR',
            message,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        };
        
        console.error(`[${category.toUpperCase()}] ERROR: ${message}`, error);
        LogStore.add(errorEntry);
    }
}

// Usage
Logger.log(LogCategory.TRAIN, 'Journey started', {
    trainId: train.id,
    railId: rail.id,
    playerId: player.id
});
```

### Debug Visualization
Implement toggle-able debug overlays.

```typescript
export class DebugRenderer {
    private static overlays: Map<string, DebugOverlay> = new Map();
    
    static registerOverlay(name: string, overlay: DebugOverlay): void {
        this.overlays.set(name, overlay);
    }
    
    static toggleOverlay(name: string): void {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.visible = !overlay.visible;
        }
    }
    
    static update(scene: Scene): void {
        this.overlays.forEach(overlay => {
            if (overlay.visible) {
                overlay.render(scene);
            }
        });
    }
}

// Debug overlays
DebugRenderer.registerOverlay('attachment_grid', new AttachmentGridOverlay());
DebugRenderer.registerOverlay('enemy_ai', new EnemyAIOverlay());
DebugRenderer.registerOverlay('performance', new PerformanceOverlay());

// Toggle with keyboard shortcuts in development
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey) {
        switch (event.key) {
            case '1': DebugRenderer.toggleOverlay('attachment_grid'); break;
            case '2': DebugRenderer.toggleOverlay('enemy_ai'); break;
            case '3': DebugRenderer.toggleOverlay('performance'); break;
        }
    }
});
```

## Testing Patterns

### Unit Testing
Write focused unit tests for pure functions and business logic.

```typescript
// TrainSystem.test.ts
describe('TrainSystem', () => {
    let trainSystem: TrainSystem;
    let mockGameState: GameState;
    
    beforeEach(() => {
        trainSystem = new TrainSystem();
        mockGameState = createMockGameState();
    });
    
    describe('startJourney', () => {
        it('should start journey with valid parameters', () => {
            const train = new Train('player1', 'station_a');
            const rail = createMockRail('station_a', 'station_b');
            
            const result = trainSystem.startJourney(train.id, rail.id, 'station_b');
            
            expect(result.success).toBe(true);
            expect(train.isMoving).toBe(true);
            expect(train.currentRail).toBe(rail.id);
        });
        
        it('should fail if train is already moving', () => {
            const train = new Train('player1', 'station_a');
            train.isMoving = true;
            
            const result = trainSystem.startJourney(train.id, 'rail_1', 'station_b');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('TRAIN_ALREADY_MOVING');
        });
    });
});
```

### Integration Testing
Test system interactions and event flows.

```typescript
// Integration.test.ts
describe('Train Journey Integration', () => {
    let gameState: GameState;
    let trainSystem: TrainSystem;
    let economySystem: EconomySystem;
    
    beforeEach(() => {
        gameState = new GameState();
        trainSystem = new TrainSystem();
        economySystem = new EconomySystem();
    });
    
    it('should complete full journey workflow', async () => {
        // Arrange
        const player = createTestPlayer();
        const train = createTestTrain(player.id);
        const route = createTestRoute();
        
        gameState.addPlayer(player);
        gameState.addTrain(train);
        
        // Act
        const journeyResult = trainSystem.startJourney(train.id, route.railId, route.destinationId);
        
        // Simulate journey completion
        while (train.progress < 1.0) {
            trainSystem.update(1/60, gameState);
            train.progress += 0.1;
        }
        
        // Assert
        expect(journeyResult.success).toBe(true);
        expect(train.currentLocation).toBe(route.destinationId);
        expect(train.isMoving).toBe(false);
    });
});
```

## File Organization

### Directory Structure
```
src/
├── core/                   # Core architecture
│   ├── GameObject.ts
│   ├── Component.ts
│   ├── SystemManager.ts
│   └── EventStack.ts
├── entities/               # Game entities
│   ├── Train.ts
│   ├── TrainCar.ts
│   ├── Player.ts
│   ├── Enemy.ts
│   └── Station.ts
├── systems/                # Game systems
│   ├── TrainSystem.ts
│   ├── EconomySystem.ts
│   ├── StationSystem.ts
│   └── AttachmentSystem.ts
├── components/             # Reusable components
│   ├── PositionComponent.ts
│   ├── HealthComponent.ts
│   └── InventoryComponent.ts
├── ui/                     # User interface
│   ├── UIManager.ts
│   ├── panels/
│   └── mobile/
├── rendering/              # Client-side rendering
│   ├── SceneManager.ts
│   ├── LightingManager.ts
│   └── DebugRenderer.ts
├── networking/             # Multiplayer
│   ├── GameRoom.ts
│   ├── StateSync.ts
│   └── NetworkManager.ts
├── config/                 # Configuration
│   ├── GameConfig.ts
│   ├── base.json
│   ├── development.json
│   └── production.json
├── utils/                  # Utilities
│   ├── Logger.ts
│   ├── ObjectTracker.ts
│   └── PerformanceProfiler.ts
└── tests/                  # Test files
    ├── unit/
    ├── integration/
    └── utils/
```

### Import Organization
```typescript
// 1. Node modules
import { Vector3, Mesh, Scene } from '@babylonjs/core';
import { Room, Client } from 'colyseus';

// 2. Internal core modules
import { GameObject } from '../core/GameObject';
import { Component, ComponentType } from '../core/Component';

// 3. Internal feature modules  
import { TrainSystem } from '../systems/TrainSystem';
import { InventoryComponent } from '../components/InventoryComponent';

// 4. Types and interfaces
import type { GameState, PlayerAction } from '../types';

// 5. Configuration and constants
import { GameConfig } from '../config/GameConfig';
import { MAX_TRAIN_CARS } from '../constants';
```

## Documentation Standards

### JSDoc Comments
Use comprehensive JSDoc for public APIs.

```typescript
/**
 * Manages train movement, journey planning, and position updates.
 * 
 * This system handles all train-related game logic including:
 * - Starting and ending journeys between stations
 * - Updating train positions along rails
 * - Managing train car configurations
 * - Calculating movement physics
 * 
 * @example
 * ```typescript
 * const trainSystem = new TrainSystem();
 * const result = trainSystem.startJourney('train_1', 'rail_ab', 'station_b');
 * if (result.success) {
 *   console.log('Journey started successfully');
 * }
 * ```
 */
export class TrainSystem extends SystemManager {
    /**
     * Initiates a journey for the specified train.
     * 
     * @param trainId - Unique identifier of the train
     * @param railId - Rail to travel on
     * @param destinationId - Target station
     * @returns Result indicating success or failure with error details
     * 
     * @throws {Error} If train or rail entities are not found
     * 
     * @example
     * ```typescript
     * const result = trainSystem.startJourney('train_1', 'rail_ab', 'station_b');
     * if (!result.success) {
     *   console.error(`Journey failed: ${result.message}`);
     * }
     * ```
     */
    startJourney(trainId: string, railId: string, destinationId: string): JourneyResult {
        // Implementation...
    }
}
```

This coding style guide ensures consistent, maintainable, and scalable code that aligns with the architectural principles established for the Train Trading Game. All team members should refer to this document when writing new code or refactoring existing systems.