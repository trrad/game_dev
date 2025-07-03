# Game Components

This directory contains game-specific components that implement the train trading game mechanics. These components build upon the engine foundation but contain logic specific to this particular game.

## Directory Structure

- **components/**: Game-specific ECS components
  - `RailPositionComponent.ts`, `RailMovementComponent.ts`, `AttachmentSlotComponent.ts`, `TrainCarVoxelComponent.ts`, etc.
- **entities/**: Game-specific entities
  - `Trains/Train.ts`: Train entity
  - `Trains/TrainCar/TrainCar.ts`: Train car entity
  - `Trains/TrainCar/TrainCarVoxels/TrainCarVoxel.ts`: Voxel entity for train cars
  - `Station/Station.ts`: Station entity
  - `Enemy.ts`: Enemy entity
  - `Attachment/Attachment.ts`: Weapon/cargo attachments
- **systems/**: Game-specific systems
  - `TrainSystem.ts`: Train management
  - `EnemySystem.ts`: Enemy management
  - `UISystem.ts`: UI management
  - `ProjectileSystem.ts`: Projectile and combat logic
- **renderers/**: Game-specific rendering components
  - `TrainRenderer.ts`, `EnemyRenderer.ts`, `StationRenderer.ts`, etc.
- **ui/**: User interface components
  - `UIManager.ts`, `UIFactory.ts`, `TrainJourneyControlsUI.ts`, etc.
- **utils/**: Game-specific utilities (if any)

## Game Mechanics

### Train System

The train system manages modular trains that:
- Move along rail networks
- Have customizable car configurations
- Can be upgraded with attachments
- Trade resources between stations

### Enemy System

The enemy system handles:
- Enemy spawning and AI
- Combat with player trains
- Pathfinding and targeting
- Evolution mechanics

### Economy System

The economy system manages:
- Resource production and consumption
- Trading between stations
- Price fluctuations
- Player economy progression

## Best Practices

When working with game components:

1. **Engine Dependency**: Game components can depend on engine components, but not vice versa
2. **Composability**: Design components to be composable and reusable where possible
3. **Clear Interfaces**: Use clear interfaces between systems
4. **Configuration**: Make components configurable with sensible defaults

## Adding New Game Features

When adding new game features:

1. Determine whether it belongs in the engine or game layer
2. Place it in the appropriate subdirectory
3. Follow existing patterns for integration
4. Update documentation
5. Add tests where appropriate
