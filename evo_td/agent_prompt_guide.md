# EVO TD - AI Agent Prompt Guide

## Core Interaction Principles

### Interactive Development Approach
- **Short, focused exchanges** - Prioritize quick iteration cycles over large, complex changes
- **Clear checkpoints** - Ask for confirmation before proceeding to next development phase
- **Explain what, why, and how** - Briefly justify architectural decisions with references to documentation
- **Offer specific options** - Present concrete alternatives with pros/cons for complex decisions
- **Build solutions incrementally** - Implement one functional piece at a time, test, then expand

### Code Quality Standards
- Follow ECS architecture patterns established in the codebase
- Maintain strict separation between game logic (components/systems) and rendering (renderers)
- Ensure all game entities extend GameObject with appropriate components
- Add proper logging and observability to new features (see Observable by Design principle)
- Follow existing naming conventions and code style from coding_style.md
- Prioritize type safety with proper interfaces and type declarations

## Development Process

### 1. Initial Assessment
- Acknowledge the prompt request with specific reference to what you understand
- Reference relevant sections of dev_guide.md and other documentation
- Identify affected systems using the Project Navigation Map
- Ask concise, targeted clarifying questions if the request is ambiguous
- Check existing implementations for similar patterns before proposing new approaches

### 2. Planning Response
- Outline the approach in 2-3 bullet points with specific file/class references
- Identify impacted files and systems with absolute paths
- Mention potential risks or trade-offs with mitigation strategies
- Confirm approach before making substantial changes
- Reference similar existing implementations when available

### 3. Implementation Strategy
- Make changes in small, logical increments with clear explanations
- Focus on one file or concept at a time, completing it fully
- Check for and fix errors as they occur, explaining the root cause
- Validate changes with tests or logging statements where appropriate
- Use consistent patterns from similar existing code

### 4. Checkpoints and Validation
- After each significant change, summarize what was done with specific improvements
- Ask if the current approach aligns with expectations before continuing
- If unexpected challenges arise, pause and explain options with pros/cons
- Suggest concrete next steps for continued development
- Provide usage examples for newly implemented features

## ECS Implementation Guide

### GameObject Creation Pattern
```typescript
export class NewEntity extends GameObject {
    private _config: EntityConfig;
    
    constructor(config: EntityConfig) {
        super('entityTypeIdentifier');
        this._config = config;
        
        // Add essential components
        this.addComponent(new PositionComponent({ 
            x: config.position?.x || 0, 
            y: config.position?.y || 0, 
            z: config.position?.z || 0 
        }));
        
        // Add behavior components
        this.addComponent(new MovementComponent());
        
        Logger.log(LogCategory.SYSTEM, `${this.type} created: ${this.id}`);
    }
    
    update(deltaTime: number): void {
        super.update(deltaTime); // Always call super.update()
        // Entity-specific update logic
    }
}
```

### Component Implementation Pattern
```typescript
export interface ComponentProperties {
    propertyA: number;
    propertyB: string;
    // Other properties...
}

const DEFAULT_PROPERTIES: ComponentProperties = {
    propertyA: 0,
    propertyB: ''
};

export class NewComponent extends Component {
    public readonly type = 'componentType'; // Unique identifier
    private _properties: ComponentProperties;
    
    constructor(properties?: Partial<ComponentProperties>) {
        super();
        this._properties = { ...DEFAULT_PROPERTIES, ...properties };
        
        Logger.log(LogCategory.COMPONENT, `${this.type} component created`);
    }
    
    update(deltaTime: number): void {
        // Component update logic
    }
    
    // Getters/setters with appropriate type safety
    get propertyA(): number {
        return this._properties.propertyA;
    }
    
    set propertyA(value: number) {
        this._properties.propertyA = value;
    }
}
```

### Renderer Implementation Pattern
```typescript
export interface VisualConfig {
    color: string;
    scale: number;
    // Other visual properties
}

const DEFAULT_CONFIG: VisualConfig = {
    color: '#FFFFFF',
    scale: 1.0
};

export class NewEntityRenderer {
    private scene: Scene;
    private visualConfig: VisualConfig;
    
    constructor(scene: Scene, config?: Partial<VisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_CONFIG, ...config };
    }
    
    createVisual(position: Position3D): Mesh {
        // Create mesh with Babylon.js
        const mesh = MeshBuilder.Create...(/* params */);
        
        // Apply position
        mesh.position = new Vector3(position.x, position.y, position.z);
        
        // Set up materials
        const material = new StandardMaterial("material", this.scene);
        material.diffuseColor = Color3.FromHexString(this.visualConfig.color);
        mesh.material = material;
        
        // Ensure visibility
        mesh.isVisible = true;
        
        return mesh;
    }
}
```

### System Implementation Pattern
```typescript
export class NewSystem {
    private entities: Map<string, GameObject> = new Map();
    private sceneManager: SceneManager;
    
    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
        Logger.log(LogCategory.SYSTEM, "NewSystem initialized");
    }
    
    registerEntity(entity: GameObject): void {
        if (entity.hasComponent('requiredComponentType')) {
            this.entities.set(entity.id, entity);
            Logger.log(LogCategory.SYSTEM, `Entity registered: ${entity.id}`);
        }
    }
    
    unregisterEntity(entityId: string): void {
        this.entities.delete(entityId);
    }
    
    update(deltaTime: number): void {
        const startTime = performance.now();
        
        // Process all entities
        for (const entity of this.entities.values()) {
            this.processEntity(entity, deltaTime);
        }
        
        Logger.log(
            LogCategory.PERFORMANCE, 
            `NewSystem update: ${this.entities.size} entities processed in ${performance.now() - startTime}ms`
        );
    }
    
    private processEntity(entity: GameObject, deltaTime: number): void {
        // System-specific processing logic
    }
}
```

## Request Handling Examples

### Good Response Pattern
1. "I understand you want to add a new WeaponComponent to the Train entity that will handle attack functionality."
2. "This will primarily affect these files:
   - `src/components/WeaponComponent.ts` (new file)
   - `src/entities/Train.ts` (update to add component)
   - `src/systems/CombatSystem.ts` (new file to process attacks)
   - `src/types/WeaponConfig.ts` (new interface file)"
3. "Here's my approach:
   - First, define the WeaponConfig interface with properties for damage, range, and cooldown
   - Next, create the WeaponComponent with appropriate methods
   - Then, update the Train class to optionally add this component
   - Finally, implement a basic CombatSystem to process attacks"
4. "Does this align with what you had in mind?"
5. [After confirmation] "I'll start by creating the WeaponConfig interface and WeaponComponent..."
6. "Now that we have the component, shall we update the Train class to use it?"

### Avoiding Common Issues
- Don't make unrelated refactoring without explicit permission
- Don't change core architectural patterns established in the codebase
- Don't implement complex features all at once without check-ins
- Don't assume implementation details that aren't specified in the prompt, unless they're made obvious by existing documentation
- Don't mix game logic in renderer classes or rendering logic in game entities
- Don't introduce new design patterns without discussing them first

## Quick System Navigation Guide

```
GameObject → Component → System → Renderer → UI
```

- Game entities (train, station) extend GameObject
- Components (position, movement) provide data and behavior
- Systems (train system, enemy system) process groups of objects
- Renderers visualize game objects with Babylon.js
- UI elements provide player interaction

## Development Sequence for New Features

1. Define interfaces and types in appropriate files
2. Implement core logic classes with proper type safety
3. Create/update components with clear responsibilities
4. Integrate with existing systems using established patterns
5. Add rendering and visuals in dedicated renderer classes
6. Implement UI elements (if needed) using UIFactory
7. Add observability (logging, metrics) following Observable by Design principle

---

Remember: Focus on incremental development with frequent check-ins to ensure alignment with the prompter's goals. Keep exchanges focused and specific, building the solution collaboratively step by step. Always follow established ECS patterns and maintain separation between game logic and rendering.
