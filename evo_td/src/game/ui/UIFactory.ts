/**
 * UI Factory for creating common UI elements
 * This provides a convenient API for creating UI elements with consistent styling
 */
import { GameObject } from "../../engine/core/GameObject";
import { UISystem, UIElementType, UIElementConfig, UIElementStyle, UIElementComponent } from '../systems/UISystem';

/**
 * Default styles for different UI elements
 */
const DefaultStyles = {
    PANEL: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        pointerEvents: 'auto'
    },
    BUTTON: {
        backgroundColor: '#333',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        margin: '5px 0',
        pointerEvents: 'auto',
        transition: 'background-color 0.2s'
    },
    LABEL: {
        color: 'white',
        fontSize: '14px',
        margin: '5px 0'
    },
    SLIDER: {
        width: '100%',
        pointerEvents: 'auto'
    },
    EXIT_BUTTON: {
        backgroundColor: '#aa3333',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        margin: '5px 0',
        pointerEvents: 'auto',
        transition: 'background-color 0.2s'
    },
    LOGS_BUTTON: {
        backgroundColor: '#3366aa',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        margin: '5px 0',
        pointerEvents: 'auto',
        transition: 'background-color 0.2s'
    }
};

/**
 * UI Factory for creating common UI elements with consistent styling
 */
export class UIFactory {
    private uiSystem: UISystem;
    
    constructor(uiSystem: UISystem) {
        this.uiSystem = uiSystem;
    }
    
    /**
     * Create a panel with the default style
     */
    createPanel(
        id: string, 
        options: {
            parent?: string;
            position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
            text?: string;
            style?: Partial<UIElementStyle>;
        } = {}
    ): GameObject {
        // Calculate position based on option
        let positionStyle: Partial<UIElementStyle> = {};
        switch(options.position) {
            case 'top-left':
                positionStyle = { position: 'absolute', top: '10px', left: '10px' };
                break;
            case 'top-right':
                positionStyle = { position: 'absolute', top: '10px', right: '10px' };
                break;
            case 'bottom-left':
                positionStyle = { position: 'absolute', bottom: '10px', left: '10px' };
                break;
            case 'bottom-right':
                positionStyle = { position: 'absolute', bottom: '10px', right: '10px' };
                break;
            case 'center':
                positionStyle = { 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)' 
                };
                break;
            default:
                break;
        }
        
        // Create panel config
        const config: UIElementConfig = {
            id,
            type: UIElementType.PANEL,
            parent: options.parent,
            text: options.text,
            style: {
                ...DefaultStyles.PANEL,
                ...positionStyle,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }
    
    /**
     * Create a button with the default style
     */
    createButton(
        id: string,
        text: string,
        onClick: () => void,
        options: {
            parent?: string;
            style?: Partial<UIElementStyle>;
            disabled?: boolean;
        } = {}
    ): GameObject {
        const config: UIElementConfig = {
            id,
            type: UIElementType.BUTTON,
            text,
            parent: options.parent,
            onClick,
            disabled: options.disabled,
            style: {
                ...DefaultStyles.BUTTON,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }
    
    /**
     * Create an exit button with the default style
     */
    createExitButton(
        id: string,
        text: string = 'Exit',
        onClick: () => void,
        options: {
            parent?: string;
            position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            style?: Partial<UIElementStyle>;
        } = {}
    ): GameObject {
        // Calculate position based on option
        let positionStyle: Partial<UIElementStyle> = {};
        switch(options.position) {
            case 'top-left':
                positionStyle = { position: 'absolute', top: '10px', left: '10px' };
                break;
            case 'top-right':
                positionStyle = { position: 'absolute', top: '10px', right: '10px' };
                break;
            case 'bottom-left':
                positionStyle = { position: 'absolute', bottom: '10px', left: '10px' };
                break;
            case 'bottom-right':
                positionStyle = { position: 'absolute', bottom: '10px', right: '10px' };
                break;
            default:
                positionStyle = { position: 'absolute', top: '10px', right: '10px' };
                break;
        }
        
        const config: UIElementConfig = {
            id,
            type: UIElementType.BUTTON,
            text,
            parent: options.parent,
            onClick,
            style: {
                ...DefaultStyles.EXIT_BUTTON,
                ...positionStyle,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }
    
    /**
     * Create a logs button with the default style
     */
    createLogsButton(
        id: string,
        text: string = 'Generate Logs',
        onClick: () => void,
        options: {
            parent?: string;
            position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            style?: Partial<UIElementStyle>;
        } = {}
    ): GameObject {
        // Calculate position based on option
        let positionStyle: Partial<UIElementStyle> = {};
        switch(options.position) {
            case 'top-left':
                positionStyle = { position: 'absolute', top: '10px', left: '10px' };
                break;
            case 'top-right':
                positionStyle = { position: 'absolute', top: '10px', right: '10px' };
                break;
            case 'bottom-left':
                positionStyle = { position: 'absolute', bottom: '10px', left: '10px' };
                break;
            case 'bottom-right':
                positionStyle = { position: 'absolute', bottom: '10px', right: '10px' };
                break;
            default:
                positionStyle = { position: 'absolute', top: '10px', right: '120px' }; // Default to right of exit button
                break;
        }
        
        const config: UIElementConfig = {
            id,
            type: UIElementType.BUTTON,
            text,
            parent: options.parent,
            onClick,
            style: {
                ...DefaultStyles.LOGS_BUTTON,
                ...positionStyle,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }

    /**
     * Create a label with the default style
     */
    createLabel(
        id: string,
        text: string,
        options: {
            parent?: string;
            style?: Partial<UIElementStyle>;
        } = {}
    ): GameObject {
        const config: UIElementConfig = {
            id,
            type: UIElementType.LABEL,
            text,
            parent: options.parent,
            style: {
                ...DefaultStyles.LABEL,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }
    
    /**
     * Create a slider with the default style
     */
    createSlider(
        id: string,
        text: string,
        options: {
            parent?: string;
            min?: number;
            max?: number;
            step?: number;
            value?: number;
            onChange?: (value: any) => void;
            style?: Partial<UIElementStyle>;
        } = {}
    ): GameObject {
        const config: UIElementConfig = {
            id,
            type: UIElementType.SLIDER,
            text,
            parent: options.parent,
            min: options.min !== undefined ? options.min : 0,
            max: options.max !== undefined ? options.max : 100,
            step: options.step !== undefined ? options.step : 1,
            value: options.value !== undefined ? options.value : 50,
            onChange: options.onChange,
            style: {
                ...DefaultStyles.SLIDER,
                ...options.style
            }
        };
        
        return this.uiSystem.createUIElement(config);
    }
    
    /**
     * Update the text of a UI element
     */
    updateText(id: string, text: string): void {
        const element = this.uiSystem.getUIElement(id);
        if (!element) return;
        
        const component = element.getComponent<UIElementComponent>('ui-element');
        if (!component) return;
        
        component.setText(text);
    }
    
    /**
     * Set the visibility of a UI element
     */
    setVisible(id: string, visible: boolean): void {
        const element = this.uiSystem.getUIElement(id);
        if (!element) return;
        
        const component = element.getComponent<UIElementComponent>('ui-element');
        if (!component) return;
        
        component.setVisible(visible);
    }
}
