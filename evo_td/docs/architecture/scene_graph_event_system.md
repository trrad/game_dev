# Scene Graph Event System Design

## Problem Statement

Our current `ComponentEvents` system is flat and lacks scene graph awareness:
- Events broadcast globally without spatial context
- No hierarchical event propagation (bubbling/capturing)
- No automatic routing based on parent-child relationships
- Difficult to target events to specific spatial regions

## Proposed Solution: Hierarchical Event System

### Core Concepts

#### 1. **Event Phases** (like DOM events)
```typescript
enum EventPhase {
    CAPTURE = 1,    // Top-down from scene root to target
    TARGET = 2,     // At the target node
    BUBBLE = 3      // Bottom-up from target to scene root
}
```

#### 2. **Scene Graph Event**
```typescript
interface SceneGraphEvent extends ComponentEvent {
    // Existing ComponentEvent properties
    type: string;
    payload?: any;
    timestamp: number;
    source: string;
    sourceId: string;
    
    // New scene graph properties
    target: SceneNodeComponent;           // The target node
    currentTarget: SceneNodeComponent;    // Current node in event path
    phase: EventPhase;                    // Current event phase
    bubbles: boolean;                     // Should event bubble up?
    cancelable: boolean;                  // Can event be cancelled?
    defaultPrevented: boolean;            // Has preventDefault() been called?
    propagationStopped: boolean;          // Has stopPropagation() been called?
    
    // Spatial context
    worldPosition?: Vector3;              // World position of event
    localPosition?: Vector3;              // Local position relative to target
    distance?: number;                    // Distance from event origin
    
    // Helper methods
    preventDefault(): void;
    stopPropagation(): void;
    stopImmediatePropagation(): void;
}
```

#### 3. **Event Targeting Strategies**
```typescript
interface EventTarget {
    type: 'node' | 'radius' | 'hierarchy' | 'broadcast';
    
    // Specific node targeting
    node?: SceneNodeComponent;
    
    // Radius-based targeting
    center?: Vector3;
    radius?: number;
    radiusType?: 'collision' | 'interaction' | 'detection' | 'render';
    
    // Hierarchy targeting
    root?: SceneNodeComponent;
    maxDepth?: number;
    
    // Filtering
    filter?: (node: SceneNodeComponent) => boolean;
}
```

### Implementation Design

#### 1. **SceneGraphEventSystem**
```typescript
class SceneGraphEventSystem {
    private sceneRoot: SceneNodeComponent;
    private eventListeners: Map<string, Map<SceneNodeComponent, EventListener[]>>;
    
    // Event targeting
    emitEvent(event: SceneGraphEvent, target: EventTarget): void;
    emitToNode(eventType: string, payload: any, node: SceneNodeComponent, options?: EventOptions): void;
    emitToRadius(eventType: string, payload: any, center: Vector3, radius: number, filter?: RadiusFilter): void;
    emitToHierarchy(eventType: string, payload: any, root: SceneNodeComponent, maxDepth?: number): void;
    
    // Event listening
    addEventListener(node: SceneNodeComponent, eventType: string, listener: EventListener, options?: EventListenerOptions): void;
    removeEventListener(node: SceneNodeComponent, eventType: string, listener: EventListener): void;
    
    // Spatial queries (for radius targeting)
    getNodesInRadius(center: Vector3, radius: number, filter?: (node: SceneNodeComponent) => boolean): SceneNodeComponent[];
    getNodesInHierarchy(root: SceneNodeComponent, filter?: (node: SceneNodeComponent) => boolean): SceneNodeComponent[];
}
```

#### 2. **Enhanced SceneNodeComponent**
```typescript
class SceneNodeComponent extends Component<SceneNodeComponentData> {
    // ...existing code...
    
    // Event methods
    addEventListener(eventType: string, listener: EventListener, options?: EventListenerOptions): void;
    removeEventListener(eventType: string, listener: EventListener): void;
    dispatchEvent(event: SceneGraphEvent): boolean;
    
    // Convenience methods
    emit(eventType: string, payload?: any, options?: EventOptions): void;
    emitToParent(eventType: string, payload?: any): void;
    emitToChildren(eventType: string, payload?: any, recursive?: boolean): void;
    emitToSiblings(eventType: string, payload?: any): void;
    
    // Spatial event methods (requires RadiusComponent)
    emitToRadius(eventType: string, payload: any, radius: number, filter?: RadiusFilter): void;
}
```

### Integration with RadiusComponent

#### Generic Radius Component Design
```typescript
interface RadiusComponentData {
    radius: number;
    type: 'collision' | 'interaction' | 'detection' | 'render' | 'custom';
    enabled: boolean;
    customType?: string;  // For custom radius types
}

class RadiusComponent extends Component<RadiusComponentData> {
    public readonly type = 'radius';
    
    constructor(radius: number, radiusType: string = 'collision') {
        super();
        this.data = { radius, type: radiusType as any, enabled: true };
    }
    
    // Spatial queries
    isInRange(other: RadiusComponent): boolean;
    getDistanceTo(other: RadiusComponent): number;
    getOverlap(other: RadiusComponent): number;
    
    // Event integration
    emitToRadius(eventType: string, payload?: any, filter?: RadiusFilter): void;
    getNodesInRadius(filter?: (node: SceneNodeComponent) => boolean): SceneNodeComponent[];
    
    // Collision/interaction helpers
    checkCollision(other: RadiusComponent): boolean;
    checkProximity(other: RadiusComponent, threshold: number): boolean;
    
    // Serialization
    serialize(): RadiusComponentData;
    deserialize(data: RadiusComponentData): void;
}
```

### Usage Examples

#### 1. **Damage Event with Radius**
```typescript
// Explosion at position, affects all entities within radius
const explosionCenter = new Vector3(10, 0, 10);
sceneEventSystem.emitToRadius('explosion', {
    damage: 50,
    center: explosionCenter
}, explosionCenter, 15, {
    filter: (node) => node.gameObject?.hasComponent('health')
});
```

#### 2. **Train Car Communication**
```typescript
// Engine car emits power change to all cars in train
engineCar.emitToSiblings('power:changed', { 
    newPower: 150,
    efficiency: 0.8 
});

// Individual car responds to damage and reports to train
car.addEventListener('damage:taken', (event) => {
    event.target.emitToParent('car:damaged', {
        carId: car.id,
        damage: event.payload.amount,
        healthRemaining: car.getComponent('health').currentHealth
    });
});
```

#### 3. **Enemy AI Detection**
```typescript
// Enemy detects nearby trains within detection radius
enemy.addEventListener('proximity:entered', (event) => {
    if (event.payload.target?.gameObject?.type === 'train') {
        enemy.getComponent('aiBehavior').setTarget(event.payload.target.gameObject);
    }
});

// Automatic proximity detection (would be handled by a system)
enemyDetectionRadius.emitToRadius('proximity:check', {
    source: enemy,
    timestamp: Date.now()
}, 25); // 25 unit detection radius
```

### Migration Strategy

1. **Phase 1**: Implement SceneGraphEventSystem alongside existing ComponentEvents
2. **Phase 2**: Add event capabilities to SceneNodeComponent
3. **Phase 3**: Implement RadiusComponent for spatial queries
4. **Phase 4**: Convert critical systems (Train, Enemy, Combat) to use new events
5. **Phase 5**: Deprecate old ComponentEvents system

### Benefits

1. **Spatial Awareness**: Events can target based on position and distance
2. **Hierarchical Communication**: Parent-child event propagation
3. **Performance**: Targeted events reduce unnecessary processing
4. **Flexibility**: Multiple targeting strategies for different use cases
5. **Debugging**: Better event tracking and visualization
6. **Game Logic**: Natural patterns for damage, detection, interaction systems

This system would provide a solid foundation for spatial game mechanics while maintaining the flexibility and performance needed for a complex game engine.
