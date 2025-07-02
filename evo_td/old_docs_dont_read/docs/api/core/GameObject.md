# GameObject

## Overview
`GameObject` is the base class for all game entities in the ECS architecture. It provides component management, observability features, and lifecycle management.

## Import
```typescript
import { GameObject } from '../core/GameObject';
```

## Constructor
```typescript
constructor(public readonly type: string) 
```

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Type identifier for this game object |

## Properties

| Name | Type | Access | Description |
|------|------|--------|-------------|
| id | string | readonly | Unique identifier for this GameObject |
| type | string | readonly | Type identifier for this GameObject |

## Methods

### Component Management

#### addComponent
```typescript
addComponent(component: Component): void
```
Adds a component to this GameObject.

| Parameter | Type | Description |
|-----------|------|-------------|
| component | Component | The component instance to add |

#### getComponent
```typescript
getComponent<T extends Component>(type: string): T | undefined
```
Gets a component by type.

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | The component type string |

**Returns**: The component instance or undefined if not found.

#### removeComponent
```typescript
removeComponent(type: string): void
```
Removes a component by type.

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | The component type string |

#### hasComponent
```typescript
hasComponent(type: string): boolean
```
Returns true if this object has a component of the given type.

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | The component type string |

**Returns**: Boolean indicating if the component exists.

### Lifecycle Management

#### update
```typescript
update(deltaTime: number): void
```
Calls update on all components.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | number | Time since last update in seconds |

#### dispose
```typescript
dispose(): void
```
Disposes this GameObject and all its components.

#### isDisposed
```typescript
isDisposed(): boolean
```
Returns whether this object has been disposed.

**Returns**: Boolean indicating if the object is disposed.

### Observability

#### emitEvent (protected)
```typescript
protected emitEvent(event: any): void
```
Emits an event for observability.

| Parameter | Type | Description |
|-----------|------|-------------|
| event | any | The event object |

#### logMetric (protected)
```typescript
protected logMetric(metric: string, value: number): void
```
Logs a metric for observability.

| Parameter | Type | Description |
|-----------|------|-------------|
| metric | string | The metric name |
| value | number | The value to add |

#### getMetrics
```typescript
getMetrics(): Map<string, number>
```
Gets all metrics collected for this object.

**Returns**: A copy of the metrics map.

## Data Flow
```
                     ┌─────────────────────┐
                     │                     │
                     ▼                     │
┌───────────────┐   ┌───────────────┐   ┌─┴─────────────┐
│ User Input    │──►│ Event System  │◄──┤ Game Systems  │
└───────────────┘   └───────┬───────┘   └───────┬───────┘
                           │                   │
                           ▼                   ▼
                    ┌───────────────┐   ┌───────────────┐
                    │ State Update  │◄──┤ Network Sync  │
                    └───────┬───────┘   └───────────────┘
                           │
                           ▼
                    ┌───────────────┐
                    │ Visual Update │
                    └───────────────┘
```

The Event System acts as a central hub:
1. It receives input from users and network
2. Game systems both consume and produce events
3. Events drive state changes
4. State changes trigger visual updates
5. Systems can react to each other's events

## Example

```typescript
// Create a new game object
const train = new GameObject('train');

// Add components
train.addComponent(new PositionComponent());
train.addComponent(new MovementComponent(0.1));

// Access components
const position = train.getComponent<PositionComponent>('position');
if (position) {
    position.setPosition({ x: 10, y: 0, z: 5 });
}

// Update the GameObject
train.update(0.016); // 16ms frame

// Check component existence
if (train.hasComponent('health')) {
    // Do something with health component
}

// Cleanup when done
train.dispose();
```