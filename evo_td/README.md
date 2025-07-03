# ECS Train Trading Game

An Entity-Component-System (ECS) based train trading game built with TypeScript. Features trains that move along rails, carry cargo, and engage in trading mechanics while defending against enemies.

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

- **ECS Architecture**: Clean Entity-Component-System design
- **Train System**: Multi-car trains with rail-based movement
- **Enemy AI**: Hostile entities with pathfinding and combat
- **Voxel Rendering**: Colorful pixel-art style graphics
- **Time Controls**: Pause, normal speed, and fast-forward
- **Attachment System**: Weapons and cargo attachments for train cars
- **Trading Mechanics**: Station-based resource trading (in development)

## Project Structure
```
evo_td/
├── package.json
├── vite.config.js
├── tsconfig.json
├── ecs-app.ts                # Main ECS application entry point
├── engine/                   # Engine framework (generic, reusable)
│   ├── core/                 # Core ECS framework
│   ├── components/           # ECS components (engine-level)
│   ├── scene/                # Scene management
│   ├── utils/                # Engine utilities
│   └── net/                  # Networking (engine-level)
├── game/                     # Game-specific logic and content
│   ├── components/           # Game-specific ECS components
│   ├── entities/             # Game entities (extend GameObject)
│   ├── systems/              # ECS systems (coordinate gameplay)
│   ├── renderers/            # Rendering components (game-specific)
│   ├── ui/                   # User interface components
│   └── utils/                # Game-specific utilities (if any)
├── public/                   # Static assets
├── assets/                   # Game assets (images, models, etc.)
└── tests/                    # Unit and integration tests
    ├── unit/
    └── mocks/
```

## Technology Stack

- **TypeScript** - Main development language
- **Vite** - Build tool and development server
- **HTML5 Canvas** - Rendering engine
- **Jest** - Testing framework
- **Colyseus** - Multiplayer networking (in development)

## Development Status

The project has undergone significant refactoring to align with ECS principles. See [Roadmap](docs/ROADMAP.md) for current status and planned improvements.

### Recently Completed
✅ Legacy code removal and cleanup  
✅ ECS architecture implementation  
✅ Component and system refactoring  
✅ Math and geometry utility consolidation  
✅ Documentation overhaul  

### In Progress
🔄 Performance optimization  
🔄 Advanced AI behaviors  
🔄 Enhanced trading mechanics  

### Planned
📋 Multiplayer networking  
📋 Procedural content generation  
📋 Mobile platform support  

## Contributing

1. Read the [Development Guide](docs/DEVELOPMENT_GUIDE.md)
2. Follow [Coding Standards](docs/CODING_STANDARDS.md)
3. Use [Quick Reference](docs/QUICK_REFERENCE.md) for common patterns
4. Write tests for new features
5. Update documentation as needed

## License

This project is for educational and development purposes.