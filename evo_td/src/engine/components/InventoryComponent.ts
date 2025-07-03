/**
 * Handles cargo storage and management for game objects.
 */
import { Component } from './Component';
import type { GameObject } from '../core/GameObject';
import { Logger, LogCategory } from '../utils/Logger';

export interface CargoItem {
    id: string;
    type: string;
    quantity: number;
}

export interface InventoryState {
    items: CargoItem[];
    capacity: number;
}

export class InventoryComponent extends Component<InventoryState> {
    public readonly type = 'inventory';
    private _items: CargoItem[] = [];
    private _capacity: number;

    constructor(gameObject: GameObject, capacity: number) {
        super();
        this.attachTo(gameObject);
        this._capacity = capacity;
    }

    addItem(item: CargoItem): boolean {
        if (this.getCurrentLoad() + item.quantity > this._capacity) {
            Logger.warn(LogCategory.ECONOMY, 'Cannot add item: insufficient capacity', {
                objectId: this._gameObject?.id,
                item,
                currentLoad: this.getCurrentLoad(),
                capacity: this._capacity
            });
            return false;
        }

        this._items.push({ ...item });
        return true;
    }

    removeItem(itemId: string, quantity: number): boolean {
        const index = this._items.findIndex(i => i.id === itemId);
        if (index === -1) return false;

        const item = this._items[index];
        if (item.quantity < quantity) return false;

        item.quantity -= quantity;
        if (item.quantity === 0) {
            this._items.splice(index, 1);
        }
        return true;
    }

    getCurrentLoad(): number {
        return this._items.reduce((sum, item) => sum + item.quantity, 0);
    }

    getCapacity(): number {
        return this._capacity;
    }

    getItems(): CargoItem[] {
        return [...this._items];
    }

    serialize(): any {
        return {
            items: [...this._items],
            capacity: this._capacity
        };
    }

    deserialize(data: any): void {
        this._items = [...(data.items ?? [])];
        this._capacity = data.capacity ?? 0;
    }
}
