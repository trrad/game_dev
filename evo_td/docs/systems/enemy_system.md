# Enemy System Documentation

## Overview

The Enemy System manages the spawning, behavior, and lifecycle of enemies in the Train Trading Game. It implements a dynamic spawning system that creates enemies around rail networks to challenge players during train journeys.

## System Architecture

### Core Components

#### EnemySystem
**Location**: `src/systems/EnemySystem.ts`

The main system class that orchestrates enemy spawning and management.

```typescript
export class EnemySystem {
    constructor(
        enemyRenderer: EnemyRenderer, 
        spawnConfig?: Partial<EnemySpawnConfig>
    )
}
```

**Key Responsibilities**:
- Managing enemy spawn timing and locations
- Coordinating with TrainSystem for dynamic spawning
- Processing enemy AI behaviors through AIBehaviorComponent
- Handling enemy health and combat through HealthComponent
- Cleaning up defeated or expired enemies

#### Enemy Entity
**Location**: `src/entities/Enemy.ts`

Game entity representing individual enemy units.

```typescript
export class Enemy extends GameObject {
    constructor(config: EnemyConfig)
}
```

**Components**:
- `PositionComponent` - World position and rotation
- `MovementComponent` - Speed and movement calculations  
- `HealthComponent` - Hit points and damage handling
- `AIBehaviorComponent` - AI decision making and targeting

#### EnemyRenderer
**Location**: `src/renderers/EnemyRenderer.ts`

Handles visual representation of enemies in the 3D scene.

```typescript
export class EnemyRenderer {
    constructor(scene: Scene)
    
    createEnemyVisual(enemy: Enemy): AbstractMesh
    updateEnemyPosition(enemyId: string, position: Vector3): void
    removeEnemyVisual(enemyId: string): void
}
```

### Components

#### HealthComponent
**Location**: `src/components/HealthComponent.ts`

Manages enemy (and other entity) health and damage.

```typescript
export interface HealthProperties {
    maxHealth: number;
    currentHealth: number;
    damageMultiplier: number;
    healingRate: number;
}

export class HealthComponent extends Component {
    takeDamage(amount: number): boolean // Returns true if entity dies
    heal(amount: number): void
    isDead(): boolean
    getHealthPercentage(): number
}
```

#### AIBehaviorComponent  
**Location**: `src/components/AIBehaviorComponent.ts`

Controls enemy AI decision making and behavior patterns.

```typescript
export interface AIBehaviorProperties {
    aggressionLevel: number;    // 0.0-1.0
    detectionRange: number;     // Units
    attackRange: number;        // Units
    moveSpeed: number;          // Units per second
    behaviorType: AIBehaviorType;
}

export enum AIBehaviorType {
    PASSIVE = 'passive',        // Doesn't attack unless provoked
    AGGRESSIVE = 'aggressive',  // Actively hunts trains
    DEFENSIVE = 'defensive',    // Guards specific areas
    PATROL = 'patrol'          // Moves along predefined paths
}

export class AIBehaviorComponent extends Component {
    update(deltaTime: number, nearbyEntities: GameObject[]): void
    setTarget(target: GameObject): void
    clearTarget(): void
}
```

## System Integration

### With TrainSystem

The EnemySystem integrates closely with TrainSystem:

```typescript
// EnemySystem references TrainSystem for:
this.enemySystem.setTrainSystem(this.trainSystem);

// 1. Active train locations for spawn positioning
const activeTrains = this.trainSystem.getActiveTrains();

// 2. Dynamic spawn timing based on train movement
const shouldSpawn = this.trainSystem.hasMovingTrains() || !this.config.spawnOnlyWhenTrainMoving;

// 3. Targeting information for AI behaviors
const nearestTrain = this.findNearestTrain(enemy.position);
```

### With TimeManager

Enemy behaviors are time-scaled for consistent gameplay:

```typescript
// Update enemies with time-scaled delta
this.timeManager.onTick((deltaTime: number) => {
    this.enemySystem.update(deltaTime);
});
```

### With EventStack

Events are logged for player awareness and debugging:

```typescript
// Enemy spawn events
this.eventStack.logEvent(LogCategory.ENEMY, 'enemy_spawned', `${enemyType} enemy spawned`, metadata);

// Enemy defeat events  
this.eventStack.logEvent(LogCategory.ENEMY, 'enemy_defeated', `Enemy defeated`, metadata);
```

## Configuration

### Spawn Configuration

```typescript
export interface EnemySpawnConfig {
    spawnInterval: { min: number; max: number };  // Seconds between spawns
    maxEnemies: number;                           // Maximum concurrent enemies
    spawnRadius: number;                          // Distance from rails to spawn
    spawnOnlyWhenTrainMoving: boolean;           // Require train movement to spawn
    enemyTypes: {                                // Probability distribution
        basic: number;      // 0.0-1.0
        fast: number;       // 0.0-1.0  
        tank: number;       // 0.0-1.0
        aggressive: number; // 0.0-1.0
    };
}
```

### Enemy Type Definitions

```typescript
export interface EnemyConfig {
    id: string;
    enemyType: 'basic' | 'fast' | 'tank' | 'aggressive';
    position: Position3D;
    health: number;
    damage: number;
    speed: number;
    aiConfig: AIBehaviorProperties;
}
```

## Usage Example

### Initializing the Enemy System

```typescript
// In ECSApp constructor
this.enemySystem = new EnemySystem(this.enemyRenderer, {
    spawnInterval: { min: 8, max: 15 },  // Spawn every 8-15 seconds
    maxEnemies: 12,                      // Max 12 enemies at once
    spawnRadius: 25,                     // Spawn within 25 units of rails
    spawnOnlyWhenTrainMoving: false,     // Always spawn for continuous action
    enemyTypes: {
        basic: 0.4,                      // 40% basic enemies
        fast: 0.3,                       // 30% fast enemies  
        tank: 0.2,                       // 20% tank enemies
        aggressive: 0.1                  // 10% aggressive enemies
    }
});

// Connect to other systems
this.enemySystem.setTimeManager(this.timeManager);
this.enemySystem.setEventStack(this.eventStack);
this.enemySystem.setSceneManager(this.sceneManager);
this.enemySystem.setTrainSystem(this.trainSystem);

// Add rails for spawn location calculations
this.rails.forEach(rail => {
    this.enemySystem.addRail(rail);
});
```

### Runtime Updates

```typescript
// In render loop
this.timeManager.onTick((deltaTime: number) => {
    this.enemySystem.update(deltaTime);
});
```

## Future Enhancements

### Planned Features
- **Evolution System**: Enemies adapt based on player strategies
- **Boss Encounters**: Special large enemies with unique mechanics
- **Loot Drops**: Enemies drop resources when defeated
- **Faction System**: Different enemy types with varying relationships

### Integration Points
- **Combat System**: Weapons and attachment damage calculations
- **Economy System**: Enemy drops affecting trade economics
- **Progression System**: Enemy difficulty scaling with player advancement

## Performance Considerations

- **Object Pooling**: Reuse enemy objects to reduce garbage collection
- **Spatial Partitioning**: Only update enemies near active trains
- **LOD System**: Reduce AI complexity for distant enemies
- **Batch Rendering**: Group similar enemy types for efficient rendering

## Debugging and Metrics

The Enemy System includes comprehensive logging:

```typescript
// Enable detailed enemy logging
Logger.log(LogCategory.ENEMY, 'Enemy spawned', {
    enemyId: enemy.id,
    type: enemy.enemyType,
    position: enemy.position,
    nearestTrainDistance: distanceToTrain
});
```

Key metrics tracked:
- Enemies spawned per minute
- Average enemy lifespan
- Enemy-train encounter frequency
- Performance impact of AI calculations
