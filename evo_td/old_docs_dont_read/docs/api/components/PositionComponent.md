# PositionComponent API Documentation

## Overview

The `PositionComponent` provides 3D position and rotation management for game entities. It's a core component required by most entities that exist in the game world.

## Import

```typescript
import { PositionComponent } from '../components/PositionComponent';
```

## Interfaces

### Position3D

```typescript
export interface Position3D {
    x: number;
    y: number;
    z: number;
}
```

### Rotation3D

```typescript
export interface Rotation3D {
    x: number;  // Pitch (rotation around X-axis)
    y: number;  // Yaw (rotation around Y-axis)
    z: number;  // Roll (rotation around Z-axis)
}
```

### PositionProperties

```typescript
export interface PositionProperties {
    position: Position3D;
    rotation: Rotation3D;
    lastPosition: Position3D;    // Previous position for velocity calculation
    positionHistory: Position3D[]; // Position tracking for debugging
    trackHistory: boolean;       // Whether to maintain position history
}
```

## Constructor

```typescript
constructor(initialPosition?: Partial<Position3D>, initialRotation?: Partial<Rotation3D>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| initialPosition | `Partial<Position3D>` | Starting position (defaults to origin) |
| initialRotation | `Partial<Rotation3D>` | Starting rotation (defaults to zero) |

## Properties

| Name | Type | Access | Description |
|------|------|--------|-------------|
| type | string | readonly | Component type identifier: `'position'` |

## Core Methods

### getPosition

```typescript
getPosition(): Position3D
```

Returns the current 3D position.

**Returns**: Copy of current position object.

**Example**:
```typescript
const posComponent = entity.getComponent<PositionComponent>('position');
const currentPos = posComponent.getPosition();
console.log(`Entity at (${currentPos.x}, ${currentPos.y}, ${currentPos.z})`);
```

### setPosition

```typescript
setPosition(position: Partial<Position3D>): void
```

Updates the entity's position.

| Parameter | Type | Description |
|-----------|------|-------------|
| position | `Partial<Position3D>` | New position (can be partial) |

**Example**:
```typescript
// Move entity to specific location
posComponent.setPosition({ x: 10, y: 0, z: 5 });

// Update only Y coordinate
posComponent.setPosition({ y: 10 });
```

### translateBy

```typescript
translateBy(offset: Partial<Position3D>): void
```

Moves the entity by the specified offset.

| Parameter | Type | Description |
|-----------|------|-------------|
| offset | `Partial<Position3D>` | Amount to move in each axis |

**Example**:
```typescript
// Move entity 5 units forward (assuming Z is forward)
posComponent.translateBy({ z: 5 });

// Move diagonally
posComponent.translateBy({ x: 2, z: 3 });
```

### getRotation

```typescript
getRotation(): Rotation3D
```

Returns the current rotation.

**Returns**: Copy of current rotation object.

### setRotation

```typescript
setRotation(rotation: Partial<Rotation3D>): void
```

Updates the entity's rotation.

| Parameter | Type | Description |
|-----------|------|-------------|
| rotation | `Partial<Rotation3D>` | New rotation in radians |

### rotateBy

```typescript
rotateBy(deltaRotation: Partial<Rotation3D>): void
```

Rotates the entity by the specified amount.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaRotation | `Partial<Rotation3D>` | Rotation change in radians |

## Utility Methods

### distanceTo

```typescript
distanceTo(otherPosition: Position3D): number
```

Calculates the 3D distance to another position.

| Parameter | Type | Description |
|-----------|------|-------------|
| otherPosition | `Position3D` | Target position |

**Returns**: Distance in world units.

**Example**:
```typescript
const target = { x: 10, y: 0, z: 10 };
const distance = posComponent.distanceTo(target);
if (distance < 5) {
    console.log('Target is within range');
}
```

### distanceToEntity

```typescript
distanceToEntity(entity: GameObject): number | null
```

Calculates distance to another entity with a PositionComponent.

| Parameter | Type | Description |
|-----------|------|-------------|
| entity | `GameObject` | Target entity |

**Returns**: Distance in world units, or null if target has no PositionComponent.

### isWithinRange

```typescript
isWithinRange(targetPosition: Position3D, range: number): boolean
```

Checks if a position is within the specified range.

| Parameter | Type | Description |
|-----------|------|-------------|
| targetPosition | `Position3D` | Position to check |
| range | `number` | Maximum distance |

**Returns**: `true` if target is within range.

### getVelocity

```typescript
getVelocity(): Position3D
```

Calculates velocity based on position change since last update.

**Returns**: Velocity vector (units per second).

**Note**: Requires component to have been updated at least once.

## Advanced Methods

### lookAt

```typescript
lookAt(targetPosition: Position3D): void
```

Rotates the entity to face the target position.

| Parameter | Type | Description |
|-----------|------|-------------|
| targetPosition | `Position3D` | Position to face |

### getForwardVector

```typescript
getForwardVector(): Position3D
```

Returns the forward direction based on current rotation.

**Returns**: Normalized forward vector.

### getRightVector

```typescript
getRightVector(): Position3D
```

Returns the right direction based on current rotation.

**Returns**: Normalized right vector.

### getUpVector

```typescript
getUpVector(): Position3D
```

Returns the up direction based on current rotation.

**Returns**: Normalized up vector.

## History and Debugging

### enablePositionHistory

```typescript
enablePositionHistory(maxHistorySize: number = 60): void
```

Enables position history tracking for debugging.

| Parameter | Type | Description |
|-----------|------|-------------|
| maxHistorySize | `number` | Maximum history entries to keep |

### getPositionHistory

```typescript
getPositionHistory(): Position3D[]
```

Returns the position history array.

**Returns**: Array of previous positions (most recent first).

### clearPositionHistory

```typescript
clearPositionHistory(): void
```

Clears the position history.

## Babylon.js Integration

### toBabylonVector3

```typescript
toBabylonVector3(): Vector3
```

Converts position to Babylon.js Vector3.

**Returns**: Babylon.js Vector3 object.

### fromBabylonVector3

```typescript
fromBabylonVector3(vector: Vector3): void
```

Updates position from Babylon.js Vector3.

| Parameter | Type | Description |
|-----------|------|-------------|
| vector | `Vector3` | Babylon.js Vector3 |

## Usage Examples

### Basic Entity Positioning

```typescript
const station = new Station(stationConfig);

// Add position component
const positionComponent = new PositionComponent(
    { x: -20, y: 0, z: 0 },  // Position
    { x: 0, y: Math.PI/4, z: 0 }  // 45-degree Y rotation
);

station.addComponent(positionComponent);

// Later: move station
positionComponent.translateBy({ x: 5 });
```

### Train Movement

```typescript
const train = new Train(trainConfig);
const posComponent = train.getComponent<PositionComponent>('position');

// Move train along a path
const waypoints = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 5 },
    { x: 20, y: 0, z: 0 }
];

let currentWaypoint = 0;
function moveToNextWaypoint() {
    if (currentWaypoint < waypoints.length) {
        posComponent.setPosition(waypoints[currentWaypoint]);
        currentWaypoint++;
    }
}
```

### Enemy AI Targeting

```typescript
const enemy = new Enemy(enemyConfig);
const enemyPos = enemy.getComponent<PositionComponent>('position');

// Find nearby targets
function findNearbyTargets(entities: GameObject[], range: number): GameObject[] {
    return entities.filter(entity => {
        const targetPos = entity.getComponent<PositionComponent>('position');
        return targetPos && enemyPos.distanceToEntity(entity)! < range;
    });
}

// Face target
function faceTarget(target: GameObject): void {
    const targetPos = target.getComponent<PositionComponent>('position');
    if (targetPos) {
        enemyPos.lookAt(targetPos.getPosition());
    }
}
```

### Camera Following

```typescript
const train = new Train(trainConfig);
const trainPos = train.getComponent<PositionComponent>('position');

// Update camera to follow train
function updateCamera(camera: ArcRotateCamera): void {
    const currentPos = trainPos.getPosition();
    
    // Set camera target to train position
    camera.target = new Vector3(currentPos.x, currentPos.y, currentPos.z);
    
    // Offset camera based on train's forward direction
    const forwardVector = trainPos.getForwardVector();
    const cameraOffset = {
        x: currentPos.x - forwardVector.x * 10,
        y: currentPos.y + 5,
        z: currentPos.z - forwardVector.z * 10
    };
    
    camera.position = new Vector3(cameraOffset.x, cameraOffset.y, cameraOffset.z);
}
```

### Position Interpolation

```typescript
// Smooth movement between positions
class PositionInterpolator {
    private startPos: Position3D;
    private endPos: Position3D;
    private duration: number;
    private elapsed: number = 0;
    
    constructor(
        private posComponent: PositionComponent,
        targetPos: Position3D,
        duration: number
    ) {
        this.startPos = posComponent.getPosition();
        this.endPos = targetPos;
        this.duration = duration;
    }
    
    update(deltaTime: number): boolean {
        this.elapsed += deltaTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        
        // Linear interpolation
        const lerpedPos = {
            x: this.startPos.x + (this.endPos.x - this.startPos.x) * progress,
            y: this.startPos.y + (this.endPos.y - this.startPos.y) * progress,
            z: this.startPos.z + (this.endPos.z - this.startPos.z) * progress
        };
        
        this.posComponent.setPosition(lerpedPos);
        
        return progress >= 1; // Return true when complete
    }
}
```

## Integration with Other Components

### With MovementComponent

```typescript
// Position and Movement work together
const entity = new GameObject('moving_entity');
const position = new PositionComponent({ x: 0, y: 0, z: 0 });
const movement = new MovementComponent({ speed: 5 });

entity.addComponent(position);
entity.addComponent(movement);

// In system update:
const velocity = movement.getVelocity();
position.translateBy({
    x: velocity.x * deltaTime,
    y: velocity.y * deltaTime,
    z: velocity.z * deltaTime
});
```

### With Rendering

```typescript
// Sync with visual representation
const meshPosition = posComponent.toBabylonVector3();
entityMesh.position = meshPosition;

const rotation = posComponent.getRotation();
entityMesh.rotation = new Vector3(rotation.x, rotation.y, rotation.z);
```

## Performance Considerations

- **Position History**: Only enable for debugging; has memory impact
- **Distance Calculations**: Cache results when checking multiple distances
- **Babylon.js Conversion**: Minimize conversions in render loops
- **Update Frequency**: Consider updating position less frequently for distant objects

## Common Patterns

### Validation
```typescript
// Validate positions are within world bounds
if (Math.abs(position.x) > WORLD_SIZE || Math.abs(position.z) > WORLD_SIZE) {
    console.warn('Entity outside world bounds');
    posComponent.setPosition({ x: 0, y: 0, z: 0 }); // Reset to origin
}
```

### Snapping to Grid
```typescript
// Snap position to grid
const gridSize = 1.0;
const currentPos = posComponent.getPosition();
posComponent.setPosition({
    x: Math.round(currentPos.x / gridSize) * gridSize,
    y: currentPos.y,
    z: Math.round(currentPos.z / gridSize) * gridSize
});
```
