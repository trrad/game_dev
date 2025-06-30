# Train Trading Game Documentation

## Overview
This documentation covers both API reference and architectural concepts for the Train Trading Game.

### 1. Architecture
Core game design and implementation:
- [System Overview](architecture/overview.md)
- [Component System](architecture/components.md)
- [Network Architecture](architecture/network.md)
- [Game Systems](architecture/systems.md)

### 2. API Documentation
Generated from source code documentation:
- [Core Systems](api/core/README.md)
  - [GameObject](api/core/GameObject.md)
  - [SceneManager](api/core/SceneManager.md)
- [Game Entities](api/entities/README.md)
- [Components](api/components/README.md)
- [Game Systems](api/systems/README.md)

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