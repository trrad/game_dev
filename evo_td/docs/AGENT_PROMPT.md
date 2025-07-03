# Agent Development Prompt

This document provides AI assistants with comprehensive context about the Train Trading Game project for effective development assistance.

## Project Overview

This is an **Entity-Component-System (ECS) based train trading game** built with TypeScript, using Babylon.JS for 3D rendering. The game features modular trains with voxel-based construction, combat against dynamic enemies, and a cooperative multiplayer trading system.

### Technology Stack
- **Language**: TypeScript with strict mode
- **Architecture**: Entity-Component-System (ECS)
- **Rendering**: Babylon.JS for 3D graphics
- **Build Tool**: Vite
- **Testing**: Jest
- **Networking**: Colyseus (planned for multiplayer)

### Current Development Phase
The project has undergone systematic refactoring (Phases 1-3) to establish clean ECS architecture:
- **Phase 1**: Legacy file cleanup and architectural alignment
- **Phase 2**: Entity/Component refactoring with constructor-based initialization
- **Phase 3**: Naming standardization and utility consolidation

## Project Structure

```
src/
├── ecs-app.ts              # Main ECS application entry point
├── core/                   # Core framework classes
│   ├── GameObject.ts       # Base entity class
│   ├── Component.ts        # Base component interface
│   ├── SceneManager.ts     # 3D scene and rendering coordination
│   └── TimeManager.ts      # Game time and delta calculations
├── components/             # ECS components (with methods, not just data)
│   ├── PositionComponent.ts    # 3D position and spatial operations
│   ├── HealthComponent.ts      # Health, damage, and regeneration
│   ├── MovementComponent.ts    # Velocity and physics properties
│   ├── AIBehaviorComponent.ts  # Enemy AI state and decision making
│   ├── RailPositionComponent.ts      # Train position along rails
│   ├── TrainCarPositionComponent.ts  # Car position within trains
│   └── AttachmentSlotComponent.ts    # 3D grid attachment mounting
├── entities/               # Game entities (extend GameObject)
│   ├── Train.ts           # Multi-car train entities
│   ├── TrainCar.ts        # Individual train cars with voxel grids
│   ├── TrainCarVoxel.ts   # Individual voxel entities
│   ├── Enemy.ts           # AI-controlled hostile entities
│   ├── Station.ts         # Trading and service hubs
│   ├── Rail.ts            # Path connections between stations
│   ├── Building.ts        # Station buildings and structures
│   ├── Attachment.ts      # Equipment mounted on train cars
│   └── Projectile.ts      # Weapon projectiles
├── systems/               # ECS systems (coordinate gameplay)
│   ├── TrainSystem.ts     # Train movement and car coordination
│   ├── EnemySystem.ts     # Enemy spawning, AI, and combat
│   ├── ProjectileSystem.ts # Projectile physics and collision
│   └── UISystem.ts        # User interface management
├── renderers/             # Rendering components (extend RenderComponent)
│   ├── VoxelRenderComponent.ts      # Individual voxel rendering
│   ├── CarRenderComponent.ts        # Car-level render coordination
│   ├── TrainRenderComponent.ts      # Train-level render coordination
│   ├── AttachmentRenderComponent.ts # Equipment and weapon rendering
│   ├── EnemyRenderer.ts             # Enemy visual representation
│   └── StationRenderer.ts           # Station and building rendering
├── utils/                 # Utility functions and helpers
│   ├── MathUtils.ts       # Mathematical operations and vectors
│   ├── GeometryUtils.ts   # Spatial calculations and collision
│   ├── ObjectTracker.ts   # Global entity registry and lookup
│   └── Logger.ts          # Structured logging and observability
└── ui/                    # User interface components
    ├── UIManager.ts       # UI system coordination
    ├── TimeControlsUI.ts  # Game time manipulation
    └── TrainJourneyControlsUI.ts  # Train control interface
```
│   ├── TimeControlsUI.ts
│   ├── EventLogUI.ts
│   └── TrainCarModificationUI.ts
├── utils/                 # Utility functions
│   ├── MathUtils.ts
│   ├── GeometryUtils.ts
│   ├── Logger.ts
│   └── ObjectTracker.ts
├── core/                  # Core ECS framework
│   ├── GameObject.ts
│   ├── Component.ts
│   ├── SceneManager.ts
│   ├── TimeManager.ts
│   └── EventStack.ts
└── net/                   # Networking code
    └── ColyseusClient.ts
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
- **Component Registration**: Add components to entities with `entity.addComponent(component)`

### Entity Creation Patterns (Current Reality)
- **Direct Construction**: Create entities directly (`new Train(config)`, `new Enemy(config)`)
- **Component Assembly**: Entities add all required components in their constructors
- **Automatic Tracking**: Entities register with `ObjectTracker` automatically when created
- **ID-Based Lookup**: Use `ObjectTracker.getById(id)` to find any entity by ID or `ObjectTracker.getByType(type)` for all entities of a type

### System Coordination (How It Actually Works)
- **Specialized Systems**: Each system manages specific mechanics (TrainSystem, EnemySystem, UISystem)
- **Entity Queries**: Systems find entities via `ObjectTracker.getByType()` or maintain their own collections
- **Structured Logging**: Use `Logger.log(category, message, data)` with categories for observability
- **Frame-Based Updates**: All update methods receive `deltaTime` parameter

### Rendering Architecture (Current Implementation)
- **Component-Based**: Each visual element has a corresponding render component
- **Hierarchical**: `CarRenderComponent` manages `VoxelRenderComponent` instances
- **Auto-Discovery**: `SceneManager` automatically finds and renders entities with render components
- **Resource Management**: Render components handle their own disposal and cleanup
- **Specialized Systems**: Each system manages specific mechanics (TrainSystem, EnemySystem)
- **Entity Queries**: Systems find entities via `ObjectTracker.getByType()` or maintain collections
- **Structured Logging**: Use `Logger` with categories for observability
- **Frame-Based Updates**: All update methods receive `deltaTime` parameter

### Rendering Architecture
- **Component-Based**: Each visual element has a corresponding render component
- **Hierarchical**: CarRenderComponent manages VoxelRenderComponent instances
- **Auto-Discovery**: SceneManager automatically finds and renders entities with render components
- **Resource Management**: Render components handle their own disposal and cleanup

## Development Guidelines

### Adding New Features

1. **New Component**:
   ```typescript
   export interface NewComponentData {
       property: string;
   }
   
   export class NewComponent extends Component<NewComponentData> {
       constructor(data: NewComponentData) {
           super('componentName', data);
       }
   }
   ```

2. **New System**:
   ```typescript
   export class NewSystem {
       update(deltaTime: number): void {
           const entities = ObjectTracker.getByType('entityType');
           // Process entities
       }
   }
   ```

3. **New Entity**:
   ```typescript
   export class NewEntity extends GameObject {
       constructor(config: NewEntityConfig) {
           super('entityType');
           this.addComponent(new PositionComponent());
           // Add other required components
       }
   }
   ```

### Code Standards

- **Naming**: Use consistent, descriptive names
  - Components: `PositionComponent`, `HealthComponent`
  - Systems: `EnemySystem`, `TrainSystem`
  - Entities: `Train`, `Enemy`, `Station`
- **File Organization**: One class per file, file name matches class name
- **Imports**: Use relative imports, group by source (core, utils, etc.)
- **Error Handling**: Use proper TypeScript types, handle null/undefined
- **Performance**: Avoid object creation in update loops

### Testing
- Unit tests in `src/tests/unit/`
- Mock objects in `src/tests/mocks/`
- Test components, systems, and entities separately
- Use descriptive test names and group related tests

## Current Features

### Core Systems
- **Train System**: Manages train movement, car coupling, and rail navigation
- **Enemy System**: Handles enemy AI, pathfinding, and combat
- **UI System**: Manages user interface updates and interactions

### Rendering
- **Voxel-based**: All entities rendered as colored voxel grids
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
- `TrainCarPositionComponent`: Position within a train

### Key Entities
- `Train`: Multi-car train entity with complex behavior
- `TrainCar`: Individual train cars with different types
- `Enemy`: AI-controlled hostile entities
- `Station`: Trading posts and interaction points

### Utilities
- `MathUtils`: Distance, direction, vector math
- `GeometryUtils`: Bounding boxes, collision detection
- `EventStack`: Pub/sub event system
- `Logger`: Centralized logging with levels

## Common Tasks

### Debugging
1. Use `Logger` for output instead of `console.log`
2. Check `ObjectTracker` for memory leaks
3. Verify component registration in `ecs-app.ts`
4. Ensure entities are added to `EntityManager`

### Performance
1. Minimize object creation in update loops
2. Cache frequently accessed components
3. Use efficient entity queries
4. Profile with browser dev tools

### Adding New Game Mechanics
1. Identify required components
2. Create or modify systems to handle new behavior
3. Update UI if user interaction is needed
4. Add appropriate rendering components
5. Write tests for new functionality

## Development Workflow

1. **Understand Requirements**: Read existing documentation and code
2. **Plan Architecture**: Identify components, systems, and entities needed
3. **Implement Incrementally**: Start with components, then systems, then integration
4. **Test Thoroughly**: Unit tests and manual testing
5. **Document Changes**: Update relevant documentation

## Common Pitfalls to Avoid

- **Component Logic**: Don't add methods to components beyond constructor
- **Direct Access**: Don't access `entity.components` directly, use `getComponent()`
- **Hardcoded Names**: Use consistent component name strings
- **Memory Leaks**: Always remove entities from managers when destroyed
- **Performance**: Avoid expensive operations in update loops
- **Type Safety**: Use proper TypeScript types, avoid `any`

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

The project includes proven patterns for large-scale refactoring and code changes in the `dev_tools/` directory.

### Batch Update Scripts for Large Refactoring

When doing systematic changes across many files (like the engine/game directory restructure), use scripted approaches rather than manual file-by-file edits:

**Key Resources:**
- `dev_tools/batch_file_updater_template.ps1` - Generalized template for batch file updates
- `dev_tools/import_path_migration_example.ps1` - Example of import path refactoring
- `dev_tools/README.md` - Complete documentation of the batch update pattern

**Success Story:**
The import path migration during engine/game separation:
- Reduced compilation errors from 350+ to 50 (90% improvement)
- Updated 41 files across 2 script runs
- Systematic, trackable, and reversible changes

### When to Use Batch Scripts

Consider scripted approaches for:
- **Import path changes** (renaming directories, restructuring modules)
- **API refactoring** (method renames, parameter changes)
- **Component/class renames** (updating all references consistently)
- **Configuration format changes** (updating config files across the project)
- **Library migrations** (switching from one library to another)

### AI-Assisted Refactoring Best Practices

1. **Pattern Recognition**: AI identifies what needs to change and creates the mapping
2. **Script Generation**: Use templates to create systematic update scripts
3. **Incremental Validation**: Test changes in small batches before full deployment
4. **Progress Tracking**: Use scripts that report what files were modified
5. **Human Review**: Always review the patterns before applying to the entire codebase

This approach enables confident large-scale changes while maintaining code quality and project stability.
