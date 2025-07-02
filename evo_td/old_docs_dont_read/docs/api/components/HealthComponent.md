# HealthComponent API Documentation

## Overview

The `HealthComponent` provides health management functionality for game entities, handling damage, healing, and death states.

## Import

```typescript
import { HealthComponent } from '../components/HealthComponent';
```

## Interface

### HealthProperties

```typescript
export interface HealthProperties {
    maxHealth: number;          // Maximum hit points
    currentHealth: number;      // Current hit points
    damageMultiplier: number;   // Multiplier for incoming damage (default: 1.0)
    healingRate: number;        // Passive healing per second (default: 0)
}
```

### Default Properties

```typescript
const DEFAULT_HEALTH_PROPERTIES: HealthProperties = {
    maxHealth: 100,
    currentHealth: 100,
    damageMultiplier: 1.0,
    healingRate: 0
};
```

## Constructor

```typescript
constructor(properties?: Partial<HealthProperties>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| properties | `Partial<HealthProperties>` | Optional health configuration |

## Properties

| Name | Type | Access | Description |
|------|------|--------|-------------|
| type | string | readonly | Component type identifier: `'health'` |

## Methods

### takeDamage

```typescript
takeDamage(amount: number): boolean
```

Applies damage to the entity.

| Parameter | Type | Description |
|-----------|------|-------------|
| amount | number | Damage amount (before multiplier) |

**Returns**: `true` if the entity died from this damage, `false` otherwise.

**Example**:
```typescript
const healthComponent = entity.getComponent<HealthComponent>('health');
const died = healthComponent.takeDamage(25);
if (died) {
    // Handle entity death
}
```

### heal

```typescript
heal(amount: number): void
```

Restores health to the entity (cannot exceed max health).

| Parameter | Type | Description |
|-----------|------|-------------|
| amount | number | Healing amount |

**Example**:
```typescript
const healthComponent = entity.getComponent<HealthComponent>('health');
healthComponent.heal(50);
```

### isDead

```typescript
isDead(): boolean
```

Returns whether the entity's health has reached zero.

**Returns**: `true` if current health <= 0, `false` otherwise.

### isAlive

```typescript
isAlive(): boolean
```

Returns whether the entity is still alive.

**Returns**: `true` if current health > 0, `false` otherwise.

### getHealthPercentage

```typescript
getHealthPercentage(): number
```

Returns health as a percentage of maximum health.

**Returns**: Number between 0.0 and 1.0 representing health percentage.

**Example**:
```typescript
const healthPercent = healthComponent.getHealthPercentage();
if (healthPercent < 0.25) {
    // Entity is critically injured
}
```

### getCurrentHealth

```typescript
getCurrentHealth(): number
```

Returns the current health value.

**Returns**: Current hit points.

### getMaxHealth

```typescript
getMaxHealth(): number
```

Returns the maximum health value.

**Returns**: Maximum hit points.

### setMaxHealth

```typescript
setMaxHealth(maxHealth: number): void
```

Updates the maximum health value.

| Parameter | Type | Description |
|-----------|------|-------------|
| maxHealth | number | New maximum health value |

**Note**: If current health exceeds new maximum, it will be capped.

### getDamageMultiplier

```typescript
getDamageMultiplier(): number
```

Returns the current damage multiplier.

**Returns**: Damage multiplier (1.0 = normal damage).

### setDamageMultiplier

```typescript
setDamageMultiplier(multiplier: number): void
```

Updates the damage multiplier.

| Parameter | Type | Description |
|-----------|------|-------------|
| multiplier | number | New damage multiplier (0.5 = half damage, 2.0 = double damage) |

### getHealingRate

```typescript
getHealingRate(): number
```

Returns the passive healing rate per second.

**Returns**: Healing points per second.

### setHealingRate

```typescript
setHealingRate(rate: number): void
```

Updates the passive healing rate.

| Parameter | Type | Description |
|-----------|------|-------------|
| rate | number | Healing points per second |

## Update Method

```typescript
update(deltaTime: number): void
```

Processes passive healing over time.

| Parameter | Type | Description |
|-----------|------|-------------|
| deltaTime | number | Time elapsed since last update (seconds) |

**Note**: This method is called automatically by the entity's update cycle.

## Usage Examples

### Basic Enemy Health

```typescript
const enemy = new Enemy(enemyConfig);

// Add health component with enemy-specific stats
const healthComponent = new HealthComponent({
    maxHealth: 150,
    currentHealth: 150,
    damageMultiplier: 1.0,
    healingRate: 0
});

enemy.addComponent(healthComponent);
```

### Armored Unit

```typescript
// Heavily armored unit with damage resistance
const armorComponent = new HealthComponent({
    maxHealth: 300,
    currentHealth: 300,
    damageMultiplier: 0.5,  // Takes half damage
    healingRate: 2          // Regenerates 2 HP/second
});
```

### Player Train Car

```typescript
// Train car with repair capabilities
const carHealth = new HealthComponent({
    maxHealth: 200,
    currentHealth: 180,     // Starts slightly damaged
    damageMultiplier: 1.2,  // Takes extra damage (fragile)
    healingRate: 1          // Slow auto-repair
});
```

## Integration with Other Systems

### Combat System

```typescript
// Weapon dealing damage to target
const targetHealth = target.getComponent<HealthComponent>('health');
if (targetHealth) {
    const killed = targetHealth.takeDamage(weaponDamage);
    if (killed) {
        this.handleEntityDeath(target);
    }
}
```

### UI Health Bars

```typescript
// Update health display
const healthComponent = entity.getComponent<HealthComponent>('health');
const healthPercent = healthComponent.getHealthPercentage();

healthBar.style.width = `${healthPercent * 100}%`;
healthBar.style.backgroundColor = healthPercent > 0.5 ? 'green' : 
                                 healthPercent > 0.25 ? 'yellow' : 'red';
```

### Status Effects

```typescript
// Temporary damage boost/reduction
const originalMultiplier = healthComponent.getDamageMultiplier();

// Apply damage boost for 10 seconds
healthComponent.setDamageMultiplier(originalMultiplier * 1.5);

setTimeout(() => {
    healthComponent.setDamageMultiplier(originalMultiplier);
}, 10000);
```
