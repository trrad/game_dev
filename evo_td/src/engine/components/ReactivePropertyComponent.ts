// src/engine/components/ReactivePropertyComponent.ts - Complete System

import { Component } from './Component';
import { Observable, Observer } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';

export interface StateChangeEvent<T> {
    from: T;
    to: T;
    changed: boolean;
    source: string;
    timestamp: number;
    componentId: string;
    gameObjectId?: string;
}

export interface ReactivePropertyData<T> {
    propertyName: string;
    currentValue: T;
    thresholds?: Array<{ value: T; eventType: string; direction: 'above' | 'below' | 'equal' }>;
}

/**
 * Base ReactiveProperty - Observable-based reactive state management
 */
export class ReactiveProperty<T> extends Component<ReactivePropertyData<T>> {
    public readonly type = 'reactiveProperty';
    protected propertyName: string;
    protected currentValue: T;
    protected previousValue: T;
    
    // Full Babylon.js Observable with all features
    public readonly changeObservable: Observable<StateChangeEvent<T>>;
    public readonly thresholdObservable: Observable<{ eventType: string; value: T; direction: string }>;
    
    protected equalityFn: (a: T, b: T) => boolean;
    protected thresholds: Array<{ value: T; eventType: string; direction: 'above' | 'below' | 'equal' }> = [];

    constructor(
        propertyName: string,
        initialValue: T,
        equalityFn?: (a: T, b: T) => boolean
    ) {
        super();
        this.propertyName = propertyName;
        this.currentValue = initialValue;
        this.previousValue = initialValue;
        this.changeObservable = new Observable<StateChangeEvent<T>>();
        this.thresholdObservable = new Observable<{ eventType: string; value: T; direction: string }>();
        this.equalityFn = equalityFn || ((a, b) => a === b);
    }

    getName(): string { return this.propertyName; }
    getValue(): T { return this.currentValue; }
    getPreviousValue(): T { return this.previousValue; }

    // Full Babylon.js Observable API exposure
    get hasObservers(): boolean { return this.changeObservable.hasObservers(); }
    get hasThresholdObservers(): boolean { return this.thresholdObservable.hasObservers(); }

    addThreshold(value: T, eventType: string, direction: 'above' | 'below' | 'equal' = 'equal'): void {
        this.thresholds.push({ value, eventType, direction });
    }

    updateValue(newValue: T, source: string = 'unknown'): boolean {
        const hasChanged = !this.equalityFn(this.currentValue, newValue);
        
        if (hasChanged) {
            this.previousValue = this.currentValue;
            this.currentValue = newValue;
            
            const event: StateChangeEvent<T> = {
                from: this.previousValue,
                to: this.currentValue,
                changed: true,
                source,
                timestamp: Date.now(),
                componentId: this.instanceId,
                gameObjectId: this._gameObject?.id
            };
            
            this.changeObservable.notifyObservers(event);
            this.checkThresholds(this.previousValue, this.currentValue);
        }
        
        return hasChanged;
    }

    // Add a public set method for compatibility with subclasses and usages
    public set(newValue: T, source: string = 'unknown'): boolean {
        return this.updateValue(newValue, source);
    }

    // Convenience methods
    onChange(callback: (event: StateChangeEvent<T>) => void): Observer<StateChangeEvent<T>> {
        return this.changeObservable.add(callback);
    }

    onThreshold(callback: (event: { eventType: string; value: T; direction: string }) => void): Observer<{ eventType: string; value: T; direction: string }> {
        return this.thresholdObservable.add(callback);
    }

    private checkThresholds(fromValue: T, toValue: T): void {
        this.thresholds.forEach(threshold => {
            if (this.checkThresholdCrossed(fromValue, toValue, threshold)) {
                this.thresholdObservable.notifyObservers({
                    eventType: threshold.eventType,
                    value: threshold.value,
                    direction: threshold.direction
                });
            }
        });
    }

    private checkThresholdCrossed(fromValue: T, toValue: T, threshold: { value: T; direction: 'above' | 'below' | 'equal' }): boolean {
        switch (threshold.direction) {
            case 'above':
                return this.compareValues(fromValue, threshold.value) <= 0 && this.compareValues(toValue, threshold.value) > 0;
            case 'below':
                return this.compareValues(fromValue, threshold.value) >= 0 && this.compareValues(toValue, threshold.value) < 0;
            case 'equal':
                return this.equalityFn(toValue, threshold.value) && !this.equalityFn(fromValue, threshold.value);
            default:
                return false;
        }
    }

    protected compareValues(a: T, b: T): number {
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        return this.equalityFn(a, b) ? 0 : (a > b ? 1 : -1);
    }

    serialize(): ReactivePropertyData<T> {
        return {
            propertyName: this.propertyName,
            currentValue: this.currentValue,
            thresholds: [...this.thresholds]
        };
    }

    deserialize(data: ReactivePropertyData<T>): void {
        this.propertyName = data.propertyName;
        this.currentValue = data.currentValue;
        this.previousValue = data.currentValue;
        if (data.thresholds) {
            this.thresholds = [...data.thresholds];
        }
    }

    dispose(): void {
        this.changeObservable.clear();
        this.thresholdObservable.clear();
        super.dispose();
    }
}

// ============================================================
// Specialized Property Types with Rich APIs
// ============================================================

export class BooleanProperty extends ReactiveProperty<boolean> {
    public readonly type = 'reactiveProperty';
    
    constructor(propertyName: string, initialValue: boolean = false) {
        super(propertyName, initialValue);
    }

    toggle(source: string = 'toggle'): boolean {
        return this.set(!this.currentValue, source);
    }

    setTrue(source: string = 'setTrue'): boolean {
        return this.currentValue ? false : this.set(true, source);
    }

    setFalse(source: string = 'setFalse'): boolean {
        return !this.currentValue ? false : this.set(false, source);
    }

    // Additional boolean-specific methods
    isTrue(): boolean { return this.currentValue === true; }
    isFalse(): boolean { return this.currentValue === false; }
    
    // Conditional updates
    setIf(condition: boolean, value: boolean, source: string = 'setIf'): boolean {
        return condition ? this.set(value, source) : false;
    }
}

export class NumericProperty extends ReactiveProperty<number> {
    public readonly type = 'reactiveProperty';
    private min?: number;
    private max?: number;
    
    constructor(
        propertyName: string, 
        initialValue: number = 0, 
        min?: number, 
        max?: number
    ) {
        super(propertyName, initialValue);
        this.min = min;
        this.max = max;
    }
    
    set(newValue: number, source: string = 'unknown'): boolean {
        if (this.min !== undefined) newValue = Math.max(this.min, newValue);
        if (this.max !== undefined) newValue = Math.min(this.max, newValue);
        return super.set(newValue, source);
    }

    // Mathematical operations
    addValue(amount: number, source: string = 'add'): boolean {
        return this.set(this.currentValue + amount, source);
    }

    subtractValue(amount: number, source: string = 'subtract'): boolean {
        return this.set(this.currentValue - amount, source);
    }

    multiply(factor: number, source: string = 'multiply'): boolean {
        return this.set(this.currentValue * factor, source);
    }

    divide(divisor: number, source: string = 'divide'): boolean {
        if (divisor === 0) return false;
        return this.set(this.currentValue / divisor, source);
    }

    // Increment/decrement
    increment(source: string = 'increment'): boolean {
        return this.addValue(1, source);
    }

    decrement(source: string = 'decrement'): boolean {
        return this.subtractValue(1, source);
    }

    // Boundary operations
    clamp(min: number, max: number, source: string = 'clamp'): boolean {
        const clamped = Math.max(min, Math.min(max, this.currentValue));
        return this.set(clamped, source);
    }

    setToMin(source: string = 'setToMin'): boolean {
        return this.min !== undefined ? this.set(this.min, source) : false;
    }

    setToMax(source: string = 'setToMax'): boolean {
        return this.max !== undefined ? this.set(this.max, source) : false;
    }

    // Utility methods
    getPercentage(): number {
        if (this.min === undefined || this.max === undefined) return 0;
        return (this.currentValue - this.min) / (this.max - this.min);
    }

    setPercentage(percentage: number, source: string = 'setPercentage'): boolean {
        if (this.min === undefined || this.max === undefined) return false;
        const value = this.min + (this.max - this.min) * Math.max(0, Math.min(1, percentage));
        return this.set(value, source);
    }

    isAtMin(): boolean { return this.min !== undefined && this.currentValue === this.min; }
    isAtMax(): boolean { return this.max !== undefined && this.currentValue === this.max; }
    isInRange(min: number, max: number): boolean { return this.currentValue >= min && this.currentValue <= max; }

    getMin(): number | undefined { return this.min; }
    getMax(): number | undefined { return this.max; }
}

// NEW: EnumProperty for strongly-typed enum values
export class EnumProperty<T extends string> extends ReactiveProperty<T> {
    public readonly type = 'reactiveProperty';
    private validValues: Set<T>;
    
    constructor(
        propertyName: string,
        initialValue: T,
        validValues: T[]
    ) {
        super(propertyName, initialValue);
        this.validValues = new Set(validValues);
        
        if (!this.validValues.has(initialValue)) {
            throw new Error(`Initial value '${initialValue}' is not a valid enum value`);
        }
    }
    
    set(newValue: T, source: string = 'unknown'): boolean {
        if (!this.validValues.has(newValue)) {
            console.warn(`Invalid enum value: ${newValue} for property ${this.propertyName}. Valid values: ${Array.from(this.validValues).join(', ')}`);
            return false;
        }
        return super.set(newValue, source);
    }

    // Enum-specific methods
    setTo(value: T, source: string = 'setTo'): boolean {
        return this.set(value, source);
    }

    isValue(value: T): boolean {
        return this.currentValue === value;
    }

    isOneOf(values: T[]): boolean {
        return values.includes(this.currentValue);
    }

    getValidValues(): T[] {
        return Array.from(this.validValues);
    }

    // Cycle through enum values
    next(source: string = 'next'): boolean {
        const values = Array.from(this.validValues);
        const currentIndex = values.indexOf(this.currentValue);
        const nextIndex = (currentIndex + 1) % values.length;
        return this.set(values[nextIndex], source);
    }

    previous(source: string = 'previous'): boolean {
        const values = Array.from(this.validValues);
        const currentIndex = values.indexOf(this.currentValue);
        const prevIndex = currentIndex === 0 ? values.length - 1 : currentIndex - 1;
        return this.set(values[prevIndex], source);
    }
}

// NEW: VectorProperty for Vector3 operations with proper type conversion
export class VectorProperty extends ReactiveProperty<Vector3> {
    public readonly type = 'reactiveProperty';
    
    constructor(propertyName: string, initialValue: Vector3 = Vector3.Zero()) {
        super(propertyName, initialValue.clone(), (a, b) => a.equals(b));
    }

    /**
     * ✅ FIXED: Override set method to always ensure Vector3 instances
     */
    set(newValue: Vector3 | {x: number, y: number, z: number}, source: string = 'unknown'): boolean {
        // Convert to Vector3 if needed
        let vector3Value: Vector3;
        
        if (newValue instanceof Vector3) {
            vector3Value = newValue.clone(); // Always clone to avoid reference issues
        } else if (newValue && typeof newValue === 'object' && 'x' in newValue && 'y' in newValue && 'z' in newValue) {
            vector3Value = new Vector3(newValue.x, newValue.y, newValue.z);
        } else {
            console.error(`VectorProperty.set: Invalid value type for ${this.propertyName}:`, newValue);
            return false;
        }
        
        return super.set(vector3Value, source);
    }

    // Vector operations (keep all existing methods but ensure they use proper Vector3)
    translate(x: number, y: number, z: number, source: string = 'translate'): boolean {
        const newValue = this.currentValue.add(new Vector3(x, y, z));
        return this.set(newValue, source);
    }

    translateByVector(offset: Vector3, source: string = 'translateByVector'): boolean {
        const newValue = this.currentValue.add(offset);
        return this.set(newValue, source);
    }

    scale(factor: number, source: string = 'scale'): boolean {
        const newValue = this.currentValue.scale(factor);
        return this.set(newValue, source);
    }

    scaleByVector(scale: Vector3, source: string = 'scaleByVector'): boolean {
        const newValue = this.currentValue.multiply(scale);
        return this.set(newValue, source);
    }

    normalize(source: string = 'normalize'): boolean {
        const newValue = this.currentValue.normalize();
        return this.set(newValue, source);
    }

    // Component-wise operations
    setX(x: number, source: string = 'setX'): boolean {
        const newValue = new Vector3(x, this.currentValue.y, this.currentValue.z);
        return this.set(newValue, source);
    }

    setY(y: number, source: string = 'setY'): boolean {
        const newValue = new Vector3(this.currentValue.x, y, this.currentValue.z);
        return this.set(newValue, source);
    }

    setZ(z: number, source: string = 'setZ'): boolean {
        const newValue = new Vector3(this.currentValue.x, this.currentValue.y, z);
        return this.set(newValue, source);
    }

    // Utility methods
    getLength(): number { return this.currentValue.length(); }
    getLengthSquared(): number { return this.currentValue.lengthSquared(); }
    distanceTo(other: Vector3): number { return Vector3.Distance(this.currentValue, other); }
    
    isZero(): boolean { return this.currentValue.equals(Vector3.Zero()); }
    isNormalized(): boolean { return Math.abs(this.currentValue.length() - 1) < 0.001; }
}

export class CollectionProperty<T> extends ReactiveProperty<Map<string, T>> {
    public readonly type = 'reactiveProperty';
    
    // Additional observables for granular collection events
    public readonly itemAddedObservable: Observable<{ key: string; value: T; source: string }>;
    public readonly itemRemovedObservable: Observable<{ key: string; value: T; source: string }>;
    public readonly itemUpdatedObservable: Observable<{ key: string; oldValue: T; newValue: T; source: string }>;
    
    constructor(propertyName: string, initialItems?: Map<string, T>) {
        super(propertyName, initialItems || new Map<string, T>(), 
            (a, b) => a.size === b.size && Array.from(a.entries()).every(([k, v]) => b.get(k) === v));
        
        this.itemAddedObservable = new Observable<{ key: string; value: T; source: string }>();
        this.itemRemovedObservable = new Observable<{ key: string; value: T; source: string }>();
        this.itemUpdatedObservable = new Observable<{ key: string; oldValue: T; newValue: T; source: string }>();
    }

    // Collection-specific methods
    addItem(key: string, value: T, source: string = 'addItem'): boolean {
        const newMap = new Map(this.currentValue);
        const wasAdded = !newMap.has(key);
        newMap.set(key, value);
        const changed = this.set(newMap, source);
        if (changed && wasAdded) {
            this.itemAddedObservable.notifyObservers({ key, value, source });
        }
        return changed;
    }

    removeItem(key: string, source: string = 'removeItem'): boolean {
        const oldValue = this.currentValue.get(key);
        if (oldValue === undefined) return false;
        const newMap = new Map(this.currentValue);
        newMap.delete(key);
        const changed = this.set(newMap, source);
        if (changed) {
            this.itemRemovedObservable.notifyObservers({ key, value: oldValue, source });
        }
        return changed;
    }

    updateItem(key: string, value: T, source: string = 'updateItem'): boolean {
        const oldValue = this.currentValue.get(key);
        if (oldValue === undefined) return false;
        const newMap = new Map(this.currentValue);
        newMap.set(key, value);
        const changed = this.set(newMap, source);
        if (changed) {
            this.itemUpdatedObservable.notifyObservers({ key, oldValue, newValue: value, source });
        }
        return changed;
    }

    hasItem(key: string): boolean { return this.currentValue.has(key); }
    getItem(key: string): T | undefined { return this.currentValue.get(key); }
    getSize(): number { return this.currentValue.size; }
    getKeys(): string[] { return Array.from(this.currentValue.keys()); }
    getValues(): T[] { return Array.from(this.currentValue.values()); }
    getEntries(): [string, T][] { return Array.from(this.currentValue.entries()); }
    isEmpty(): boolean { return this.currentValue.size === 0; }

    clear(source: string = 'clear'): boolean {
        return this.set(new Map<string, T>(), source);
    }

    dispose(): void {
        this.itemAddedObservable.clear();
        this.itemRemovedObservable.clear();
        this.itemUpdatedObservable.clear();
        super.dispose();
    }
}

// ============================================================
// Unified Component Container
// ============================================================

/**
 * Single component that holds multiple reactive properties
 * Solves the component discovery problem while keeping specialized types
 */
export class ReactivePropertiesComponent extends Component<Record<string, any>> {
    public readonly type = 'reactiveProperties';
    private properties: Map<string, ReactiveProperty<any>> = new Map();
    
    addProperty<T>(property: ReactiveProperty<T>): void {
        this.properties.set(property.getName(), property);
        property.attachTo(this._gameObject!);
    }
    
    getProperty<T>(name: string): ReactiveProperty<T> | undefined {
        return this.properties.get(name) as ReactiveProperty<T>;
    }
    
    getBooleanProperty(name: string): BooleanProperty | undefined {
        const prop = this.properties.get(name);
        return prop instanceof BooleanProperty ? prop : undefined;
    }
    
    getNumericProperty(name: string): NumericProperty | undefined {
        const prop = this.properties.get(name);
        return prop instanceof NumericProperty ? prop : undefined;
    }
    
    getEnumProperty<T extends string>(name: string): EnumProperty<T> | undefined {
        const prop = this.properties.get(name);
        return prop instanceof EnumProperty ? prop : undefined;
    }
    
    getVectorProperty(name: string): VectorProperty | undefined {
        const prop = this.properties.get(name);
        return prop instanceof VectorProperty ? prop : undefined;
    }
    
    getCollectionProperty<T>(name: string): CollectionProperty<T> | undefined {
        const prop = this.properties.get(name);
        return prop instanceof CollectionProperty ? prop : undefined;
    }
    
    hasProperty(name: string): boolean {
        return this.properties.has(name);
    }
    
    getAllProperties(): ReactiveProperty<any>[] {
        return Array.from(this.properties.values());
    }
    
    getPropertyNames(): string[] {
        return Array.from(this.properties.keys());
    }
    
    removeProperty(name: string): boolean {
        const property = this.properties.get(name);
        if (property) {
            property.dispose();
            return this.properties.delete(name);
        }
        return false;
    }
    
    serialize(): Record<string, any> {
        const data: Record<string, any> = {};
        this.properties.forEach((property, name) => {
            data[name] = property.serialize();
        });
        return data;
    }
    
    deserialize(data: Record<string, any>): void {
        Object.entries(data).forEach(([name, propData]) => {
            const property = this.properties.get(name);
            if (property) {
                property.deserialize(propData);
            }
        });
    }
    
    dispose(): void {
        this.properties.forEach(property => property.dispose());
        this.properties.clear();
        super.dispose();
    }
}

// ============================================================
// Direct Constructor Usage - Clean and Simple
// ============================================================

/*
USAGE EXAMPLES - Direct Constructor Approach:

// ✅ Boolean properties
const isAlive = new BooleanProperty('is_alive', true);
const canMove = new BooleanProperty('can_move', false);

// ✅ Numeric properties with bounds
const health = new NumericProperty('health', 100, 0, 100);
const speed = new NumericProperty('speed', 0, 0, 10);

// ✅ Enum properties with validation
const gameState = new EnumProperty('game_state', 'menu', ['menu', 'playing', 'paused']);
const unitState = new EnumProperty('unit_state', 'idle', ['idle', 'moving', 'attacking']);

// ✅ Vector properties for spatial data
const position = new VectorProperty('position', Vector3.Zero());
const velocity = new VectorProperty('velocity', new Vector3(0, 0, 1));

// ✅ Collection properties for inventory, etc.
const inventory = new CollectionProperty<Item>('inventory');
const skills = new CollectionProperty<Skill>('skills', new Map());

// ✅ Generic fallback for custom types only
const customData = new ReactiveProperty<CustomType>('custom', initialData, customEqualityFn);
*/