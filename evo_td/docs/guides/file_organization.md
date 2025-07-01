# File Organization Standards

## Overview

This document establishes clear rules for organizing code files in the Train Trading Game project, ensuring consistency and maintainability as the project scales.

## Directory Structure

### Current Project Structure

```
src/
├── core/                   # Core ECS framework
│   ├── GameObject.ts       # Base entity class
│   ├── Component.ts        # Base component class
│   ├── SceneManager.ts     # 3D scene management
│   ├── TimeManager.ts      # Game time and speed control
│   └── EventStack.ts       # Event system
│
├── entities/               # Game entities (extend GameObject)
│   ├── Train.ts           # Player trains
│   ├── TrainCar.ts        # Individual train cars
│   ├── Station.ts         # Trading stations
│   ├── Rail.ts            # Rail connections
│   ├── Enemy.ts           # Enemy entities
│   ├── Game.ts            # Main game state entity
│   └── Weapon.ts          # Weapon entities
│
├── components/             # Reusable component logic
│   ├── PositionComponent.ts        # 3D position and rotation
│   ├── MovementComponent.ts        # Movement and velocity
│   ├── HealthComponent.ts          # Health and damage
│   ├── AIBehaviorComponent.ts      # AI decision making
│   ├── InventoryComponent.ts       # Item storage
│   ├── AttachmentComponent.ts      # Train attachments
│   ├── AttachmentFactory.ts        # Attachment creation
│   ├── AttachmentSlotComponent.ts  # Attachment mounting
│   └── AttachmentSlotFactory.ts    # Slot creation
│
├── systems/                # Game logic systems
│   ├── TrainSystem.ts      # Train movement and management
│   ├── EnemySystem.ts      # Enemy spawning and AI
│   └── UISystem.ts         # User interface coordination
│
├── renderers/              # Visual representation (Babylon.js)
│   ├── StationRenderer.ts  # Station 3D visuals
│   ├── RailRenderer.ts     # Rail track visuals
│   ├── TrainRenderer.ts    # Train 3D models
│   ├── EnemyRenderer.ts    # Enemy visuals
│   ├── GroundRenderer.ts   # Ground plane
│   └── LightRenderer.ts    # Scene lighting
│
├── ui/                     # User interface components
│   ├── UIFactory.ts        # UI element creation
│   ├── UIManager.ts        # UI coordination
│   ├── EventLogUI.ts       # Event log display
│   ├── TimeControlsUI.ts   # Time speed controls
│   ├── TrainJourneyControlsUI.ts   # Train control panel
│   ├── TrainCarModificationUI.ts   # Attachment interface
│   └── assets/             # UI CSS and resources
│       ├── main.css
│       ├── time-controls.css
│       ├── event-log.css
│       └── train-car-modification.css
│
├── utils/                  # Utility classes and helpers
│   ├── Logger.ts           # Logging system
│   ├── ObjectTracker.ts    # Development debugging
│   └── CSSLoader.ts        # Dynamic CSS loading
│
├── net/                    # Networking (Colyseus integration)
│   └── ColyseusClient.ts   # Multiplayer client
│
├── tests/                  # Test files
│   ├── mocks/              # Mock objects for testing
│   │   └── babylonjs.mock.ts
│   └── unit/               # Unit tests
│       ├── Rail.test.ts
│       ├── Station.test.ts
│       ├── Train.test.ts
│       ├── TrainCar.test.ts
│       └── SceneManager.test.ts
│
└── examples/               # Integration examples and demos
    ├── GameIntegration.ts
    └── SceneManagerIntegration.ts
```

## File Placement Rules

### 1. Core Framework (`/core/`)

**Purpose**: Fundamental ECS framework classes that other code depends on.

**Place here**:
- Base classes (GameObject, Component, System)
- Core managers (SceneManager, TimeManager, EventStack)
- Framework utilities that are system-agnostic

**Don't place here**:
- Game-specific logic
- UI components
- Rendering code
- Business logic

```typescript
// core/GameObject.ts - Base entity class
export abstract class GameObject {
    // Framework-level entity management
}

// core/TimeManager.ts - Time scaling and pause functionality
export class TimeManager {
    // Core time management for all systems
}
```

### 2. Game Entities (`/entities/`)

**Purpose**: Concrete game objects that represent things in the game world.

**Place here**:
- Classes that extend GameObject
- Game-specific entity logic
- Entity factory functions
- Entity configuration interfaces

**Naming Convention**: 
- PascalCase for classes: `Train.ts`, `TrainCar.ts`
- Suffix with entity type: `Station.ts`, `Rail.ts`

```typescript
// entities/Train.ts
export class Train extends GameObject {
    // Train-specific logic and components
}

export interface TrainConfig {
    // Train configuration options
}
```

### 3. Components (`/components/`)

**Purpose**: Reusable behaviors and data that can be attached to any entity.

**Place here**:
- Classes that extend Component
- Component-specific interfaces
- Factory classes for complex components
- Pure data containers with minimal logic

**Naming Convention**: 
- Suffix with "Component": `PositionComponent.ts`
- Suffix factories with "Factory": `AttachmentFactory.ts`

```typescript
// components/PositionComponent.ts
export class PositionComponent extends Component {
    // Position and rotation data
}

// components/AttachmentFactory.ts
export class AttachmentFactory {
    // Creates attachment objects
}
```

### 4. Systems (`/systems/`)

**Purpose**: Business logic that processes entities and coordinates game behavior.

**Place here**:
- Classes that manage game logic
- System coordination classes
- Game state management
- Cross-entity interactions

**Naming Convention**:
- Suffix with "System": `TrainSystem.ts`, `EnemySystem.ts`

```typescript
// systems/TrainSystem.ts
export class TrainSystem {
    // Manages all train movement and interactions
}
```

### 5. Renderers (`/renderers/`)

**Purpose**: Visual representation and 3D graphics using Babylon.js.

**Place here**:
- Babylon.js mesh creation
- Visual effects
- 3D model management
- Scene rendering logic

**Naming Convention**:
- Suffix with "Renderer": `TrainRenderer.ts`

```typescript
// renderers/TrainRenderer.ts
export class TrainRenderer {
    // Creates and manages train 3D visuals
}
```

### 6. UI Components (`/ui/`)

**Purpose**: User interface elements and interaction logic.

**Place here**:
- DOM manipulation classes
- UI event handlers
- HTML/CSS generation
- User input processing

**Naming Convention**:
- Suffix with "UI": `EventLogUI.ts`
- Group related CSS in `/ui/assets/`

```typescript
// ui/EventLogUI.ts
export class EventLogUI {
    // Manages the event log display
}
```

### 7. Utilities (`/utils/`)

**Purpose**: Helper functions and utility classes used across the project.

**Place here**:
- Logging and debugging tools
- Mathematical utilities
- File I/O helpers
- Cross-cutting concerns

```typescript
// utils/Logger.ts
export class Logger {
    // Project-wide logging functionality
}
```

## File Naming Conventions

### Class Files
- **PascalCase**: `TrainSystem.ts`, `PositionComponent.ts`
- **Descriptive**: Include the type suffix (`Component`, `System`, `Renderer`)
- **Specific**: Avoid generic names like `Helper.ts` or `Utility.ts`

### Interface Files
- **Co-locate with implementation**: Define interfaces in the same file as the class that uses them
- **Export separately**: Allow interfaces to be imported independently

```typescript
// entities/Train.ts
export interface TrainConfig {
    cargoCapacity: number;
    baseSpeed: number;
}

export class Train extends GameObject {
    constructor(config: TrainConfig) {
        // Implementation
    }
}
```

### Test Files
- **Mirror source structure**: `src/entities/Train.ts` → `src/tests/unit/Train.test.ts`
- **Suffix with `.test.ts`**: Clear test file identification
- **Group by test type**: `unit/`, `integration/`, `e2e/`

### Configuration Files
- **Place near usage**: Configuration interfaces go with the classes that use them
- **Separate large configs**: Create dedicated config files for complex configurations

## Import Organization

### Import Order
```typescript
// 1. External libraries
import { Engine, Scene, Vector3 } from "@babylonjs/core";
import { Room, Client } from 'colyseus';

// 2. Core framework (relative imports)
import { GameObject } from "../core/GameObject";
import { Component } from "../core/Component";

// 3. Internal modules (relative imports)
import { TrainSystem } from "../systems/TrainSystem";
import { PositionComponent } from "../components/PositionComponent";

// 4. Types and interfaces
import type { TrainConfig, StationConfig } from "../types";

// 5. Constants and configuration
import { GameConfig } from "../config/GameConfig";
```

### Import Patterns
```typescript
// Prefer named imports
import { Train, TrainConfig } from "../entities/Train";

// Use type-only imports for type annotations
import type { GameObject } from "../core/GameObject";

// Avoid default exports for better IDE support
export class TrainSystem { } // Good
export default TrainSystem;  // Avoid
```

## When to Create New Files

### Create a New File When:

1. **New Entity Type**: Any new game object that extends GameObject
   ```typescript
   // entities/PowerUp.ts
   export class PowerUp extends GameObject { }
   ```

2. **New Component**: Reusable behavior for multiple entity types
   ```typescript
   // components/ShieldComponent.ts
   export class ShieldComponent extends Component { }
   ```

3. **New System**: Independent game logic that processes entities
   ```typescript
   // systems/WeatherSystem.ts
   export class WeatherSystem { }
   ```

4. **File Size**: When a file exceeds ~300-400 lines, consider splitting

5. **Distinct Responsibility**: When code has clearly separate concerns

### Don't Create New Files For:

1. **Tightly Coupled Code**: Keep related interfaces and classes together
2. **Small Utility Functions**: Add to existing utility files
3. **Temporary Code**: Use comments and TODO markers instead
4. **Similar Functionality**: Extend existing classes or use composition

## File Migration Guidelines

### When Refactoring:

1. **Update All Imports**: Use IDE find/replace or refactoring tools
2. **Update Tests**: Ensure test files reflect new structure
3. **Update Documentation**: Keep README and docs in sync
4. **Check Build**: Verify compilation after moves
5. **Commit Separately**: Isolate file moves from logic changes

### Moving Files Checklist:

- [ ] Update import statements in all dependent files
- [ ] Move corresponding test files
- [ ] Update documentation references
- [ ] Check TypeScript compilation
- [ ] Verify runtime functionality
- [ ] Update build configuration if needed

## Best Practices Summary

1. **One Class Per File**: Keep files focused on a single responsibility
2. **Descriptive Names**: File names should clearly indicate contents
3. **Consistent Structure**: Follow the established directory organization
4. **Import Order**: Maintain consistent import organization
5. **Co-locate Related**: Keep tightly coupled code in the same file
6. **Test Mirroring**: Test file structure should mirror source structure
7. **Avoid Deep Nesting**: Keep directory hierarchies shallow and logical

## Examples of Good File Organization

### ✅ Good Examples

```typescript
// entities/Vehicle.ts - Base class
export abstract class Vehicle extends GameObject { }

// entities/Train.ts - Extends Vehicle
export class Train extends Vehicle { }

// components/EngineComponent.ts - Reusable component
export class EngineComponent extends Component { }

// systems/TransportSystem.ts - Manages all vehicles
export class TransportSystem { }
```

### ❌ Examples to Avoid

```typescript
// BAD: util.ts - Too generic
export class Util { }

// BAD: Mixing concerns in one file
export class TrainSystemAndRenderer { }

// BAD: Overly nested structure
// src/game/entities/vehicles/trains/passenger/express/Train.ts
```
