# Engine Architecture

This directory contains the core engine components that are game-agnostic and could be reused in other projects. The engine architecture is designed to be modular, extensible, and provide a solid foundation for building games.

## Directory Structure

- **core/**: Core framework classes
  - `Component.ts`: Base component class
  - `GameObject.ts`: Base entity class
  - `EventStack.ts`: Event management system
  - `ConfigManager.ts`: Engine configuration
  - `TimeManager.ts`: Time and update management
- **components/**: ECS components (engine-level)
  - `NodeComponent.ts`: Scene node/transform component
  - `PositionComponent.ts`: Position and rotation
  - `HealthComponent.ts`: Health and damage
  - `MovementComponent.ts`: Movement and velocity
  - `RadiusComponent.ts`: Collision/area radius
- **scene/**: Scene graph management
  - `SceneManager.ts`: Scene and entity hierarchy
- **utils/**: Engine utilities
  - `Logger.ts`, `MathUtils.ts`, `GeometryUtils.ts`, `ObjectTracker.ts`
- **net/**: Networking (engine-level)
  - `ColyseusClient.ts`: Multiplayer networking (planned)

## Key Features

### Scene Graph Hierarchy

The `NodeComponent` provides hierarchical node management using Babylon.js's scene graph:

- Parent-child relationships between objects
- Local and world space transformations
- Automatic inheritance of transforms
- Efficient matrix operations
- Hierarchical organization of game objects

### Resource Management

The `RenderResourceManager` optimizes rendering performance through:

- Mesh template pooling and instancing
- Material reuse and management
- Texture caching
- Automatic resource cleanup

## Best Practices

When working with engine components:

1. **Minimal Dependencies**: Engine components should have minimal dependencies on game-specific code
2. **Interface-Based Design**: Use clear interfaces between systems
3. **Composition Over Inheritance**: Prefer component composition over deep inheritance hierarchies
4. **Memory Management**: Always clean up resources when they're no longer needed
5. **Decoupled Communication**: Use the EventStack for communication between loosely coupled systems

## Adding New Engine Features

When adding new engine features:

1. Place them in the appropriate subdirectory
2. Keep them game-agnostic and reusable
3. Provide clear documentation
4. Add proper unit tests
5. Update this README if necessary
