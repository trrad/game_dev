# System Architecture

## Architecture Overview

The Train Trading Game uses a **Hierarchical Scene Graph** architecture with GameObject-Component patterns and clean engine/game separation. This design enables complex object hierarchies, efficient spatial operations, and robust event propagation while maintaining modularity and testability.

### Design Principles

1. **Hierarchical Composition**: Game objects exist in parent-child relationships within a scene graph
2. **Transform Inheritance**: Position, rotation, and scale cascade through the hierarchy
3. **Scene Graph Event System**: Events propagate through the hierarchy with bubbling and capturing phases
4. **Engine/Game Separation**: Clear distinction between reusable engine code and game-specific logic
5. **Spatial Awareness**: Native support for proximity, collision, and radius-based operations
6. **Observable by Design**: Every system includes built-in metrics, logging, and debugging capabilities

## System Layers

```
┌───────────────────────────────────────────────────────────────────┐
│                     Client Architecture                           │
├───────────────┬───────────────────────┬───────────────────────────┤
│  Game Layer   │     Engine Layer      │      Networking Layer     │
│               │                       │                           │
│ ┌───────────┐ │ ┌───────────────────┐ │ ┌─────────────────────┐   │
│ │Game Systems│ │ │Scene Graph       │ │ │   Colyseus Client   │   │
│ │- TrainSys  │ │ │- SceneNode       │◄┼─┤ - State Sync        │   │
│ │- EnemySys  │ │ │- Event Propagation│ │ │ - Event Relay      │   │
│ │- UISys     │ │ │- Spatial Queries  │ │ │ - Scene Graph Sync │   │
│ └───────────┘ │ └───────────────────┘ │ └─────────────────────┘   │
│               │         ▲             │                           │
│ ┌───────────┐ │         │             │                           │
│ │Game Entities│◄────────┘             │                           │
│ │- Train     │ │ ┌───────────────────┐│                           │
│ │- TrainCar  │ │ │Rendering System   ││                           │
│ │- Station   │ │ │(Babylon.js)       ││                           │
│ │- Enemy     │ │ │- SceneManager     ││                           │
│ └───────────┘ │ │- Visual Registration││                          │
│               │ └───────────────────┘│                           │
└───────────────┴───────────────────────┴───────────────────────────┘
```

## Core Framework

### Engine Layer

The engine layer provides core functionality that is game-agnostic and reusable:

#### SceneNodeComponent
The foundation of our hierarchical scene graph:
- **Parent-Child Relationships**: Establish and manage hierarchical relationships
- **Transform Operations**: Local and world position, rotation, and scale
- **Event Propagation**: Hierarchical event system with bubbling and capturing
- **Spatial Awareness**: Query nearby objects and emit radius-based events

```typescript
// Simplified structure - see src/engine/scene/SceneNodeComponent.ts for implementation
class SceneNodeComponent extends Component {
    private _parent: SceneNodeComponent | null;
    private _children: SceneNodeComponent[];
    
    // Transform properties
    localPosition: Vector3;
    localRotation: Quaternion;
    localScale: Vector3;
    
    // Hierarchy methods
    addChild(child: SceneNodeComponent): void;
    removeChild(child: SceneNodeComponent): void;
    
    // Transform methods
    getWorldPosition(): Vector3;
    getWorldRotation(): Quaternion;
    setWorldPosition(position: Vector3): void;
    
    // Event methods
    addEventListener(type: string, listener: EventListener): void;
    emitToChildren(event: GameEvent): void;
    emitToParent(event: GameEvent): void;
    emitToRadius(event: GameEvent, radius: number): void;
}
```

#### GameObject Foundation
The base class for all game entities, providing:
- **Unique Identification**: Every entity has a stable ID for networking
- **Component Management**: Add, remove, and query components
- **Lifecycle Management**: Creation, update, and disposal
- **Event Integration**: Built-in event emission and subscription
- **Serialization**: Support for saving/loading and network synchronization

#### Core Components
- **SceneNodeComponent**: Hierarchical transformation and parent-child relationships
- **RadiusComponent**: Spatial operations like collision, proximity, and radius-based events
- **PositionComponent**: Legacy 3D position support (transitioning to SceneNodeComponent)
- **HealthComponent**: Health points, damage handling, and regeneration

### Scene Graph Event System

Our scene graph includes a sophisticated event system that enables complex interactions between objects:

#### Event Propagation Phases
- **Capture Phase**: Events travel from the root node down to the target
- **Target Phase**: Event is processed at the intended target node
- **Bubble Phase**: Events bubble up from the target to the root

#### Event Features
- **Event Prevention**: Stop propagation or prevent default behaviors
- **Spatial Targeting**: Emit events to objects within a specific radius
- **Filtering**: Apply filters to target specific nodes or component types
- **Event Hierarchies**: Events can target entire subtrees or specific branches

### Game Systems
Coordinate gameplay mechanics within the scene graph:

#### TrainSystem (`src/systems/TrainSystem.ts`)
- **Journey Management**: Route planning and train movement within scene graph
- **Hierarchy Management**: Train cars as children of train with proper transforms
- **Attachment Integration**: Weapon firing and utility activation through event system
- **State Synchronization**: Network updates for hierarchical scene graph

#### EnemySystem (`src/systems/EnemySystem.ts`)
- **Dynamic Spawning**: Procedural enemy generation based on activity
- **Spatial Awareness**: Use RadiusComponent for detection and targeting
- **Combat Resolution**: Damage calculation and health management through events
- **Evolution Mechanics**: Adaptive difficulty and enemy progression

## Entity Architecture

### Train Entities

#### Train (`src/entities/Train.ts`)
The top-level train entity that:
- **Manages TrainCar Collection**: Maintains ordered list of cars
- **Coordinates Movement**: Synchronizes car positions along rails
- **Aggregates Statistics**: Health, cargo, and performance metrics
- **Handles Player Commands**: Route selection and train control

#### TrainCar (`src/entities/TrainCar.ts`)
Individual train cars with:
- **Voxel Grid Management**: 3D array of TrainCarVoxel entities
- **Attachment System**: Mounting points for weapons and equipment
- **Type Specialization**: Engine, cargo, passenger, or utility roles
- **Damage Modeling**: Individual car health and destruction

#### TrainCarVoxel (`src/entities/TrainCarVoxel.ts`)
Granular train components:
- **Individual Health**: Each voxel can be damaged independently
- **Material Properties**: Different voxel types (armor, glass, etc.)
- **Attachment Points**: Some voxels support equipment mounting
- **Visual Representation**: Each voxel has distinct rendering

### Station & World Entities

#### Station (`src/entities/Station.ts`)
Trade hubs that provide:
- **Economic Functions**: Buy/sell cargo with dynamic pricing
- **Services**: Repair, refuel, and upgrade facilities
- **Procedural Properties**: Randomly generated specializations
- **Building System**: Modular station expansion with Building entities

#### Rail (`src/entities/Rail.ts`)
Connections between stations:
- **Path Definition**: Spline-based routes with variable difficulty
- **Travel Mechanics**: Speed limits and environmental effects
- **Network Integration**: Links multiple stations in trade routes
- **Dynamic Events**: Hazards and opportunities along routes

### Combat Entities

#### Enemy (`src/entities/Enemy.ts`)
Hostile entities with:
- **AI-Driven Behavior**: State machines for different enemy types
- **Dynamic Spawning**: Appear based on player activity and progression
- **Adaptive Tactics**: Learn from player strategies and adapt
- **Evolution System**: Increase in difficulty over time

#### Projectile (`src/entities/Projectile.ts`)
Weapon projectiles featuring:
- **Physics Simulation**: Realistic ballistics and collision
- **Damage Application**: Health reduction and visual effects
- **Network Synchronization**: Client prediction with server validation
- **Effect Integration**: Visual and audio feedback systems

## Rendering Architecture

### Component-Based Rendering
Each visual element has a corresponding render component:

#### VoxelRenderComponent (`src/renderers/VoxelRenderComponent.ts`)
- **Individual Voxel Rendering**: Each voxel is a separate mesh
- **Health Visualization**: Damage states and color coding
- **Performance Optimization**: Level-of-detail and culling
- **Material System**: Different materials for different voxel types

#### CarRenderComponent (`src/renderers/CarRenderComponent.ts`)
- **Car-Level Coordination**: Manages multiple voxel renderers
- **Attachment Mounting**: Visual placement of weapons and equipment
- **Animation System**: Movement and state-based animations
- **Group Management**: Hierarchical scene organization

#### AttachmentRenderComponent (`src/renderers/AttachmentRenderComponent.ts`)
- **Equipment Visualization**: Weapons, cargo, and utility items
- **Dynamic Mounting**: Attachment to appropriate voxel positions
- **State Feedback**: Active/inactive states and operation indicators
- **Effect Integration**: Muzzle flashes, repair beams, etc.

### Scene Management
The SceneManager (`src/core/SceneManager.ts`) provides:
- **Entity Discovery**: Automatically finds and renders entities with render components
- **Camera Control**: Player-controlled camera with smooth following
- **Performance Management**: Frame rate monitoring and quality adjustment
- **Event Integration**: Responds to game events for visual updates

## Utility Systems

### Mathematics & Geometry
Consolidated utility functions for common operations:

#### MathUtils (`src/utils/MathUtils.ts`)
- **Distance Calculations**: 2D and 3D distance functions
- **Vector Operations**: Normalization, direction, and interpolation
- **Spatial Queries**: Point-in-bounds and proximity testing
- **Random Generation**: Seeded random for deterministic behavior

#### GeometryUtils (`src/utils/GeometryUtils.ts`)
- **Bounding Box Operations**: Creation, expansion, and overlap testing
- **Collision Detection**: Point-box and box-box intersection
- **Spatial Optimization**: Efficient geometric calculations
- **3D Transformations**: Position and rotation utilities

### Object Management
#### ObjectTracker (`src/utils/ObjectTracker.ts`)
- **Entity Registry**: Global lookup for any GameObject by ID
- **Lifecycle Tracking**: Automatic registration and cleanup
- **Query Interface**: Find entities by type or properties
- **Debugging Support**: Entity inspection and validation

### Logging & Observability
#### Logger (`src/utils/Logger.ts`)
- **Structured Logging**: Categorized log entries with rich metadata
- **Performance Metrics**: Built-in timing and counting capabilities
- **Debug Support**: Development-time information and warnings
- **Production Safety**: Configurable log levels and output filtering

## Data Flow & Communication

### Event-Driven Architecture
Systems communicate through a central event system:

1. **User Input** → Input handlers emit interaction events
2. **Game Logic** → Systems process events and update entity state
3. **State Changes** → Entity updates trigger component events
4. **Rendering** → Render components respond to entity changes
5. **Networking** → State changes are synchronized across clients

### Update Cycles
The game follows a standard game loop pattern:

```typescript
// Simplified game loop - see src/ecs-app.ts for implementation
function gameLoop(deltaTime: number) {
    // 1. Process input events
    inputManager.update(deltaTime);
    
    // 2. Update game logic systems
    trainSystem.update(deltaTime);
    enemySystem.update(deltaTime);
    uiSystem.update(deltaTime);
    
    // 3. Render visual updates
    sceneManager.render(deltaTime);
    
    // 4. Network synchronization
    networkManager.sync(deltaTime);
}
```

## Network Architecture

### Client-Server Model
- **Authoritative Server**: All game state decisions made server-side
- **Client Prediction**: Immediate response with server reconciliation
- **Event Synchronization**: Game events replicated across all clients
- **State Delta**: Only changed data transmitted for efficiency

### Future Network Features
- **Colyseus Integration**: Multiplayer room management and state sync
- **Lag Compensation**: Client-side prediction and rollback
- **Bandwidth Optimization**: Delta compression and priority queuing
- **Persistence**: Save/load game state and player progression

## Performance Considerations

### Optimization Strategies
- **Object Pooling**: Reuse entities to reduce garbage collection
- **Spatial Partitioning**: Efficient collision detection and rendering culling
- **Level of Detail**: Reduce complexity for distant objects
- **Asset Streaming**: Load/unload resources based on proximity

### Scalability Targets
- **60fps Gameplay**: Smooth experience on modern mobile devices
- **Cross-Platform**: Consistent performance across web and mobile
- **Multiplayer Ready**: Architecture supports multiple concurrent players
- **Extensible Design**: Easy addition of new features and content

---

*This document describes the current system architecture. Implementation details are found in individual source files with comprehensive JSDoc documentation.*
