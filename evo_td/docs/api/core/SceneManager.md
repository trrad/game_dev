# SceneManager

The SceneManager is responsible for bridging the logical game entities (ECS system) with the visual representation (Babylon.js). It handles the rendering, field of view culling, and performance optimizations for the game.

## Core Responsibilities

- Managing visual representations of game entities
- Field of view and culling for performance optimization
- Camera management and positioning
- Scene setup and configuration
- Time-based update scheduling

## Class Structure

```typescript
export class SceneManager {
    // Public properties
    public scene: Scene;              // The Babylon.js Scene
    public camera: Camera;            // Main camera
    
    // Core methods
    constructor(engine: Engine, config?: Partial<SceneManagerConfig>);
    registerGameObject(gameObject: GameObject, mesh: AbstractMesh): void;
    unregisterGameObject(gameObjectId: string): void;
    update(deltaTime: number): void;
    start(): void;
    stop(): void;
    dispose(): void;
    
    // Configuration methods
    setDebugMode(enabled: boolean): void;
    setFieldOfViewDistance(distance: number): void;
    setMaxVisibleObjects(maxObjects: number): void;
    setCullingEnabled(enabled: boolean): void;
    setCameraTarget(position: Vector3): void;
    
    // Utility methods
    createDefaultVisual(gameObject: GameObject): AbstractMesh;
    getTimeManager(): TimeManager;
}
```

## Configuration Options

The SceneManager can be configured with the following options:

```typescript
export interface SceneManagerConfig {
    fieldOfViewDistance: number;    // Maximum visible distance for objects
    enableCulling: boolean;         // Whether to cull distant objects
    maxVisibleObjects: number;      // Maximum number of objects to render at once
    debugMode: boolean;             // Whether to show debug visuals
}
```

## Integration with ECS

The SceneManager connects to the ECS architecture through the following mechanisms:

1. **GameObject Registration**: Game objects register their visual representations with the SceneManager
2. **Position Synchronization**: The SceneManager updates mesh positions based on PositionComponent data
3. **Time Management**: The SceneManager uses the TimeManager for time-scaled updates

## Usage Example

```typescript
// Initialize engine and scene manager
const engine = new Engine(canvas);
const sceneManager = new SceneManager(engine, {
    fieldOfViewDistance: 100,
    enableCulling: true,
    maxVisibleObjects: 1000
});

// Create a game object
const train = new Train();
const positionComponent = new PositionComponent();
positionComponent.setPosition({ x: 0, y: 0, z: 0 });
train.addComponent(positionComponent);

// Create visual for the train
const trainMesh = MeshBuilder.CreateBox("trainMesh", { width: 1, height: 0.5, depth: 2 }, sceneManager.scene);
sceneManager.registerGameObject(train, trainMesh);

// Start the scene manager (starts time manager and updates)
sceneManager.start();

// Set the camera to follow the train
sceneManager.setCameraTarget(new Vector3(0, 0, 0));

// In the game loop
engine.runRenderLoop(() => {
    const deltaTime = engine.getDeltaTime() / 1000; // Convert to seconds
    sceneManager.update(deltaTime);
    sceneManager.scene.render();
});
```

## Performance Considerations

- Objects beyond the `fieldOfViewDistance` are automatically culled (not rendered)
- Only `maxVisibleObjects` nearest objects are rendered when there are too many
- Debug visuals help visualize the field of view when `debugMode` is enabled
- Fixed timestep updates maintain consistent physics/movement regardless of framerate

## Time Management

The SceneManager includes its own TimeManager instance to handle:

- Game speed scaling (1x, 4x, 8x, 16x)
- Player voting on game speed
- Fixed timestep updates for consistent simulation
