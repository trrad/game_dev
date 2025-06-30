# Component System

## Overview
The component system follows the Entity-Component-System (ECS) pattern, where:
- **Entities** (GameObjects) are containers for components
- **Components** encapsulate specific behaviors or data
- **Systems** process and update related components

This approach provides a flexible, modular foundation for building complex game objects through composition rather than inheritance.

## Core Framework Classes

### GameObject

The `GameObject` class is the base for all game entities. It:

- Provides component management (add, get, remove)
- Manages its own lifecycle (creation, updates, disposal)
- Collects metrics and logs events for observability

See [GameObject API](../api/core/GameObject.md) for details.

### Component

The `Component` class adds specific behaviors to game objects. Components:

- Store and manage state related to their specific function
- Can be enabled/disabled independently
- Support serialization for network sync and persistence

### SceneManager

The `SceneManager` class bridges the ECS system with the visual representation:

- Manages the 3D scene and camera
- Handles field of view culling for performance
- Creates visual representations of game objects
- Synchronizes game object state with visual elements

See [SceneManager API](../api/core/SceneManager.md) for details.

### Systems

Systems process entities with specific component combinations:

- `TrainSystem`: Updates train positions, manages journeys, etc.
- `EconomySystem`: Handles trading, market fluctuations, etc.
- _More systems will be added as needed_

## Component Types

### Core Components

#### PositionComponent
```typescript
export class PositionComponent extends Component {
    private _position: Position3D = { x: 0, y: 0, z: 0 };
    private _rotation: Position3D = { x: 0, y: 0, z: 0 };

    // Getter/setter methods...
}
```
Handles position and rotation data for game objects.

#### MovementComponent
```typescript
export class MovementComponent extends Component {
    private _speed: number;

    getSpeed(): number;
    setSpeed(speed: number): void;
    // Other movement functionality...
}
```
Manages movement calculations, speed, and velocity.

#### InventoryComponent
```typescript
export class InventoryComponent extends Component {
    private items: InventoryItem[] = [];
    private capacity: number;

    addItem(item: InventoryItem): boolean;
    removeItem(itemId: string): boolean;
    // Other inventory management...
}
```
Provides storage capabilities for items and cargo.

### Specialized Components

#### AttachmentComponent
```typescript
export class AttachmentComponent extends Component {
    private attachments: Map<string, AttachmentPoint> = new Map();

    addAttachmentPoint(id: string, point: AttachmentPoint): void;
    canAttach(itemId: string, pointId: string): boolean;
    // Other attachment functionality...
}
```
Manages attachment points and attached items using a 3D grid system.

#### HealthComponent
```typescript
export class HealthComponent extends Component {
    private _health: number;
    private _maxHealth: number;

    takeDamage(amount: number): void;
    heal(amount: number): void;
    // Other health-related functionality...
}
```
Handles health, damage, and related state.

## Component Lifecycle

1. **Creation**: Components are instantiated and configured
2. **Attachment**: Component is attached to a GameObject
3. **Initialization**: Initialize component state
4. **Updates**: Regular updates during game loop
5. **Serialization**: Convert to data for saving/networking
6. **Disposal**: Clean up resources when removed

## Communication Between Components

Components should generally not reference each other directly. Instead:

1. **Via GameObject**: Get other components from the parent GameObject
```typescript
const health = this._gameObject?.getComponent<HealthComponent>('health');
if (health) health.takeDamage(10);
```

2. **Via Events**: Emit events that other components can subscribe to
```typescript
this._gameObject?.emitEvent({ type: 'damage_taken', amount: 10 });
```

## Best Practices

1. **Single Responsibility**: Each component should do one thing well
2. **Minimal Dependencies**: Reduce coupling between components
3. **Serializable State**: All component state should be serializable for networking
4. **Observability**: Include proper logging and metrics
5. **Data-Driven**: Use configuration over hard-coding values

## Example: Creating a Complex Entity
```typescript
// Create a train with multiple components
const train = new GameObject('train');
train.addComponent(new PositionComponent());
train.addComponent(new MovementComponent(0.1)); // 0.1 units/sec
train.addComponent(new InventoryComponent(100)); // 100 capacity
train.addComponent(new AttachmentComponent());
train.addComponent(new HealthComponent(200)); // 200 max health
```

By combining different components, we can create a wide variety of game entities with minimal code duplication.

# Component System Architecture

## Overview

The Train Trading Game uses an Entity-Component-System (ECS) architecture to manage game objects and their behaviors. This design pattern separates data (components) from behavior (systems) and identity (entities).

## Core Framework Classes

### GameObject

The `GameObject` class is the base for all game entities. It:

- Provides component management (add, get, remove)
- Manages its own lifecycle (creation, updates, disposal)
- Collects metrics and logs events for observability

See [GameObject API](../api/core/GameObject.md) for details.

### Component

The `Component` class adds specific behaviors to game objects. Components:

- Store and manage state related to their specific function
- Can be enabled/disabled independently
- Support serialization for network sync and persistence

### SceneManager

The `SceneManager` class bridges the ECS system with the visual representation:

- Manages the 3D scene and camera
- Handles field of view culling for performance
- Creates visual representations of game objects
- Synchronizes game object state with visual elements

See [SceneManager API](../api/core/SceneManager.md) for details.

### Systems

Systems process entities with specific component combinations:

- `TrainSystem`: Updates train positions, manages journeys, etc.
- `EconomySystem`: Handles trading, market fluctuations, etc.
- _More systems will be added as needed_

## Component Types

### PositionComponent

Manages an entity's position and rotation in 3D space.

### MovementComponent

Handles movement logic, pathfinding, and velocity.

### InventoryComponent

Stores and manages items an entity can carry.

### AttachmentComponent

Manages the attachment grid system for mounting items on trains.

## Integration Points

### Time Management

All systems and components are updated based on the TimeManager:

- Game time can be scaled (1x, 4x, 8x, 16x)
- Players can vote on game speed
- Fixed timestep updates ensure consistent physics/movement

### Rendering Pipeline

The rendering pipeline connects ECS entities to visual elements:

1. GameObject with PositionComponent registers with SceneManager
2. SceneManager maintains mapping between GameObjects and meshes
3. SceneManager updates mesh positions based on PositionComponent data
4. Field of view and performance culling optimizes rendering

### Serialization

Components can serialize their state for:

- Network synchronization
- Game state persistence
- Event logging