# Agent Development Prompt

This document provides AI assistants with comprehensive context about the Train Trading Game project for effective development assistance.

## 🎯 Current Mission: Scene Graph Migration

**PRIMARY OBJECTIVE**: We are actively migrating from a mixed architecture to a unified **Scene Graph Event System** with hierarchical NodeComponent-based entities. This is the top priority for all development work.

### Migration Status Overview
✅ **COMPLETED**: Scene graph foundation (NodeComponent, GameNodeObject, SceneGraphEventSystem)  
🔄 **IN PROGRESS**: Entity integration and SceneManager refactoring  
📋 **NEXT**: System conversion to use scene graph queries and events  

### Key Architecture Principles
- **All entities extend GameNodeObject** (which includes NodeComponent for scene graph participation)
- **Events flow through scene graph hierarchy** with DOM-like capture/bubble phases
- **Voxels are individual NodeObjects** (not instanced) for per-voxel logic and events
- **Train cars use dual-point rail attachment** for realistic wheel-based movement
- **Single global root node** managed by SceneManager; EventStack is being deprecated

## Project Overview

This is an **Entity-Component-System (ECS) based train trading game** built with TypeScript, using Babylon.JS for 3D rendering. The game features modular trains with voxel-based construction, combat against dynamic enemies, and a cooperative multiplayer trading system.

### Technology Stack
- **Language**: TypeScript with strict mode
- **Architecture**: Entity-Component-System (ECS) with Scene Graph hierarchy
- **Rendering**: Babylon.JS for 3D graphics
- **Build Tool**: Vite
- **Testing**: Jest
- **Networking**: Colyseus (planned for multiplayer)

### Current Development Phase
The project is in **Phase 2** of the Scene Graph Migration:
- **Phase 1**: ✅ Scene graph foundation established
- **Phase 2**: 🔄 Entity integration and event system unification
- **Phase 3**: 📋 Component refactoring and dependency validation
- **Phase 4**: 📋 System integration with scene graph queries

## Project Structure

```
evo_td/
├── package.json
├── vite.config.js
├── tsconfig.json
├── ecs-app.ts                # Main ECS application entry point
├── engine/                   # Engine framework (generic, reusable)
│   ├── core/                 # Core ECS framework
│   │   ├── GameObject.ts     # Base game object
│   │   ├── GameNodeObject.ts # Scene graph participating game object
│   │   ├── SceneManager.ts   # Scene and rendering management
│   │   ├── TimeManager.ts    # Time management system
│   │   └── EventStack.ts     # Legacy event system (being deprecated)
│   ├── components/           # ECS components (engine-level)
│   │   ├── Component.ts      # Base component class
│   │   ├── NodeComponent.ts  # Scene graph node with hierarchical events
│   │   ├── PositionComponent.ts
│   │   ├── HealthComponent.ts
│   │   ├── MovementComponent.ts
│   │   ├── RadiusComponent.ts
│   │   └── RenderComponent.ts
│   ├── scene/                # Scene graph and event systems
│   │   ├── SceneManager.ts   # Scene graph aware scene manager
│   │   ├── SceneGraphEventSystem.ts  # Hierarchical event system
│   │   └── SceneNodeDebugger.ts     # Debug tools for scene graph
│   ├── utils/                # Engine utilities
│   │   ├── Logger.ts
│   │   ├── MathUtils.ts
│   │   ├── GeometryUtils.ts
│   │   └── ObjectTracker.ts
│   └── net/
│       └── ColyseusClient.ts
├── game/                     # Game-specific logic and content
│   ├── components/           # Game-specific ECS components
│   ├── entities/             # Game entities (extend GameObject)
│   ├── systems/              # ECS systems (coordinate gameplay)
│   ├── renderers/            # Rendering components (game-specific)
│   ├── ui/                   # User interface components
│   └── utils/                # Game-specific utilities (if any)
├── public/                   # Static assets
├── assets/                   # Game assets (images, models, etc.)
└── tests/                    # Unit and integration tests
    ├── unit/
    └── mocks/
```

## Architectural Principles

### ECS Pattern (Our Implementation)
1. **Entities** (`GameObject`): Containers with unique IDs that hold components
2. **Components**: Functional units that contain BOTH data and methods (extend `Component<T>`)
3. **Systems**: Coordinate entities and handle gameplay mechanics (extend `SystemManager`)
4. **Global Registry**: `ObjectTracker` provides entity lookup by ID or type

### Component Design Patterns (CRITICAL - Different from typical ECS)
- **Constructor Initialization**: Components initialize in constructors, NOT separate `initialize()` methods
- **Functional Components**: Components have methods like `getPosition()`, `setPosition()`, `takeDamage()`
- **Type Safety**: All components extend `Component<T>` with typed data
## 🚀 Migration-Specific Development Guidelines

### Scene Graph Entity Pattern (NEW)
All new entities should extend `GameNodeObject` for scene graph participation:

```typescript
export class NewEntity extends GameNodeObject {
    constructor(config: NewEntityConfig, parentNode?: NodeComponent) {
        super('newEntity', undefined, scene, parentNode);
        
        // Position is now handled by this.node
        this.node.setLocalPosition(config.position.x, config.position.y, config.position.z);
        
        // Add other components as needed
        this.addComponent(new HealthComponent(config.health));
    }
}
```

### Event System Migration (IN PROGRESS)
Replace old event patterns with scene graph events:

```typescript
// OLD - GameObject.emit (being deprecated)
this.emit('damage:taken', { amount: 10 });

// NEW - Scene graph events
this.node.emit('damage:taken', { amount: 10 });
this.node.emitToParent('car:damaged', { carId: this.id });
this.node.emitToRadius('explosion', { damage: 50 }, 15);
```

### Component Dependencies (NEXT)
Use dependency validation in component constructors:

```typescript
export class WeaponComponent extends Component<WeaponComponentData> {
    constructor(data: WeaponComponentData) {
        super('weapon', data);
        this.requiresComponents(['node', 'health']); // Validates at runtime
    }
}
```

### Scene Graph Query Patterns (NEXT)
Replace direct entity references with scene graph queries:

```typescript
// OLD - Direct entity management
const enemies = ObjectTracker.getByType('enemy');

// NEW - Scene graph queries
const enemies = SceneEvents.getNodesInRadius(position, detectionRange, 
    (node) => node.gameObject?.type === 'enemy');
```

## Current Architecture Status

### ✅ Working Systems (Use These)
- **NodeComponent**: Full hierarchical transform and event system
- **GameNodeObject**: Base class for all scene graph entities
- **SceneGraphEventSystem**: DOM-like event propagation with spatial targeting
- **RadiusComponent**: Spatial queries and collision detection

### 🔄 Migration In Progress (Help Required)
- **Entity Integration**: Convert Train, TrainCar, Enemy to GameNodeObject
- **SceneManager**: Update to use scene graph auto-registration
- **Event Unification**: Replace GameObject.emit with node.emit
- **System Coordination**: Convert to scene graph queries

### 📋 Legacy Systems (Being Replaced)
- **EventStack**: Use SceneGraphEventSystem instead
- **Direct mesh management**: Use NodeComponent transforms
- **Manual position syncing**: Use hierarchical transforms

## Development Guidelines

### Adding New Features

1. **New Scene Graph Entity**:
   ```typescript
   export class NewEntity extends GameNodeObject {
       constructor(config: NewEntityConfig, parentNode?: NodeComponent) {
           super('newEntity', undefined, scene, parentNode);
           this.node.setLocalPosition(config.position.x, config.position.y, config.position.z);
           this.addComponent(new HealthComponent(config.health));
       }
   }
   ```

2. **New Component**:
   ```typescript
   export interface NewComponentData {
       property: string;
   }
   
   export class NewComponent extends Component<NewComponentData> {
       constructor(data: NewComponentData) {
           super('componentName', data);
           this.requiresComponents(['node']); // Scene graph participation
   ```

3. **New System**:
   ```typescript
   export class NewSystem {
       update(deltaTime: number): void {
           // NEW - Scene graph queries
           const entities = SceneEvents.getNodesInRadius(centerPoint, radius, 
               (node) => node.gameObject?.type === 'entityType');
           
           // Process entities using scene graph events
           entities.forEach(entity => {
               entity.emit('system:update', { deltaTime });
           });
       }
   }
   ```

4. **Migration Example** (Converting existing entity):
   ```typescript
   // BEFORE
   export class Train extends GameObject {
       constructor(config: TrainConfig) {
           super('train');
           this.addComponent(new PositionComponent(config.position));
       }
   }
   
   // AFTER
   export class Train extends GameNodeObject {
       constructor(config: TrainConfig, parentNode?: NodeComponent) {
           super('train', undefined, scene, parentNode);
           this.node.setLocalPosition(config.position.x, config.position.y, config.position.z);
           
           // Train cars become children of this node
           config.cars.forEach((carConfig, index) => {
               const car = new TrainCar(carConfig, this.node);
               this.node.addChild(car.node);
           });
       }
   }
   ```

### Code Standards

- **Naming**: Use consistent, descriptive names
  - Components: `PositionComponent`, `HealthComponent`, `NodeComponent`
  - Systems: `EnemySystem`, `TrainSystem`
  - Entities: `Train`, `Enemy`, `Station` (all extending `GameNodeObject`)
- **File Organization**: One class per file, file name matches class name
- **Imports**: Use relative imports, group by source (core, utils, etc.)
- **Error Handling**: Use proper TypeScript types, handle null/undefined
- **Performance**: Avoid object creation in update loops, use scene graph queries efficiently

### Migration Priority Order

1. **HIGH**: Convert core entities (Train, TrainCar, Enemy) to `GameNodeObject`
2. **HIGH**: Update SceneManager to use scene graph auto-registration
3. **MEDIUM**: Replace event patterns with scene graph events
4. **MEDIUM**: Convert systems to use scene graph queries
5. **LOW**: Add component dependency validation
6. **LOW**: Optimize rendering with scene graph hierarchy

### Testing
- Unit tests in `src/tests/unit/`
- Mock objects in `src/tests/mocks/`
- Test components, systems, and entities separately
- **NEW**: Test scene graph event propagation and hierarchy
- Use descriptive test names and group related tests

## Current Features

### Core Systems
- **Train System**: Manages train movement, car coupling, and rail navigation
- **Enemy System**: Handles enemy AI, pathfinding, and combat
- **UI System**: Manages user interface updates and interactions
- **Scene Graph System**: Hierarchical entity management and event propagation

### Rendering
- **Voxel-based**: All entities rendered as colored voxel grids (individual objects, not instanced)
- **Hierarchical**: Parent-child relationships for trains, cars, and attachments
- **Component-based**: Rendering handled by render components
- **Canvas**: Direct HTML5 Canvas rendering for performance

### Game Mechanics
- **Rail Network**: Trains move along predefined rail paths
- **Car System**: Trains can have multiple cars with different functions
- **Attachment System**: Cars can have attachments (weapons, cargo, etc.)
- **Time Control**: Game can be paused, played at normal speed, or fast-forwarded

## Important Files to Understand

### Core Entry Point
- `src/ecs-app.ts`: Main application initialization and game loop

### Key Components
- `PositionComponent`: Spatial positioning (x, y coordinates)
- `HealthComponent`: Health/damage system
- `MovementComponent`: Movement with velocity and direction
- `RailPositionComponent`: Position on rail network
- `NodeComponent`: Scene graph participation with hierarchical transforms and events
- `TrainCarPositionComponent`: Position within a train (being migrated to NodeComponent)

### Key Entities
- `Train`: Multi-car train entity with complex behavior (migrating to GameNodeObject)
- `TrainCar`: Individual train cars with different types (migrating to GameNodeObject)
- `Enemy`: AI-controlled hostile entities (migrating to GameNodeObject)
- `Station`: Trading posts and interaction points (migrating to GameNodeObject)

### Utilities
- `MathUtils`: Distance, direction, vector math
- `GeometryUtils`: Bounding boxes, collision detection
- `EventStack`: Pub/sub event system (being deprecated in favor of SceneGraphEventSystem)
- `Logger`: Centralized logging with levels

## 📋 Migration Checklist

### Phase 2: Entity Integration (CURRENT)
- ☐ **Convert Train to GameNodeObject** - Update train entity to use scene graph
- ☐ **Convert TrainCar to GameNodeObject** - Train cars as children of train node
- ☐ **Convert Enemy to GameNodeObject** - Enemies participate in scene graph
- ☐ **Convert Station to GameNodeObject** - Stations as scene graph nodes
- ☐ **Update SceneManager** - Use scene graph auto-registration instead of direct mesh management

### Phase 3: Event System Unification (NEXT)
- ☐ **Replace GameObject.emit** - Use node.emit for all event emission
- ☐ **Update event listeners** - Convert to scene graph event listeners
- ☐ **Connect EventStack** - Route legacy events through scene graph
- ☐ **System conversion** - Update systems to use scene graph events

### Phase 4: System Integration (PLANNED)
- ☐ **Scene graph queries** - Replace direct entity references with spatial queries
- ☐ **Component dependencies** - Add validation for required components
- ☐ **Performance optimization** - Optimize scene graph queries and event propagation

## Common Tasks

### Debugging
1. Use `Logger` for output instead of `console.log`
2. Check `ObjectTracker` for memory leaks
3. Verify component registration in `ecs-app.ts`
4. Ensure entities are added to `EntityManager`
5. **NEW**: Use `SceneNodeDebugger` for scene graph hierarchy visualization

### Performance
1. Minimize object creation in update loops
2. Cache frequently accessed components
3. Use efficient entity queries (prefer scene graph queries)
4. Profile with browser dev tools
5. **NEW**: Optimize scene graph event propagation with targeted events

### Adding New Game Mechanics
1. Identify required components (ensure NodeComponent dependency)
2. Create or modify systems to handle new behavior
3. Update UI if user interaction is needed
4. Add appropriate rendering components
5. Write tests for new functionality
6. **NEW**: Consider scene graph event patterns for entity communication

## Development Workflow

1. **Understand Requirements**: Read existing documentation and code
2. **Plan Architecture**: Identify components, systems, and entities needed
3. **Implement Incrementally**: Start with components, then systems, then integration
4. **Test Thoroughly**: Unit tests and manual testing
5. **Document Changes**: Update relevant documentation
6. **NEW**: **Follow Migration Patterns**: Use GameNodeObject for new entities, scene graph events for communication

## Common Pitfalls to Avoid

- **Component Logic**: Don't add methods to components beyond constructor
- **Direct Access**: Don't access `entity.components` directly, use `getComponent()`
- **Hardcoded Names**: Use consistent component name strings
- **Memory Leaks**: Always remove entities from managers when destroyed
- **Performance**: Avoid expensive operations in update loops
- **Type Safety**: Use proper TypeScript types, avoid `any`
- **NEW**: **Scene Graph Violations**: Don't bypass NodeComponent for positioning/hierarchy
- **NEW**: **Event Anti-patterns**: Don't mix old ComponentEvents with new SceneGraphEvents
- **NEW**: **Legacy Dependencies**: Don't add new dependencies on EventStack (use SceneGraphEventSystem)

## Current Limitations and TODOs

See `docs/ROADMAP.md` for detailed current status and planned improvements.

### Immediate Areas for Improvement
- Performance optimization for large numbers of entities
- Better error handling and validation
- More comprehensive testing coverage
- Enhanced debugging tools
- Improved asset management

### Future Features
- Multiplayer networking integration
- Advanced AI behaviors
- More complex trading mechanics
- Procedural content generation
- Mobile platform support

## Documentation References

- `docs/GAME_MECHANICS_AND_ART.md`: Game vision and mechanics
- `docs/SYSTEM_ARCHITECTURE.md`: Technical architecture details
- `docs/CODING_STANDARDS.md`: Code style and patterns
- `docs/DEVELOPMENT_GUIDE.md`: Detailed development instructions
- `docs/QUICK_REFERENCE.md`: Common patterns and snippets
- `docs/ROADMAP.md`: Current status and future plans

## How to Help

When assisting with development:

1. **Understand Context**: Read relevant documentation first
2. **Follow Patterns**: Use existing code patterns and architectural principles
3. **Maintain Quality**: Write clean, typed, testable code
4. **Consider Performance**: Be mindful of game loop performance
5. **Test Changes**: Ensure new code works and doesn't break existing functionality
6. **Update Documentation**: Keep documentation current with code changes

Remember: This is an ECS-based game engine. Always think in terms of entities, components, and systems. Favor composition over inheritance, and keep concerns properly separated.

## Implementation Reality vs Documentation

### What Actually Exists (Use These)
- **Main Entry**: `src/ecs-app.ts` (NOT `src/app.ts` which is legacy)
- **Working Systems**: TrainSystem, EnemySystem, UISystem in `src/systems/`
- **Functioning Entities**: All entities in `src/entities/` are implemented and working
- **Render Components**: VoxelRenderComponent, CarRenderComponent, AttachmentRenderComponent in `src/renderers/`
- **Utilities**: MathUtils, GeometryUtils, Logger, ObjectTracker in `src/utils/`
- **Core Framework**: GameObject, Component, SceneManager all functional

### What's Minimal/Stubbed (Needs Development)
- **Multiplayer**: Colyseus client exists but no actual multiplayer functionality
- **AI Behavior**: AIBehaviorComponent is basic, no behavior trees
- **Game Mechanics**: Basic entities exist but economic/trade gameplay is minimal
- **UI Polish**: Functional but not game-ready (developer-focused only)
- **Mobile Support**: None - desktop web only
- **Asset Pipeline**: Basic colored voxels only, no real art assets

### Common Gotchas for AI Assistants
- **Don't reference** non-existent managers (InputManager, NetworkManager, AudioManager)
- **Components** have methods and behavior, not just data (it's a pragmatic ECS)
- **No initialize()** methods - everything initializes in constructors
- **Math operations** should often use MathUtils/GeometryUtils, not inline calculations
- **Logging** should use Logger with proper categories, not console.log
- **All entities** inherit from GameObject and use component composition

This reality check helps you give accurate advice based on what's actually implemented vs. aspirational documentation.

## Development Tools and Batch Update Patterns

The project includes some patterns for large-scale refactoring and code changes in the `dev_tools/` directory. These should be used sparingly, as they have introduced significant erros when misused in the past.

### AI-Assisted Refactoring Best Practices

1. **Pattern Recognition**: AI identifies what needs to change and creates the mapping
2. **Script Generation**: Use templates to create systematic update scripts
3. **Incremental Validation**: Test changes in small batches before full deployment
4. **Progress Tracking**: Use scripts that report what files were modified
5. **Human Review**: Always review the patterns before applying to the entire codebase

This approach enables confident large-scale changes while maintaining code quality and project stability.
