/**
 * Base class for all components in the ECS architecture.
 * Components add functionality to GameObjects and support observability and disposal.
 */
import type { GameObject } from './GameObject';

export abstract class Component<T = any> {
    /** The type string for this component */
    public abstract readonly type: string;
    /** Reference to the parent GameObject */
    protected _gameObject?: GameObject;
    /** Whether this component is enabled */
    private _enabled: boolean = true;

    /**
     * Attach this component to a GameObject.
     * @param gameObject The parent GameObject
     */
    attachTo(gameObject: GameObject): void {
        this._gameObject = gameObject;
    }

    /**
     * Called every update tick if enabled.
     * @param deltaTime Time since last update
     */
    update?(deltaTime: number): void;

    /**
     * Enable this component.
     */
    enable(): void {
        this._enabled = true;
    }

    /**
     * Disable this component.
     */
    disable(): void {
        this._enabled = false;
    }

    /**
     * Returns whether this component is enabled.
     */
    isEnabled(): boolean {
        return this._enabled;
    }

    /**
     * Dispose this component and clean up resources.
     */
    dispose(): void {
        this._gameObject = undefined;
    }

    /**
     * Serialize this component's state.
     */
    abstract serialize(): T;

    /**
     * Deserialize this component's state.
     * @param data The data to restore
     */
    abstract deserialize(data: T): void;
}
