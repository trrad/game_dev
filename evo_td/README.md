# Train Trading Game Docume### 4.### 3. Developer Guides
- [Development Guide](dev_guide.md) - Main development guidelines and project structure
- [Coding Style](coding_style.md) - Code formatting and style standards
- [Quick Reference](quick_reference.md) - Code snippets for common tasks
- [AI Agent Prompt Guide](agent_prompt_guide.md) - Interactive development guide for working with AI assistants

#### Implementation Guides
- [Component Registration Patterns](docs/guides/component_registration.md) - Best practices for adding new components
- [System Communication Patterns](docs/guides/system_communication.md) - How systems should interact
- [File Organization Standards](docs/guides/file_organization.md) - Project structure and file placement rulesure Documentation
- [Dynamic Enemy Evolution System](docs/dynamic_evolution_spawn_system.md)
- [Enemy System Integration Guide](docs/systems/enemy_system.md)

## Recent System Restorations
- **Enemy System**: Fully restored enemy spawning, AI behaviors, and health management
  - [Enemy System Documentation](docs/systems/enemy_system.md)
  - [HealthComponent API](docs/api/components/HealthComponent.md)
  - [AIBehaviorComponent API](docs/api/components/AIBehaviorComponent.md)ation

## Overview
This documentation covers both API reference and architectural concepts for the Train Trading Game.

### 1. Architecture
Core game design and implementation:
- [System Overview](docs/architecture/overview.md)
- [Component System](docs/architecture/components.md)
- Network Architecture - *In development*
- Game Systems - *In development*

### 2. API Documentation
Generated from source code documentation:
- [Core Systems](docs/api/core/)
  - [GameObject](docs/api/core/GameObject.md)
  - [SceneManager](docs/api/core/SceneManager.md)
- [Components](docs/api/components/)
  - [PositionComponent](docs/api/components/PositionComponent.md) - 3D position and rotation
  - [MovementComponent](docs/api/components/MovementComponent.md) - Velocity and physics
  - [HealthComponent](docs/api/components/HealthComponent.md) - Health and damage
  - [AIBehaviorComponent](docs/api/components/AIBehaviorComponent.md) - AI decision making
- [Game Entities](docs/api/) - *Documentation for entities in development*
- [Game Systems](docs/api/) - *System API documentation in development*

### 3. Developer Guides
- [Development Guide](../dev_guide.md) - Main development guidelines and project structure
- [Coding Style](../coding_style.md) - Code formatting and style standards
- [Quick Reference](../quick_reference.md) - Code snippets for common tasks
- [AI Agent Prompt Guide](../agent_prompt_guide.md) - Interactive development guide for working with AI assistants

### 4. Feature Documentation
- [Dynamic Enemy Evolution System](dynamic_evolution_spawn_system.md)

## Documentation Structure
- TypeScript docstrings generate API reference
- Markdown files contain architectural concepts
- README files provide component/system guidance

## Building Documentation
```bash
npm run docs  # Generates complete documentation
```

## Contributing
When adding new code:
1. Include JSDoc comments for all public APIs
2. Update relevant README files
3. Add unit tests with descriptive names
4. Update architecture docs for significant changes