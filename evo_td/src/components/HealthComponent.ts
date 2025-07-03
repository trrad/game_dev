/**
 * Handles health, damage, and death mechanics for game entities
 */
import { Component } from '../engine/core/Component';

export interface HealthState {
    health: number;
    maxHealth: number;
    isDead: boolean;
    lastDamageTime: number;
    regenerationRate: number; // HP per second
    damageResistances: {
        kinetic: number;    // 0.0 = immune, 1.0 = normal, 2.0 = vulnerable
        explosive: number;
        energy: number;
        fire: number;
        cold: number;
        toxic: number;
        radiation: number;
    };
}

export class HealthComponent extends Component<HealthState> {
    public readonly type = 'health';

    private _health: number;
    private _maxHealth: number;
    private _isDead: boolean = false;
    private _lastDamageTime: number = 0;
    private _regenerationRate: number = 0;
    private _damageResistances: HealthState['damageResistances'];

    constructor(
        maxHealth: number = 100,
        regenerationRate: number = 0,
        resistances?: Partial<HealthState['damageResistances']>
    ) {
        super();
        this._maxHealth = maxHealth;
        this._health = maxHealth;
        this._regenerationRate = regenerationRate;
        this._damageResistances = {
            kinetic: 1.0,
            explosive: 1.0,
            energy: 1.0,
            fire: 1.0,
            cold: 1.0,
            toxic: 1.0,
            radiation: 1.0,
            ...resistances
        };
    }

    /**
     * Apply damage with type-specific resistance
     */
    public takeDamage(amount: number, damageType: keyof HealthState['damageResistances'] = 'kinetic'): number {
        if (this._isDead) return 0;

        const resistance = this._damageResistances[damageType];
        const actualDamage = Math.max(0, amount * resistance);

        this._health = Math.max(0, this._health - actualDamage);
        this._lastDamageTime = performance.now();

        if (this._health <= 0) {
            this._isDead = true;
        }

        return actualDamage;
    }

    /**
     * Heal the entity
     */
    public heal(amount: number): number {
        if (this._isDead) return 0;

        const oldHealth = this._health;
        this._health = Math.min(this._maxHealth, this._health + amount);
        return this._health - oldHealth;
    }

    /**
     * Update regeneration over time
     */
    public update(deltaTime: number): void {
        if (this._isDead || this._regenerationRate <= 0) return;

        // Only regenerate if not recently damaged (3 seconds)
        const timeSinceLastDamage = (performance.now() - this._lastDamageTime) / 1000;
        if (timeSinceLastDamage >= 3.0) {
            this.heal(this._regenerationRate * deltaTime);
        }
    }

    // Getters
    public getHealth(): number { return this._health; }
    public getMaxHealth(): number { return this._maxHealth; }
    public getHealthPercentage(): number { return this._health / this._maxHealth; }
    public isDead(): boolean { return this._isDead; }
    public getRegenerationRate(): number { return this._regenerationRate; }
    public getDamageResistances(): HealthState['damageResistances'] { return { ...this._damageResistances }; }

    // Setters
    public setMaxHealth(maxHealth: number): void {
        this._maxHealth = maxHealth;
        this._health = Math.min(this._health, maxHealth);
    }

    public setRegenerationRate(rate: number): void {
        this._regenerationRate = Math.max(0, rate);
    }

    public setResistance(damageType: keyof HealthState['damageResistances'], resistance: number): void {
        this._damageResistances[damageType] = Math.max(0, resistance);
    }

    public getState(): HealthState {
        return {
            health: this._health,
            maxHealth: this._maxHealth,
            isDead: this._isDead,
            lastDamageTime: this._lastDamageTime,
            regenerationRate: this._regenerationRate,
            damageResistances: { ...this._damageResistances }
        };
    }

    public setState(state: Partial<HealthState>): void {
        if (state.health !== undefined) this._health = state.health;
        if (state.maxHealth !== undefined) this._maxHealth = state.maxHealth;
        if (state.isDead !== undefined) this._isDead = state.isDead;
        if (state.lastDamageTime !== undefined) this._lastDamageTime = state.lastDamageTime;
        if (state.regenerationRate !== undefined) this._regenerationRate = state.regenerationRate;
        if (state.damageResistances !== undefined) {
            this._damageResistances = { ...state.damageResistances };
        }
    }

    // Component interface implementation
    public serialize(): HealthState {
        return this.getState();
    }

    public deserialize(data: HealthState): void {
        this.setState(data);
    }
}