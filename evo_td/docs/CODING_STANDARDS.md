# Coding Standards & Architecture Guide

## Overview

This document establishes coding standards, architectural patterns, and design principles for the Train Trading Game project. These guidelines ensure consistent, maintainable, and scalable code as the project evolves.

## Core Architectural Principles

### 1. Observable by Design
Every class should include built-in observability from creation, not added as an afterthought.

```typescript
// ✅ GOOD: Built-in observability
export class TrainSystem {
    private metrics: Map<string, number> = new Map();
    
    constructor() {
        // Initialize metrics tracking
        this.metrics.set('trains_updated', 0);
        this.metrics.set('journeys_started', 0);
        
        Logger.log(LogCategory.SYSTEM, 'TrainSystem initialized');
    }
    
    private updateTrain(train: Train): void {
        const startTime = performance.now();
        
        // ... update logic ...
        
        this.metrics.set('trains_updated', this.metrics.get('trains_updated')! + 1);
        this.metrics.set('update_time_ms', performance.now() - startTime);
    }
}

// ❌ BAD: No observability
export class TrainSystem {
    updateTrain(train: Train): void {
        // ... update logic with no metrics ...
    }
}
```

### 2. Component-Entity-System Pattern
Prefer composition over inheritance. Entities are data containers, components provide functionality.

```typescript
// ✅ GOOD: Composition-based design
export class Train extends GameObject {
    constructor(playerId: string) {
        super('train');
        this.addComponent(new PositionComponent());
        this.addComponent(new MovementComponent());
        this.addComponent(new InventoryComponent(100));
    }
}

// ❌ BAD: Deep inheritance hierarchies
export class MovableTrain extends InventoryTrain extends BaseTrain {
    // Brittle inheritance chain
}
```

### 3. Event-Driven Communication
Systems communicate through events, not direct method calls, to maintain loose coupling.

```typescript
// ✅ GOOD: Event-driven communication using EventStack
export class TrainSystem {
    private eventStack: EventStack | null = null;
    
    constructor() {
        // System initialization
        Logger.log(LogCategory.SYSTEM, 'TrainSystem initialized');
    }
    
    setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
    }
    
    private startJourney(train: Train, railId: string): void {
        // ... journey logic ...
        
        if (this.eventStack) {
            this.eventStack.logEvent(EventCategory.SYSTEM, 'journey_started', {
                trainId: train.id,
                railId: railId,
                timestamp: performance.now()
            });
        }
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

### 4. Deterministic Game Logic
All game logic must be reproducible for network synchronization. Use seeded RNG, avoid `Date.now()` in game logic.

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

### 5. Immutable Configuration
Configuration objects should be immutable after creation to prevent accidental modification.

```typescript
// ✅ GOOD: Immutable config
export interface TrainCarConfig {
    readonly carType: CarType;
    readonly maxHealth: number;
    readonly cargoCapacity: number;
}

// ❌ BAD: Mutable config
export interface TrainCarConfig {
    carType: CarType;
    maxHealth: number; // Could be accidentally modified
    cargoCapacity: number;
}
```

## TypeScript Standards

### Type Safety
- **Explicit Types**: Use explicit type annotations for public APIs
- **Strict Mode**: Enable all strict TypeScript compiler options
- **No Any**: Avoid `any` type; use `unknown` or proper union types
- **Interface First**: Define interfaces before implementing classes

```typescript
// ✅ GOOD: Explicit, type-safe
export interface ComponentConfig {
    readonly maxHealth: number;
    readonly regenerationRate: number;
}

export class HealthComponent implements Component {
    private readonly config: ComponentConfig;
    private currentHealth: number;
    
    constructor(config: ComponentConfig) {
        this.config = { ...config }; // Defensive copy
        this.currentHealth = config.maxHealth;
    }
    
    public getHealth(): number {
        return this.currentHealth;
    }
}

// ❌ BAD: Loose typing
export class HealthComponent {
    config: any;
    currentHealth: any;
    
    constructor(config: any) {
        this.config = config;
        this.currentHealth = config.maxHealth;
    }
}
```

### Error Handling
- **Result Types**: Use Result<T, E> pattern for operations that can fail
- **Null Safety**: Use optional chaining and nullish coalescing
- **Graceful Degradation**: Systems should handle missing components gracefully

```typescript
// ✅ GOOD: Safe error handling
export class TrainMovement {
    moveToStation(train: Train, stationId: string): Result<void, string> {
        const positionComponent = train.getComponent<PositionComponent>('position');
        if (!positionComponent) {
            return Result.error('Train missing position component');
        }
        
        const station = ObjectTracker.getById(stationId);
        if (!station) {
            return Result.error(`Station ${stationId} not found`);
        }
        
        // Safe to proceed
        return Result.success(void 0);
    }
}

// ❌ BAD: Unsafe assumptions
export class TrainMovement {
    moveToStation(train: Train, stationId: string): void {
        const position = train.getComponent('position').getPosition(); // Crash if null
        const station = ObjectTracker.getById(stationId).serialize(); // Crash if null
    }
}
```

## Naming Conventions

### Files and Directories
- **PascalCase**: Class files use PascalCase (`TrainSystem.ts`, `HealthComponent.ts`)
- **camelCase**: Utility files use camelCase (`mathUtils.ts`, `objectTracker.ts`)
- **kebab-case**: Documentation files use kebab-case (`system-architecture.md`)
- **Descriptive Names**: Files should clearly indicate their purpose

### Variables and Functions
- **camelCase**: Variables and functions use camelCase
- **Meaningful Names**: Avoid abbreviations; use descriptive names
- **Verb Functions**: Functions should start with verbs (`calculateDistance`, `updatePosition`)
- **Noun Variables**: Variables should be nouns or noun phrases (`trainPosition`, `enemyCount`)

```typescript
// ✅ GOOD: Clear, descriptive naming
export class EnemySpawner {
    private enemySpawnInterval: number = 5000;
    private lastSpawnTime: number = 0;
    
    public shouldSpawnEnemy(currentTime: number): boolean {
        return (currentTime - this.lastSpawnTime) >= this.enemySpawnInterval;
    }
    
    public createEnemyAtPosition(spawnPosition: Vector3): Enemy {
        const enemy = new Enemy({
            spawnPosition,
            maxHealth: 100,
            movementSpeed: 2.0
        });
        
        this.lastSpawnTime = performance.now();
        return enemy;
    }
}

// ❌ BAD: Unclear, abbreviated naming
export class ESpawner {
    private intv: number = 5000;
    private lst: number = 0;
    
    public chk(t: number): boolean {
        return (t - this.lst) >= this.intv;
    }
    
    public mk(pos: Vector3): Enemy {
        const e = new Enemy({ pos, maxHealth: 100, movementSpeed: 2.0 });
        this.lst = performance.now();
        return e;
    }
}
```

### Constants and Enums
- **SCREAMING_SNAKE_CASE**: Constants use all caps with underscores
- **PascalCase**: Enum names use PascalCase
- **SCREAMING_SNAKE_CASE**: Enum values use all caps

```typescript
// ✅ GOOD: Consistent constant naming
export const MAX_TRAIN_CARS = 10;
export const DEFAULT_MOVEMENT_SPEED = 5.0;
export const ENEMY_SPAWN_RADIUS = 50.0;

export enum CarType {
    ENGINE = 'ENGINE',
    CARGO = 'CARGO',
    PASSENGER = 'PASSENGER',
    UTILITY = 'UTILITY'
}

export enum LogCategory {
    SYSTEM = 'SYSTEM',
    RENDERING = 'RENDERING',
    NETWORK = 'NETWORK'
}
```

## Component Design Patterns

### Component Interface
All components must implement the base Component interface:

```typescript
export interface Component {
    readonly type: string;
    initialize?(): void;
    update?(deltaTime: number): void;
    dispose?(): void;
    serialize?(): any;
    deserialize?(data: any): void;
}
```

### Component Lifecycle
- **Constructor**: Initialize component with configuration
- **No initialize()**: Use constructor-based initialization instead of separate initialize methods
- **update()**: Optional; called each frame if implemented
- **dispose()**: Clean up resources when component is removed

```typescript
// ✅ GOOD: Constructor-based initialization
export class HealthComponent implements Component {
    readonly type = 'health';
    private currentHealth: number;
    private readonly maxHealth: number;
    private readonly regenerationRate: number;
    
    constructor(maxHealth: number, regenerationRate: number = 0) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.regenerationRate = regenerationRate;
        
        Logger.log(LogCategory.SYSTEM, `HealthComponent created with ${maxHealth} health`);
    }
    
    update(deltaTime: number): void {
        if (this.regenerationRate > 0 && this.currentHealth < this.maxHealth) {
            this.currentHealth = Math.min(
                this.maxHealth,
                this.currentHealth + this.regenerationRate * deltaTime
            );
        }
    }
}

// ❌ BAD: Separate initialize method
export class HealthComponent implements Component {
    readonly type = 'health';
    private currentHealth: number = 0;
    private maxHealth: number = 0;
    
    initialize(maxHealth: number): void {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
    }
}
```

## Entity Design Patterns

### Entity Creation
- **Configuration Objects**: Use interfaces for entity configuration
- **Sensible Defaults**: Provide reasonable default values
- **Component Assembly**: Add all required components in constructor
- **Validation**: Validate configuration parameters

```typescript
// ✅ GOOD: Well-structured entity
export interface TrainConfig {
    readonly playerId: string;
    readonly startPosition?: Vector3;
    readonly maxSpeed?: number;
}

export class Train extends GameObject {
    private readonly playerId: string;
    
    constructor(config: TrainConfig) {
        super('train');
        this.playerId = config.playerId;
        
        // Add required components
        this.addComponent(new PositionComponent());
        this.addComponent(new MovementComponent());
        this.addComponent(new RailPositionComponent());
        this.addComponent(new RailMovementComponent());
        
        // Set initial position if provided
        if (config.startPosition) {
            const position = this.getComponent<PositionComponent>('position');
            position?.setPosition(config.startPosition);
        }
        
        Logger.log(LogCategory.SYSTEM, `Train created for player ${config.playerId}`);
    }
    
    public getPlayerId(): string {
        return this.playerId;
    }
}
```

## System Design Patterns

### System Structure
- **Plain System Classes**: Systems are regular TypeScript classes with standard patterns
- **Dependency Injection**: Systems receive dependencies via setter methods (setTimeManager, setEventStack)
- **Metrics Collection**: Track performance and behavior metrics using Map-based storage
- **Error Resilience**: Handle component failures gracefully with try-catch blocks

> **TODO**: Consider implementing a general SystemManager base class that individual systems can extend for consistency. Currently systems are plain classes following established patterns.

```typescript
// ✅ GOOD: Well-structured system following current patterns
export class TrainSystem {
    private trains = new Map<string, Train>();
    private metrics = new Map<string, number>();
    private timeManager: TimeManager | null = null;
    private eventStack: EventStack | null = null;
    
    constructor() {
        // Initialize metrics
        this.metrics.set('active_trains', 0);
        this.metrics.set('journeys_completed', 0);
        this.metrics.set('average_update_time', 0);
        
        Logger.log(LogCategory.SYSTEM, 'TrainSystem initialized');
    }
    
    setTimeManager(timeManager: TimeManager): void {
        this.timeManager = timeManager;
    }
    
    setEventStack(eventStack: EventStack): void {
        this.eventStack = eventStack;
    }
    
    public update(deltaTime: number): void {
        const startTime = performance.now();
        
        for (const [trainId, train] of this.trains) {
            try {
                this.updateTrain(train, deltaTime);
            } catch (error) {
                Logger.error(LogCategory.SYSTEM, `Error updating train ${trainId}`, { error });
                // Continue with other trains
            }
        }
        
        const updateTime = performance.now() - startTime;
        this.metrics.set('average_update_time', updateTime);
        this.metrics.set('active_trains', this.trains.size);
    }
    
    private updateTrain(train: Train, deltaTime: number): void {
        // Update logic with component safety checks
        const movement = train.getComponent<RailMovementComponent>('railMovement');
        const position = train.getComponent<RailPositionComponent>('railPosition');
        
        if (movement && position) {
            // Safe to update
            movement.update(deltaTime);
            this.updateTrainPosition(train, position, deltaTime);
        }
    }
}
```

## Utility Guidelines

### Mathematical Operations
- **Centralized Utilities**: Use `MathUtils` and `GeometryUtils` for common operations
- **Performance Considerations**: Avoid unnecessary calculations in hot paths
- **Precision Handling**: Use appropriate precision for game requirements

### Babylon.JS Integration
- **Scene Management**: Use SceneManager for coordinating 3D rendering with Babylon.JS
- **Standard Patterns**: Follow Babylon.JS best practices for mesh creation, materials, and scene organization
- **Resource Management**: Properly dispose of Babylon.JS resources (meshes, textures, materials)
- **Performance**: Leverage Babylon.JS optimization features (culling, level of detail, etc.)

```typescript
// ✅ GOOD: Using centralized utilities
import { MathUtils } from '../utils/MathUtils';
import { GeometryUtils } from '../utils/GeometryUtils';

export class CollisionDetection {
    public static checkTrainEnemyCollision(train: Train, enemy: Enemy): boolean {
        const trainPos = train.getComponent<PositionComponent>('position')?.getPosition();
        const enemyPos = enemy.getComponent<PositionComponent>('position')?.getPosition();
        
        if (!trainPos || !enemyPos) return false;
        
        const distance = MathUtils.calculateDistance(trainPos, enemyPos);
        return distance < COLLISION_THRESHOLD;
    }
    
    public static checkStationBounds(position: Vector3, station: Station): boolean {
        const bounds = station.getBounds();
        return GeometryUtils.pointOverlapsBounds(position, bounds);
    }
}

// ❌ BAD: Duplicate calculations
export class CollisionDetection {
    public static checkTrainEnemyCollision(train: Train, enemy: Enemy): boolean {
        const trainPos = train.getComponent<PositionComponent>('position')?.getPosition();
        const enemyPos = enemy.getComponent<PositionComponent>('position')?.getPosition();
        
        if (!trainPos || !enemyPos) return false;
        
        // Duplicate distance calculation
        const dx = trainPos.x - enemyPos.x;
        const dy = trainPos.y - enemyPos.y;
        const dz = trainPos.z - enemyPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        return distance < COLLISION_THRESHOLD;
    }
}
```

## Documentation Standards

### JSDoc Comments
- **Public APIs**: All public methods and properties must have JSDoc comments
- **Parameter Documentation**: Describe all parameters and return values
- **Example Usage**: Include examples for complex APIs
- **Link References**: Link to related types and methods

```typescript
/**
 * Manages train movement along rail networks with physics simulation
 * and collision detection.
 */
export class TrainMovementSystem {
    /**
     * Moves a train to the specified station along the optimal route.
     * 
     * @param train - The train entity to move
     * @param targetStationId - ID of the destination station
     * @param options - Movement configuration options
     * @returns Promise that resolves when movement is complete
     * 
     * @example
     * ```typescript
     * const result = await trainMovement.moveToStation(myTrain, 'station-123', {
     *     maxSpeed: 10.0,
     *     preferSafeRoute: true
     * });
     * ```
     */
    public async moveToStation(
        train: Train,
        targetStationId: string,
        options: MovementOptions = {}
    ): Promise<MovementResult> {
        // Implementation...
    }
}
```

### Code Comments
- **Intent, Not Implementation**: Explain why, not what
- **Complex Logic**: Comment non-obvious algorithms
- **TODOs**: Use structured TODO comments for future improvements
- **Warnings**: Document potential pitfalls or edge cases

```typescript
// ✅ GOOD: Intent-focused comments
export class EnemyAI {
    private selectTarget(enemy: Enemy): GameObject | null {
        // Prioritize damaged trains as they're easier targets
        const damagedTrains = this.findDamagedTrains(enemy);
        if (damagedTrains.length > 0) {
            return this.findClosestTarget(enemy, damagedTrains);
        }
        
        // TODO: Implement smart target selection based on cargo value
        // Currently using simple distance-based selection
        return this.findClosestTrain(enemy);
    }
}

// ❌ BAD: Implementation-focused comments
export class EnemyAI {
    private selectTarget(enemy: Enemy): GameObject | null {
        // Loop through all trains
        const trains = ObjectTracker.getByType('train');
        let closest = null;
        let minDistance = Infinity;
        
        // Calculate distance to each train
        for (const train of trains) {
            const distance = this.calculateDistance(enemy, train);
            // Check if this distance is smaller
            if (distance < minDistance) {
                minDistance = distance;
                closest = train;
            }
        }
        
        return closest;
    }
}
```

## Testing Guidelines

### Unit Test Structure
- **Descriptive Names**: Test names should describe the scenario and expected outcome
- **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
- **Test Isolation**: Each test should be independent and not rely on others
- **Mock External Dependencies**: Use mocks for network, file system, and random number generation

```typescript
// ✅ GOOD: Well-structured test
describe('HealthComponent', () => {
    describe('takeDamage', () => {
        it('should reduce health by damage amount when not blocked', () => {
            // Arrange
            const component = new HealthComponent(100, 0);
            
            // Act
            component.takeDamage(30, 'kinetic');
            
            // Assert
            expect(component.getHealth()).toBe(70);
        });
        
        it('should not reduce health below zero', () => {
            // Arrange
            const component = new HealthComponent(100, 0);
            
            // Act
            component.takeDamage(150, 'kinetic');
            
            // Assert
            expect(component.getHealth()).toBe(0);
        });
    });
});
```

---

*These standards are living guidelines that evolve with the project. When in doubt, prioritize code clarity and maintainability over brevity.*

## Implementation Reality Check

### ✅ Standards Currently Followed
- **Component-Entity-System Pattern**: All entities (Train, TrainCar, Station, etc.) properly inherit from GameObject and use component composition
- **Consistent File Structure**: Files are organized by role (entities/, components/, systems/, renderers/, utils/)
- **Logging Integration**: Logger utility is used throughout with proper categories and structured data
- **TypeScript Standards**: Strong typing, proper interfaces, and comprehensive JSDoc documentation
- **Constructor-Based Initialization**: All components initialize in constructors (no legacy `initialize()` methods)
- **Math/Geometry Consolidation**: All math utilities are consolidated in MathUtils and GeometryUtils

### 🔨 Partially Implemented Standards
- **Observable by Design**: Some systems have metrics (TrainSystem, EnemySystem), but not all classes include built-in observability
- **Event-Driven Communication**: Basic event logging exists via EventStack, but full event-driven system communication is incomplete
- **Error Handling**: Basic try-catch exists in some places, but comprehensive error boundaries and handling patterns need expansion
- **Testing Structure**: Test files exist but comprehensive coverage is incomplete

### 📋 Standards Needing Implementation  
- **Deterministic Game Logic**: No seeded RNG system implemented yet (still uses Math.random() in some places)
- **Performance Monitoring**: No systematic performance metrics collection across all systems
- **Resource Management**: Limited object pooling or systematic resource lifecycle management
- **Network-Ready Patterns**: Code is not fully prepared for multiplayer synchronization
- **Comprehensive Testing**: Limited unit test coverage

### 🎯 Future Architectural Patterns (Planned)
- **SystemManager Base Class**: Optional pattern for system consistency (currently all systems are plain classes)
- **UIManager Integration**: Centralized UI management (exists but not used in main app)
- **WorldSystem Expansion**: Procedural world generation (basic structure exists, mostly TODO)
- **Enhanced Babylon.JS Integration**: Better leverage of Babylon.JS optimization features

### Key Implementation Notes
- **Current RNG**: Most random generation still uses Math.random() - needs conversion to seeded system
- **Event System**: Events are emitted on individual GameObjects but no central event bus for system communication
- **Metrics Collection**: Logger supports metrics but not systematically used for performance monitoring
- **Error Boundaries**: Error handling exists in critical paths but no comprehensive error boundary system
- **Testing Infrastructure**: Jest is configured but test coverage is minimal

This reality check helps identify which standards are actively followed vs. aspirational goals, guiding future refactoring priorities.
