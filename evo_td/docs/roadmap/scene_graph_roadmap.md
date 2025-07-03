# Scene Graph Implementation Roadmap

This document outlines the step-by-step implementation plan for integrating a hierarchical scene graph into our ECS architecture.

## Phase 1: Core Infrastructure (COMPLETED)

### ✅ Step 1: SceneNodeComponent Implementation
- ✅ Created base SceneNodeComponent class (renamed from TransformComponent)
- ✅ Implemented parent-child relationships
- ✅ Added local/world transformation methods
- ✅ Built synchronization with PositionComponent

### ✅ Step 2: Event System Integration
- ✅ Implemented scene graph-aware event system
- ✅ Added event bubbling and capturing
- ✅ Created spatial event targeting
- ✅ Integrated events with SceneNodeComponent

### ✅ Step 3: Spatial Components
- ✅ Created RadiusComponent for spatial operations
- ✅ Implemented proximity detection and collision
- ✅ Added helper functions for common spatial operations
- ✅ Integrated with event system

## Phase 2: SceneManager Integration (CURRENT PHASE)

### Step 1: SceneManager Updates (HIGH PRIORITY)
- Update SceneManager to use SceneNodeComponent
- Replace direct mesh registration with scene graph registration
- Support hierarchical object registration
- Implement proper transform propagation

### Step 2: Train System Hierarchy
- Complete TrainCar integration with SceneNodeComponent
- Establish proper parent-child relationships for Train -> Cars -> Voxels
- Update Train movement to control entire hierarchy
- Fix rail positioning to work with scene graph

### Step 3: Voxel Integration
- Complete TrainCarVoxel integration with SceneNodeComponent
- Update voxel positioning to use local coordinates
- Ensure proper inheritance of transforms
- Fix attachment positioning using hierarchy

## Phase 3: Spatial Systems Integration

### Step 1: Collision & Proximity
- Integrate RadiusComponent with game entities
- Update collision detection to use scene graph queries
- Implement spatial event system for proximity triggers
- Convert enemy detection to use spatial events

### Step 2: Station & Building Systems
- Convert static structures to use SceneNodeComponent
- Implement proper transform hierarchy for buildings
- Update rendering to leverage scene graph

### Step 3: Debug & Testing
- Complete SceneNodeDebugger integration
- Create visualization tools for scene graph
- Implement hierarchy inspection tools
- Add performance profiling for scene graph operations
- Add attachment points for station features

### Step 3: Optimization
- Implement batched rendering for similar objects
- Add view frustum culling optimizations
- Create spatial partition system for large scenes

## Phase 4: Advanced Features (3-4 weeks)

### Step 1: Shader System
- Create shader management framework
- Implement custom material pipeline
- Add procedural texture generation

### Step 2: Visual Effects
- Build particle system integration
- Add post-processing framework
- Implement environment effects

### Step 3: Animation System
- Create skeletal animation framework
- Implement animation blending
- Add procedural animation capabilities

## Implementation Strategy

### Development Approach
1. **Incremental Development**: Each component is built and tested individually
2. **Parallel Systems**: Maintain compatibility with existing systems during transition
3. **Feature Toggles**: Use flags to switch between old and new systems
4. **Comprehensive Testing**: Extensive unit and integration testing

### Migration Path
1. **New Features**: Build using new architecture from the start
2. **Critical Systems**: Prioritize fixing issues in train/voxel system
3. **Gradual Conversion**: Move one system at a time to new architecture
4. **Legacy Support**: Maintain compatibility layers where needed

## Engine/Game Code Separation

In addition to implementing the scene graph, we will restructure the codebase to separate engine code from game-specific code:

### New Directory Structure

```
src/
├── engine/                      # Engine-level components (reusable)
│   ├── core/                    # Core framework
│   │   ├── Component.ts         # Base component class
│   │   ├── GameObject.ts        # Base entity class
│   │   ├── System.ts            # Base system class
│   │   └── EventStack.ts        # Event management
│   ├── scene/                   # Scene management
│   │   ├── SceneManager.ts      # Scene coordination
│   │   ├── SceneNodeComponent.ts # Hierarchical node management
│   │   └── CameraManager.ts     # Camera control
│   ├── rendering/               # Rendering framework
│   │   ├── RenderResourceManager.ts  # Resource pooling
│   │   ├── RenderComponent.ts   # Base render component
│   │   └── MaterialLibrary.ts   # Material management
│   └── utils/                   # Engine utilities
│       ├── MathUtils.ts         # Math helpers
│       └── ObjectTracker.ts     # Entity registry
│
├── game/                        # Game-specific components
│   ├── components/              # Game-specific components
│   │   ├── TrainComponent.ts    # Train behavior
│   │   ├── RailComponent.ts     # Rail behavior
│   │   └── EnemyComponent.ts    # Enemy behavior
│   ├── entities/                # Game-specific entities
│   │   ├── Train.ts             # Train entity
│   │   ├── TrainCar.ts          # Train car entity
│   │   └── Enemy.ts             # Enemy entity
│   └── systems/                 # Game-specific systems
│       ├── TrainSystem.ts       # Train management
│       └── EnemySystem.ts       # Enemy management
│
└── ui/                          # User interface (could be further split)
    ├── TimeControlsUI.ts        # Time controls
    └── TrainUI.ts               # Train interface
```

### Migration Strategy

1. **Create New Structure**: Establish the new directory structure
2. **Move Engine Components**: Start by moving core engine components
3. **Update Imports**: Fix import references as files are moved
4. **Move Game Components**: Then move game-specific components
5. **Incremental Testing**: Test after each component is moved

## Technical Debt Management

During this refactoring, we'll address these existing issues:

1. **Coordinate System Inconsistencies**: Standardize on right-handed coordinates
2. **Manual Position Calculations**: Remove error-prone manual transformations
3. **Memory Management**: Fix potential leaks in render resource handling
4. **Performance Bottlenecks**: Address individual mesh creation overhead
5. **Code Organization**: Separate engine and game concerns for better maintainability
6. **Interface Definitions**: Create clear interfaces between engine and game code

## Success Metrics

The refactoring will be considered successful when:

1. **Visual Correctness**: Voxel rotations properly follow parent objects
2. **Performance Improvement**: 30%+ increase in FPS with large scenes
3. **Code Maintainability**: Reduced complexity in spatial transformation code
4. **Feature Enablement**: New capabilities like LOD and instancing are working
5. **Code Separation**: Clean boundaries between engine and game code
6. **Reusability**: Engine components can be reused in different game contexts

## Current Progress

### Completed:
- ✅ Created new directory structure for engine/game separation
- ✅ Fixed hierarchical component implementation with proper inheritance
- ✅ Created RenderResourceManager for optimizing rendering
- ✅ Updated documentation for component registration and system communication
- ✅ Added README files for engine and game directories
- ✅ Renamed TransformComponent to SceneNodeComponent to better reflect its primary purpose
- ✅ Created SceneNodeDebugger for visualizing hierarchies
- ✅ Moved core files to new engine structure:
  - EventStack.ts → engine/core/
  - TimeManager.ts → engine/core/
  - SceneManager.ts → engine/scene/
  - MathUtils.ts, GeometryUtils.ts, Logger.ts, ObjectTracker.ts → engine/utils/
- ✅ Moved game-specific files:
  - ConfigManager.ts → game/
  - StationManager.ts → game/
- ✅ Completed comprehensive import path migration (2 rounds of bulk updates)
- ✅ **PROJECT CLEANUP COMPLETE:**
  - Removed 77 generated .js files from src directory
  - Updated tsconfig.json to output to separate `dist/` directory
  - Updated .gitignore to exclude build output
  - Removed empty directories from refactoring
  - Source directory is now clean and organized
- ✅ Started updating import paths in systems and core files

### Currently In Progress:
- ✅ Updated import paths throughout codebase to use new engine/game structure (2 rounds of bulk updates)
- ✅ Reduced compilation errors from 350+ to 50 errors (90% reduction!)
- 🔄 Fixing remaining component usage patterns (getComponent string vs class usage)
- 🔄 Updating test files with outdated API expectations
- 🔄 Resolving remaining type compatibility issues

### Progress on Import Migration:
- Round 1: Updated 20 files with basic import patterns
- Round 2: Updated 21 additional files with remaining patterns  
- **Success**: Reduced compilation errors from 350+ to 50 (90% improvement!)
- **Core Achievement**: All main import path issues resolved
- Main remaining issues are now functional/behavioral, not structural:
  - Component usage patterns in TrainCarVoxel.ts (23 errors)
  - API method mismatches in a few places (EventStack, train methods)
  - Test file expectations that need updating
  - Minor Babylon.js API compatibility issues

### Next Critical Steps (Updated Priority):

#### 🚨 **Phase A: Scene Graph Event System (High Priority)**
Our current ComponentEvents system lacks scene graph awareness. We need:
1. **Hierarchical Event Propagation**: Events that bubble up/down the scene graph
2. **Spatial Event Filtering**: Events can target by proximity or hierarchy level
3. **Event Phases**: Capture and bubble phases like DOM events
4. **Scene Context**: Events include spatial and hierarchical context

#### 🔄 **Phase B: Entity Integration with SceneGraph (Critical)**
Major entities need to be converted to use SceneNodeComponent:
1. **TrainCar Integration**: Cars become children of Train scene node
2. **TrainCarVoxel Integration**: Voxels become children of Car scene nodes  
3. **Attachment System**: Attachments use scene hierarchy for proper mounting
4. **Enemy Integration**: Enemies use scene graph for spatial relationships

#### 💡 **Phase C: Spatial Systems Enhancement**
Implement generic spatial components for collision and interaction:
1. **RadiusComponent**: Generic spatial component for collision/proximity/LOD
2. **Collision Detection**: Leverage scene graph for efficient spatial queries
3. **Proximity Systems**: AI awareness, interaction zones, trigger areas
4. **LOD Implementation**: Distance-based optimization using scene hierarchy

#### 🎯 **Phase D: Rendering Optimization**
1. **Automatic Transform Sync**: Render components follow scene node transforms
2. **Frustum Culling**: Scene graph-aware visibility determination
3. **Batching**: Group similar objects in scene hierarchy for performance

## SceneManager Integration Plan

### Current Status

The `SceneManager` class is currently the bridge between our game objects and the rendering system, but it doesn't fully leverage our new scene graph architecture. Here's what needs to be updated:

### 1. Visual Registration Refactoring

```typescript
// CURRENT APPROACH - Direct mesh registration
this.sceneManager.registerGameObject(rail, railMesh);

// NEW APPROACH - Scene graph aware registration
this.sceneManager.registerSceneNode(rail.getComponent('sceneNode'), railVisualMesh);
```

### 2. Hierarchical Registration

```typescript
// Current approach - Flat registration
this.sceneManager.registerGameObject(train, trainMesh);
this.sceneManager.registerGameObject(trainCar1, car1Mesh);
this.sceneManager.registerGameObject(trainCar2, car2Mesh);

// New approach - Hierarchical registration
this.sceneManager.registerHierarchy(train);
// Child objects auto-registered through scene graph
```

### 3. Transform Propagation

Currently, the `SceneManager` manually updates positions:

```typescript
// Current approach
const posComponent = mapping.gameObject.getComponent<PositionComponent>("position");
if (posComponent) {
    const pos = posComponent.getPosition();
    visual.position.x = pos.x;
    visual.position.y = pos.y;
    visual.position.z = pos.z;
}
```

New approach will leverage SceneNodeComponent's built-in transform hierarchy:

```typescript
// New approach - transforms propagate automatically through the scene graph
// SceneManager just ensures the root nodes have correct transforms
const sceneNode = mapping.gameObject.getComponent<SceneNodeComponent>("sceneNode");
if (sceneNode && sceneNode.hasChanged()) {
    sceneNode.syncTransformToNode();
}
```

### Implementation Steps

1. Add new methods to SceneManager:
   - `registerSceneNode(sceneNode: SceneNodeComponent, visual?: AbstractMesh): void`
   - `registerHierarchy(rootGameObject: GameObject): void`
   - `unregisterHierarchy(rootGameObjectId: string): void`

2. Update existing visual mappings to track SceneNodeComponent references

3. Modify the update logic to work with the scene graph:
   - Only update root nodes, let transforms propagate naturally
   - Leverage SceneNodeComponent for visibility culling

4. Connect SceneManager to SceneGraphEventSystem for automatic updates

5. Fix specific entity registration in the main app:
   - Update Train, TrainCar, Rail, Station registrations
   - Ensure proper parent-child relationships
