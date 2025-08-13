# Resonance Engine

A lightweight reactive state-based multiplayer game engine built on Babylon.js and TypeScript with advanced WebGPU rendering, Havok physics, and dead cheap server authoritative multiplayer. Not novel, just a pragmatic integration of proven patterns for browser-first games.

The goal: make it easy and fun to create beautiful, responsive multiplayer games I can actually run at scale. One server per region, not thousands of edge nodes. Players might have 200ms ping, but the game still feels responsive thanks to client prediction and lag compensation.

## What This Is

An experimental engine that combines:
- React-style reactivity (observable state changes)
- Unity-style networking (authority-based property sync) 
- GGPO-style rollback (state history for lag compensation)
- Babylon.js for 3D rendering (or headless on server)

The core idea: game state is reactive properties that automatically synchronize based on authority rules. No manual networking code, no separate prediction logic. Complex client-side effects like ray-tracing, ragdoll physics, and particle systems run locally and don't affect the deterministic game state.

## Why Lag Compensation Matters

I want to deploy servers globally without needing expensive edge infrastructure. For the games I'm building (slower-paced, browser-based strategy, puzzle, tower defense), 200ms ping is totally acceptable for gameplay - these aren't twitchy FPS games. But 200ms ping normally means nearly half a second delay between clicking and anything changing on your screen, which feels terrible.

Lag compensation solves this: players get immediate response to their inputs (client prediction) while the server maintains authority. This makes high-ping multiplayer feel responsive without the cost of worldwide server deployment. This framework aims to make it stupid simple to write naturally lag-compensated 3D browser games without duplicating any work to create server and client bundles.

## What Multiplayer Actually Looks Like

Here's a hypothetical RTS-style example with multiple players:

```typescript
// Shared entity definition - same code everywhere
class Unit extends NetworkReactiveEntity {
    schema = {
        properties: [
            // Client can only express intent
            { name: 'targetPosition', type: 'vector3', authority: 'client' },
            { name: 'targetEnemyId', type: 'string', authority: 'client' },
            
            // Server owns actual state
            { name: 'position', type: 'vector3', authority: 'server' },
            { name: 'health', type: 'numeric', authority: 'server' },
            { name: 'attacking', type: 'boolean', authority: 'server' }
        ]
    };
    
    // Game logic runs identically on client and server
    updateGameLogic(deltaTime: number) {
        const target = this.getVectorProperty('targetPosition').getValue();
        const position = this.getVectorProperty('position');
        
        // Move toward target
        if (target && !position.getValue().equals(target)) {
            this.moveToward(target, deltaTime);
        }
        
        // Attack if enemy targeted
        const enemyId = this.getProperty('targetEnemyId').getValue();
        if (enemyId) {
            this.attackTarget(enemyId);
        }
    }
}

// Player clicks enemy unit
onEnemyClick(enemyId: string) {
    // Just update client's input state
    myUnit.getProperty('targetEnemyId').set(enemyId);
    // This immediately runs on client (prediction)
    // And syncs to server for authoritative processing
}
```

The magic: the client sees immediate response, the server processes with authority, and they naturally converge.

## Architecture

### Reactive Properties

Everything is state. State changes drive everything else. At the core are reactive properties - observable containers for game state:

```typescript
import { NumericProperty, VectorProperty, BooleanProperty } from '@engine/components/ReactivePropertyComponent';
import { Vector3 } from '@babylonjs/core';

// Create typed reactive properties
const health = new NumericProperty('health', 100);
const position = new VectorProperty('position', Vector3.Zero());
const isAlive = new BooleanProperty('isAlive', true);

// They're observable - react to any change
health.onChange((update) => {
    console.log(`Health: ${update.oldState} → ${update.newState}`);
    if (update.newState <= 0 && update.oldState > 0) {
        isAlive.set(false, 'death');
    }
});

// Each type has useful methods
health.decrement(10);           // Take damage
health.clamp(0, 100);          // Enforce bounds

position.add(velocity);         // Vector math
position.setX(5);              // Component access

isAlive.toggle();              // Boolean operations
```

These properties become networked when defined in schemas:

```typescript
import { EntitySchema, NetworkReactiveEntity } from '@engine/networking';

// Schema defines properties with network authority
const BALL_SCHEMA: EntitySchema = {
    name: 'ball',
    properties: [
        // Server owns game state
        { name: 'position', type: 'vector3', default: Vector3.Zero(), authority: 'server' },
        { name: 'health', type: 'numeric', default: 100, min: 0, max: 100, authority: 'server' },
        
        // Client owns only input
        { name: 'targetPosition', type: 'vector3', authority: 'client' },
        { name: 'attackTarget', type: 'string', authority: 'client' }
    ]
};

// Entity automatically creates and syncs these properties
class Ball extends NetworkReactiveEntity {
    protected getSchema() { return BALL_SCHEMA; }
    
    constructor() {
        super();
        // Properties are created from schema
        // Already networked and reactive
        
        this.observeProperty('health', (newVal, oldVal) => {
            this.updateHealthBar();
        });
    }
}
```

The `NaturalSyncNetworkManager` watches these properties and automatically syncs based on authority - no manual networking code needed.

### Input as State

The only thing the client owns is its input state. Everything else is server authoritative.

```typescript
import { NetworkReactiveEntity, EntitySchema } from '@engine/networking';
import { InputStateEntity } from '@engine/inputs';
import { Vector3 } from '@babylonjs/core';

// From InputStateEntity.ts - input is just reactive state
export class InputStateEntity extends NetworkReactiveEntity {
    protected getSchema(): EntitySchema {
        return {
            name: 'input_state',
            properties: [
                { name: 'clickPosition', type: 'vector3', authority: 'client' },
                { name: 'hoveredEntityId', type: 'string', authority: 'client' },
                { name: 'clickedEntityId', type: 'string', authority: 'client' },
                { name: 'inputVector', type: 'vector3', authority: 'client' }
            ]
        };
    }
}

// From Ball.base.ts - entities observe input state changes
public observeInputState(inputState: InputStateEntity): void {
    // Hover state changes update visual
    inputState.getProperty('hoveredEntityId')
        ?.onChange((event) => {
            const isHovered = event.to === this.getNetworkId();
            this.getBooleanProperty('isHovered')?.set(isHovered, 'hover_state');
        });
    
    // Click triggers color cycle
    inputState.getProperty('clickedEntityId')
        ?.onChange((event) => {
            if (event.to === this.getNetworkId()) {
                this.cycleColor('entity_click');
            }
        });
        
    // Ground clicks trigger movement
    inputState.getProperty('clickPosition')
        ?.onChange((event) => {
            if (event.to && !event.to.equals(Vector3.Zero())) {
                this.moveTo(event.to, 'ground_click');
            }
        });
}
```

Input is state that syncs like any other property. The ReactiveInputEnricher maps DOM and Babylon events to this state.

### Babylon.js Integration

The engine wraps Babylon's powerful features in reactive components:

```typescript
import { Component } from '@engine/components';
import { GameObject } from '@engine/core';
import { VectorProperty } from '@engine/components/ReactivePropertyComponent';
import { TransformNode, Scene } from '@babylonjs/core';

// PositionComponent wraps Babylon's TransformNode
export class PositionComponent extends Component {
    private _node: TransformNode;  // Babylon's transform
    
    // Reactive properties that sync across network
    public readonly position: VectorProperty;
    public readonly rotation: VectorProperty;
    public readonly scale: VectorProperty;
    
    constructor(scene: Scene) {
        // Scene always exists (NullEngine on server)
        this._node = new TransformNode(`node_${this.id}`, scene);
        
        // Properties sync to Babylon transform
        this.position.onChange((update) => {
            this._node.position.copyFrom(update.newState);
        });
    }
}

// GameNodeObject provides scene graph hierarchy
export class GameNodeObject extends GameObject {
    public readonly node: PositionComponent;
    
    // Entities automatically participate in Babylon's scene graph
    // Parent-child relationships, transforms, etc all work
    // But state is reactive and networked
}
```

This lets you use Babylon's advanced features (WebGPU rendering, Havok physics, spatial audio) while keeping game state reactive and networked.

### Shared Game Logic

The same code runs on client and server. In production, the server runs headless (NullEngine) without rendering graphics, but this doesn't affect game state calculations:

```typescript
import { NetworkReactiveEntity } from '@engine/networking';
import { Vector3 } from '@babylonjs/core';

// From Ball.base.ts - shared movement logic
public updateGameLogic(deltaTime: number): void {
    this.updateMovement(deltaTime);
}

private updateMovement(deltaTime: number): void {
    const isMoving = this.getBooleanProperty('isMoving');
    const position = this.getVectorProperty('position');
    const targetPosition = this.getVectorProperty('targetPosition');
    const moveSpeed = this.getNumericProperty('moveSpeed');

    if (!isMoving?.isTrue() || !position || !targetPosition || !moveSpeed) return;

    const currentPos = position.getValue();
    const targetPos = targetPosition.getValue();
    const speed = moveSpeed.getValue();

    const direction = targetPos.subtract(currentPos);
    const distance = direction.length();

    if (distance < 0.1) {
        // Reached target
        isMoving.setFalse('movement_complete');
        position.set(targetPos, 'movement_complete');
    } else {
        // Move towards target
        const movement = direction.normalize().scale(speed * deltaTime);
        const newPos = currentPos.add(movement);
        position.set(newPos, 'movement_interpolation');
    }
}
```

Client prediction isn't special code - it's just running this shared logic without waiting for the server.

### State History & Lag Compensation

The server maintains a rolling buffer of all state changes:

```typescript
// From ecs-app.ts - enable state history
NetworkReactiveEntity.enableStateHistory(1000);

// From GameWorld.ts - process late updates with automatic rewind
processClientInput(input: ClientInput): void {
    const entity = this.entities.get(input.entityId);
    if (!entity) return;
    
    // Get historical state at input time
    const historicalState = entity.getStateAt(input.timestamp);
    
    // Rewind entity
    entity.restoreState(historicalState);
    
    // Apply input
    if (input.action === 'moveTo') {
        entity.moveTo(input.parameters.target, input.parameters.source);
    }
    
    // Fast-forward back to present
    const timeSinceInput = Date.now() - input.timestamp;
    const steps = Math.ceil(timeSinceInput / 50);
    for (let i = 0; i < steps; i++) {
        entity.updateGameLogic(0.05);
    }
}
```

This is inspired by GGPO/Overwatch but even simpler - we just store property changes, not full snapshots.

Future dreams include p2p authoritative state transitions for deterministic shared game physics.

### Components and Reactive Properties

The ECS component pattern works perfectly with reactive properties. Components like RenderComponent observe state changes:

```typescript
import { RenderComponent } from '@engine/components';
import { GameObject } from '@engine/core';
import { MeshBuilder, StandardMaterial, ParticleSystem } from '@babylonjs/core';

// Visual components observe reactive properties
export class BallRenderComponent extends RenderComponent {
    private particleSystem?: ParticleSystem;
    private particleTexture?: Texture;      // 2MB texture
    private soundEffects?: Sound[];         // 10MB of audio
    private complexMaterial?: PBRMaterial;  // Shaders and textures
    
    protected createVisual(): void {
        // Create the mesh
        this.mesh = MeshBuilder.CreateSphere(
            `ball_${this.gameObject.id}`, 
            { diameter: 1.0 }, 
            this.scene
        );
        
        // Setup materials and effects
        this.material = new StandardMaterial(`mat_${this.gameObject.id}`, this.scene);
        this.setupParticles();
        this.loadAudioAssets();
    }
    
    attachTo(gameObject: GameObject): void {
        super.attachTo(gameObject);
        
        // Observe entity's reactive properties
        gameObject.observeProperty('colorState', () => this.updateVisuals());
        gameObject.observeProperty('isHovered', () => this.updateVisuals());
        gameObject.observeProperty('isMoving', (moving) => {
            if (moving) this.startParticles();
            else this.stopParticles();
        });
    }
    
    @ClientOnly  // Strips textures, audio, shaders from server bundle
    private updateVisuals(): void {
        // This could load 100MB+ of visual assets
        // Server doesn't need any of this data
        const colorState = this.gameObject.getNumericProperty('colorState')?.getValue();
        const isHovered = this.gameObject.getBooleanProperty('isHovered')?.isTrue();
        
        this.updateMaterial(colorState, isHovered);
        this.updateParticleColors();
    }
}

// Entities compose components with reactive properties
class Ball extends NetworkReactiveEntity {
    constructor() {
        super();
        this.createPropertiesFromSchema(BALL_SCHEMA);
        
        // Add components - they'll observe the reactive properties
        this.addComponent(new BallRenderComponent());
        this.addComponent(new MovementComponent());
    }
}
```

Components handle specific concerns (rendering, movement, sound) while reactive properties handle state and networking.

### Build-Time Code Separation

Currently the demo uses ClientBall/ServerBall classes, but the decorator system enables a single entity class with components:

```typescript
import { NetworkReactiveEntity } from '@engine/networking';
import { BallRenderComponent, MovementComponent } from '@game/components';

// Future: Single Ball class with decorators
export class Ball extends NetworkReactiveEntity {
    constructor() {
        super();
        this.createPropertiesFromSchema(BALL_SCHEMA);
        
        // Components handle their own concerns
        this.addComponent(new BallRenderComponent());  // Visuals
        this.addComponent(new MovementComponent());     // Physics
        
        // Entity just coordinates
        this.setupGameLogic();
    }
    
    private setupGameLogic(): void {
        // Game logic that runs on both client and server
        this.observeProperty('health', (health) => {
            if (health <= 0) this.die();
        });
    }
    
    @ServerOnly
    private generateLootTable(): string[] {
        // This code is stripped from client bundle entirely
        // Client literally can't access the loot algorithm
        return this.secretLootAlgorithm();
    }
    
    @ClientOnly
    private connectToVoiceChat(): void {
        // Hypothetical example - this code would be stripped from server bundle
        // Once I have the build system, @ClientOnly keeps client-specific APIs out of server
        this.voiceConnection = new RTCPeerConnection();
    }
}
```

Visual code lives in RenderComponents which naturally do nothing when headless. Decorators are for secrets, platform-specific APIs, and reducing bundle size.

## Working Example

The `ecs-app.ts` is a **local test harness** that simulates both client and server in a single browser window for demonstration:

```typescript
import { NaturalSyncNetworkManager } from '@engine/networking';
import { EntityFactory } from '@engine/core';
import { InputStateEntity, ReactiveInputEnricher } from '@engine/inputs';
import { Vector3 } from '@babylonjs/core';

// SIMULATION: Both sides running in one browser for testing
const clientNetworkManager = new NaturalSyncNetworkManager(clientRole);
const serverNetworkManager = new NaturalSyncNetworkManager(serverRole);

// SIMULATION: Fake network delay with setTimeout
let networkDelay = 0;
clientNetworkManager.setSendCallback((message) => {
    setTimeout(() => serverNetworkManager.handleMessage(message), networkDelay);
});

// SIMULATION: Two visual balls showing client vs server view
const clientBall = EntityFactory.create('ball', 'ball1', scene, clientRole);
const serverBall = EntityFactory.create('ball', 'ball1', scene, serverRole);

// Input state (client authoritative)
const clientInputState = new InputStateEntity('client_input', scene, clientRole);
const inputEnricher = new ReactiveInputEnricher(scene, clientInputState);

// Server gets a replica of client input
const serverInputState = new InputStateEntity('client_input', null, serverRole);

// Both observe the same input state
clientBall.observeInputState(clientInputState);
serverBall.observeInputState(serverInputState);

// Register for automatic sync
clientNetworkManager.registerEntity(clientBall);
serverNetworkManager.registerEntity(serverBall);
clientNetworkManager.registerEntity(clientInputState);

// Debug utilities for the simulation
(window as any).pureReactive = {
    setPing: (ms: number) => { networkDelay = ms; },
    separateBalls: () => {
        // Pull them apart visually to see the difference
        clientBall.getVectorProperty('position')?.set(new Vector3(-3, 0.5, 0));
        serverBall.getVectorProperty('position')?.set(new Vector3(3, 0.5, 0));
    }
};
```

In a **real deployment**:
- Client and server run largely the same Ball entity code
- Only small, specific differences in the bundles (secrets stripped from client, network authority differences, etc.)
- Write game logic once, runs identically on both sides
- They communicate via WebSockets (not setTimeout)

## Current State

This is messy experimental code. Working parts (see `ecs-app.ts`):

- **NetworkReactiveEntity** - Base class with reactive properties
- **ReactiveProperty system** - Observable state with typed variants (Boolean, Numeric, Vector, Collection)
- **NaturalSyncNetworkManager** - Automatic property sync based on authority
- **State history** - Lag compensation via rewind/replay
- **InputStateEntity** - Client input as reactive state
- **Ball entity** - Complete example with client/server variants

Messy parts that need cleanup:

- **Event spaghetti** - CollectionProperty has parallel event systems (itemAdded/itemRemoved) alongside the base onChange
- **Fake networking** - Currently using setTimeout instead of real WebSockets for the demo
- **Some legacy code** - Older game entities (trains/stations) from a previous prototype
- **Mixed patterns** - A few different approaches to entity setup still coexist

## If You're Exploring This

The interesting bits:
- `src/engine/networking/NetworkReactiveEntity.ts` - Base class with state history
- `src/engine/networking/NaturalSyncNetworkManager.ts` - Automatic property sync
- `src/engine/components/ReactivePropertyComponent.ts` - The property system with typed variants
- `src/engine/components/RenderComponent.ts` - Base component for visual rendering
- `src/engine/components/PositionComponent.ts` - Babylon TransformNode wrapper
- `src/engine/inputs/InputStateEntity.ts` - Input as reactive state
- `src/engine/inputs/ReactiveInputEnricher.ts` - Maps DOM/Babylon events to state
- `src/game/entities/Ball/` - Complete entity example with client/server split
- `src/game/systems/GameWorld.ts` - Tick management and lag compensation
- `src/ecs-app.ts` - Working test harness showing everything together

Skip:
- The docs folder (aspirational, not current)
- Old game entities (trains/stations from previous prototype)

This needs significant cleanup before it's usable by others. But the core idea - game state as reactive properties with automatic networking - works.

---

*An experiment in pragmatic multiplayer game architecture. Not novel, just trying to make the common cases simple.*
