/**
 * LightRenderer - Responsible for creating and managing scene lighting
 */
import { Scene, HemisphericLight, DirectionalLight, Color3, Vector3, Light } from "@babylonjs/core";
import { Logger, LogCategory } from "../engine/utils/Logger";

/**
 * Light configuration for scene lighting
 */
export interface LightConfig {
    ambient: {
        direction: Vector3;
        intensity: number;
        diffuse: Color3;
    };
    directional: {
        direction: Vector3;
        intensity: number;
        diffuse: Color3;
    };
}

/**
 * Default light configuration
 */
const DEFAULT_LIGHT_CONFIG: LightConfig = {
    ambient: {
        direction: new Vector3(0, 1, 0),
        intensity: 0.5,
        diffuse: new Color3(0.7, 0.7, 0.8),
    },
    directional: {
        direction: new Vector3(-1, -2, -1),
        intensity: 0.8,
        diffuse: new Color3(1, 0.95, 0.85),
    }
};

/**
 * Handles the creation and management of scene lighting
 */
export class LightRenderer {
    private scene: Scene;
    private config: LightConfig;
    private ambientLight: HemisphericLight | null = null;
    private directionalLight: DirectionalLight | null = null;

    /**
     * Create a new LightRenderer
     * @param scene The Babylon.js scene
     * @param config Optional light configuration
     */
    constructor(scene: Scene, config?: Partial<LightConfig>) {
        this.scene = scene;
        this.config = this.mergeConfig(DEFAULT_LIGHT_CONFIG, config);
        
        Logger.log(LogCategory.RENDERING, "LightRenderer initialized");
    }

    /**
     * Set up basic lighting for the scene
     * @returns Array of created lights
     */
    setupLights(): Light[] {
        const lights: Light[] = [];
        
        // Add ambient light for general illumination
        this.ambientLight = new HemisphericLight(
            "ambientLight",
            this.config.ambient.direction,
            this.scene
        );
        this.ambientLight.intensity = this.config.ambient.intensity;
        this.ambientLight.diffuse = this.config.ambient.diffuse;
        lights.push(this.ambientLight);
        
        // Add directional light for shadows and detail
        this.directionalLight = new DirectionalLight(
            "directionalLight",
            this.config.directional.direction,
            this.scene
        );
        this.directionalLight.intensity = this.config.directional.intensity;
        this.directionalLight.diffuse = this.config.directional.diffuse;
        lights.push(this.directionalLight);
        
        Logger.log(LogCategory.RENDERING, "Scene lighting setup complete");
        
        return lights;
    }
    
    /**
     * Get the ambient light
     */
    getAmbientLight(): HemisphericLight | null {
        return this.ambientLight;
    }
    
    /**
     * Get the directional light
     */
    getDirectionalLight(): DirectionalLight | null {
        return this.directionalLight;
    }
    
    /**
     * Deep merge configuration objects
     */
    private mergeConfig(defaultConfig: LightConfig, userConfig?: Partial<LightConfig>): LightConfig {
        if (!userConfig) return defaultConfig;
        
        const result = { ...defaultConfig };
        
        // Merge ambient config if provided
        if (userConfig.ambient) {
            result.ambient = {
                ...defaultConfig.ambient,
                ...userConfig.ambient
            };
        }
        
        // Merge directional config if provided
        if (userConfig.directional) {
            result.directional = {
                ...defaultConfig.directional,
                ...userConfig.directional
            };
        }
        
        return result;
    }
}
