/**
 * UIFactory.ts
 * 
 * ROLE: Factory for creating standardized DOM UI elements with consistent styling
 * RESPONSIBILITIES:
 * - Creates styled HTML elements (buttons, panels, sliders, labels)
 * - Applies consistent design system and styling across all UI components
 * - Provides convenience methods for common UI patterns (error messages, exit dialogs)
 * - Abstracts DOM element creation with configurable options
 * 
 * INTERFACE:
 * - createPanel(options): Create styled container divs with positioning
 * - createButton/createExitButton/createLogsButton(): Create styled interactive buttons
 * - createLabel/createSlider(): Create form elements with consistent styling
 * - createErrorMessage/createExitMessage(): Create specialized modal dialogs
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

function applyStyle(element: HTMLElement, style: Record<string, string>) {
    Object.assign(element.style, style);
}

export class UIFactory {
    /**
     * Create a panel (div) with default style
     */
    createPanel(options: {
        text?: string;
        style?: Partial<CSSStyleDeclaration>;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    } = {}): HTMLDivElement {
        const div = document.createElement('div');
        applyStyle(div, DefaultStyles.PANEL);
        if (options.text) div.textContent = options.text;
        if (options.style) Object.assign(div.style, options.style);
        // Positioning
        switch (options.position) {
            case 'top-left':
                Object.assign(div.style, { position: 'absolute', top: '10px', left: '10px' });
                break;
            case 'top-right':
                Object.assign(div.style, { position: 'absolute', top: '10px', right: '10px' });
                break;
            case 'bottom-left':
                Object.assign(div.style, { position: 'absolute', bottom: '10px', left: '10px' });
                break;
            case 'bottom-right':
                Object.assign(div.style, { position: 'absolute', bottom: '10px', right: '10px' });
                break;
            case 'center':
                Object.assign(div.style, {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                });
                break;
        }
        return div;
    }

    /**
     * Create a button with default style
     */
    createButton(text: string, onClick: () => void, options: { style?: Partial<CSSStyleDeclaration> } = {}): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        applyStyle(btn, DefaultStyles.BUTTON);
        if (options.style) Object.assign(btn.style, options.style);
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Create an exit button with default style
     */
    createExitButton(onClick: () => void, options: { style?: Partial<CSSStyleDeclaration> } = {}): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = 'Exit';
        applyStyle(btn, DefaultStyles.EXIT_BUTTON);
        if (options.style) Object.assign(btn.style, options.style);
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Create a logs button with default style
     */
    createLogsButton(text: string, onClick: () => void, options: { style?: Partial<CSSStyleDeclaration> } = {}): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        applyStyle(btn, DefaultStyles.LOGS_BUTTON);
        if (options.style) Object.assign(btn.style, options.style);
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Create a label (span) with default style
     */
    createLabel(text: string, options: { style?: Partial<CSSStyleDeclaration> } = {}): HTMLSpanElement {
        const span = document.createElement('span');
        span.textContent = text;
        applyStyle(span, DefaultStyles.LABEL);
        if (options.style) Object.assign(span.style, options.style);
        return span;
    }

    /**
     * Create a slider (input[type=range]) with default style
     */
    createSlider(options: {
        min?: number;
        max?: number;
        step?: number;
        value?: number;
        onChange?: (value: number) => void;
        style?: Partial<CSSStyleDeclaration>;
    } = {}): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(options.min ?? 0);
        input.max = String(options.max ?? 100);
        input.step = String(options.step ?? 1);
        input.value = String(options.value ?? 50);
        applyStyle(input, DefaultStyles.SLIDER);
        if (options.style) Object.assign(input.style, options.style);
        if (options.onChange) {
            input.addEventListener('input', e => options.onChange!(Number((e.target as HTMLInputElement).value)));
        }
        return input;
    }

    /**
     * Create an error message panel
     */
    createErrorMessage(title: string, messages: string[]): HTMLDivElement {
        const div = this.createPanel({
            style: {
                color: '#ffcccc',
                backgroundColor: 'rgba(80,0,0,0.95)',
                fontSize: '16px',
                zIndex: '2000',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }
        });
        div.innerHTML = `<strong>${title}</strong><br>${messages.map(m => `<div>${m}</div>`).join('')}`;
        return div;
    }

    /**
     * Create an exit message panel with a reload button
     */
    createExitMessage(message: string, onReload: () => void): HTMLDivElement {
        const div = this.createPanel({
            style: {
                color: '#ccccff',
                backgroundColor: 'rgba(0,0,80,0.95)',
                fontSize: '16px',
                zIndex: '2000',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }
        });
        div.innerHTML = `<div style='font-weight:bold;font-size:18px;margin-bottom:8px;'>${message}</div>`;
        const reloadBtn = this.createButton('Reload', onReload, {
            style: {
                margin: '16px 0 0 0',
                backgroundColor: '#3333ff',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
            }
        });
        div.appendChild(reloadBtn);
        return div;
    }
}