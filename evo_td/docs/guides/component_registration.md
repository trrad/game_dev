# Component Registration Guide

This guide outlines how to register and use components in our ECS architecture, including the new TransformComponent and the separation between engine and game components.

## Component Categories

### Engine Components
Engine components are generic, reusable components that could be used in any game:

- **SceneNodeComponent**: Hierarchical scene graph node management
- **RenderComponent**: Base rendering functionality
- **PhysicsComponent**: Physics simulation properties

Location: `src/engine/` directory

### Game Components
Game components are specific to our train trading game:

- **TrainComponent**: Train-specific behavior
- **EnemyComponent**: Enemy-specific behavior
- **RailComponent**: Rail network behavior

Location: `src/game/` directory

## Component Types

### Core Engine Components
- **SceneNodeComponent**: Hierarchical node in scene graph
- **PositionComponent**: Basic spatial positioning (legacy, use SceneNodeComponent for new entities)
- **HealthComponent**: Health and damage handling
- **MovementComponent**: Velocity and physics properties

### Specialized Components
- **RailPositionComponent**: Train position along rails
- **TrainCarPositionComponent**: Car position within trains
- **AttachmentSlotComponent**: Equipment mounting points

### Render Components
- **RenderComponent**: Base class for all renderers
- **VoxelRenderComponent**: Individual voxel rendering
- **CarRenderComponent**: Car-level rendering coordination

## Directory Structure

Components are now organized by their scope and purpose:

```
src/
├── engine/                  # Engine-level components (reusable)
│   ├── core/                # Core framework classes
│   │   ├── Component.ts     # Base component class
│   │   └── GameObject.ts    # Base entity class
│   ├── scene/               # Scene management
│   │   └── TransformComponent.ts # Hierarchical transforms
│   └── rendering/           # Rendering framework
│       └── RenderComponent.ts   # Base render component
│
└── game/                    # Game-specific components
    ├── components/          # Game component implementations
    │   ├── TrainComponent.ts
    │   └── EnemyComponent.ts
    └── entities/            # Game entity implementations
        ├── Train.ts
        └── Enemy.ts
```

## Component Registration

### Basic Component Registration

```typescript
// Create entity
const entity = new GameObject('entityType');

// Create and add component
const position = new PositionComponent();
entity.addComponent(position);

// Retrieve component
const retrievedPosition = entity.getComponent<PositionComponent>('position');
```

### Scene Node Hierarchy Registration

```typescript
// Create parent entity with scene node
const parent = new GameObject('parent');
const parentNode = new SceneNodeComponent(scene);
parent.addComponent(parentNode);

// Create child entity with scene node
const child = new GameObject('child');
const childNode = new SceneNodeComponent(scene);
child.addComponent(childNode);

// Establish parent-child relationship
childNode.setParent(parentNode);

// Position child relative to parent
childNode.setLocalPosition(0, 1, 0); // 1 unit above parent
```

## Component Communication

Components can communicate through:

1. **Direct References**: When components need to work closely together
2. **Entity Context**: Through the shared GameObject
3. **Event System**: Using EventStack for decoupled communication

## Lifecycle Management

1. **Creation**: Components should initialize in constructors
2. **Registration**: Add to GameObject using addComponent()
3. **Updates**: Handle in relevant system's update loop
4. **Disposal**: Clean up resources in onDispose()

## SceneNodeComponent Usage

The SceneNodeComponent is a special component that bridges our ECS with Babylon's scene graph:

### When to Use SceneNodeComponent

- For entities with parent-child relationships
- When entities need hierarchical transformations
- For objects composed of multiple visual parts
- To leverage Babylon.js scene graph optimizations

### Engine vs Game Component Imports

When importing components, use the correct path:

```typescript
// Engine components
import { Component } from '../engine/core/Component';
import { SceneNodeComponent } from '../engine/scene/SceneNodeComponent';
import { RenderComponent } from '../engine/rendering/RenderComponent';

// Game components
import { TrainComponent } from '../game/components/TrainComponent';
import { EnemyComponent } from '../game/components/EnemyComponent';
```

### Creating Custom Game Components

Game-specific components should extend the base Component class:

```typescript
import { Component } from '../../engine/core/Component';

export interface TrainComponentData {
    speed: number;
    capacity: number;
}

export class TrainComponent extends Component<TrainComponentData> {
    public readonly type = 'train';
    
    constructor(data: TrainComponentData) {
        super();
        // Initialize with data
    }
    
    serialize(): TrainComponentData {
        // Implement serialization
    }
    
    deserialize(data: TrainComponentData): void {
        // Implement deserialization
    }
    
    // Game-specific methods
    accelerate(amount: number): void {
        // Implementation
    }
}
```

### Syncing with PositionComponent

During a transition period, TransformComponent can sync with PositionComponent:

```typescript
// In your system update loop
const position = entity.getComponent<PositionComponent>('position');
const transform = entity.getComponent<TransformComponent>('transform');

if (position && transform) {
    // Sync position data to transform
    const pos = position.getPosition();
    const rot = position.getRotation();
    
    transform.setLocalPosition(pos.x, pos.y, pos.z);
    transform.setLocalRotation(rot.x, rot.y, rot.z);
}
```

### Best Practices

1. **Maintain a Shallow Hierarchy**: Keep transform hierarchies under 5 levels deep
2. **Update from Root to Leaf**: Update parent transforms before children
3. **Minimize Transform Changes**: Batch transform updates for performance
4. **Use Local Coordinates**: Work in local space when positioning child objects
5. **Release Resources**: Always dispose transforms when removing entities
