# Train Trading Game: System Architecture

## Architecture Overview

The Train Trading Game uses a **Hierarchical Scene Graph** with **Unified Event-Driven Architecture** built on an **Entity-Component-System (ECS)** foundation. All game entities extend `GameNodeObject` and participate in the scene graph for both spatial hierarchy and event communication, with deep integration of Babylon.js advanced features.

### Core Principles

1. **Universal Scene Graph**: Everything extends GameNodeObject to participate in events
2. **Events Drive Everything**: State changes propagate through scene graph events
3. **Spatial Awareness**: Events and queries leverage 3D spatial relationships
4. **Component Composition**: Entities are built from reusable, dependency-aware components
5. **Server Authoritative**: Game logic designed for server-side execution
6. **Hybrid Physics**: Visual effects use physics, game logic remains deterministic
7. **Babylon.js Native**: Advanced features like Path3D, NavigationMesh, and skeletal animation are first-class citizens

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│              Scene Graph Event System                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                  Scene Root Node                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│ │ │   Station   │ │    Train    │ │      Enemies        │ │ │
│ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────────────┐ │ │ │
│ │ │ │Buildings│ │ │ │  Cars   │ │ │ │ NavigationMesh  │ │ │ │
│ │ │ └─────────┘ │ │ │┌───────┐│ │ │ │ ┌─────────────┐ │ │ │ │
│ │ └─────────────┘ │ ││ Voxel ││ │ │ │ │ Skeletal    │ │ │ │ │
│ │ ┌─────────────┐ │ │└───────┘│ │ │ │ │ Animation   │ │ │ │ │
│ │ │ Path3D Rails│ │ │ Path3D  │ │ │ │ └─────────────┘ │ │ │ │
│ │ └─────────────┘ │ └─────────┘ │ │ └─────────────────┘ │ │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Entity Layer                             │
│ ┌──────────────┐           ┌──────────────────────────┐   │
│ │  GameObject  │──────────▶│    GameNodeObject        │   │
│ │ (base class) │           │ (all game entities)      │   │
│ └──────────────┘           └──────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  ECS Component Layer                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│ │   Node   │ │  Health  │ │  Radius  │ │    Render    │  │
│ │Component │ │Component │ │Component │ │  Component   │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│ │ RailPath │ │Navigation│ │  Visual  │ │   Skeletal   │  │
│ │Component │ │Component │ │ Physics  │ │  Component   │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   System Managers                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│ │  Train   │ │  Enemy   │ │ Station  │ │      UI       │ │
│ │  System  │ │  System  │ │ Manager  │ │    System     │ │
│ └──────────┘ └──────────┘ └──────────┘ └───────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│ │ Physics  │ │ Visual   │ │Animation │ │   Navigation  │ │
│ │ System   │ │ Effects  │ │ System   │ │    System     │ │
│ └──────────┘ └──────────┘ └──────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Entity Architecture

### GameObject Foundation

Base class providing core functionality for all entities:

```typescript
class GameObject {
    readonly id: string;
    readonly type: string;
    private _components: Map<string, Component>;
    
    addComponent(component: Component): void;
    getComponent<T>(type: string): T | undefined;
    serialize(): GameObjectData;
    deserialize(data: GameObjectData): void;
    
    // Event delegation to node (for ergonomics)
    emit(eventType: string, payload?: any): boolean;
    addEventListener(eventType: string, listener: Function): void;
}
```

### GameNodeObject - Universal Entity

All entities extend GameNodeObject for scene graph participation:

```typescript
class GameNodeObject extends GameObject {
    readonly node: NodeComponent;
    
    constructor(type: string, scene: Scene, parentNode?: NodeComponent) {
        super(type, scene);
        this.node = new NodeComponent(scene, parentNode || null);
        this.addComponent(this.node);
    }
    
    // Delegate event methods to node component
    emit(eventType: string, payload?: any): boolean {
        return this.node.emit(eventType, payload);
    }
    
    addEventListener(eventType: string, listener: Function): void {
        this.node.addEventListener(eventType, listener);
    }
}
```

### Entity Hierarchies

Game entities form these hierarchies with automatic transform inheritance:

- **Train** → TrainCar → TrainCarVoxel → Attachment
- **Station** → Building
- **Enemy** → Mutation
- **UI** → Panel → Button → Text
- **World** → Region → Station/Rail
- **SystemRoot** → GameSystem → Subsystem

### Special Node Types

Some nodes serve organizational purposes:

```typescript
// UI nodes use hierarchy for event flow, position maps to screen space
class UINode extends GameNodeObject {
    constructor(type: string, parentNode?: NodeComponent) {
        super(`ui:${type}`, scene, parentNode);
    }
}

// System nodes exist for event organization
class SystemNode extends GameNodeObject {
    constructor(systemName: string) {
        super(`system:${systemName}`, scene, sceneRoot);
    }
}
```

## Unified Event System

### Event Flow Architecture

All events flow through the scene graph with DOM-like propagation:

```typescript
// Scene Root captures ALL events for logging
class SceneRoot extends NodeComponent {
    constructor(scene: Scene, eventStack: EventStack) {
        super(scene);
        
        this.addEventListener('*', (event) => {
            eventStack.handleSceneEvent(event);
            uiSystem.handleSceneEvent(event);
        }, { capture: true });
    }
}
```

### Event Propagation Phases

1. **Capture Phase**: Root → Target (top-down)
2. **Target Phase**: At the target node
3. **Bubble Phase**: Target → Root (bottom-up)

### Event Types

**State Change Events**
```typescript
'health:changed' → { oldHealth: 100, newHealth: 75, damage: 25 }
'position:updated' → { oldPos: Vector3, newPos: Vector3 }
'radius:collision' → { other: NodeComponent, overlap: number }
```

**Game Events**
```typescript
'journey:started' → { trainId, railId, targetStationId }
'station:reached' → { trainId, stationId, cargoSummary }
'enemy:spawned' → { enemyType, position, threatLevel }
```

**Spatial Events**
```typescript
'explosion:damage' → emitToRadius(50) → affects all in range
'aura:healing' → emitToRadius(20) → heals nearby allies
'detection:pulse' → emitToRadius(100) → reveals hidden units
```

**Babylon.js Integration Events**
```typescript
'rail:position:updated' → { progress: number, position: Vector3 }
'rail:junction:reached' → { junctionId: string, options: string[] }
'ai:pathfinding:completed' → { path: Vector3[], estimatedTime: number }
'physics:ragdoll:enabled' → { entity: NodeComponent, mass: number }
'skeleton:animation:started' → { animationName: string, duration: number }
'skeleton:bone:attached' → { boneName: string, attachedObject: NodeComponent }
```

### Event Naming Conventions

- `<domain>:<action>`
- `<domain>:<object>:<action>`
- `<component>:<property>:<state>`

Examples:
- `train:journey:completed`
- `health:damage:taken`
- `voxel:attachment:mounted`
- `station:trade:initiated`

## Component Architecture

### Component Dependencies

Components declare and validate their dependencies:

```typescript
abstract class DependentComponent<T> extends Component<T> {
    static dependencies: ComponentDependencies = {
        required: [],   // Must exist before this component
        optional: [],   // Enhanced functionality if present
        provides: []    // What this component offers
    };
    
    protected validateDependencies(): boolean {
        const deps = (this.constructor as any).dependencies;
        for (const reqDep of deps.required) {
            if (!this._gameObject?.hasComponent(reqDep)) {
                console.error(`${this.type} requires ${reqDep} component`);
                return false;
            }
        }
        return true;
    }
}
```

### Core Engine Components

**NodeComponent**
- Manages scene graph hierarchy using Babylon.js TransformNode
- Handles local/world transforms with automatic inheritance
- Provides spatial event propagation (emitToRadius, hierarchical events)
- Serializes parent-child relationships
- Integrates with Babylon.js bone systems for skeletal attachment

**RadiusComponent**
- Generic spatial queries (collision, detection, interaction)
- Integrates with event system for radius-based events
- Supports multiple radius types on same entity
- Works with NavigationMesh for AI obstacle detection

**HealthComponent**
- Damage/healing with resistance types
- Automatic death state management
- Emits standardized health events
- Triggers ragdoll physics on death (visual only)

**RenderComponent**
- Base class for all visual representations
- Integrates with scene graph for positioning
- Handles LoD and culling
- Supports skeletal mesh attachment

### Babylon.js Integration Components

**RailPathComponent**
```typescript
export class RailPathComponent extends DependentComponent<RailConfig> {
    static dependencies = {
        required: ['node'],
        optional: ['physics'],
        provides: ['rail_movement']
    };
    
    private _path3D: BABYLON.Path3D;
    private _progress: number = 0;
    private _speed: number = 1.0;
    
    constructor(waypoints: Vector3[]) {
        super();
        this._path3D = new BABYLON.Path3D(waypoints);
    }
    
    updatePosition(deltaTime: number): void {
        this._progress += this._speed * deltaTime;
        if (this._progress > 1.0) this._progress = 0; // Loop
        
        const position = this._path3D.getPointAt(this._progress);
        const tangent = this._path3D.getTangentAt(this._progress);
        
        this._gameObject?.node.setWorldPosition(position.x, position.y, position.z);
        this._gameObject?.node.lookAt(position.add(tangent));
        
        this._gameObject?.node.emit('rail:position:updated', {
            progress: this._progress,
            position,
            tangent
        });
    }
}
```

**NavigationComponent**
```typescript
export class NavigationComponent extends DependentComponent<NavConfig> {
    static dependencies = {
        required: ['node'],
        optional: ['ai', 'movement'],
        provides: ['pathfinding']
    };
    
    private _navMesh: BABYLON.RecastJSPlugin;
    private _currentPath: Vector3[] = [];
    private _agent: BABYLON.ICrowd;
    
    async findPathTo(target: Vector3): Promise<Vector3[]> {
        const start = this._gameObject?.node.getWorldPosition()!;
        const path = await this._navMesh.computePath(start, target);
        
        this._currentPath = path;
        this._gameObject?.node.emit('ai:pathfinding:completed', {
            path,
            estimatedTime: this.calculateTravelTime(path)
        });
        
        return path;
    }
    
    private calculateTravelTime(path: Vector3[]): number {
        let totalDistance = 0;
        for (let i = 1; i < path.length; i++) {
            totalDistance += Vector3.Distance(path[i-1], path[i]);
        }
        return totalDistance / this._speed;
    }
}
```

**VisualPhysicsComponent**
```typescript
export class VisualPhysicsComponent extends DependentComponent<PhysicsConfig> {
    static dependencies = {
        required: ['node', 'render'],
        optional: ['skeleton', 'health'],
        provides: ['visual_physics']
    };
    
    private _physicsImpostor?: BABYLON.PhysicsImpostor;
    private _isKinematic: boolean = true;
    
    enablePhysicsEffects(): void {
        // Kinematic body for visual effects only
        this._physicsImpostor = new BABYLON.PhysicsImpostor(
            this._gameObject?.node.getTransformNode(),
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0 }, // Kinematic
            this._gameObject?.node._scene
        );
        
        this._physicsImpostor.registerOnPhysicsCollide([], (collider, collidedWith) => {
            this._gameObject?.node.emit('physics:visual:collision', {
                visualEffectOnly: true,
                impact: this._physicsImpostor!.getLinearVelocity()
            });
        });
    }
    
    enableRagdoll(mass: number = 1.0): void {
        if (this._physicsImpostor) {
            this._physicsImpostor.setParam('mass', mass);
            this._isKinematic = false;
            
            this._gameObject?.node.emit('physics:ragdoll:enabled', {
                mass,
                visualOnly: true
            });
        }
    }
}
```

**SkeletalComponent**
```typescript
export class SkeletalComponent extends DependentComponent<SkeletalConfig> {
    static dependencies = {
        required: ['node', 'render'],
        optional: ['animation'],
        provides: ['skeletal']
    };
    
    private _skeleton?: BABYLON.Skeleton;
    private _animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
    
    loadSkeletalMesh(meshUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMeshAsync("", meshUrl, "", this._scene)
                .then(result => {
                    this._skeleton = result.skeletons[0];
                    
                    result.animationGroups.forEach(group => {
                        this._animationGroups.set(group.name, group);
                    });
                    
                    this._gameObject?.node.emit('skeleton:loaded', {
                        boneCount: this._skeleton.bones.length,
                        animations: Array.from(this._animationGroups.keys())
                    });
                    
                    resolve();
                })
                .catch(reject);
        });
    }
    
    playAnimation(name: string, loop: boolean = true): void {
        const animation = this._animationGroups.get(name);
        if (animation) {
            this._animationGroups.forEach(group => group.stop()); // Stop others
            animation.play(loop);
            
            this._gameObject?.node.emit('skeleton:animation:started', {
                animationName: name,
                duration: animation.to - animation.from,
                loop
            });
        }
    }
    
    attachToBone(boneName: string, childNode: NodeComponent): void {
        const bone = this._skeleton?.getBoneByName(boneName);
        if (bone) {
            childNode.getTransformNode().attachToBone(bone, this._gameObject?.node.getTransformNode());
            
            this._gameObject?.node.emit('skeleton:bone:attached', {
                boneName,
                attachedObject: childNode
            });
        }
    }
}
```

### Game-Specific Components

**AttachmentSlotComponent**
- Weapon/equipment mounting system
- Grid-based positioning on voxels
- Integrates with skeletal bone attachment for complex entities

**CargoComponent**
- Trade goods storage and capacity
- Weight calculations affecting train movement via Path3D speed

**TrainCarVoxelComponent**
- Individual voxel management within cars
- Each voxel can have skeletal attachment points
- Supports ragdoll physics on destruction

## System Architecture

### System Patterns

Systems extend GameNodeObject and use events:

```typescript
class TrainSystem extends GameNodeObject {
    constructor(parentNode: NodeComponent) {
        super('system:train', scene, parentNode);
        
        // Listen to train events
        this.node.addEventListener('journey:requested', (e) => this.handleJourneyRequest(e));
        this.node.addEventListener('rail:reached:end', (e) => this.handleJourneyComplete(e));
        this.node.addEventListener('rail:position:updated', (e) => this.updateTrainPhysics(e));
    }
    
    update(deltaTime: number): void {
        // Query all trains via scene graph
        const trains = this.node.findNodesByType('train');
        trains.forEach(trainNode => {
            this.updateTrain(trainNode.gameObject as Train, deltaTime);
        });
    }
    
    private updateTrain(train: Train, deltaTime: number): void {
        // Path3D component handles movement automatically
        const railPath = train.getComponent<RailPathComponent>('rail_path');
        railPath?.updatePosition(deltaTime);
        
        // No manual position updates needed - hierarchy handles it!
    }
}
```

### Advanced System Integration

**PhysicsSystem**
```typescript
class PhysicsSystem extends GameNodeObject {
    private _physicsEngine: BABYLON.PhysicsEngine;
    
    constructor(parentNode: NodeComponent) {
        super('system:physics', scene, parentNode);
        
        this._physicsEngine = new BABYLON.CannonJSPlugin();
        scene.enablePhysics(new Vector3(0, -9.81, 0), this._physicsEngine);
        
        // Listen for ragdoll requests
        this.node.addEventListener('physics:ragdoll:enabled', (event) => {
            this.handleRagdollTransition(event.target, event.payload);
        });
    }
    
    private handleRagdollTransition(entity: NodeComponent, config: any): void {
        if (config.visualOnly) {
            // Apply visual physics without affecting game state
            const visualPhysics = entity.gameObject?.getComponent<VisualPhysicsComponent>('visual_physics');
            visualPhysics?.enableRagdoll(config.mass);
        }
    }
}
```

**NavigationSystem**
```typescript
class NavigationSystem extends GameNodeObject {
    private _navMeshPlugin: BABYLON.RecastJSPlugin;
    
    constructor(parentNode: NodeComponent) {
        super('system:navigation', scene, parentNode);
        
        this._navMeshPlugin = new BABYLON.RecastJSPlugin();
        
        // Listen for pathfinding requests
        this.node.addEventListener('ai:pathfinding:started', (event) => {
            this.processPathfindingRequest(event.target, event.payload);
        });
    }
    
    private async processPathfindingRequest(entity: NodeComponent, request: any): Promise<void> {
        const navComponent = entity.gameObject?.getComponent<NavigationComponent>('navigation');
        if (navComponent) {
            await navComponent.findPathTo(request.target);
        }
    }
}
```

### Event-Driven Communication

Systems communicate exclusively through events:

```typescript
// Combat system detects hit
projectileNode.emit('projectile:hit', { 
    target: enemyNode,
    damage: 50,
    damageType: 'kinetic'
});

// Health component receives and processes
enemyNode.addEventListener('projectile:hit', (event) => {
    this.takeDamage(event.payload.damage, event.payload.damageType);
});

// Death triggers ragdoll (visual only)
enemyNode.addEventListener('health:depleted', (event) => {
    const visualPhysics = event.target.gameObject?.getComponent('visual_physics');
    visualPhysics?.enableRagdoll();
});

// UI updates automatically
sceneRoot.addEventListener('health:damage:taken', (event) => {
    if (event.target.type === 'enemy') {
        this.updateEnemyHealthBar(event.target.id, event.payload.remaining);
    }
});
```

## Advanced Babylon.js Integration

### Hybrid Physics Architecture

**Game Logic (Deterministic)**
- Health calculations
- Movement decisions
- Collision detection for gameplay
- Trade and economic systems

**Visual Effects (Client-Side)**
- Ragdoll death animations
- Explosion debris and particles
- Environmental destruction (cosmetic)
- Weapon visual feedback

```typescript
// Example: Projectile system with hybrid approach
class ProjectileSystem extends GameNodeObject {
    fireProjectile(source: Vector3, target: Vector3, damage: number): void {
        // Game logic: Instant raycast for hit detection
        const hit = this.performRaycast(source, target);
        if (hit.entity) {
            hit.entity.emit('damage:projectile', { amount: damage });
        }
        
        // Visual effect: Create particle trail
        this.createProjectileTrail(source, target, hit.position);
    }
    
    private createProjectileTrail(from: Vector3, to: Vector3, impact: Vector3): void {
        // Pure visual - uses physics for trajectory but doesn't affect game state
        const projectileVisual = new ProjectileVisual(from, to);
        projectileVisual.addComponent(new VisualPhysicsComponent());
    }
}
```

### Performance Optimization

**Spatial Acceleration**
- Scene graph provides natural spatial partitioning
- Event radius queries use bounding volumes
- Frustum culling traverses visible branches only

**Level of Detail (LoD)**
```typescript
class LODComponent extends Component {
    update(camera: NodeComponent): void {
        const distance = Vector3.Distance(
            this._gameObject?.node.getWorldPosition()!,
            camera.getWorldPosition()
        );
        
        if (distance < 50) this.setDetailLevel('high');
        else if (distance < 100) this.setDetailLevel('medium');
        else this.setDetailLevel('low');
    }
}
```

**Object Pooling**
- Projectiles reuse GameNodeObjects
- Voxel meshes share geometry via instancing
- Particle effects reset and replay

## Serialization Architecture

### Three-Layer Serialization

**1. Component State**
```typescript
serialize(): ComponentData {
    return {
        type: this.type,
        data: this.getSerializableState()
    };
}
```

**2. GameObject Structure**
```typescript
serialize(): GameObjectData {
    return {
        id: this.id,
        type: this.type,
        components: Object.fromEntries(
            Array.from(this._components.entries())
                .map(([type, comp]) => [type, comp.serialize()])
        )
    };
}
```

**3. Scene Graph Relationships**
```typescript
serialize(): NodeData {
    return {
        transform: { position, rotation, scale },
        parentId: this.parent?.id,
        childIds: this.children.map(c => c.id),
        babylonNodeId: this._node.id // For Babylon.js reconstruction
    };
}
```

### Network Snapshots

Components provide delta-friendly snapshots:

```typescript
getNetworkSnapshot(): NetworkData {
    return {
        position: this.node.getWorldPosition(),
        health: this.health.current,
        state: this.aiState,
        animationState: this.skeletal?.getCurrentAnimation()
    };
}
```

## Implementation Status

### ✅ Core Foundation
- **GameObject and GameNodeObject classes**: Base entity system complete
- **NodeComponent with hierarchy management**: Babylon.js TransformNode integration
- **Basic event propagation system**: Scene graph event flow
- **Component serialization interfaces**: Save/load and network sync support

### 🔨 In Progress (Migration Phase)
- **Scene graph event system**: Advanced propagation phases being implemented
- **Component dependency validation**: DependentComponent base class integration
- **SceneManager hierarchy integration**: Auto-discovery of NodeComponent entities
- **Babylon.js advanced features**: Path3D, NavigationMesh, skeletal systems

### 📋 Planned Advanced Features
- **Complete Babylon.js integration**: Full Path3D rail networks, NavigationMesh AI
- **Visual effects pipeline**: Lens effects, particles, motion blur
- **Performance optimization**: Advanced LoD, spatial partitioning, object pooling
- **Network multiplayer**: Colyseus integration with scene graph state sync
- **Advanced physics**: Complete hybrid physics with visual/logic separation

### Migration Reference

This architecture represents the target state. For implementation steps and transition guidance, see the **Scene Graph Migration Guide** which details the phase-by-phase approach to achieving this architecture while maintaining system stability.

### Performance Targets

- **60fps gameplay**: Smooth experience with 1000+ entities
- **Scene graph queries**: <2ms for complex hierarchical searches
- **Event propagation**: <1ms for deep hierarchies
- **Babylon.js features**: Path3D updates at 60fps, NavigationMesh queries <10ms
- **Visual effects**: Full pipeline stable at 60fps with quality scaling

---

*This document describes the target system architecture for the Train Trading Game. For migration steps and implementation guidance, refer to the companion Scene Graph Migration Guide.*