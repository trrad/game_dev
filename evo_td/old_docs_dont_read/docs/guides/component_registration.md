# Component Registration Patterns

## Overview

This guide covers best practices for adding new components to the ECS architecture, ensuring consistency, performance, and maintainability.

## Component Creation Workflow

### 1. Define Component Interface

Start by defining the component's data structure and default values:

```typescript
// components/NewComponent.ts
export interface NewComponentProperties {
    propertyA: number;
    propertyB: string;
    enabled: boolean;
}

const DEFAULT_PROPERTIES: NewComponentProperties = {
    propertyA: 0,
    propertyB: '',
    enabled: true
};
```

### 2. Implement Component Class

Follow the established component pattern:

```typescript
export class NewComponent extends Component {
    public readonly type = 'new_component'; // Unique identifier
    private _properties: NewComponentProperties;
    
    constructor(properties?: Partial<NewComponentProperties>) {
        super();
        this._properties = { ...DEFAULT_PROPERTIES, ...properties };
        
        // Log component creation for debugging
        Logger.log(LogCategory.SYSTEM, `${this.type} component created`);
    }
    
    // Update method for time-based behavior
    update(deltaTime: number): void {
        if (!this._properties.enabled) return;
        
        // Component-specific update logic
        // Example: this._properties.propertyA += deltaTime;
    }
    
    // Getters and setters for component properties
    getPropertyA(): number {
        return this._properties.propertyA;
    }
    
    setPropertyA(value: number): void {
        this._properties.propertyA = value;
    }
    
    // Serialization support (for networking/save games)
    serialize(): any {
        return { ...this._properties };
    }
    
    deserialize(data: any): void {
        this._properties = { ...DEFAULT_PROPERTIES, ...data };
    }
}
```

### 3. Register with Entities

Add the component to relevant game entities:

```typescript
// In entity constructor or factory method
export class MyEntity extends GameObject {
    constructor(config: MyEntityConfig) {
        super('my_entity');
        
        // Add core components first
        this.addComponent(new PositionComponent({ 
            x: config.position?.x || 0, 
            y: config.position?.y || 0, 
            z: config.position?.z || 0 
        }));
        
        // Add your new component
        this.addComponent(new NewComponent({
            propertyA: config.initialValue || 10,
            propertyB: config.label || 'default',
            enabled: true
        }));
        
        Logger.log(LogCategory.SYSTEM, `Entity created with NewComponent`, {
            entityId: this.id,
            componentType: 'new_component'
        });
    }
}
```

### 4. System Integration

Create or update systems to process the component:

```typescript
// systems/MySystem.ts
export class MySystem {
    private entities: Map<string, GameObject> = new Map();
    
    processEntitiesWithNewComponent(deltaTime: number): void {
        this.entities.forEach(entity => {
            const component = entity.getComponent<NewComponent>('new_component');
            if (component) {
                component.update(deltaTime);
                
                // System-specific processing
                this.processEntity(entity, component);
            }
        });
    }
    
    private processEntity(entity: GameObject, component: NewComponent): void {
        // Business logic that uses the component
        const currentValue = component.getPropertyA();
        
        // Example: interaction with other components
        const positionComponent = entity.getComponent<PositionComponent>('position');
        if (positionComponent && currentValue > 50) {
            // Move entity based on component state
            const currentPos = positionComponent.getPosition();
            positionComponent.setPosition({
                x: currentPos.x + 1,
                y: currentPos.y,
                z: currentPos.z
            });
        }
    }
}
```

## Standard Component Patterns

### Core Components (Required for most entities)

```typescript
// Standard entity setup
const entity = new GameObject('entity_type');

// Position - Required for anything that exists in 3D space
entity.addComponent(new PositionComponent({ x: 0, y: 0, z: 0 }));

// Movement - Required for anything that moves
entity.addComponent(new MovementComponent({ speed: 1.0 }));
```

### Behavioral Components (Optional, specific to entity type)

```typescript
// Health - For entities that can take damage
entity.addComponent(new HealthComponent({ 
    maxHealth: 100, 
    currentHealth: 100 
}));

// AI Behavior - For autonomous entities
entity.addComponent(new AIBehaviorComponent({ 
    behaviorType: AIBehaviorType.AGGRESSIVE,
    detectionRange: 15 
}));

// Inventory - For entities that carry items
entity.addComponent(new InventoryComponent({ capacity: 50 }));
```

## Component Dependencies

### Declare Dependencies

Document component dependencies clearly:

```typescript
export class MovementComponent extends Component {
    // REQUIRES: PositionComponent (for location updates)
    // OPTIONAL: PhysicsComponent (for collision detection)
    
    update(deltaTime: number): void {
        const entity = this.getOwner();
        const positionComponent = entity.getComponent<PositionComponent>('position');
        
        if (!positionComponent) {
            Logger.log(LogCategory.ERROR, 'MovementComponent requires PositionComponent');
            return;
        }
        
        // Movement logic...
    }
}
```

### Validation in Entity Constructors

```typescript
export class Train extends GameObject {
    constructor(config: TrainConfig) {
        super('train');
        
        // Add required components
        this.addComponent(new PositionComponent(config.position));
        this.addComponent(new MovementComponent({ speed: config.baseSpeed }));
        
        // Validate component dependencies
        this.validateComponents();
    }
    
    private validateComponents(): void {
        const requiredComponents = ['position', 'movement'];
        const missingComponents = requiredComponents.filter(type => 
            !this.hasComponent(type)
        );
        
        if (missingComponents.length > 0) {
            throw new Error(`Train missing required components: ${missingComponents.join(', ')}`);
        }
    }
}
```

## Performance Considerations

### Component Pooling

For frequently created/destroyed components:

```typescript
export class ComponentPool<T extends Component> {
    private pool: T[] = [];
    private createComponent: () => T;
    
    constructor(createFn: () => T, initialSize: number = 10) {
        this.createComponent = createFn;
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    acquire(): T {
        return this.pool.pop() || this.createComponent();
    }
    
    release(component: T): void {
        // Reset component to default state
        component.reset();
        this.pool.push(component);
    }
}

// Usage in system
const healthComponentPool = new ComponentPool(() => new HealthComponent(), 50);
```

### Batch Processing

Process similar components together:

```typescript
export class RenderSystem {
    updatePositions(entities: GameObject[]): void {
        // Batch process all position updates
        const positionUpdates: { entity: GameObject; component: PositionComponent }[] = [];
        
        entities.forEach(entity => {
            const positionComponent = entity.getComponent<PositionComponent>('position');
            if (positionComponent) {
                positionUpdates.push({ entity, component: positionComponent });
            }
        });
        
        // Batch update visuals
        this.batchUpdateVisuals(positionUpdates);
    }
}
```

## Testing Patterns

### Component Unit Tests

```typescript
// tests/components/NewComponent.test.ts
describe('NewComponent', () => {
    let component: NewComponent;
    
    beforeEach(() => {
        component = new NewComponent({
            propertyA: 10,
            propertyB: 'test'
        });
    });
    
    test('should initialize with provided properties', () => {
        expect(component.getPropertyA()).toBe(10);
        expect(component.type).toBe('new_component');
    });
    
    test('should update property values correctly', () => {
        component.setPropertyA(25);
        expect(component.getPropertyA()).toBe(25);
    });
    
    test('should serialize and deserialize correctly', () => {
        const serialized = component.serialize();
        const newComponent = new NewComponent();
        newComponent.deserialize(serialized);
        
        expect(newComponent.getPropertyA()).toBe(component.getPropertyA());
    });
});
```

### Integration Tests

```typescript
// tests/integration/ComponentIntegration.test.ts
describe('Component Integration', () => {
    test('should work together in entity', () => {
        const entity = new GameObject('test');
        entity.addComponent(new PositionComponent({ x: 0, y: 0, z: 0 }));
        entity.addComponent(new MovementComponent({ speed: 2.0 }));
        
        // Test component interaction
        const movement = entity.getComponent<MovementComponent>('movement');
        const position = entity.getComponent<PositionComponent>('position');
        
        expect(movement).toBeTruthy();
        expect(position).toBeTruthy();
        
        // Test movement updates position
        movement?.update(1.0); // 1 second
        const newPos = position?.getPosition();
        
        expect(newPos?.x).not.toBe(0); // Should have moved
    });
});
```

## Common Pitfalls

### ❌ Avoid These Patterns

```typescript
// DON'T: Direct component communication
class BadComponent extends Component {
    update(deltaTime: number): void {
        // DON'T access other components directly
        const otherEntity = gameWorld.findEntity('other');
        const otherComponent = otherEntity.getComponent<SomeComponent>('some');
    }
}

// DON'T: Heavy computation in component update
class ExpensiveComponent extends Component {
    update(deltaTime: number): void {
        // DON'T do expensive calculations every frame
        this.complexAIPathfinding();
        this.heavyPhysicsSimulation();
    }
}
```

### ✅ Use These Patterns Instead

```typescript
// DO: Use systems for entity communication
class GoodSystem {
    update(deltaTime: number): void {
        // Let systems coordinate between entities
        this.processInteractions(this.entities);
    }
}

// DO: Cache expensive calculations
class OptimizedComponent extends Component {
    private cachedResult: any;
    private lastCalculationTime: number = 0;
    
    update(deltaTime: number): void {
        // Only recalculate when needed
        if (this.needsRecalculation()) {
            this.cachedResult = this.expensiveCalculation();
            this.lastCalculationTime = performance.now();
        }
    }
}
```

## Summary Checklist

When adding a new component:

- [ ] Define clear property interface with defaults
- [ ] Implement standard component methods (update, serialize/deserialize)
- [ ] Document component dependencies
- [ ] Add to relevant entities in their constructors
- [ ] Create or update systems to process the component
- [ ] Write unit tests for the component
- [ ] Consider performance implications (pooling, caching)
- [ ] Add logging for debugging
- [ ] Update documentation
