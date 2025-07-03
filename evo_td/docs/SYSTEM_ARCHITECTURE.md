# System Architecture

## Architecture Overview

The Train Trading Game uses a **Component-Entity-System (ECS)** architecture with clear separation between game logic, rendering, and networking. This design enables scalable multiplayer gameplay, cross-platform deployment, and modular feature development.

### Design Principles

1. **Observable by Design**: Every system includes built-in metrics, logging, and debugging capabilities
2. **Event-Driven Communication**: Systems communicate through events, not direct coupling
3. **Deterministic Game Logic**: All gameplay is reproducible for network synchronization
4. **Composition over Inheritance**: Entities are built from reusable components
5. **Clear Layer Separation**: Game logic, rendering, and network concerns are isolated

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Architecture                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Game Logic    │   Rendering     │      Networking         │
│                 │                 │                         │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │ECS Systems  │ │ │SceneManager │ │ │   Colyseus Client   │ │
│ │- TrainSys   │ │ │(Babylon.js) │ │ │ - State Sync        │ │
│ │- EnemySys   │ │ └─────────────┘ │ │ - Event Relay       │ │
│ │- UISys      │ │ ┌─────────────┐ │ │ - Network Prediction│ │
│ └─────────────┘ │ │RenderComps  │ │ └─────────────────────┘ │
│ ┌─────────────┐ │ │- VoxelRend  │ │                         │
│ │Game Entities│ │ │- TrainRend  │ │                         │
│ │- Train      │ │ │- UIRend     │ │                         │
│ │- Station    │ │ └─────────────┘ │                         │
│ │- Enemy      │ │                 │                         │
│ └─────────────┘ │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Core Framework

### GameObject Foundation
The base class for all game entities, providing:
- **Unique Identification**: Every entity has a stable ID for networking
- **Component Management**: Add, remove, and query components
- **Lifecycle Management**: Creation, update, and disposal
- **Event Integration**: Built-in event emission and subscription

```typescript
// Simplified structure - see src/core/GameObject.ts for implementation
abstract class GameObject {
    readonly id: string;
    readonly type: string;
    
    addComponent<T extends Component>(component: T): T;
    getComponent<T extends Component>(type: string): T | undefined;
    removeComponent(type: string): void;
    hasComponent(type: string): boolean;
}
```

### Component System
Reusable behaviors that can be attached to any GameObject:

#### Core Components
- **PositionComponent**: 3D position, rotation, and basic spatial operations
- **HealthComponent**: Health points, damage handling, and regeneration
- **MovementComponent**: Velocity, acceleration, and physics properties
- **InventoryComponent**: Cargo storage and capacity management

#### Specialized Components
- **RailPositionComponent**: Train position along rail networks
- **AIBehaviorComponent**: Enemy AI state and decision making
- **AttachmentSlotComponent**: 3D grid-based attachment mounting
- **TrainCarVoxelComponent**: Individual voxel management within cars

### System Managers
Coordinate gameplay mechanics and component interactions:

#### TrainSystem (`src/systems/TrainSystem.ts`)
- **Journey Management**: Route planning and train movement
- **Car Coordination**: Multi-car physics and positioning
- **Attachment Integration**: Weapon firing and utility activation
- **State Synchronization**: Network updates for train positions

#### EnemySystem (`src/systems/EnemySystem.ts`)
- **Dynamic Spawning**: Procedural enemy generation based on activity
- **AI Behavior Trees**: State-driven enemy decision making
- **Combat Resolution**: Damage calculation and health management
- **Evolution Mechanics**: Adaptive difficulty and enemy progression

#### UISystem (`src/systems/UISystem.ts`)
- **Interface Management**: Dynamic UI element creation and updates
- **Input Processing**: Touch and mouse interaction handling
- **State Presentation**: Game data visualization and feedback
- **Responsive Layout**: Cross-platform UI adaptation

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

## Implementation Status

### ✅ Fully Implemented
- **Core ECS Framework**: `GameObject`, component system, and entity management are complete
- **Entity Architecture**: All major entities (Train, TrainCar, Station, Enemy) exist and are functional
- **Component System**: Core components (Position, Health, Movement, etc.) are implemented
- **Rendering System**: Component-based rendering with VoxelRenderComponent, CarRenderComponent, and AttachmentRenderComponent
- **Math/Geometry Utilities**: MathUtils and GeometryUtils are consolidated and in use
- **Logging System**: Comprehensive Logger with categories and structured output
- **Object Tracking**: ObjectTracker provides global entity registry and lookup

### 🔨 Partially Implemented  
- **Train System**: Basic train movement exists, but journey management and multi-car physics need expansion
- **Enemy System**: Basic enemy entities exist, but AI behavior trees and evolution mechanics are minimal
- **UI System**: Basic UI components exist, but responsive layout and touch handling need work
- **Attachment System**: Attachment entities and slots exist, but dynamic mounting and full 3D placement need refinement
- **Station/Building System**: Station entities exist, but modular building expansion is not implemented

### 📋 Planned/Stubbed
- **Network Architecture**: Colyseus client exists but multiplayer functionality is minimal
- **Performance Optimizations**: Object pooling, spatial partitioning, and LoD systems are planned but not implemented
- **AI Behavior Trees**: Enemy AI is basic state-based, not full behavior tree implementation
- **Asset Streaming**: Static asset loading only, no dynamic streaming
- **Persistence**: No save/load system currently implemented

### Key Implementation Notes
- **Entry Point**: Game runs through `src/ecs-app.ts` (not the old `src/app.ts`)
- **Scene Management**: Uses SceneManager in `src/core/SceneManager.ts` for Babylon.js integration
- **Game Loop**: Standard update cycle in ecs-app.ts coordinates all systems
- **Component Registration**: Components are added to entities via `addComponent()` method
- **Event System**: Basic event emission exists on GameObject, but full event-driven communication needs expansion
- **Voxel System**: TrainCarVoxel entities exist with individual health and rendering
- **Rail System**: Basic rail entities exist but spline-based routing is not fully implemented

This status helps developers understand what exists vs. what's planned, and guides future development priorities.
