# GitHub Issues to Create

## 1. Enhance Camera System - Smooth Interpolation and Advanced Controls

**Title:** Enhance Camera System: Smooth Interpolation and Advanced Cinematic Controls

**Labels:** enhancement, camera, UX

**Description:**
The current camera system provides basic cinematic controls but needs refinement for a smoother, more professional feel.

### Current State
- Basic azimuth rotation around train (±60° limit)
- Low-angle cinematic camera (22.5° elevation)
- Pan along train length with restrictions
- Zoom controls (5-50 unit range)

### Improvements Needed
- **Smoother interpolation**: Camera movements feel slightly jerky during transitions
- **Dynamic elevation**: Camera angle should adjust based on train speed or events
- **Advanced angle transitions**: More sophisticated easing curves for camera movements
- **Speed-responsive camera**: Camera behavior changes based on train velocity
- **Event-driven camera**: Camera reacts to combat, trading, or dramatic moments
- **Multiple camera modes**: 
  - Cinematic mode (current)
  - Tactical mode (higher angle for strategy)
  - First-person mode (inside train car)
- **Camera shake**: Subtle effects during collisions, attacks, or rough terrain

### Technical Requirements
- Implement custom easing functions for camera interpolation
- Add speed-based camera behavior modifiers
- Create camera preset system for different gameplay modes
- Add camera effects system (shake, zoom, focus)

### Acceptance Criteria
- [ ] Camera movements feel smooth and professional
- [ ] Multiple camera modes are available and switchable
- [ ] Camera reacts appropriately to game events
- [ ] Performance impact is minimal

---

## 2. Station View and Logic System

**Title:** Implement Station View System and Trading Interface

**Labels:** feature, UI, economy, stations

**Description:**
Create a dedicated station view that provides detailed interfaces for trading, train modification, and station information.

### Requirements
- **Station detail view**: Click on stations to enter focused view mode
- **Trading interface**: Buy/sell cargo with dynamic pricing
- **Train modification UI**: Access attachment system while docked
- **Station information**: View available goods, services, reputation
- **Visual transitions**: Smooth camera movement when entering/exiting station view

### Components Needed
- StationViewController for managing station-focused camera and UI
- TradingInterface component with inventory management
- StationInfoPanel showing available services and goods
- TrainModificationInterface for attachment system access

### Technical Details
- Integrate with existing SceneManager camera system
- Create new UI panels using current UIFactory pattern
- Connect to economy system for pricing and availability
- Support both mouse and touch interactions

### Acceptance Criteria
- [ ] Players can click stations to enter detail view
- [ ] Trading interface shows current prices and available goods
- [ ] Train modification is accessible from station view
- [ ] Smooth transitions between world view and station view
- [ ] Station view works on both desktop and mobile

---

## 3. Basic Economy System Implementation

**Title:** Implement Core Economy System with Dynamic Pricing

**Labels:** feature, economy, core-system

**Description:**
Build the foundation economy system that drives the trading gameplay loop, including supply/demand mechanics and dynamic pricing.

### Core Features
- **Good types system**: Different cargo types with varying values
- **Supply and demand**: Station-specific needs and production
- **Dynamic pricing**: Prices fluctuate based on supply, demand, and events
- **Trade route profitability**: Calculate and display potential profits
- **Reputation system**: Station relationships affect prices and access

### Economic Mechanics
- **Production cycles**: Stations generate goods over time
- **Consumption patterns**: Stations consume goods, creating demand
- **Market events**: Random events that affect supply/demand
- **Distance pricing**: Longer routes = higher potential profits
- **Guild bonuses**: Multiplayer cooperation benefits

### Data Structures
```typescript
interface Good {
  id: string;
  name: string;
  baseValue: number;
  weight: number;
  category: GoodCategory;
}

interface StationEconomy {
  stationId: string;
  produces: Map<string, ProductionInfo>;
  consumes: Map<string, DemandInfo>;
  inventory: Map<string, number>;
  priceModifiers: Map<string, number>;
}
```

### Integration Points
- Connect to existing Station and Train entities
- Integrate with UI system for trading interfaces
- Link to event system for market fluctuations
- Support multiplayer through Colyseus state sync

### Acceptance Criteria
- [ ] Stations produce and consume goods realistically
- [ ] Prices fluctuate based on supply and demand
- [ ] Trade routes show profit potential
- [ ] Economy feels balanced and engaging
- [ ] System supports multiplayer guild mechanics

---

## 4. Train Car Attachment System

**Title:** Implement 3D Grid-Based Train Car Attachment System

**Labels:** feature, train-customization, 3D

**Description:**
Create the core train customization system using a 3D grid-based attachment mechanism for weapons, cargo containers, and equipment.

### System Overview
Based on existing documentation, implement a 3D voxel-style attachment system where players can:
- Attach components to specific positions on train cars
- Rotate and position attachments in 3D space
- Manage weight distribution and balance
- Visualize attachments in real-time

### Core Components
- **AttachmentPoint**: 3D grid positions on train cars
- **AttachmentComponent**: Weapons, cargo, equipment that can be attached
- **AttachmentSystem**: Manages placement, validation, and effects
- **AttachmentUI**: Visual interface for attachment management

### Features Required
- **3D placement grid**: Visual grid overlay on train cars
- **Drag-and-drop interface**: Intuitive attachment placement
- **Constraint validation**: Check attachment rules and conflicts
- **Weight simulation**: Affect train performance based on attachments
- **Visual feedback**: Highlight valid/invalid placement zones
- **Attachment categories**:
  - Weapons (turrets, cannons, defensive systems)
  - Cargo containers (different sizes and types)
  - Utility (generators, refineries, workshops)
  - Defensive (armor plating, shields)

### Technical Implementation
- Extend existing TrainCar entity with attachment points
- Create AttachmentRenderer for 3D visualization
- Integrate with SceneManager's hierarchical object system
- Support both mouse and touch interactions
- Implement real-time physics simulation for weight effects

### Acceptance Criteria
- [ ] Players can attach components to train cars using 3D interface
- [ ] Attachment placement feels intuitive and responsive
- [ ] Weight and balance affect train movement realistically
- [ ] System works smoothly on both desktop and mobile
- [ ] Attachment effects (weapons, cargo, utilities) function correctly

---

## 5. Weapon and Combat System

**Title:** Implement Train Weapon System and Combat Mechanics

**Labels:** feature, combat, weapons

**Description:**
Build the combat system that allows trains to defend against enemies using attached weapons and defensive systems.

### Combat Features
- **Weapon types**: Different attachment-based weapons with unique behaviors
- **Targeting system**: Auto-aim and manual targeting options
- **Defensive systems**: Shields, armor, and countermeasures
- **Combat UI**: Health bars, weapon status, threat indicators
- **Damage system**: Realistic damage to train components and cargo

### Weapon Categories
Based on the post-apocalyptic setting:
- **Kinetic weapons**: Machine guns, cannons, railguns
- **Energy weapons**: Laser turrets, plasma cannons, EMP devices
- **Defensive systems**: Point defense, armor plating, shields
- **Utility weapons**: Grappling hooks, net launchers, smoke dispensers

### Integration with Enemy System
- Extend existing EnemySystem for combat interactions
- Implement weapon range and damage calculations
- Create targeting algorithms for auto-aim functionality
- Add visual effects for weapon fire and impacts

### Technical Requirements
- WeaponComponent attached to train cars via attachment system
- CombatSystem managing engagements and damage
- TargetingSystem for enemy acquisition and tracking
- EffectsRenderer for muzzle flashes, projectiles, explosions

### Acceptance Criteria
- [ ] Weapons can be attached to trains and fire at enemies
- [ ] Different weapon types have distinct behaviors and effects
- [ ] Combat feels engaging and strategic
- [ ] Weapon effects are visually satisfying
- [ ] Performance remains smooth during combat

---

## 6. Cargo Management System

**Title:** Implement Advanced Cargo Management and Logistics

**Labels:** feature, cargo, economy, UI

**Description:**
Create a comprehensive cargo management system that makes inventory handling intuitive and strategically interesting.

### Core Features
- **Cargo container types**: Different sizes, specialized containers
- **Inventory UI**: Visual representation of cargo space and contents
- **Weight distribution**: Affect train handling based on cargo placement
- **Specialized cargo**: Hazardous, perishable, valuable goods with special requirements
- **Loading/unloading**: Animated cargo transfer at stations

### Container System
- **Standard containers**: Basic cargo storage
- **Refrigerated containers**: For perishable goods
- **Secure containers**: For valuable or sensitive cargo
- **Bulk containers**: For raw materials (liquids, grain, ore)
- **Specialized containers**: Custom containers for unique goods

### Cargo Mechanics
- **Weight affects performance**: Heavier loads reduce speed and acceleration
- **Balance matters**: Uneven distribution affects stability
- **Cargo security**: Risk of theft or damage during travel
- **Time-sensitive goods**: Delivery deadlines and spoilage
- **Guild cargo sharing**: Cooperative logistics between guild members

### UI/UX Requirements
- Visual cargo bay representation
- Drag-and-drop cargo management
- Clear indicators for weight, space, and constraints
- Mobile-friendly touch controls
- Real-time updates during loading/unloading

### Acceptance Criteria
- [ ] Cargo management feels intuitive and strategic
- [ ] Different container types have meaningful gameplay differences
- [ ] Weight and balance visibly affect train performance
- [ ] Cargo transfer animations are smooth and satisfying
- [ ] System integrates well with economy and trading

---

## 7. Train Car Modification UI Interface

**Title:** Create Comprehensive Train Car Modification Interface

**Labels:** feature, UI, train-customization

**Description:**
Design and implement a user-friendly interface for modifying train cars, managing attachments, and customizing train configurations.

### Interface Components
- **Car selection panel**: Navigate between different train cars
- **Attachment library**: Browse available components and upgrades
- **3D preview window**: Real-time visualization of modifications
- **Stats panel**: Show performance impact of changes
- **Comparison tools**: Before/after statistics and visual comparison

### User Experience Goals
- **Intuitive workflow**: Logical progression from selection to installation
- **Visual feedback**: Clear indication of modification effects
- **Mobile optimization**: Touch-friendly controls and layouts
- **Accessibility**: Support for different screen sizes and input methods
- **Context-sensitive help**: Tooltips and guidance for new players

### Technical Integration
- Connect to attachment system for component placement
- Integrate with economy system for purchase/upgrade costs
- Link to train performance simulation for realistic stat updates
- Support undo/redo functionality for experimental modifications

### Features
- **Component browser**: Filter and search available attachments
- **Installation wizard**: Step-by-step guidance for complex modifications
- **Configuration presets**: Save and load favorite train setups
- **Share configurations**: Export/import train designs for guild sharing
- **Modification history**: Track changes and revert if needed

### Acceptance Criteria
- [ ] Interface is intuitive for both new and experienced players
- [ ] All modification features are accessible via UI
- [ ] Performance impact is clearly communicated
- [ ] Interface works smoothly on desktop and mobile
- [ ] Integration with other systems is seamless

---

## 8. Advanced Enemy System Enhancement

**Title:** Enhance Enemy System with AI Behaviors and Dynamic Spawning

**Labels:** enhancement, enemies, AI

**Description:**
Expand the current basic enemy system into a sophisticated AI-driven threat system with dynamic behaviors and adaptive spawning.

### Current State
- Basic EnemySystem with spawn/cleanup functionality
- Simple HealthComponent and AIBehaviorComponent
- Integration with SceneManager for visual management

### Enhanced AI Behaviors
- **Hunting patterns**: Different enemy types use distinct hunting strategies
- **Pack coordination**: Some enemies work together in groups
- **Environmental awareness**: Enemies use terrain and obstacles tactically
- **Learning behavior**: Enemies adapt to player strategies over time
- **Threat assessment**: Enemies prioritize targets based on vulnerability

### Dynamic Spawning System
- **Adaptive difficulty**: Spawn rates adjust to player performance
- **Environmental spawning**: Different biomes produce different enemy types
- **Event-driven spawns**: Story events or player actions trigger special enemies
- **Resource-based spawning**: Enemy presence affects local economy and trade

### Advanced Features
- **Enemy evolution**: Based on existing dynamic_evolution_spawn_system.md
- **Trait inheritance**: Enemies pass characteristics to offspring
- **Environmental adaptation**: Enemies evolve based on player strategies
- **Multi-generational tracking**: Long-term ecosystem simulation

### Technical Requirements
- Expand AIBehaviorComponent with state machines
- Implement EvolutionSystem for trait inheritance
- Create SpawnDirector for intelligent enemy placement
- Add BehaviorTree system for complex AI decision making

### Acceptance Criteria
- [ ] Enemies exhibit diverse and intelligent behaviors
- [ ] Spawning feels organic and responds to player actions
- [ ] Evolution system creates meaningful long-term progression
- [ ] Performance scales well with multiple active enemies
- [ ] Enemy diversity keeps gameplay fresh and challenging

---

## 9. 3D Model Rendering System

**Title:** Replace Primitive Meshes with 3D Model Rendering System

**Labels:** enhancement, graphics, assets

**Description:**
Upgrade the visual presentation by replacing primitive mesh objects (boxes, spheres) with detailed 3D models for all game entities.

### Current State
- Trains, stations, enemies use basic geometric shapes
- Simple material and texturing system
- Basic renderer classes for each entity type

### 3D Model Integration
- **Asset pipeline**: System for loading and managing 3D models
- **Model formats**: Support for common formats (.glb, .gltf preferred)
- **LOD system**: Multiple detail levels for performance optimization
- **Animation support**: Skeletal and vertex animation for dynamic models
- **Texture management**: Efficient loading and caching of textures

### Entity-Specific Models
- **Trains and cars**: Detailed locomotive and freight car models
- **Stations**: Distinctive station buildings reflecting their economic role
- **Enemies**: Varied creature models fitting the post-apocalyptic theme
- **Attachments**: 3D models for weapons, cargo containers, equipment
- **Environment**: Rails, terrain features, atmospheric objects

### Technical Implementation
- Extend existing renderer classes to support 3D models
- Create AssetManager for model loading and caching
- Implement ModelRenderer base class for shared functionality
- Add animation system for dynamic models
- Optimize for web delivery (model compression, streaming)

### Performance Considerations
- Efficient model streaming for large worlds
- Instancing for repeated objects (rail segments, common containers)
- Frustum culling integration with existing visibility system
- Mobile optimization with automatic quality scaling

### Acceptance Criteria
- [ ] All major game entities use detailed 3D models
- [ ] Models match the game's post-apocalyptic aesthetic
- [ ] Performance is maintained or improved over primitive rendering
- [ ] Asset pipeline supports efficient content creation workflow
- [ ] Animation system works smoothly for dynamic elements

---

## 10. Advanced Enemy Rendering System

**Title:** Implement Advanced Enemy Rendering with Animation and Effects

**Labels:** enhancement, enemies, graphics, animation

**Description:**
Create a sophisticated rendering system specifically for enemies, supporting animations, visual effects, and dynamic model swapping based on evolutionary traits.

### Advanced Rendering Features
- **Skeletal animation**: Smooth movement and attack animations
- **Procedural generation**: Dynamic enemy appearance based on traits
- **Visual effects**: Particle systems for abilities and environmental interactions
- **Damage visualization**: Visual feedback for health and status effects
- **Evolution visualization**: Gradual model changes as enemies evolve

### Integration with Evolution System
- **Trait-based rendering**: Enemy appearance reflects their evolved characteristics
- **Dynamic model assembly**: Combine model parts based on traits
- **Material variation**: Procedural materials for different evolutionary paths
- **Size scaling**: Visual representation of size trait variations
- **Ability effects**: Visual representation of special enemy abilities

### Animation System
- **Behavior-driven animation**: Animations tied to AI state machine
- **Contextual animations**: Different animations for different environments
- **Combat animations**: Attack, defend, death, and special ability animations
- **Locomotion blending**: Smooth transitions between movement states
- **Performance optimization**: Animation LOD and culling systems

### Technical Architecture
- Extend EnemyRenderer with advanced model management
- Create EnemyAnimationController for animation state management
- Implement TraitVisualizer for evolution-based appearance
- Add EffectSystem for particle and visual effects
- Integrate with existing EnemySystem and evolution logic

### Performance Requirements
- Efficient animation blending and state management
- Scalable to handle many animated enemies simultaneously
- Mobile-friendly optimization with quality scaling
- Integration with existing culling and visibility systems

### Acceptance Criteria
- [ ] Enemies have smooth, contextual animations
- [ ] Visual appearance accurately reflects evolutionary traits
- [ ] Animation system performs well with multiple enemies
- [ ] Visual effects enhance combat and interaction feedback
- [ ] System integrates seamlessly with existing enemy logic

---

## 11. Voxel-Based Architecture Implementation (COMPLETED ✅)

**Title:** Implement Entity-Level Registration Pattern for Voxel-Based Train Cars

**Labels:** architecture, rendering, voxels, enhancement

**Description:**
**STATUS: COMPLETED** - Successfully implemented a voxel-based architecture for train cars using the Entity-Level Registration pattern.

### What Was Accomplished
- **TrainCarVoxel entities**: Each voxel is now an individual GameObject with its own PositionComponent and HealthComponent
- **VoxelRenderComponent**: Per-voxel rendering components that automatically register with SceneManager
- **Entity-Level Registration**: Any GameObject with a RenderComponent is automatically discovered and rendered
- **Auto-discovery system**: SceneManager automatically finds and registers renderable objects
- **Component lifecycle fixes**: Fixed critical timing issues in VoxelRenderComponent.onAttach()

### Technical Implementation
- `TrainCarVoxel.ts`: Individual voxel entities with position, health, and rendering
- `VoxelRenderComponent.ts`: Per-voxel render components with cube mesh creation
- `SceneManager.ts`: Auto-discovery mechanism for objects with RenderComponents
- `GameObject.ts`: Added scene property for Entity-Level Registration support
- `TrainCar.ts`: Updated to create voxel grids using new architecture

### Architecture Benefits
- **Pure ECS pattern**: Each voxel is a full entity with its own components
- **Flexible rendering**: No monolithic renderer dependencies
- **Modular systems**: Easy to add/remove voxel-level functionality
- **Performance ready**: Foundation for LoD and instancing optimizations
- **Extensible**: Pattern ready for attachments, buildings, and other modular entities

### Future Directions (Next Steps)
- Apply the same Entity-Level Registration pattern to:
  - **Attachments**: Replace monolithic attachment rendering
  - **Buildings**: Modular station building components
  - **Weapons**: Individual weapon rendering components
- Implement LoD/asset coordination hooks for performance
- Add instancing optimizations for repeated voxel types
- Create voxel-level damage and destruction systems

### Lessons Learned
- Component lifecycle order is critical (set entity reference before calling super.onAttach())
- Auto-discovery provides clean separation between rendering and game logic
- Entity-Level Registration scales better than parent-managed rendering
- SceneManager auto-discovery reduces coupling between systems

---
