# Development Guide

## Project Overview

The Train Trading Game is a multiplayer cozy trading and exploration game built with TypeScript, Babylon.js, and an Entity-Component-System (ECS) architecture. This guide provides practical information for developers working on the project.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- TypeScript 4.9+
- Modern web browser with WebGL support
- Git for version control

### Setup
```bash
git clone <repository-url>
cd evo_td
npm install
npm run dev        # Start development server
npm run test       # Run test suite
npm run build      # Build for production
```

### Project Structure
```
evo_td/
├── src/
│   ├── core/           # Core ECS framework
│   ├── entities/       # Game entities (Train, Station, Enemy)
│   ├── components/     # Reusable behaviors
│   ├── systems/        # Game logic managers
│   ├── renderers/      # Visual representation components
│   ├── ui/             # User interface components
│   ├── utils/          # Utility functions and helpers
│   └── main.ts         # Application entry point
├── docs/               # Documentation (this file)
├── public/             # Static assets
└── tests/              # Test files
```

## Architecture Reference

### Core Framework Files

#### `src/core/GameObject.ts`
Base class for all game entities. Provides component management and event integration.

**Key Methods:**
- `addComponent<T>(component: T): T` - Attach a component
- `getComponent<T>(type: string): T | undefined` - Retrieve a component
- `removeComponent(type: string): void` - Remove a component
- `hasComponent(type: string): boolean` - Check component existence

#### `src/core/SceneManager.ts`
Manages 3D rendering and camera control using Babylon.js.

**Responsibilities:**
- Entity discovery and rendering registration
- Camera following and control
- Performance monitoring and quality adjustment
- Event-driven visual updates

#### `src/utils/ObjectTracker.ts`
Global entity registry for lookup and lifecycle management.

**Key Methods:**
- `static register(gameObject: GameObject): void` - Register entity
- `static getById(id: string): GameObject | undefined` - Find by ID
- `static getByType(type: string): GameObject[]` - Find by type
- `static unregister(id: string): void` - Remove from registry

### Component System

#### Component Interface
All components must implement:
```typescript
interface Component {
    readonly type: string;
    update?(deltaTime: number): void;
    dispose?(): void;
}
```

#### Core Components

**`PositionComponent`** (`src/components/PositionComponent.ts`)
- 3D position and rotation management
- `getPosition(): Position3D` - Get current position
- `setPosition(pos: Position3D): void` - Update position

**`HealthComponent`** (`src/components/HealthComponent.ts`)
- Health points and damage handling
- `getHealth(): number` - Current health value
- `takeDamage(amount: number, type: string): void` - Apply damage

**`MovementComponent`** (`src/components/MovementComponent.ts`)
- Velocity and acceleration properties
- Used by physics systems for entity movement

**`AIBehaviorComponent`** (`src/components/AIBehaviorComponent.ts`)
- Enemy AI state management
- Behavior tree execution and target tracking

### Entity Types

#### Train Entities

**`Train`** (`src/entities/Train.ts`)
Top-level train entity managing multiple cars.
- `getCars(): TrainCar[]` - Get all train cars
- `addCar(car: TrainCar): void` - Attach new car
- `removeCar(carId: string): void` - Detach car

**`TrainCar`** (`src/entities/TrainCar.ts`)
Individual train car with voxel grid and attachments.
- `getVoxels(): TrainCarVoxel[]` - Get all voxels
- `getAttachments(): Attachment[]` - Get mounted equipment
- `addAttachment(attachment: Attachment): void` - Mount equipment

**`TrainCarVoxel`** (`src/entities/TrainCarVoxel.ts`)
Individual voxel within a train car.
- Independent health and damage states
- Material type and visual properties

#### World Entities

**`Station`** (`src/entities/Station.ts`)
Trade hub with economic functions.
- `getBuildings(): Building[]` - Get station buildings
- `addBuilding(building: Building): void` - Construct building

**`Rail`** (`src/entities/Rail.ts`)
Connection between stations for train movement.
- `getPositionAt(progress: number): Vector3` - Get position along rail
- Path interpolation and movement support

#### Combat Entities

**`Enemy`** (`src/entities/Enemy.ts`)
Hostile entity with AI behavior.
- `getTargetPosition(): Vector3 | null` - Current AI target
- `takeDamage(amount: number): void` - Damage handling

**`Projectile`** (`src/entities/Projectile.ts`)
Weapon projectiles with physics simulation.
- `updatePosition(deltaTime: number): void` - Physics update
- `getTargetPosition(): Vector3` - Target coordinates

### System Managers

#### `TrainSystem` (`src/systems/TrainSystem.ts`)
Manages train movement and multi-car coordination.

**Key Responsibilities:**
- Journey planning and execution
- Car positioning and physics
- Attachment integration and weapon firing

**Key Methods:**
- `update(deltaTime: number): void` - Main update loop
- `moveTrainToStation(trainId: string, stationId: string): void` - Route planning

#### `EnemySystem` (`src/systems/EnemySystem.ts`)
Handles enemy spawning, AI, and combat.

**Key Responsibilities:**
- Dynamic enemy spawning based on player activity
- AI behavior tree execution
- Combat resolution and health management

**Key Methods:**
- `update(deltaTime: number): void` - AI and combat updates
- `spawnEnemyNearRail(railId: string): Enemy` - Create new enemy

#### `UISystem` (`src/systems/UISystem.ts`)
Manages user interface and input processing.

**Key Responsibilities:**
- Dynamic UI element creation and updates
- Input event handling and routing
- Cross-platform interface adaptation

## Rendering System

### Render Components

#### `VoxelRenderComponent` (`src/renderers/VoxelRenderComponent.ts`)
Renders individual train car voxels.
- Health-based color coding
- Material type visualization
- Performance optimization through LoD

#### `CarRenderComponent` (`src/renderers/CarRenderComponent.ts`)
Coordinates rendering for entire train cars.
- Manages multiple voxel renderers
- Attachment mounting and positioning
- Car-level visual effects

#### `AttachmentRenderComponent` (`src/renderers/AttachmentRenderComponent.ts`)
Renders weapons and equipment.
- Dynamic mounting to train cars
- State-based visual feedback
- Effect integration (muzzle flashes, etc.)

### Visual Integration
The rendering system uses component-based discovery:
1. Entities with render components are automatically found by SceneManager
2. Render components create and manage Babylon.js meshes
3. Position updates trigger visual updates through events

## Utility Libraries

### `MathUtils` (`src/utils/MathUtils.ts`)
Mathematical operations for game calculations.

**Key Functions:**
- `calculateDistance(pos1: Position3D, pos2: Position3D): number`
- `calculateNormalizedDirection(from: Position3D, to: Position3D): Position3D`
- `isWithinDistance(pos1: Position3D, pos2: Position3D, maxDistance: number): boolean`

### `GeometryUtils` (`src/utils/GeometryUtils.ts`)
Geometric calculations and spatial operations.

**Key Functions:**
- `createBounds(position: Vector3, size: Vector3): BoundingBox`
- `pointOverlapsBounds(point: Vector3, bounds: BoundingBox, radius?: number): boolean`
- `boundsOverlap(bounds1: BoundingBox, bounds2: BoundingBox): boolean`

### `Logger` (`src/utils/Logger.ts`)
Structured logging with categorization and rich metadata.

**Usage:**
```typescript
Logger.log(LogCategory.SYSTEM, 'Train created', { trainId: 'train-123' });
Logger.error(LogCategory.RENDERING, 'Mesh creation failed', { error });
```

## Development Patterns

### Adding New Components

1. **Create Component File**
```typescript
// src/components/NewComponent.ts
export class NewComponent implements Component {
    readonly type = 'newComponent';
    
    constructor(config: NewComponentConfig) {
        // Initialize with configuration
    }
    
    update(deltaTime: number): void {
        // Optional update logic
    }
}
```

2. **Register Component Type**
Add to component type definitions and ensure unique type string.

3. **Integration**
Add component to relevant entities in their constructors.

### Adding New Entities

1. **Create Entity File**
```typescript
// src/entities/NewEntity.ts
export class NewEntity extends GameObject {
    constructor(config: NewEntityConfig) {
        super('newEntity');
        
        // Add required components
        this.addComponent(new PositionComponent());
        // Add other components as needed
        
        // Register with ObjectTracker
        ObjectTracker.register(this);
    }
}
```

2. **Add Factory Function** (if needed)
Create standardized creation methods for complex entities.

3. **System Integration**
Update relevant systems to handle the new entity type.

### Adding New Systems

1. **Create System File**
```typescript
// src/systems/NewSystem.ts
export class NewSystem extends SystemManager {
    constructor() {
        super('NewSystem');
        
        // Initialize metrics
        this.metrics.set('entities_processed', 0);
    }
    
    update(deltaTime: number): void {
        // Main update logic
    }
}
```

2. **Register System**
Add to main application initialization in `src/ecs-app.ts`.

3. **Event Integration**
Subscribe to relevant events and emit system events as needed.

## Testing Guidelines

### Test Structure
Tests are located in `src/tests/` with the following structure:
- `unit/` - Individual component and entity tests
- `integration/` - System interaction tests
- `mocks/` - Test doubles and mock objects

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

### Writing Tests
```typescript
describe('ComponentName', () => {
    describe('methodName', () => {
        it('should behave correctly when condition', () => {
            // Arrange
            const component = new ComponentName(config);
            
            // Act
            const result = component.methodName(input);
            
            // Assert
            expect(result).toBe(expectedValue);
        });
    });
});
```

## Common Tasks

### Creating a New Train Car Type
1. Add car type to `CarType` enum
2. Update `TrainCarConfig` interface if needed
3. Add specialized logic in `TrainCar` constructor
4. Update factory methods in `AttachmentSlotFactory`
5. Add tests for new functionality

### Adding a New Weapon Type
1. Create weapon configuration in `AttachmentFactory`
2. Add weapon-specific logic in `Attachment` class
3. Update rendering in `AttachmentRenderComponent`
4. Implement firing logic in `EnemySystem`
5. Add visual effects and audio feedback

### Implementing a New UI Element
1. Create UI component in `src/ui/`
2. Add styling in `assets/ui/`
3. Register with `UISystem`
4. Add event handling for interactions
5. Ensure responsive design for mobile

### Performance Optimization
1. Profile using browser developer tools
2. Identify bottlenecks in update loops
3. Implement object pooling for frequently created objects
4. Add Level-of-Detail (LoD) for distant objects
5. Use batch operations for similar entities

## Debugging Tools

### Console Commands
Available in browser developer console:
- `game.getTrains()` - List all active trains
- `game.getEnemies()` - List all enemies
- `game.getMetrics()` - Display system performance metrics

### Logging Categories
- `SYSTEM` - Core game logic events
- `RENDERING` - Visual system operations
- `NETWORK` - Multiplayer synchronization
- `UI` - Interface interactions
- `DEBUG` - Development-time information

### Visual Debugging
- Component health states are color-coded in rendering
- Bounding boxes can be toggled for collision debugging
- AI targets and pathfinding are visualized in debug mode

## Deployment

### Development Build
```bash
npm run dev         # Start development server with hot reload
```

### Production Build
```bash
npm run build       # Create optimized production build
npm run preview     # Preview production build locally
```

### Build Configuration
- TypeScript compilation with strict mode enabled
- Asset optimization and minification
- Source map generation for debugging
- Tree shaking for smaller bundle sizes

## Contributing

### Code Review Process
1. Create feature branch from main
2. Implement changes following coding standards
3. Add tests for new functionality
4. Update documentation as needed
5. Submit pull request for review

### Commit Standards
Use conventional commit format:
- `feat: add new enemy type`
- `fix: resolve train car coupling issue`
- `docs: update API documentation`
- `refactor: consolidate utility functions`

---

*This guide covers the current state of the project. For architectural decisions and design philosophy, see `CODING_STANDARDS.md`. For future development plans, see `ROADMAP.md`.*
