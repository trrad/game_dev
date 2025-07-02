# MovementComponent API Documentation

## Overview

The `MovementComponent` handles velocity, acceleration, and movement calculations for game entities. It works closely with `PositionComponent` to provide smooth, time-based movement.

## Import

```typescript
import { MovementComponent } from '../components/MovementComponent';
```

## Interfaces

### Velocity3D

```typescript
export interface Velocity3D {
    x: number;  // Units per second
    y: number;  // Units per second  
    z: number;  // Units per second
}
```

### MovementProperties

```typescript
export interface MovementProperties {
    velocity: Velocity3D;
    maxSpeed: number;           // Maximum movement speed
    acceleration: number;       // Acceleration rate (units/second²)
    deceleration: number;       // Deceleration rate (units/second²)
    friction: number;           // Friction coefficient (0.0-1.0)
    enablePhysics: boolean;     // Whether to apply physics calculations
    groundLevel: number;        // Y coordinate considered as ground
    enableGravity: boolean;     // Whether to apply gravity
    gravityStrength: number;    // Gravity acceleration (units/second²)
}
```

### Default Properties

```typescript
const DEFAULT_MOVEMENT_PROPERTIES: MovementProperties = {
    velocity: { x: 0, y: 0, z: 0 },
    maxSpeed: 10,
    acceleration: 5,
    deceleration: 8,
    friction: 0.95,
    enablePhysics: true,
    groundLevel: 0,
    enableGravity: false,
    gravityStrength: 9.81
};
```

## Constructor

```typescript
constructor(properties?: Partial<MovementProperties>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| properties | `Partial<MovementProperties>` | Optional movement configuration |

## Properties

| Name | Type | Access | Description |
|------|------|--------|-------------|
| type | string | readonly | Component type identifier: `'movement'` |

## Core Methods

### getVelocity

```typescript
getVelocity(): Velocity3D
```

Returns the current velocity vector.

**Returns**: Copy of current velocity.

### setVelocity

```typescript
setVelocity(velocity: Partial<Velocity3D>): void
```

Sets the velocity vector.

| Parameter | Type | Description |
|-----------|------|-------------|
| velocity | `Partial<Velocity3D>` | New velocity (can be partial) |

**Example**:
```typescript
const movement = entity.getComponent<MovementComponent>('movement');

// Set full velocity
movement.setVelocity({ x: 5, y: 0, z: -3 });

// Set only forward velocity
movement.setVelocity({ z: 10 });
```

### addVelocity

```typescript
addVelocity(deltaVelocity: Partial<Velocity3D>): void
```

Adds to the current velocity.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaVelocity | `Partial<Velocity3D>` | Velocity to add |

### getSpeed

```typescript
getSpeed(): number
```

Returns the magnitude of the velocity vector.

**Returns**: Current speed in units per second.

### setSpeed

```typescript
setSpeed(speed: number): void
```

Sets the speed while maintaining direction.

| Parameter | Type | Description |
|-----------|------|-------------|
| speed | `number` | New speed magnitude |

## Movement Control

### accelerateToward

```typescript
accelerateToward(direction: Velocity3D, deltaTime: number): void
```

Applies acceleration in the specified direction.

| Parameter | Type | Description |
|-----------|------|-------------|
| direction | `Velocity3D` | Direction to accelerate (will be normalized) |
| deltaTime | `number` | Time step for acceleration |

**Example**:
```typescript
// Accelerate forward
movement.accelerateToward({ x: 0, y: 0, z: 1 }, deltaTime);

// Accelerate toward a target
const targetDirection = { x: 1, y: 0, z: 1 }; // Northeast
movement.accelerateToward(targetDirection, deltaTime);
```

### decelerate

```typescript
decelerate(deltaTime: number): void
```

Applies deceleration to gradually stop movement.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | `number` | Time step for deceleration |

### stop

```typescript
stop(): void
```

Immediately sets velocity to zero.

### applyImpulse

```typescript
applyImpulse(impulse: Velocity3D): void
```

Applies an instantaneous velocity change.

| Parameter | Type | Description |
|-----------|------|-------------|
| impulse | `Velocity3D` | Immediate velocity change |

**Example**:
```typescript
// Apply explosion knockback
movement.applyImpulse({ x: -5, y: 2, z: -5 });

// Apply jump
movement.applyImpulse({ x: 0, y: 8, z: 0 });
```

## Physics and Constraints

### applyFriction

```typescript
applyFriction(deltaTime: number): void
```

Applies friction to reduce velocity over time.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | `number` | Time step for friction calculation |

### applyGravity

```typescript
applyGravity(deltaTime: number): void
```

Applies gravitational acceleration (if enabled).

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | `number` | Time step for gravity |

### constrainToMaxSpeed

```typescript
constrainToMaxSpeed(): void
```

Ensures velocity doesn't exceed maximum speed.

### getMaxSpeed

```typescript
getMaxSpeed(): number
```

Returns the maximum allowed speed.

### setMaxSpeed

```typescript
setMaxSpeed(maxSpeed: number): void
```

Updates the maximum speed limit.

## Configuration Methods

### setAcceleration

```typescript
setAcceleration(acceleration: number): void
```

Sets the acceleration rate.

### setDeceleration

```typescript
setDeceleration(deceleration: number): void
```

Sets the deceleration rate.

### setFriction

```typescript
setFriction(friction: number): void
```

Sets the friction coefficient (0.0 = no friction, 1.0 = maximum friction).

### enablePhysics

```typescript
enablePhysics(enabled: boolean): void
```

Enables or disables physics calculations.

### enableGravity

```typescript
enableGravity(enabled: boolean): void
```

Enables or disables gravity.

## Update Method

```typescript
update(deltaTime: number): void
```

Processes movement physics and updates velocity.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | `number` | Time elapsed since last update |

**Note**: This method is called automatically by the entity's update cycle.

## Integration Methods

### updatePosition

```typescript
updatePosition(positionComponent: PositionComponent, deltaTime: number): void
```

Updates the entity's position based on current velocity.

| Parameter | Type | Description |
|-----------|------|-------------|
| positionComponent | `PositionComponent` | Position component to update |
| deltaTime | `number` | Time step for movement |

## Utility Methods

### isMoving

```typescript
isMoving(threshold: number = 0.01): boolean
```

Checks if the entity is currently moving.

| Parameter | Type | Description |
|-----------|------|-------------|
| threshold | `number` | Minimum speed to consider as "moving" |

**Returns**: `true` if speed exceeds threshold.

### getDirection

```typescript
getDirection(): Velocity3D
```

Returns the normalized direction of movement.

**Returns**: Unit vector indicating direction, or zero vector if not moving.

### isMovingToward

```typescript
isMovingToward(targetPosition: Position3D, currentPosition: Position3D): boolean
```

Checks if current movement is toward a target.

| Parameter | Type | Description |
|-----------|------|-------------|
| targetPosition | `Position3D` | Target position |
| currentPosition | `Position3D` | Current position |

**Returns**: `true` if moving toward target.

## Usage Examples

### Basic Movement Setup

```typescript
const train = new Train(trainConfig);

// Add movement component
const movement = new MovementComponent({
    maxSpeed: 15,           // 15 units per second max
    acceleration: 8,        // Accelerate at 8 units/second²
    deceleration: 12,       // Quick stopping
    friction: 0.98,         // Low friction for smooth movement
    enablePhysics: true
});

train.addComponent(movement);
```

### Player-Controlled Movement

```typescript
class PlayerController {
    private movement: MovementComponent;
    
    constructor(private entity: GameObject) {
        this.movement = entity.getComponent<MovementComponent>('movement')!;
    }
    
    handleInput(input: InputState, deltaTime: number): void {
        const direction = { x: 0, y: 0, z: 0 };
        
        if (input.forward) direction.z += 1;
        if (input.backward) direction.z -= 1;
        if (input.left) direction.x -= 1;
        if (input.right) direction.x += 1;
        
        if (direction.x !== 0 || direction.z !== 0) {
            this.movement.accelerateToward(direction, deltaTime);
        } else {
            this.movement.decelerate(deltaTime);
        }
    }
}
```

### AI Movement

```typescript
class EnemyAI {
    private movement: MovementComponent;
    private position: PositionComponent;
    
    constructor(private enemy: GameObject) {
        this.movement = enemy.getComponent<MovementComponent>('movement')!;
        this.position = enemy.getComponent<PositionComponent>('position')!;
    }
    
    moveToward(targetPosition: Position3D, deltaTime: number): void {
        const currentPos = this.position.getPosition();
        
        // Calculate direction to target
        const direction = {
            x: targetPosition.x - currentPos.x,
            y: targetPosition.y - currentPos.y,
            z: targetPosition.z - currentPos.z
        };
        
        // Check if close enough to target
        const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
        
        if (distance > 1.0) {
            // Move toward target
            this.movement.accelerateToward(direction, deltaTime);
        } else {
            // Stop when close
            this.movement.decelerate(deltaTime);
        }
    }
}
```

### Train Movement System

```typescript
export class TrainSystem {
    updateTrainMovement(train: Train, deltaTime: number): void {
        const movement = train.getComponent<MovementComponent>('movement');
        const position = train.getComponent<PositionComponent>('position');
        
        if (!movement || !position) return;
        
        // Apply train-specific movement logic
        if (train.isOnRail()) {
            // Constrain movement to rail path
            const railDirection = train.getCurrentRailDirection();
            const currentSpeed = movement.getSpeed();
            
            movement.setVelocity({
                x: railDirection.x * currentSpeed,
                y: 0, // Trains don't move vertically
                z: railDirection.z * currentSpeed
            });
        }
        
        // Update position based on movement
        movement.updatePosition(position, deltaTime);
    }
}
```

### Physics Integration

```typescript
const physicsEntity = new GameObject('physics_object');

const movement = new MovementComponent({
    maxSpeed: 20,
    acceleration: 10,
    friction: 0.9,
    enablePhysics: true,
    enableGravity: true,
    gravityStrength: 9.81,
    groundLevel: 0
});

// In system update:
function updatePhysics(entity: GameObject, deltaTime: number): void {
    const movement = entity.getComponent<MovementComponent>('movement');
    const position = entity.getComponent<PositionComponent>('position');
    
    if (movement && position) {
        // Physics are automatically applied in movement.update()
        movement.update(deltaTime);
        
        // Handle ground collision
        const currentPos = position.getPosition();
        if (currentPos.y <= movement.getGroundLevel()) {
            position.setPosition({ y: movement.getGroundLevel() });
            
            // Stop downward velocity on ground contact
            const velocity = movement.getVelocity();
            if (velocity.y < 0) {
                movement.setVelocity({ y: 0 });
            }
        }
        
        // Apply movement to position
        movement.updatePosition(position, deltaTime);
    }
}
```

### Vehicle Steering

```typescript
class VehicleSteering {
    constructor(
        private movement: MovementComponent,
        private position: PositionComponent
    ) {}
    
    steer(steerDirection: number, deltaTime: number): void {
        // steerDirection: -1 (left) to 1 (right)
        const currentVelocity = this.movement.getVelocity();
        const speed = this.movement.getSpeed();
        
        if (speed > 0.1) {
            // Calculate new direction based on steering
            const currentRotation = this.position.getRotation();
            const steerAmount = steerDirection * 2.0 * deltaTime; // Steering sensitivity
            
            this.position.rotateBy({ y: steerAmount });
            
            // Update velocity to match new direction
            const forwardVector = this.position.getForwardVector();
            this.movement.setVelocity({
                x: forwardVector.x * speed,
                y: currentVelocity.y,
                z: forwardVector.z * speed
            });
        }
    }
    
    brake(deltaTime: number): void {
        this.movement.decelerate(deltaTime);
    }
    
    accelerate(deltaTime: number): void {
        const forwardVector = this.position.getForwardVector();
        this.movement.accelerateToward(forwardVector, deltaTime);
    }
}
```

## Integration with Other Components

### With PositionComponent

```typescript
// Standard integration pattern
function updateEntityMovement(entity: GameObject, deltaTime: number): void {
    const movement = entity.getComponent<MovementComponent>('movement');
    const position = entity.getComponent<PositionComponent>('position');
    
    if (movement && position) {
        // Movement component handles physics
        movement.update(deltaTime);
        
        // Update position based on velocity
        movement.updatePosition(position, deltaTime);
    }
}
```

### With HealthComponent

```typescript
// Reduce movement when damaged
const health = entity.getComponent<HealthComponent>('health');
const movement = entity.getComponent<MovementComponent>('movement');

if (health && movement) {
    const healthPercent = health.getHealthPercentage();
    const baseSpeed = 10;
    
    // Reduce speed when injured
    movement.setMaxSpeed(baseSpeed * healthPercent);
}
```

## Performance Considerations

- **Update Frequency**: Consider updating distant entities less frequently
- **Physics Calculations**: Disable physics for static or very slow entities
- **Velocity Thresholds**: Use `isMoving()` to skip processing for stationary entities
- **Batch Processing**: Process similar entities together in systems

## Common Patterns

### Smooth Stopping
```typescript
// Gradually reduce speed instead of immediate stop
if (shouldStop) {
    movement.decelerate(deltaTime);
} else {
    movement.accelerateToward(targetDirection, deltaTime);
}
```

### Speed Boosting
```typescript
// Temporary speed boost
const originalMaxSpeed = movement.getMaxSpeed();
movement.setMaxSpeed(originalMaxSpeed * 2);

setTimeout(() => {
    movement.setMaxSpeed(originalMaxSpeed);
}, 5000); // 5-second boost
```

### Movement State Machine
```typescript
enum MovementState {
    IDLE,
    ACCELERATING,
    CRUISING,
    DECELERATING
}

class MovementStateMachine {
    private state = MovementState.IDLE;
    
    update(movement: MovementComponent, deltaTime: number): void {
        switch (this.state) {
            case MovementState.ACCELERATING:
                movement.accelerateToward(this.targetDirection, deltaTime);
                if (movement.getSpeed() >= movement.getMaxSpeed() * 0.9) {
                    this.state = MovementState.CRUISING;
                }
                break;
                
            case MovementState.CRUISING:
                // Maintain current velocity
                break;
                
            case MovementState.DECELERATING:
                movement.decelerate(deltaTime);
                if (movement.getSpeed() < 0.1) {
                    this.state = MovementState.IDLE;
                }
                break;
        }
    }
}
