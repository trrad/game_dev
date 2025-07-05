# Migration Guide

## Overview

This guide provides step-by-step instructions for migrating the Train Trading Game from the current mixed architecture to the unified Scene Graph Event System. The migration can be done incrementally, allowing the game to remain functional throughout the process.

**Core Migration Focus**: Entity hierarchy, event unification, and scene graph systems remain the primary objectives. Advanced Babylon.js features are integrated as additional capabilities that build upon these foundations.

## Migration Phases

### Phase 1: Scene Graph Foundation (Current)
**Status**: ✅ In Progress  
**Goal**: Establish scene graph hierarchy for all entities

### Phase 2: Event System Unification
**Status**: 🔄 Starting  
**Goal**: Route all events through scene graph

### Phase 3: Component Refactoring
**Status**: 📋 Planned  
**Goal**: Implement dependency system and standardize components

### Phase 4: System Integration
**Status**: 📋 Planned  
**Goal**: Convert all systems to use scene graph queries and events

### Phase 5: Advanced Babylon.js Features
**Status**: 📋 Future  
**Goal**: Integrate Path3D, NavigationMesh, visual effects, and skeletal systems

## Current State Assessment

### What's Working
- `GameNodeObject` base class implemented
- `NodeComponent` with hierarchical transforms
- `RadiusComponent` for spatial queries
- Basic scene graph event system
- Train→Car→Voxel hierarchy partially implemented

### What Needs Migration
- `SceneManager` still uses direct mesh registration → **Auto-registration via scene graph**
- Events split between ComponentEvents, GameObject.emit, and scene graph → **Unified scene graph events**
- Train/Car/Voxel positions updated manually → **Automatic via hierarchy**
- Systems using direct entity references → **Scene graph queries**
- Component dependencies not validated → **Dependency validation system**

### New Babylon.js Integration Opportunities
- **Rails**: Manual spline calculations → **Path3D for deterministic movement**
- **Enemies**: Basic AI → **NavigationMesh pathfinding + skeletal animation**
- **Death effects**: Simple removal → **Ragdoll physics (visual only)**
- **Projectiles**: Basic collision → **Visual effects with physics/logic separation**
- **Atmosphere**: Basic rendering → **Lens effects and environmental enhancement**

## Phase 1: Scene Graph Foundation

### Step 1.1: Convert Entities to GameNodeObject

**Current Pattern**:
```typescript
export class Station extends GameObject {
    constructor(config: StationConfig) {
        super('station');
        // Manual position management
    }
}
```

**Migrated Pattern**:
```typescript
export class Station extends GameNodeObject {
    constructor(config: StationConfig, parentNode?: NodeComponent) {
        super('station', scene, parentNode);
        // Position now handled by node
        this.node.setLocalPosition(config.position.x, config.position.y, config.position.z);
    }
}
```

**Migration Checklist**:
- ☐ Train extends GameNodeObject
- ☐ TrainCar extends GameNodeObject  
- ☐ TrainCarVoxel extends GameNodeObject
- ☐ Station extends GameNodeObject
- ☐ Enemy extends GameNodeObject
- ☐ Projectile extends GameNodeObject
- ☐ UI elements extend GameNodeObject

### Step 1.2: Establish Hierarchies

**Current Pattern**:
```typescript
// Manual position updates
this.trainCars.forEach((car, index) => {
    const offset = index * carSpacing;
    car.setPosition(trainPos.x - offset, trainPos.y, trainPos.z);
});
```

**Migrated Pattern**:
```typescript
// Automatic via hierarchy
trainCar.node.setParent(train.node);
trainCar.node.setLocalPosition(-index * carSpacing, 0, 0);
// Car follows train automatically!
```

**Key Hierarchies to Establish**:
```
SceneRoot
├── World
│   ├── Regions
│   │   ├── Stations
│   │   │   └── Buildings
│   │   └── Rails (🆕 Path3D integration point)
│   ├── Entities
│   │   ├── Trains
│   │   │   └── TrainCars
│   │   │       └── Voxels
│   │   │           └── Attachments
│   │   └── Enemies (🆕 NavigationMesh integration point)
│   │       └── Mutations
│   └── Effects (🆕 Visual effects integration point)
│       └── Projectiles
├── Systems
│   ├── TrainSystem
│   ├── EnemySystem
│   └── EconomySystem
└── UI
    ├── HUD
    └── Menus
```

### Step 1.3: Update SceneManager

**Current Registration**:
```typescript
sceneManager.registerGameObject(train, trainMesh);
```

**Migrated Registration**:
```typescript
// SceneManager discovers renderables via components
sceneManager.registerHierarchy(train.node);
// Automatically finds all RenderComponents in hierarchy
```

**🆕 Babylon.js Integration Considerations**:
- **Path3D Preparation**: Rails will need spline data structure
- **Skeleton Support**: Entities may need skeleton attachment points
- **Physics Bodies**: Visual effects entities need physics impostor setup

## Phase 2: Event System Unification

### Step 2.1: Replace GameObject.emit
### Or at least modify it to call the node component emit. ie: GameNodeObject.emit(args) -> GameNodeObject.node.emit(args)
### Can do similar for event listeners -- the high level basic functions of NodeComponent can be re-exposed at the GameObject level just for brevity reasons.

**Current Pattern**:
```typescript
this.emit('journey_started', { railId, targetStationId });
```

**Migrated Pattern**:
```typescript
this.node.emit('journey:started', { railId, targetStationId });
```

### Step 2.2: Replace Event Listeners

**Current Pattern**:
```typescript
train.on('damage', (event) => { /* ... */ });
```

**Migrated Pattern**:
```typescript
train.node.addEventListener('damage:taken', (event) => { /* ... */ });
```

### Step 2.3: Connect EventStack to Scene Graph

**Current**:
```typescript
eventStack.info(EventCategory.TRAIN, 'journey_started', 'Train journey started');
```

**Migrated**:
```typescript
// EventStack listens at scene root
sceneRoot.addEventListener('*', (event) => {
    eventStack.handleSceneEvent(event);
}, { capture: true });

// Events automatically logged
// can also be called via train.emit directly, using an interface that pases calls to the node component for emit/listeners.
train.node.emit('journey:started', payload); // Auto-logged!
```

**🆕 Event Types for Babylon.js Integration**:
```typescript
// Path3D rail events
'rail:position:updated' → { progress: number, position: Vector3 }
'rail:junction:reached' → { junctionId: string, options: string[] }

// NavigationMesh AI events  
'ai:pathfinding:started' → { target: Vector3, priority: number }
'ai:pathfinding:completed' → { path: Vector3[], estimatedTime: number }

// Physics/visual events
'physics:visual:collision' → { visualEffectOnly: true, impact: Vector3 }
'physics:ragdoll:enabled' → { entity: NodeComponent, mass: number }

// Animation events
'skeleton:animation:started' → { animationName: string, duration: number }
'skeleton:bone:attached' → { boneName: string, attachedObject: NodeComponent }
```

## Phase 3: Component Refactoring

### Step 3.1: Implement Component Dependencies

**Add Base Class**:
```typescript
export abstract class DependentComponent<T> extends Component<T> {
    static dependencies: ComponentDependencies = {
        required: [],
        optional: [],
        provides: []
    };
    
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        this.validateDependencies();
    }
}
```

**Update Components**:
```typescript
export class VoxelRenderComponent extends DependentComponent<RenderConfig> {
    static dependencies = {
        required: ['node'],
        optional: ['health', 'radius'],
        provides: ['render']
    };
}
```

### Step 3.2: Remove PositionComponent Dependencies

**Current**:
```typescript
const pos = entity.getComponent<PositionComponent>('position');
pos.setPosition({ x: 10, y: 0, z: 5 });
```

**Migrated**:
```typescript
entity.node.setLocalPosition(10, 0, 5);
// Or for world position:
entity.node.setWorldPosition(10, 0, 5);
```

**🆕 New Babylon.js Components**:
```typescript
// Path3D component for rail-based movement
// I think I like having a PathPositionComponent and PathMovementComponent that extend the underying PositionComponent and MovementComponent and are used in wrapping the bablyonJS Node position interface.
export class RailPathComponent extends DependentComponent<RailConfig> {
    static dependencies = {
        required: ['node'],
        optional: ['physics'],
        provides: ['rail_movement']
    };
    
    private _path3D: BABYLON.Path3D;
    private _progress: number = 0;
    
    updatePosition(speed: number, deltaTime: number): void {
        this._progress += speed * deltaTime;
        const position = this._path3D.getPointAt(this._progress);
        this._gameObject?.node.setWorldPosition(position.x, position.y, position.z);
    }
}

// NavigationMesh component for AI pathfinding
export class NavigationComponent extends DependentComponent<NavConfig> {
    static dependencies = {
        required: ['node'],
        optional: ['ai'],
        provides: ['pathfinding']
    };
    
    private _navMesh: BABYLON.RecastJSPlugin;
    private _currentPath: Vector3[] = [];
    
    findPathTo(target: Vector3): Promise<Vector3[]> {
        return this._navMesh.computePath(
            this._gameObject?.node.getWorldPosition()!,
            target
        );
    }
}

// Visual physics component (effects only, no game state)
export class VisualPhysicsComponent extends DependentComponent<PhysicsConfig> {
    static dependencies = {
        required: ['node', 'render'],
        optional: ['skeleton'],
        provides: ['visual_physics']
    };
    
    enableRagdoll(): void {
        // Switch from kinematic to dynamic for visual death effects
        this._gameObject?.node.emit('physics:ragdoll:request', {
            visualOnly: true,
            preserveGameState: true
        });
    }
}
```

## Phase 4: System Integration

### Step 4.1: Convert System Queries

**Current**:
```typescript
export class TrainSystem {
    private trains: Map<string, Train> = new Map();
    
    update(deltaTime: number): void {
        for (const train of this.trains.values()) {
            this.updateTrain(train, deltaTime);
        }
    }
}
```

**Migrated**:
```typescript
export class TrainSystem extends GameNodeObject {
    constructor(parentNode: NodeComponent) {
        super('system:train', scene, parentNode);
    }
    
    update(deltaTime: number): void {
        // Query scene graph for trains
        const trains = this.node.findNodesByType('train');
        trains.forEach(trainNode => {
          // not doing position updates in this direct call anymore, but instead automatically based on the node position.
            this.updateTrain(trainNode.gameObject as Train, deltaTime);
        });
    }
}
```

### Step 4.2: Event-Based System Communication

**Current**:
```typescript
// Direct system references
this.enemySystem.spawnEnemy(position);
this.uiSystem.showDamage(amount);
```

**Migrated**:
```typescript
// Event-based
```typescript
// Event-based
this.emit('enemy:spawn:request', { position, type: 'basic' });
this.emit('ui:damage:display', { amount, worldPosition });
```

> **Note:** For improved ergonomics, consider defining a shared interface at the `GameNodeObject` level that mirrors basic `emit` and event-listening methods. This allows calls like `this.emit(...)` to delegate to the underlying node, keeping advanced node/event methods on `NodeComponent` as needed. This pattern is cleaner than always using `this.node.emit(...)`.
```

**🆕 Babylon.js System Integration**:
```typescript
export class AdvancedTrainSystem extends GameNodeObject {
    constructor(parentNode: NodeComponent) {
        super('system:advanced_train', scene, parentNode);
        this.setupBabylonIntegration();
    }
    
    private setupBabylonIntegration(): void {
        // Listen for Path3D rail events
        this.node.addEventListener('rail:junction:reached', (event) => {
            this.handleRailJunction(event.payload);
        });
        
        // Listen for visual physics events (don't affect game state)
        this.node.addEventListener('physics:visual:collision', (event) => {
            this.spawnVisualEffects(event.payload.impact, event.payload.position);
        });
        
        // Listen for ragdoll requests (visual only)
        this.node.addEventListener('physics:ragdoll:request', (event) => {
            if (event.payload.visualOnly) {
                this.enableVisualRagdoll(event.target);
            }
        });
    }
}
```

## Phase 5: Advanced Babylon.js Features

**Status**: 📋 Future Phase  
**Prerequisites**: Phases 1-4 completed successfully

### Path3D Rail Networks
- Convert manual spline calculations to Path3D
- Implement rail junctions and switches
- Add train scheduling and collision avoidance

### NavigationMesh AI Systems  
- Replace basic AI with NavigationMesh pathfinding
- Add crowd simulation for multiple enemies
- Implement dynamic obstacle avoidance

### Skeletal Animation & Ragdoll
- Add skeletal meshes for complex entities
- Implement animation state machines
- Enable ragdoll physics on death (visual only)

### Visual Effects Pipeline
- Lens effects for atmospheric enhancement
- Particle systems for explosions and impacts
- Motion blur and depth of field effects

### Hybrid Physics Architecture
- **Game Logic**: Health, movement, collision detection (deterministic)
- **Visual Effects**: Ragdolls, debris, particle physics (client-side only)
- **Projectiles**: Instant raycast for damage, visual trail for immersion

## Migration Utilities

### Debug Helpers
```typescript
// Add to window for console debugging
window.debugSceneGraph = () => {
    const printNode = (node: NodeComponent, depth: number = 0) => {
        const indent = '  '.repeat(depth);
        console.log(`${indent}${node.gameObject?.type || 'node'} [${node.instanceId}]`);
        node.getChildren().forEach(child => printNode(child, depth + 1));
    };
    printNode(sceneRoot);
};

window.debugBabylonFeatures = () => {
    console.log('🛤️ Path3D Rails:', sceneRoot.findNodesByComponent('rail_movement').length);
    console.log('🤖 NavigationMesh AI:', sceneRoot.findNodesByComponent('pathfinding').length);
    console.log('💀 Ragdoll Physics:', sceneRoot.findNodesByComponent('visual_physics').length);
    console.log('🎭 Skeletal Animations:', sceneRoot.findNodesByComponent('skeleton').length);
};
```

### Validation Scripts
```typescript
// Validate core migration completion
export function validateCoreMigration(): void {
    const entities = ObjectTracker.getAllEntities();
    const legacy = entities.filter(e => !(e instanceof GameNodeObject));
    
    if (legacy.length > 0) {
        console.warn('❌ Unmigrated entities:', legacy.map(e => e.type));
    } else {
        console.log('✅ All entities migrated to GameNodeObject');
    }
}

// Check Babylon.js feature readiness
export function validateBabylonReadiness(): void {
    const railEntities = sceneRoot.findNodesByType('train');
    const railReady = railEntities.every(train => train.gameObject?.hasComponent('rail_movement'));
    
    const aiEntities = sceneRoot.findNodesByType('enemy'); 
    const aiReady = aiEntities.every(enemy => enemy.gameObject?.hasComponent('pathfinding'));
    
    console.log('🛤️ Path3D Ready:', railReady ? '✅' : '❌');
    console.log('🤖 NavigationMesh Ready:', aiReady ? '✅' : '❌');
}
```

## Testing Migration

### Component Tests
```typescript
describe('Core Migration', () => {
    it('should work with scene graph', () => {
        const entity = new GameNodeObject('test');
        const component = new MigratedComponent();
        entity.addComponent(component);
        
        // Test uses node
        expect(entity.node).toBeDefined();
        expect(component.validateDependencies()).toBe(true);
    });
});

describe('Babylon.js Integration', () => {
    it('should support Path3D movement', () => {
        const train = new Train();
        const railPath = new RailPathComponent(testPath);
        train.addComponent(railPath);
        
        railPath.updatePosition(1.0, 0.016); // 60fps
        
        expect(train.node.getWorldPosition()).not.toEqual(Vector3.Zero());
    });
});
```

### Integration Tests
```typescript
describe('Scene Graph Integration', () => {
    it('should propagate events up the tree', (done) => {
        const train = new Train();
        const car = new TrainCar();
        const voxel = new TrainCarVoxel();
        
        // Build hierarchy
        car.node.setParent(train.node);
        voxel.node.setParent(car.node);
        
        // Listen at train level
        train.node.addEventListener('voxel:destroyed', (event) => {
            expect(event.target).toBe(voxel.node);
            expect(event.phase).toBe(EventPhase.BUBBLE);
            done();
        });
        
        // Emit from voxel
        voxel.node.emit('voxel:destroyed', { gridPos: [0, 0, 0] });
    });
});
```

## Rollback Plan

If critical issues arise during migration:

1. **Feature Flags**: Use flags to toggle between old/new systems
2. **Parallel Systems**: Run both systems temporarily  
3. **Incremental Rollout**: Migrate one entity type at a time
4. **Compatibility Layer**: Maintain adapters during transition

## Success Criteria

**Core Migration Complete When**:
- ✅ All entities extend GameNodeObject
- ✅ No direct GameObject.emit calls remain
- ✅ SceneManager uses hierarchy registration
- ✅ All systems query via scene graph
- ✅ Component dependencies are validated
- ✅ Event flow visualization shows complete tree
- ✅ All tests pass with new architecture

**Babylon.js Integration Ready When**:
- 🔄 Path3D components available for rail entities
- 🔄 NavigationMesh components available for AI entities
- 🔄 Visual physics separation implemented
- 🔄 Skeletal animation framework established
- 🔄 Visual effects pipeline integrated

**Performance Benchmarks**:
- 📊 Scene graph queries: <2ms for 1000 entities
- 📊 Event propagation: <1ms for deep hierarchies
- 📊 Path3D updates: 60fps with 100+ trains
- 📊 NavigationMesh queries: <10ms for complex paths
- 📊 Visual effects: Stable 60fps with full pipeline

The migration prioritizes solid foundations (entity hierarchy, events, components) before adding advanced features. This ensures the core architecture is robust and can support future Babylon.js enhancements without compromising stability or performance.