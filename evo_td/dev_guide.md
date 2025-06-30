# Train Trading Game - Development Guide

## Project Vision
A multiplayer cozy trading and exploration game where players form shipping guilds and control customizable trains traveling between procedurally generated stations. Players build profitable trade routes, customize trains with a 3D attachment system, and explore dynamic worlds with environmental challenges.

## Core Development Principles

### 1. Incremental Development
- **Start small, scale deliberately** - Begin with core mechanics, then expand
- **Build one system at a time** - Ensure each system works before integration
- **Validate early and often** - Test functionality at each development stage

### 2. Architecture Guidelines
- **Component-based design** - Use ECS pattern for flexible game entities
- **Clear system separation** - Logical systems should be decoupled from rendering
- **Observable by default** - Build in metrics, logging and debugging from the start
- **Interface-driven development** - Define clear interfaces before implementation

### 3. Request-Specific Changes
- **Focus on the immediate request** - Only make changes related to the current task
- **Preserve unrelated code** - Don't refactor code outside the scope of the request
- **Document suggestions separately** - Note potential improvements without implementing them

## Project Navigation Map

```
├── Core Architecture
│   ├── GameObject System [core/GameObject.ts]
│   ├── Component System [docs/architecture/components.md]
│   ├── Scene Management [core/SceneManager.ts]
│   └── System Managers [docs/architecture/overview.md]
│
├── Gameplay Systems
│   ├── Train System
│   │   ├── Train Entity [entities/Train.ts]
│   │   ├── Train Cars [game/TrainCar.ts]
│   │   └── Train System [systems/TrainSystem.ts]
│   │
│   ├── Station & Rail Network
│   │   ├── Station Entity [game/Station.ts]
│   │   ├── Rail Connections [game/Rail.ts]
│   │   └── Rendering [renderers/*Renderer.ts]
│   │
│   ├── Economy System
│   │   └── Market Mechanics [TBD]
│   │
│   └── Enemy System
│       └── Dynamic Evolution [docs/dynamic_evolution_spawn_system.md]
│
├── Technical Infrastructure
│   ├── Rendering Pipeline [ecs-app.ts]
│   ├── Network Layer [net/ColyseusClient.ts]
│   ├── Event System [game/EventStack.ts]
│   └── Logging [utils/Logger.ts]
│
└── User Interface
    ├── UI Components [ui/UIFactory.ts]
    └── UI System [ui/UISystem.ts]
```

## Development Workflow

### 1. Understanding a Feature
1. **Review documentation** - Start with relevant markdown docs
2. **Examine interfaces** - Understand data structures and contracts
3. **Map dependencies** - Identify related systems and components
4. **Check existing implementations** - See how similar features work

### 2. Implementation Approach
1. **Define interfaces first** - Start with clear typing
2. **Create minimal implementation** - Build the simplest working version
3. **Add observability** - Ensure logging and metrics are in place
4. **Test functionality** - Verify the implementation works as expected

### 3. Code Integration
1. **Check for side effects** - Ensure changes don't break existing functionality
2. **Update related documentation** - Keep markdown files in sync with code
3. **Follow coding standards** - Maintain project style and patterns
4. **Favor composition** - Use components rather than inheritance

## Feature Implementation Guide

### Adding a New Game Entity
1. Create class extending GameObject
2. Define required components
3. Implement core logic
4. Add to appropriate systems
5. Create renderer (if visual)

### Creating a New System
1. Define system responsibilities
2. Create interfaces for data structures
3. Implement core processing logic
4. Add observability (logging, metrics)
5. Integrate with EventStack

### Implementing UI Elements
1. Design component interface
2. Create factory method in UIFactory
3. Implement rendering logic
4. Add event handlers
5. Register with UISystem

## Documentation Links
- Architecture Overview [docs/architecture/overview.md]
- Component System [docs/architecture/components.md]
- Coding Style [coding_style.md]
- Enemy Evolution System [docs/dynamic_evolution_spawn_system.md]

## Collaboration Guidelines
- **Respect system boundaries** - Changes should be contained to relevant systems
- **Document architectural decisions** - Explain "why" not just "what" 
- **Update documentation alongside code** - Keep docs and code in sync
- **Consider multiplayer implications** - Remember the client-server architecture

## Emergency Procedures
- **Rendering issues** - Check SceneManager and renderer implementations
- **Entity behavior problems** - Validate component and GameObject logic
- **Performance concerns** - Review update loops and rendering optimizations
- **Type errors** - Check interface implementations and data transformations
