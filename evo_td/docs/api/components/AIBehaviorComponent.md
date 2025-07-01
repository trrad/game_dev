# AIBehaviorComponent API Documentation

## Overview

The `AIBehaviorComponent` provides artificial intelligence behavior for game entities, controlling decision-making, targeting, and autonomous actions.

## Import

```typescript
import { AIBehaviorComponent, AIBehaviorType } from '../components/AIBehaviorComponent';
```

## Interfaces

### AIBehaviorProperties

```typescript
export interface AIBehaviorProperties {
    aggressionLevel: number;      // 0.0-1.0: How likely to initiate combat
    detectionRange: number;       // Units: How far the entity can see
    attackRange: number;          // Units: Range for attacks
    moveSpeed: number;            // Units per second
    behaviorType: AIBehaviorType; // Primary behavior pattern
    patrolRadius: number;         // Units: Area to patrol (for PATROL type)
    fearThreshold: number;        // 0.0-1.0: Health % when entity flees
    groupRadius: number;          // Units: Distance to maintain from allies
}
```

### AIBehaviorType Enum

```typescript
export enum AIBehaviorType {
    PASSIVE = 'passive',         // Doesn't attack unless provoked
    AGGRESSIVE = 'aggressive',   // Actively hunts targets
    DEFENSIVE = 'defensive',     // Guards specific areas
    PATROL = 'patrol',          // Moves along predefined paths
    SWARM = 'swarm',            // Coordinates with nearby allies
    AMBUSH = 'ambush'           // Waits for targets to approach
}
```

### Default Properties

```typescript
const DEFAULT_AI_PROPERTIES: AIBehaviorProperties = {
    aggressionLevel: 0.5,
    detectionRange: 15,
    attackRange: 5,
    moveSpeed: 2,
    behaviorType: AIBehaviorType.PASSIVE,
    patrolRadius: 10,
    fearThreshold: 0.25,
    groupRadius: 5
};
```

## Constructor

```typescript
constructor(properties?: Partial<AIBehaviorProperties>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| properties | `Partial<AIBehaviorProperties>` | Optional AI configuration |

## Properties

| Name | Type | Access | Description |
|------|------|--------|-------------|
| type | string | readonly | Component type identifier: `'ai_behavior'` |

## Core Methods

### update

```typescript
update(deltaTime: number, nearbyEntities: GameObject[]): void
```

Main AI update cycle that processes behavior logic.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | number | Time elapsed since last update (seconds) |
| nearbyEntities | GameObject[] | List of entities within detection range |

**Note**: This method is called automatically by the entity's update cycle.

### setTarget

```typescript
setTarget(target: GameObject | null): void
```

Sets or clears the AI's current target.

| Parameter | Type | Description |
|-----------|------|-------------|
| target | GameObject \| null | Target entity, or null to clear |

### getTarget

```typescript
getTarget(): GameObject | null
```

Returns the current target entity.

**Returns**: Current target or null if no target.

### hasTarget

```typescript
hasTarget(): boolean
```

Returns whether the AI currently has a target.

**Returns**: `true` if target exists, `false` otherwise.

### clearTarget

```typescript
clearTarget(): void
```

Removes the current target.

## Detection and Targeting

### canDetect

```typescript
canDetect(entity: GameObject): boolean
```

Determines if the AI can detect a given entity.

| Parameter | Type | Description |
|-----------|------|-------------|
| entity | GameObject | Entity to check for detection |

**Returns**: `true` if entity is within detection range and line of sight.

### findNearestHostile

```typescript
findNearestHostile(entities: GameObject[]): GameObject | null
```

Finds the nearest hostile entity within detection range.

| Parameter | Type | Description |
|-----------|------|-------------|
| entities | GameObject[] | List of potential targets |

**Returns**: Nearest hostile entity or null if none found.

### shouldAttack

```typescript
shouldAttack(target: GameObject): boolean
```

Determines if the AI should attack a specific target.

| Parameter | Type | Description |
|-----------|------|-------------|
| target | GameObject | Potential attack target |

**Returns**: `true` if attack should proceed, considering aggression and behavior type.

## Movement and Positioning

### getDesiredMovement

```typescript
getDesiredMovement(): { direction: Vector3; speed: number } | null
```

Calculates the desired movement for this update cycle.

**Returns**: Movement direction and speed, or null if no movement desired.

### moveToward

```typescript
moveToward(targetPosition: Vector3, deltaTime: number): void
```

Moves the entity toward a target position.

| Parameter | Type | Description |
|-----------|------|-------------|
| targetPosition | Vector3 | Position to move toward |
| deltaTime | number | Time step for movement calculation |

### maintainDistance

```typescript
maintainDistance(target: GameObject, preferredDistance: number): Vector3
```

Calculates a position to maintain specific distance from target.

| Parameter | Type | Description |
|-----------|------|-------------|
| target | GameObject | Entity to maintain distance from |
| preferredDistance | number | Desired distance in units |

**Returns**: Calculated position vector.

## Behavior State Management

### getCurrentState

```typescript
getCurrentState(): AIState
```

Returns the current AI behavior state.

**Returns**: Current state (IDLE, SEARCHING, PURSUING, ATTACKING, FLEEING, etc.)

### setState

```typescript
setState(state: AIState): void
```

Changes the AI behavior state.

| Parameter | Type | Description |
|-----------|------|-------------|
| state | AIState | New behavior state |

### shouldFlee

```typescript
shouldFlee(): boolean
```

Determines if the AI should enter flee state based on health and fear threshold.

**Returns**: `true` if entity should flee, `false` otherwise.

## Group Behavior

### findAllies

```typescript
findAllies(entities: GameObject[]): GameObject[]
```

Finds allied entities within group radius.

| Parameter | Type | Description |
|-----------|------|-------------|
| entities | GameObject[] | List of potential allies |

**Returns**: Array of allied entities.

### coordinateWithAllies

```typescript
coordinateWithAllies(allies: GameObject[]): void
```

Adjusts behavior based on ally positions and actions.

| Parameter | Type | Description |
|-----------|------|-------------|
| allies | GameObject[] | Allied entities to coordinate with |

## Configuration Methods

### setAggressionLevel

```typescript
setAggressionLevel(level: number): void
```

Updates the aggression level.

| Parameter | Type | Description |
|-----------|------|-------------|
| level | number | Aggression level (0.0-1.0) |

### setBehaviorType

```typescript
setBehaviorType(type: AIBehaviorType): void
```

Changes the primary behavior pattern.

| Parameter | Type | Description |
|-----------|------|-------------|
| type | AIBehaviorType | New behavior type |

### setDetectionRange

```typescript
setDetectionRange(range: number): void
```

Updates the detection range.

| Parameter | Type | Description |
|-----------|------|-------------|
| range | number | Detection range in units |

## Usage Examples

### Basic Enemy AI

```typescript
const enemy = new Enemy(enemyConfig);

// Add aggressive AI behavior
const aiComponent = new AIBehaviorComponent({
    aggressionLevel: 0.8,      // Highly aggressive
    detectionRange: 20,        // Can see 20 units
    attackRange: 3,            // Melee combat
    moveSpeed: 3,              // Fast movement
    behaviorType: AIBehaviorType.AGGRESSIVE,
    fearThreshold: 0.2         // Flees at 20% health
});

enemy.addComponent(aiComponent);
```

### Guard AI

```typescript
// Defensive AI that guards a specific area
const guardAI = new AIBehaviorComponent({
    aggressionLevel: 0.6,
    detectionRange: 25,
    attackRange: 8,
    moveSpeed: 2,
    behaviorType: AIBehaviorType.DEFENSIVE,
    patrolRadius: 15,          // Guards 15-unit radius
    fearThreshold: 0.1         // Very brave
});
```

### Pack Hunter

```typescript
// AI that coordinates with allies for pack hunting
const packAI = new AIBehaviorComponent({
    aggressionLevel: 0.7,
    detectionRange: 18,
    attackRange: 4,
    moveSpeed: 4,
    behaviorType: AIBehaviorType.SWARM,
    groupRadius: 8,            // Stays near allies
    fearThreshold: 0.3
});
```

## Integration Examples

### With Combat System

```typescript
// In entity update loop
const aiComponent = entity.getComponent<AIBehaviorComponent>('ai_behavior');
const nearbyEntities = this.sceneManager.getEntitiesInRange(entity, aiComponent.getDetectionRange());

aiComponent.update(deltaTime, nearbyEntities);

// Check if AI wants to attack
const target = aiComponent.getTarget();
if (target && aiComponent.shouldAttack(target)) {
    this.combatSystem.attemptAttack(entity, target);
}
```

### With Movement System

```typescript
// Apply AI movement decisions
const aiComponent = entity.getComponent<AIBehaviorComponent>('ai_behavior');
const movementComponent = entity.getComponent<MovementComponent>('movement');

const desiredMovement = aiComponent.getDesiredMovement();
if (desiredMovement && movementComponent) {
    movementComponent.setVelocity(desiredMovement.direction.scale(desiredMovement.speed));
}
```

### Dynamic Behavior Changes

```typescript
// Change behavior based on game state
const aiComponent = entity.getComponent<AIBehaviorComponent>('ai_behavior');

if (gameState.isPlayerNearby) {
    aiComponent.setBehaviorType(AIBehaviorType.AGGRESSIVE);
    aiComponent.setAggressionLevel(0.9);
} else {
    aiComponent.setBehaviorType(AIBehaviorType.PATROL);
    aiComponent.setAggressionLevel(0.3);
}
```
