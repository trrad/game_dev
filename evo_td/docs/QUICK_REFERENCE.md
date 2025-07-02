# Quick Reference Guide

This document provides quick access to common patterns, solutions, and code snippets for development in the ECS Train Trading Game.

## Table of Contents
- [Project Structure](#project-structure)
- [Common Patterns](#common-patterns)
- [Component Usage](#component-usage)
- [Entity Creation](#entity-creation)
- [System Communication](#system-communication)
- [Rendering](#rendering)
- [Utilities](#utilities)
- [Debugging](#debugging)

## Project Structure

### Key Directories
```
src/
├── components/          # ECS components (data containers)
├── entities/           # Entity factory classes and complex entities
├── systems/           # ECS systems (logic processors)
├── renderers/         # Rendering components and utilities
├── ui/               # User interface components
├── utils/            # Utility functions and helpers
├── core/             # Core ECS framework and managers
└── net/              # Networking and multiplayer code
```

### Entry Points
- `src/main.ts` - Legacy entry point (being phased out)
- `src/ecs-app.ts` - Main ECS application entry point
- `ecs-index.html` - HTML for ECS version

## Common Patterns

### Adding a New Component
```typescript
// 1. Create component file in src/components/
export interface NewComponentData {
    property: string;
    value: number;
}

export class NewComponent extends Component<NewComponentData> {
    constructor(data: NewComponentData) {
        super('new', data);
    }
}

// 2. Register in ecs-app.ts
ComponentRegistry.register('new', NewComponent);

// 3. Use in entities
entity.addComponent(new NewComponent({ property: 'value', value: 42 }));
```

### Creating a New System
```typescript
export class NewSystem {
    update(deltaTime: number): void {
        // Get entities with required components
        const entities = EntityManager.getEntitiesWithComponents(['position', 'new']);
        
        for (const entity of entities) {
            const pos = entity.getComponent<PositionComponent>('position')!;
            const newComp = entity.getComponent<NewComponent>('new')!;
            
            // System logic here
        }
    }
}
```

### Entity Factory Pattern
```typescript
export class NewEntityFactory {
    static create(x: number, y: number): GameObject {
        const entity = new GameObject();
        
        entity.addComponent(new PositionComponent({ x, y }));
        entity.addComponent(new NewComponent({ property: 'default', value: 0 }));
        
        return entity;
    }
}
```

## Component Usage

### Core Components
```typescript
// Position - for spatial entities
new PositionComponent({ x: 100, y: 200 })

// Health - for entities that can take damage
new HealthComponent({ current: 100, maximum: 100 })

// Movement - for entities that move
new MovementComponent({ 
    velocity: { x: 0, y: 0 }, 
    speed: 50,
    direction: { x: 1, y: 0 }
})

// AI Behavior - for AI-controlled entities
new AIBehaviorComponent({
    type: 'seek',
    target: null,
    state: 'idle'
})
```

### Train-Specific Components
```typescript
// Rail Position - for entities on rails
new RailPositionComponent({
    railId: 'rail_1',
    position: 0.5,
    direction: 1
})

// Train Car Position - for train cars
new TrainCarPositionComponent({
    trainId: 'train_1',
    carIndex: 0,
    offsetX: 0,
    offsetY: 0
})
```

## Entity Creation

### Basic Entity
```typescript
const entity = new GameObject();
entity.addComponent(new PositionComponent({ x: 0, y: 0 }));
EntityManager.addEntity(entity);
```

### Using Factories
```typescript
// Create a train
const train = TrainFactory.create();

// Create an enemy
const enemy = EnemyFactory.create(x, y);

// Create a station
const station = StationFactory.create(x, y);
```

### Train with Cars
```typescript
const train = new Train();
const car1 = new TrainCar('cargo');
const car2 = new TrainCar('passenger');

train.addCar(car1);
train.addCar(car2);
```

## System Communication

### Event System
```typescript
// Subscribe to events
EventStack.getInstance().subscribe('enemy_spawned', (data) => {
    console.log('Enemy spawned:', data);
});

// Emit events
EventStack.getInstance().emit('enemy_spawned', { 
    enemyId: enemy.id, 
    position: { x: 100, y: 200 } 
});
```

### Direct System Access
```typescript
// Get system instances from managers
const enemySystem = SystemManager.getSystem('EnemySystem');
const trainSystem = SystemManager.getSystem('TrainSystem');
```

## Rendering

### Voxel Rendering
```typescript
// Add voxel rendering to an entity
entity.addComponent(new VoxelRenderComponent({
    voxels: [
        { x: 0, y: 0, color: '#ff0000' },
        { x: 1, y: 0, color: '#00ff00' }
    ],
    scale: 10
}));
```

### Car Rendering
```typescript
// Add car rendering to a train car
car.addComponent(new CarRenderComponent({
    type: 'cargo',
    color: '#8B4513',
    width: 30,
    height: 15
}));
```

### Attachment Rendering
```typescript
// Add attachment rendering
attachment.addComponent(new AttachmentRenderComponent({
    type: 'weapon',
    subtype: 'cannon',
    color: '#444444'
}));
```

## Utilities

### Math Operations
```typescript
import { MathUtils } from '../utils/MathUtils';

// Distance between points
const distance = MathUtils.distance(point1, point2);

// Direction vector
const direction = MathUtils.direction(from, to);

// Normalize vector
const normalized = MathUtils.normalize(vector);

// Vector operations
const sum = MathUtils.addVectors(vec1, vec2);
const scaled = MathUtils.scaleVector(vector, 2.0);
```

### Geometry Operations
```typescript
import { GeometryUtils } from '../utils/GeometryUtils';

// Create bounding box
const bounds = GeometryUtils.createBounds(x, y, width, height);

// Check overlap
const overlaps = GeometryUtils.boundsOverlap(bounds1, bounds2);

// Check point in bounds
const contains = GeometryUtils.pointInBounds(point, bounds);
```

### Logging
```typescript
import { Logger } from '../utils/Logger';

Logger.info('System initialized');
Logger.warn('Performance issue detected');
Logger.error('Failed to load asset');
Logger.debug('Debug information', { data: value });
```

## Debugging

### Object Tracking
```typescript
import { ObjectTracker } from '../utils/ObjectTracker';

// Track object creation/destruction
ObjectTracker.track(entity, 'Entity');

// Get statistics
const stats = ObjectTracker.getStats();
console.log('Active entities:', stats.Entity);
```

### Component Inspection
```typescript
// List all components on an entity
const components = entity.getComponents();
console.log('Components:', Object.keys(components));

// Check for specific component
if (entity.hasComponent('position')) {
    const pos = entity.getComponent<PositionComponent>('position');
    console.log('Position:', pos.data);
}
```

### System Debugging
```typescript
// Enable debug mode in systems
class MySystem {
    private debug = true;
    
    update(deltaTime: number): void {
        if (this.debug) {
            Logger.debug('MySystem update', { deltaTime });
        }
        // ... system logic
    }
}
```

## Common Pitfalls

### ❌ Don't Do This
```typescript
// Don't access components directly
entity.components['position'].data.x = 100;

// Don't create entities without proper initialization
const entity = new GameObject();
// Missing: entity.addComponent(...);
// Missing: EntityManager.addEntity(entity);

// Don't hardcode component names
if (entity.hasComponent('pos')) { ... } // Should be 'position'
```

### ✅ Do This Instead
```typescript
// Use proper component access
const pos = entity.getComponent<PositionComponent>('position');
if (pos) {
    pos.data.x = 100;
}

// Properly initialize entities
const entity = new GameObject();
entity.addComponent(new PositionComponent({ x: 0, y: 0 }));
EntityManager.addEntity(entity);

// Use consistent component names
if (entity.hasComponent('position')) { ... }
```

## Performance Tips

1. **Batch Operations**: Process similar entities together in systems
2. **Component Reuse**: Reuse component instances when possible
3. **Selective Updates**: Only update systems that need to run each frame
4. **Efficient Queries**: Cache entity queries when the result set is stable
5. **Avoid Deep Copying**: Use references and minimize object creation in hot paths

## Testing

### Component Testing
```typescript
describe('NewComponent', () => {
    it('should initialize with correct data', () => {
        const component = new NewComponent({ property: 'test', value: 42 });
        expect(component.data.property).toBe('test');
        expect(component.data.value).toBe(42);
    });
});
```

### System Testing
```typescript
describe('NewSystem', () => {
    beforeEach(() => {
        EntityManager.clear();
    });
    
    it('should process entities correctly', () => {
        const entity = new GameObject();
        entity.addComponent(new PositionComponent({ x: 0, y: 0 }));
        EntityManager.addEntity(entity);
        
        const system = new NewSystem();
        system.update(16.67); // ~60fps
        
        // Assert expected behavior
    });
});
```
