# System Communication Guide

This guide outlines how systems communicate in our ECS architecture, with a focus on the new Scene Graph integration and the separation between engine and game systems.

## System Categories

### Engine Systems
Engine systems are generic, reusable systems that could be used in any game:

- **RenderSystem**: Handles rendering of all visual elements
- **PhysicsSystem**: Manages physics simulation
- **InputSystem**: Processes user input
- **AudioSystem**: Manages sound playback

Location: `src/engine/systems/` directory

### Game Systems
Game systems are specific to our train trading game:

- **TrainSystem**: Manages train behavior and movement
- **EnemySystem**: Controls enemy behavior and AI
- **EconomySystem**: Handles trading and resources

Location: `src/game/systems/` directory

## Directory Structure

Systems are organized by their scope and purpose:

```
src/
├── engine/
│   └── systems/             # Engine-level systems (reusable)
│       ├── RenderSystem.ts  # Generic rendering system
│       ├── PhysicsSystem.ts # Physics simulation
│       └── InputSystem.ts   # Input processing
│
└── game/
    └── systems/             # Game-specific systems
        ├── TrainSystem.ts   # Train behavior and movement
        ├── EnemySystem.ts   # Enemy AI and behavior
        └── EconomySystem.ts # Trading and resources
```

## Communication Patterns

### Direct Component Access

Systems access components directly through entities:

```typescript
// In TrainSystem.update()
const trains = ObjectTracker.getByType('train');
trains.forEach(train => {
    const transform = train.getComponent<TransformComponent>('transform');
    if (transform) {
        // Use transform data
    }
});
```

### Event-Based Communication

For looser coupling, systems can communicate through the EventStack:

```typescript
// In damage system
eventStack.info(EventCategory.COMBAT, 'entity_damaged', 'Entity took damage', {
    entityId: entity.id,
    amount: damageAmount,
    source: damageSource
});

// In UI system
eventStack.subscribe(EventCategory.COMBAT, 'entity_damaged', (data) => {
    // Update UI based on damage event
    updateCombatLog(data);
});
```

### Parent-Child Scene Node Communication

With the new SceneNodeComponent, parent-child relationships communicate automatically:

```typescript
// Set up parent-child relationship
parentNode.addChild(childNode);

// Moving parent automatically affects child
parentNode.setLocalPosition(10, 0, 0);
// Child's world position is updated automatically
const childWorldPos = childNode.getWorldPosition();
```

## System Lifecycle

### Initialization

```typescript
class TrainSystem {
    constructor() {
        // System initialization
    }
    
    initialize(sceneManager: SceneManager, eventStack: EventStack) {
        // Connect to other systems
        this.sceneManager = sceneManager;
        this.eventStack = eventStack;
        
        // Register for events
        this.eventStack.subscribe(EventCategory.GAME, 'game_started', this.onGameStarted);
    }
}
```

### Update Cycle

```typescript
class TrainSystem {
    update(deltaTime: number) {
        // Process all train entities
        const trains = ObjectTracker.getByType('train');
        trains.forEach(train => this.updateTrain(train, deltaTime));
        
        // Perform scene graph updates
        this.updateTransformHierarchies();
    }
    
    // New method for scene graph updates
    private updateTransformHierarchies() {
        // Process transforms in hierarchical order (parents before children)
        const rootEntities = this.getRootEntities();
        rootEntities.forEach(entity => this.updateEntityHierarchy(entity));
    }
}
```

## Scene Graph Communication

### Transform Hierarchy Updates

With the new architecture, transform updates flow from parent to child:

```typescript
private updateEntityHierarchy(entity: GameObject) {
    // Update this entity's transform
    const transform = entity.getComponent<TransformComponent>('transform');
    if (transform) {
        // Apply game logic to transform
        
        // Children are automatically updated by Babylon.js scene graph
        // No manual calculation needed!
    }
    
    // Recursively update children if needed
    // (only for custom logic beyond transformations)
    const children = this.getChildEntities(entity);
    children.forEach(child => this.updateEntityHierarchy(child));
}
```

### Rendering System Integration

The SceneManager now works with the transform hierarchy:

```typescript
class SceneManager {
    // New method for scene graph processing
    processSceneGraph() {
        // Root objects are processed first
        const rootEntities = this.getRootEntities();
        
        // Process visibility and culling hierarchically
        rootEntities.forEach(entity => this.processEntityCulling(entity));
        
        // Process LOD based on camera distance
        this.processLevelOfDetail();
    }
}
```

## Engine-Game System Communication

The engine systems provide services to game systems, while game systems implement game-specific logic. Their communication should follow these patterns:

### Service-Based Communication

Engine systems provide services that game systems consume:

```typescript
// In RenderSystem (engine)
class RenderSystem {
    registerForRendering(entity: GameObject): void {
        // Add entity to render queue
    }
    
    unregisterFromRendering(entity: GameObject): void {
        // Remove entity from render queue
    }
}

// In TrainSystem (game)
class TrainSystem {
    constructor(private renderSystem: RenderSystem) {}
    
    createTrain(): void {
        const train = new Train();
        // Configure train
        this.renderSystem.registerForRendering(train);
    }
}
```

### Event-Based Communication

For looser coupling between engine and game systems:

```typescript
// In engine system
eventStack.emit(EngineEventCategory.RENDERING, 'resource_loaded', {
    resourceId: 'mesh_train',
    status: 'success'
});

// In game system
eventStack.subscribe(EngineEventCategory.RENDERING, 'resource_loaded', (data) => {
    if (data.resourceId === 'mesh_train' && data.status === 'success') {
        this.onTrainMeshLoaded();
    }
});
```

### Scene Graph Communication

The SceneNodeComponent provides a bridge between engine and game systems:

```typescript
// In game system
const trainNode = train.getComponent<SceneNodeComponent>('sceneNode');
trainNode.setLocalPosition(10, 0, 5);

// Engine systems automatically use the updated scene node
// for rendering, physics, etc.
```

### Best Practices for Engine-Game Separation

1. **Interface-Based**: Engine systems should expose clear interfaces for game systems
2. **Dependency Injection**: Pass engine systems to game systems rather than hardcoding references
3. **Event-Driven**: Use events for loose coupling between engine and game systems
4. **Minimal Dependencies**: Game code can depend on engine code, but engine code should never depend on game code
5. **Configuration Over Code**: Engine systems should be configurable without requiring code changes
