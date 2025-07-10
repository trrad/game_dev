/**
 * Base class for all components in the ECS architecture.
 * Components add functionality to GameObjects and support attachment, disposal and serialization functions.
 */
import type { GameObject } from '../core/GameObject';

export abstract class Component<T = any> {
    /** The type string for this component */
    public abstract readonly type: string;
    /** Reference to the parent GameObject */
    protected _gameObject?: GameObject;
    /** Whether this component is enabled */
    private _enabled: boolean = true;
    /** Event subscriptions for cleanup */
    private _eventUnsubscribers: (() => void)[] = [];
    /** Unique identifier for this component instance */
    public readonly instanceId: string;

    constructor() {
        // Generate instance ID using timestamp and random string
        this.instanceId = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Attach this component to a GameObject.
     * @param gameObject The parent GameObject
     */
    attachTo(gameObject: GameObject): void {
        this._gameObject = gameObject;
    }

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
        // is this correct? should confirm what dispose should do in this instance -- I think generally subclasses are doing most of the cleanup?
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
