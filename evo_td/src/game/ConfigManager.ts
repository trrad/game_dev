/**
 * Centralized configuration management system
 * Provides type-safe access to game configuration values
 */
import { Logger, LogCategory } from "../engine/utils/Logger";

export interface GameConfig {
    // Core game settings
    game: {
        tickRate: number;
        maxPlayers: number;
        autoSaveInterval: number; // minutes
    };
    
    // Train system settings
    train: {
        maxSpeed: number;
        carSpacing: number;
        maxCars: number;
        defaultBaseSpeed: number;
        powerEfficiency: number;
    };
    
    // Enemy system settings
    enemy: {
        spawnInterval: { min: number; max: number };
        maxEnemies: number;
        spawnRadius: number;
        spawnOnlyWhenTrainMoving: boolean;
        defaultHealth: number;
        defaultSpeed: number;
    };
    
    // Station and economy settings
    station: {
        maxUpgradeLevel: number;
        baseStorageCapacity: number;
        upgradeStorageMultiplier: number;
        baseTradingRange: number;
    };
    
    // UI settings
    ui: {
        eventLogMaxEntries: number;
        eventLogAutoScroll: boolean;
        timeControlsEnabled: boolean;
    };
    
    // Performance settings
    performance: {
        maxMeshesPerFrame: number;
        cullDistance: number;
        enableObjectPooling: boolean;
    };
    
    // Debug settings (optional)
    debug?: {
        enableLogging: boolean;
        showPerformanceMetrics: boolean;
        enableVisualDebug: boolean;
        logCategories: string[];
    };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: GameConfig = {
    game: {
        tickRate: 60,
        maxPlayers: 6,
        autoSaveInterval: 5
    },
    train: {
        maxSpeed: 0.25,
        carSpacing: 0.8,
        maxCars: 8,
        defaultBaseSpeed: 1.0,
        powerEfficiency: 1.0
    },
    enemy: {
        spawnInterval: { min: 6, max: 10 },
        maxEnemies: 15,
        spawnRadius: 20,
        spawnOnlyWhenTrainMoving: false,
        defaultHealth: 75,
        defaultSpeed: 1.0
    },
    station: {
        maxUpgradeLevel: 5,
        baseStorageCapacity: 100,
        upgradeStorageMultiplier: 1.5,
        baseTradingRange: 50
    },
    ui: {
        eventLogMaxEntries: 100,
        eventLogAutoScroll: true,
        timeControlsEnabled: true
    },
    performance: {
        maxMeshesPerFrame: 50,
        cullDistance: 100,
        enableObjectPooling: true
    }
};

export class ConfigManager {
    private static config: GameConfig = { ...DEFAULT_CONFIG };
    private static isInitialized: boolean = false;

    /**
     * Initialize the configuration system
     * @param environment - The environment to load config for
     * @param customConfig - Optional custom configuration to merge
     */
    static async initialize(
        environment: 'development' | 'production' | 'test' = 'development',
        customConfig?: Partial<GameConfig>
    ): Promise<void> {
        if (this.isInitialized) {
            Logger.log(LogCategory.SYSTEM, 'ConfigManager already initialized');
            return;
        }

        try {
            // Start with default config
            this.config = { ...DEFAULT_CONFIG };

            // Apply environment-specific overrides
            if (environment === 'development') {
                this.config.debug = {
                    enableLogging: true,
                    showPerformanceMetrics: true,
                    enableVisualDebug: true,
                    logCategories: ['SYSTEM', 'TRAIN', 'ENEMY', 'UI']
                };
                this.config.game.tickRate = 30; // Slower for debugging
            } else if (environment === 'test') {
                this.config.game.tickRate = 120; // Faster for tests
                this.config.enemy.maxEnemies = 5; // Fewer for tests
            }

            // Apply custom configuration overrides
            if (customConfig) {
                this.config = this.mergeConfig(this.config, customConfig);
            }

            this.isInitialized = true;
            
            Logger.log(LogCategory.SYSTEM, `ConfigManager initialized for ${environment}`, {
                tickRate: this.config.game.tickRate,
                maxEnemies: this.config.enemy.maxEnemies,
                debugEnabled: !!this.config.debug?.enableLogging
            });
        } catch (error) {
            Logger.error(LogCategory.SYSTEM, 'Failed to initialize ConfigManager', error as Error);
            throw error;
        }
    }

    /**
     * Get a configuration value by path
     * @param path - Dot-separated path to the config value (e.g., 'train.maxSpeed')
     */
    static get<T = any>(path: string): T {
        if (!this.isInitialized) {
            Logger.warn(LogCategory.SYSTEM, 'ConfigManager not initialized, using default values');
            this.config = { ...DEFAULT_CONFIG };
            this.isInitialized = true;
        }

        const keys = path.split('.');
        let value: any = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                Logger.warn(LogCategory.SYSTEM, `Config path not found: ${path}`);
                return undefined as T;
            }
        }
        
        return value as T;
    }

    /**
     * Get the entire configuration object (read-only)
     */
    static getAll(): Readonly<GameConfig> {
        if (!this.isInitialized) {
            Logger.warn(LogCategory.SYSTEM, 'ConfigManager not initialized, returning default config');
            return DEFAULT_CONFIG;
        }
        return this.config;
    }

    /**
     * Update a configuration value at runtime
     * @param path - Dot-separated path to the config value
     * @param value - New value to set
     */
    static set(path: string, value: any): void {
        if (!this.isInitialized) {
            Logger.warn(LogCategory.SYSTEM, 'ConfigManager not initialized, initializing with defaults');
            this.initialize();
        }

        const keys = path.split('.');
        const lastKey = keys.pop();
        
        if (!lastKey) {
            Logger.error(LogCategory.SYSTEM, `Invalid config path: ${path}`, new Error('Empty path'));
            return;
        }

        let target: any = this.config;
        
        for (const key of keys) {
            if (target && typeof target === 'object' && key in target) {
                target = target[key];
            } else {
                Logger.error(LogCategory.SYSTEM, `Config path not found: ${path}`, new Error(`Key ${key} not found`));
                return;
            }
        }
        
        if (target && typeof target === 'object') {
            target[lastKey] = value;
            Logger.log(LogCategory.SYSTEM, `Config updated: ${path} = ${value}`);
        }
    }

    /**
     * Merge two configuration objects deeply
     */
    private static mergeConfig(base: GameConfig, override: Partial<GameConfig>): GameConfig {
        const result = { ...base };
        
        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key as keyof GameConfig] = {
                    ...result[key as keyof GameConfig],
                    ...value
                } as any;
            } else {
                result[key as keyof GameConfig] = value as any;
            }
        }
        
        return result;
    }

    /**
     * Reset configuration to defaults
     */
    static reset(): void {
        this.config = { ...DEFAULT_CONFIG };
        Logger.log(LogCategory.SYSTEM, 'Configuration reset to defaults');
    }

    /**
     * Check if ConfigManager is initialized
     */
    static isReady(): boolean {
        return this.isInitialized;
    }
}
