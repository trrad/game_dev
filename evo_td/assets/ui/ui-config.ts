/**
 * UI Configuration
 * Centralized configuration for UI elements, styles, and behavior
 */

export interface UIConfig {
    timeControls: {
        position: { top: string; left: string };
        speedOptions: readonly (1 | 4 | 8 | 16 | 32)[];
        updateInterval: number;
    };
    eventLog: {
        position: { top: string; right: string };
        maxEntries: number;
        autoScroll: boolean;
        collapsed: boolean;
        width: string;
        maxHeight: string;
    };
    exitButton: {
        position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
        style: {
            fontSize: string;
            fontWeight: string;
            padding: string;
            boxShadow: string;
            zIndex: string;
        };
    };
}

export const defaultUIConfig: UIConfig = {
    timeControls: {
        position: { top: '20px', left: '20px' },
        speedOptions: [1, 4, 8, 16, 32] as const,
        updateInterval: 100
    },
    eventLog: {
        position: { top: '20px', right: '20px' },
        maxEntries: 100,
        autoScroll: true,
        collapsed: false,
        width: '300px',
        maxHeight: '400px'
    },
    exitButton: {
        position: 'top-right',
        style: {
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '8px 16px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            zIndex: '1000'
        }
    }
};

// CSS class mappings
export const CSS_CLASSES = {
    ui: {
        panel: 'ui-panel',
        button: 'ui-button',
        buttonActive: 'ui-button active',
        buttonDanger: 'ui-button danger'
    },
    timeControls: {
        container: 'time-controls',
        label: 'time-speed-label',
        buttons: 'time-buttons',
        button: 'time-button',
        buttonActive: 'time-button active',
        pauseButton: 'pause-button',
        gameTime: 'game-time-display'
    },
    eventLog: {
        panel: 'event-log-panel',
        header: 'event-log-header',
        title: 'event-log-title',
        toggle: 'event-log-toggle',
        content: 'event-log-content',
        contentCollapsed: 'event-log-content collapsed',
        entry: 'event-log-entry',
        footer: 'event-log-footer'
    },
    error: {
        message: 'error-message',
        webglError: 'error-message webgl-error',
        engineError: 'error-message engine-error'
    },
    exit: {
        message: 'exit-message',
        restartButton: 'restart-button'
    }
} as const;
