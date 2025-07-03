# Scene Graph Integration

This document outlines the integration of a hierarchical scene graph into our ECS architecture, providing a bridge between our game logic and Babylon.js rendering.

## Motivation

Our current architecture faces several challenges:
1. **Hierarchical Transformations**: Voxel rotations don't properly inherit from parent objects
2. **Performance Limitations**: Individual mesh management doesn't scale efficiently
3. **Coordinate System Inconsistencies**: Manual position/rotation calculations are error-prone
4. **Rendering Optimizations**: Difficulty implementing instancing and batching

By integrating a proper scene graph, we can address these issues while maintaining our ECS philosophy.

## Core Components

### SceneNodeComponent

This new component serves as the bridge between our ECS architecture and Babylon.js's scene graph:

```typescript
export class SceneNodeComponent extends Component<SceneNodeComponentData> {
    private _node: TransformNode;
    private _parent: SceneNodeComponent | null = null;
    private _children: SceneNodeComponent[] = [];

    constructor(scene: Scene) {
        super();
        this._node = new TransformNode(`node_${this.instanceId || 'unattached'}`, scene);
    }

    // Parent-child relationship
    setParent(parent: SceneNodeComponent | null): void;
    addChild(child: SceneNodeComponent): void;
    removeChild(child: SceneNodeComponent): void;

    // Local transformations (relative to parent)
    setLocalPosition(x: number, y: number, z: number): void;
    setLocalRotation(x: number, y: number, z: number): void;
    setLocalScale(x: number, y: number, z: number): void;
    
    // World transformations (global space)
    getWorldPosition(): Vector3;
    getWorldRotation(): Vector3;
    getWorldDirection(): Vector3;
    
    // Access to underlying node
    getTransformNode(): TransformNode;
}
```

### RenderResourceManager

A centralized system for managing rendering resources:

```typescript
export class RenderResourceManager {
    // Mesh template registry
    static registerMeshTemplate(key: string, mesh: Mesh): void;
    static createMeshInstance(key: string, name: string): Mesh | null;
    
    // Material management
    static getMaterial(key: string, creator: () => Material): Material;
    
    // Texture management
    static getTexture(key: string, url: string): Promise<Texture>;
    
    // Resource cleanup
    static disposeUnused(): void;
}
```

## Implementation Phases

### Phase 1: SceneNodeComponent Integration
1. Create SceneNodeComponent class
2. Update GameObject to support scene node hierarchy
3. Modify PositionComponent to sync with SceneNodeComponent
4. Update SceneManager to recognize SceneNodeComponent

### Phase 2: Train Car Refactoring
1. Refactor TrainCar to use SceneNodeComponent
2. Update TrainCarVoxel to be a child of TrainCar's scene node
3. Modify TrainSystem to leverage the scene graph
4. Add debug visualization for scene node hierarchy

### Phase 3: RenderResource Optimization
1. Implement RenderResourceManager
2. Convert voxel meshes to use instancing
3. Add material pooling and reuse
4. Integrate LOD system for distant objects

### Phase 4: Advanced Rendering Features
1. Add custom shader support
2. Implement procedural texture generation
3. Create batched rendering for similar objects
4. Add post-processing effects framework

## Migration Strategy

To minimize disruption, we'll implement a hybrid approach:

1. **Parallel Systems**: Allow both old and new components to coexist
2. **Bridge Components**: Create adapters between old and new systems
3. **Incremental Migration**: Convert one entity type at a time
4. **Feature Flags**: Toggle between systems for testing

## Expected Benefits

1. **Visual Consistency**: Proper inheritance of transforms
2. **Performance**: Significant reduction in draw calls and CPU overhead
3. **Maintainability**: Cleaner architecture with proper separation of concerns
4. **Scalability**: Better support for complex hierarchies and large numbers of entities
5. **Future-Proofing**: Foundation for advanced rendering features

## Performance Considerations

1. **Transform Updates**: Cache and batch transform updates
2. **Hierarchical Depth**: Limit transform hierarchy depth (ideally ≤ 5 levels)
3. **Culling**: Implement hierarchical frustum culling
4. **Static Objects**: Optimize static objects with frozen transforms
5. **Instancing**: Use instanced rendering for similar objects
