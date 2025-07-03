# Scene Graph Train Trading Game

A hierarchical scene graph-based train trading game built with TypeScript and Babylon.js. Features trains that move along rails with modular voxel-based construction, cargo trading mechanics, and combat against enemies. Originally built with ECS architecture, now enhanced with a robust scene graph hierarchy.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Documentation

### 📖 Main Documentation
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Complete development setup and workflow
- **[Game Mechanics & Art](docs/GAME_MECHANICS_AND_ART.md)** - Game vision, mechanics, and art direction
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Technical architecture and ECS design
- **[Coding Standards](docs/CODING_STANDARDS.md)** - Code style, patterns, and best practices
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Common code patterns and snippets
- **[Roadmap](docs/ROADMAP.md)** - Current status, TODOs, and future plans

### 🤖 For AI Assistants
- **[Agent Prompt](docs/AGENT_PROMPT.md)** - Comprehensive project context for AI development assistance

## Current Features

- **Scene Graph Architecture**: Hierarchical node-based game object structure
- **Train System**: Multi-car trains with rail-based movement and parent-child relationships
- **Enemy AI**: Hostile entities with pathfinding and combat
- **Voxel Rendering**: Colorful 3D voxel graphics with Babylon.js
- **Time Controls**: Pause, normal speed, and fast-forward
- **Attachment System**: Weapons and cargo attachments for train cars
- **Trading Mechanics**: Station-based resource trading (in development)
- **Event System**: Scene graph-aware event propagation with bubbling and capture phases
- **Spatial System**: Radius-based proximity detection for interactions and combat

## Project Structure
```
src/
├── ecs-app.ts              # Main application entry point
├── engine/                # Engine core (rendering, scene graph, utils)
│   ├── core/              # Core engine classes and interfaces
│   │   ├── Component.ts   # Base component class
│   │   └── GameObject.ts  # Base game object class
│   ├── scene/             # Scene graph implementation
│   │   ├── SceneNodeComponent.ts  # Hierarchical transform component
│   │   └── SceneGraphEventSystem.ts  # Event propagation system
│   ├── rendering/         # Rendering system (Babylon.js)
│   └── utils/             # Engine utilities
├── game/                  # Game-specific implementation
│   ├── components/        # Game-specific components
│   ├── entities/          # Game entity factories
│   ├── systems/           # Game systems (logic processors)
│   └── config/            # Game configuration
├── components/            # Shared components
├── entities/              # Entity implementations
├── systems/               # System implementations
├── ui/                    # User interface components
└── net/                   # Networking code
```

## Technology Stack

- **TypeScript** - Main development language
- **Vite** - Build tool and development server
- **Babylon.js** - 3D rendering engine
- **Jest** - Testing framework
- **Colyseus** - Multiplayer networking (in development)

## Development Status

The project has undergone significant architectural evolution from ECS principles to a more robust scene graph architecture. See [Scene Graph Roadmap](docs/roadmap/scene_graph_roadmap.md) and [Current Status](docs/scene_graph_current_status.md) for detailed information.

### Recently Completed
✅ Scene Graph Architecture Implementation  
✅ Engine/Game Directory Separation  
✅ SceneNodeComponent Hierarchical System  
✅ Scene Graph Event System with Bubbling/Capturing  
✅ RadiusComponent for Spatial Operations  
✅ Game Entity Integration with Scene Graph (TrainCarVoxel)  
✅ Import Path Migration and Error Reduction  

### In Progress
🔄 SceneManager Integration with Scene Graph  
🔄 Train System Hierarchy Implementation  
🔄 Entity Migration to Scene Graph Architecture  
🔄 Engine/Game Split Finalization  

### Planned
📋 Spatial Systems (Collision, Proximity, LOD)  
📋 Optimized Rendering with Scene Graph  
📋 Multiplayer Networking  
📋 Mobile Platform Support  

## Contributing

1. Read the [Development Guide](docs/DEVELOPMENT_GUIDE.md)
2. Follow [Coding Standards](docs/CODING_STANDARDS.md)
3. Use [Quick Reference](docs/QUICK_REFERENCE.md) for common patterns
4. Write tests for new features
5. Update documentation as needed

## License

This project is for educational and development purposes.