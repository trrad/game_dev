# EVO TD - Quick Reference Guide

## Common Development Tasks

### Setting Up a New Game Entity

```typescript
// 1. Define the configuration interface
export interface EntityConfig {
    id: string;
    name: string;
    // Other properties...
}

// 2. Create the class extending GameObject
export class NewEntity extends GameObject {
    private _config: EntityConfig;
    
    constructor(config: EntityConfig) {
        super('entityType');
        this._config = config;
        
        // Add components
        this.addComponent(new PositionComponent());
        
        // Initialize
        Logger.log(LogCategory.SYSTEM, `Entity created: ${config.name}`);
    }
    
    // Implement required methods
    update(deltaTime: number): void {
        super.update(deltaTime);
        // Entity-specific update logic
    }
}
```

### Creating a New Component

```typescript
// 1. Define component properties interface (if needed)
export interface ComponentProperties {
    // Properties...
}

// 2. Create the component class
export class NewComponent extends Component {
    public readonly type = 'componentType';
    private _properties: ComponentProperties;
    
    constructor(properties?: Partial<ComponentProperties>) {
        super();
        this._properties = { ...DEFAULT_PROPERTIES, ...properties };
    }
    
    // Implement update method if needed
    update(deltaTime: number): void {
        // Update logic
    }
    
    // Getter/setter methods
}
```

### Adding a New Renderer

```typescript
// 1. Define visual configuration interface
export interface VisualConfig {
    // Visual properties...
}

// 2. Create the renderer class
export class NewRenderer {
    private scene: Scene;
    private visualConfig: VisualConfig;
    
    constructor(scene: Scene, config?: Partial<VisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_CONFIG, ...config };
        
        Logger.log(LogCategory.RENDERING, "Renderer initialized");
    }
    
    createVisual(entity: Entity | EntityConfig): Mesh {
        // Create mesh with Babylon.js
        const mesh = MeshBuilder.Create...(/* params */);
        
        // Set up materials, position, etc.
        
        return mesh;
    }
}
```

### Implementing a System

```typescript
export class NewSystem {
    private entities: Map<string, Entity> = new Map();
    
    constructor() {
        // Initialize
    }
    
    registerEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
    }
    
    unregisterEntity(entityId: string): void {
        this.entities.delete(entityId);
    }
    
    update(deltaTime: number): void {
        // Process all entities
        for (const entity of this.entities.values()) {
            // System-specific processing
        }
    }
}
```

### Creating UI Elements

```typescript
// In UIFactory.ts
createNewUIElement(
    id: string,
    options: UIElementOptions
): UIElement {
    const element = document.createElement('div');
    element.id = id;
    
    // Set up styles, content, etc.
    
    // Add event handlers
    element.addEventListener('click', () => {
        // Handle events
    });
    
    // Register with UI system
    this.uiSystem.registerElement(id, element);
    
    return element;
}
```

## Common Gotchas and Solutions

### GameObject ID vs. Config ID
- GameObject has auto-generated ID: `${type}_${nextGameObjectId++}`
- Config objects have explicit IDs: e.g., `station_a`
- Use `gameObject.id` when registering with SceneManager

### Position Handling
- PositionComponent uses Position3D interface
- BabylonJS uses Vector3
- Convert between them when necessary:
  ```typescript
  // Position3D to Vector3
  new Vector3(position.x, position.y, position.z)
  
  // Vector3 to Position3D
  { x: vector3.x, y: vector3.y, z: vector3.z }
  ```

### Update Method Chain
- GameObject.update calls Component.update
- SceneManager.update calls GameObject.update
- Ensure update methods call their super.update()

### Rendering Visibility Issues
- Set mesh.isVisible = true explicitly
- Use alwaysSelectAsActiveMesh for important objects
- Check Y-position (height) if objects disappear

### Type Safety
- Define interfaces before implementation
- Use type guards for conditional logic: `if ('property' in object)`
- Add explicit type annotations when needed

## Common Shell Commands

```bash
# Run ECS application
npm run start:ecs

# Run unit tests
npm test

# Run specific tests
npm test -- -t "Rail"

# Build for production
npm run build
```

---

Use this quick reference to speed up development and avoid common issues.
