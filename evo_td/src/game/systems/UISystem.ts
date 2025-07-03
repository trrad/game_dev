/**
 * UI System for the ECS-based game
 * Handles creation, management and events for UI elements
 */

import { GameObject } from "../../engine/core/GameObject";
import { Component } from "../../engine/components/Component";
import { Logger, LogCategory } from "../../engine/utils/Logger";

/**
 * Types of UI elements supported by the system
 */
export enum UIElementType {
    BUTTON = 'button',
    LABEL = 'label',
    PANEL = 'panel',
    SLIDER = 'slider',
    CONTAINER = 'container'
}

/**
 * Styles for UI elements
 */
export interface UIElementStyle {
    backgroundColor?: string;
    color?: string;
    borderColor?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
    width?: string;
    height?: string;
    fontSize?: string;
    fontWeight?: string;
    position?: 'absolute' | 'relative' | 'fixed';
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    zIndex?: string;
    display?: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    opacity?: string;
    pointerEvents?: string;
    transition?: string;
    transform?: string;
    cursor?: string;
    boxShadow?: string;
}

/**
 * Configuration for a UI element
 */
export interface UIElementConfig {
    id: string;
    type: UIElementType;
    text?: string;
    parent?: string;
    style?: UIElementStyle;
    visible?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    onChange?: (value: any) => void;
    value?: any;
    min?: number;
    max?: number;
    step?: number;
}

/**
 * Component that represents a UI element
 */
export class UIElementComponent extends Component {
    public readonly type = 'ui-element';
    private _config: UIElementConfig;
    private _domElement: HTMLElement | null = null;

    constructor(gameObject: GameObject, config: UIElementConfig) {
        super();
        this.attachTo(gameObject);
        this._config = config;
    }
    
    /**
     * Serialize the component state
     * Note: We only serialize the config, not the DOM element
     */
    serialize(): Record<string, any> {
        return {
            config: {
                ...this._config,
                // Remove event handlers as they can't be serialized
                onClick: undefined,
                onChange: undefined
            }
        };
    }
    
    /**
     * Deserialize the component state
     * Note: The DOM element will be recreated when needed
     */
    deserialize(data: Record<string, any>): void {
        if (data.config) {
            // Preserve event handlers from the current config
            const { onClick, onChange } = this._config;
            this._config = { 
                ...data.config,
                onClick: onClick,
                onChange: onChange
            };
        }
    }

    getDomElement(): HTMLElement | null {
        return this._domElement;
    }

    setDomElement(element: HTMLElement): void {
        this._domElement = element;

        // Add event listeners
        if (this._config.onClick && (this._config.type === UIElementType.BUTTON || this._config.type === UIElementType.PANEL)) {
            this._domElement.addEventListener('click', this._config.onClick);
        }

        if (this._config.onChange && this._config.type === UIElementType.SLIDER) {
            this._domElement.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                if (this._config.onChange) {
                    this._config.onChange(target.value);
                }
            });
        }
    }

    getConfig(): UIElementConfig {
        return this._config;
    }

    updateConfig(partialConfig: Partial<UIElementConfig>): void {
        this._config = { ...this._config, ...partialConfig };
        
        // Update the DOM element if it exists
        this.updateDomElement();
    }

    setText(text: string): void {
        this._config.text = text;
        if (this._domElement) {
            if (this._config.type === UIElementType.SLIDER) {
                // For slider, update the associated label if there is one
                const label = this._domElement.previousElementSibling;
                if (label && label instanceof HTMLElement) {
                    label.textContent = text;
                }
            } else {
                this._domElement.textContent = text;
            }
        }
    }

    setVisible(visible: boolean): void {
        this._config.visible = visible;
        if (this._domElement) {
            this._domElement.style.display = visible ? 'block' : 'none';
        }
    }

    setDisabled(disabled: boolean): void {
        this._config.disabled = disabled;
        if (this._domElement) {
            if (this._domElement instanceof HTMLButtonElement || 
                this._domElement instanceof HTMLInputElement) {
                this._domElement.disabled = disabled;
            } else {
                this._domElement.style.pointerEvents = disabled ? 'none' : 'auto';
                this._domElement.style.opacity = disabled ? '0.5' : '1';
            }
        }
    }

    setValue(value: any): void {
        this._config.value = value;
        if (this._domElement && this._config.type === UIElementType.SLIDER) {
            (this._domElement as HTMLInputElement).value = value;
        }
    }

    dispose(): void {
        // Clean up any event listeners
        if (this._domElement) {
            if (this._config.onClick && (this._config.type === UIElementType.BUTTON || this._config.type === UIElementType.PANEL)) {
                this._domElement.removeEventListener('click', this._config.onClick);
            }
            
            // Remove the element from its parent
            if (this._domElement.parentElement) {
                this._domElement.parentElement.removeChild(this._domElement);
            }
            
            this._domElement = null;
        }
        
        super.dispose();
    }

    private updateDomElement(): void {
        if (!this._domElement) return;

        // Update attributes based on config
        if (this._config.type === UIElementType.SLIDER) {
            const slider = this._domElement as HTMLInputElement;
            if (this._config.min !== undefined) slider.min = this._config.min.toString();
            if (this._config.max !== undefined) slider.max = this._config.max.toString();
            if (this._config.step !== undefined) slider.step = this._config.step.toString();
            if (this._config.value !== undefined) slider.value = this._config.value.toString();
            if (this._config.disabled !== undefined) slider.disabled = this._config.disabled;
        } else {
            if (this._config.text !== undefined) this._domElement.textContent = this._config.text;
            if (this._config.disabled !== undefined) {
                this._domElement.style.pointerEvents = this._config.disabled ? 'none' : 'auto';
                this._domElement.style.opacity = this._config.disabled ? '0.5' : '1';
            }
        }

        // Update styles
        if (this._config.style) {
            Object.entries(this._config.style).forEach(([key, value]) => {
                if (value !== undefined) {
                    (this._domElement!.style as any)[key] = value;
                }
            });
        }

        // Update visibility
        if (this._config.visible !== undefined) {
            this._domElement.style.display = this._config.visible ? 'block' : 'none';
        }
    }
}

/**
 * UI System that manages UI elements and their lifecycle
 */
export class UISystem {
    private rootElement: HTMLElement;
    private elements: Map<string, GameObject> = new Map();
    private parentMap: Map<string, string[]> = new Map();
    private isInitialized: boolean = false;

    /**
     * Creates a new UI system
     * @param rootElementId The ID of the root element to attach UI to, or null to create a new one
     */
    constructor(rootElementId: string | null = null) {
        if (rootElementId) {
            const existingRoot = document.getElementById(rootElementId);
            if (existingRoot) {
                this.rootElement = existingRoot;
            } else {
                this.rootElement = this.createRootElement(rootElementId);
            }
        } else {
            this.rootElement = this.createRootElement('ui-system-root');
        }
    }

    /**
     * Initialize the UI system
     */
    initialize(): void {
        if (!this.isInitialized) {
            // Ensure the root element is added to the body if not already there
            if (!document.body.contains(this.rootElement)) {
                document.body.appendChild(this.rootElement);
            }

            this.isInitialized = true;
            Logger.log(LogCategory.SYSTEM, 'UI System initialized');
        }
    }

    /**
     * Create a new UI element
     * @param config The configuration for the UI element
     * @returns The game object representing the UI element
     */
    createUIElement(config: UIElementConfig): GameObject {
        if (!this.isInitialized) {
            this.initialize();
        }

        // Check if an element with this ID already exists
        if (this.elements.has(config.id)) {
            Logger.warn(LogCategory.SYSTEM, `UI element with id ${config.id} already exists`);
            return this.elements.get(config.id)!;
        }

        // Create a GameObject for this UI element
        const gameObject = new GameObject(config.id);
        const component = new UIElementComponent(gameObject, config);

        // Create the DOM element
        const domElement = this.createDomElement(config);
        component.setDomElement(domElement);

        // Add to parent element
        let parentElement: HTMLElement = this.rootElement;
        if (config.parent && this.elements.has(config.parent)) {
            const parentComponent = this.elements.get(config.parent)?.getComponent<UIElementComponent>('ui-element');
            if (parentComponent) {
                const parentDom = parentComponent.getDomElement();
                if (parentDom) {
                    parentElement = parentDom;
                }
            }
        }
        parentElement.appendChild(domElement);

        // Track parent-child relationships for cleanup
        if (config.parent) {
            if (!this.parentMap.has(config.parent)) {
                this.parentMap.set(config.parent, []);
            }
            this.parentMap.get(config.parent)?.push(config.id);
        }

        // Store the game object
        this.elements.set(config.id, gameObject);

        return gameObject;
    }

    /**
     * Get a UI element by ID
     * @param id The ID of the UI element
     * @returns The game object representing the UI element, or undefined if not found
     */
    getUIElement(id: string): GameObject | undefined {
        return this.elements.get(id);
    }

    /**
     * Update an existing UI element
     * @param id The ID of the element to update
     * @param config Partial configuration to update
     */
    updateUIElement(id: string, config: Partial<UIElementConfig>): void {
        const gameObject = this.elements.get(id);
        if (!gameObject) {
            Logger.warn(LogCategory.SYSTEM, `UI element with id ${id} not found`);
            return;
        }

        const component = gameObject.getComponent<UIElementComponent>('ui-element');
        if (!component) {
            Logger.warn(LogCategory.SYSTEM, `UI element component not found for ${id}`);
            return;
        }

        component.updateConfig(config);
    }

    /**
     * Remove a UI element
     * @param id The ID of the element to remove
     */
    removeUIElement(id: string): void {
        const gameObject = this.elements.get(id);
        if (!gameObject) {
            return;
        }

        // Clean up children first
        const children = this.parentMap.get(id);
        if (children) {
            // Create a copy of the array since we'll be modifying it while iterating
            [...children].forEach(childId => {
                this.removeUIElement(childId);
            });
        }

        // Dispose the game object (which will also remove the DOM element)
        gameObject.dispose();
        
        // Remove from our tracking maps
        this.elements.delete(id);
        this.parentMap.delete(id);

        // Remove from parent's children list
        for (const [parentId, children] of this.parentMap.entries()) {
            const index = children.indexOf(id);
            if (index !== -1) {
                children.splice(index, 1);
                break;
            }
        }
    }

    /**
     * Dispose all UI elements and clean up
     */
    dispose(): void {
        // Remove all elements from the DOM
        const rootElements = Array.from(this.elements.values())
            .filter(obj => !this.isChildElement(obj.id));

        rootElements.forEach(obj => {
            this.removeUIElement(obj.id);
        });

        // Clean up maps
        this.elements.clear();
        this.parentMap.clear();

        // Remove the root element from the DOM
        if (document.body.contains(this.rootElement)) {
            document.body.removeChild(this.rootElement);
        }

        this.isInitialized = false;
        Logger.log(LogCategory.SYSTEM, 'UI System disposed');
    }

    /**
     * Create the root element for the UI system
     */
    private createRootElement(id: string): HTMLElement {
        const root = document.createElement('div');
        root.id = id;
        root.style.position = 'absolute';
        root.style.top = '0';
        root.style.left = '0';
        root.style.width = '100%';
        root.style.height = '100%';
        root.style.pointerEvents = 'none'; // By default, the root doesn't catch events
        root.style.zIndex = '1000';
        document.body.appendChild(root);
        return root;
    }

    /**
     * Create a DOM element based on the UI element configuration
     */
    private createDomElement(config: UIElementConfig): HTMLElement {
        let element: HTMLElement;

        switch (config.type) {
            case UIElementType.BUTTON:
                element = document.createElement('button');
                if (config.text) {
                    element.textContent = config.text;
                }
                break;
            
            case UIElementType.SLIDER:
                const sliderContainer = document.createElement('div');
                sliderContainer.style.display = 'flex';
                sliderContainer.style.flexDirection = 'column';
                sliderContainer.style.gap = '5px';
                
                // Add label if text is provided
                if (config.text) {
                    const label = document.createElement('div');
                    label.textContent = config.text;
                    label.style.fontSize = '12px';
                    sliderContainer.appendChild(label);
                }
                
                const slider = document.createElement('input');
                slider.type = 'range';
                if (config.min !== undefined) slider.min = config.min.toString();
                if (config.max !== undefined) slider.max = config.max.toString();
                if (config.step !== undefined) slider.step = config.step.toString();
                if (config.value !== undefined) slider.value = config.value.toString();
                sliderContainer.appendChild(slider);
                
                element = sliderContainer;
                break;
            
            case UIElementType.LABEL:
                element = document.createElement('div');
                if (config.text) {
                    element.textContent = config.text;
                }
                break;
            
            case UIElementType.PANEL:
            case UIElementType.CONTAINER:
            default:
                element = document.createElement('div');
                if (config.text) {
                    element.textContent = config.text;
                }
                break;
        }

        // Set ID for easier debugging
        element.id = config.id;

        // Allow interaction by default for buttons and sliders
        if (config.type === UIElementType.BUTTON || config.type === UIElementType.SLIDER) {
            element.style.pointerEvents = 'auto';
        }

        // Apply styles
        if (config.style) {
            Object.entries(config.style).forEach(([key, value]) => {
                if (value !== undefined) {
                    (element.style as any)[key] = value;
                }
            });
        }

        // Apply visibility
        if (config.visible === false) {
            element.style.display = 'none';
        }

        // Apply disabled state
        if (config.disabled === true) {
            if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
                element.disabled = true;
            } else {
                element.style.pointerEvents = 'none';
                element.style.opacity = '0.5';
            }
        }

        return element;
    }

    /**
     * Check if an element is a child of another element
     */
    private isChildElement(id: string): boolean {
        for (const children of this.parentMap.values()) {
            if (children.includes(id)) {
                return true;
            }
        }
        return false;
    }
}
