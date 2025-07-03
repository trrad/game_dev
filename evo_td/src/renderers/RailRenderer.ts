/**
 * RailRenderer - Responsible for creating and managing visual representations of rails
 */
import { Scene, MeshBuilder, Color3, Vector3, LinesMesh } from "@babylonjs/core";
import { Rail, RailConfig } from "../entities/Rail";
import { Logger, LogCategory } from "../engine/utils/Logger";

/**
 * Rail visual style configuration
 */
export interface RailVisualConfig {
    operationalColor: Color3;
    damagedColor: Color3;
    updatable: boolean;
}

/**
 * Default visual configuration for rails
 */
const DEFAULT_RAIL_VISUAL: RailVisualConfig = {
    operationalColor: new Color3(0.4, 0.2, 0.1), // Brown for operational
    damagedColor: new Color3(0.6, 0.1, 0.1),     // Red for damaged
    updatable: true
};

/**
 * Handles the rendering aspects of Rail entities
 */
export class RailRenderer {
    private scene: Scene;
    private visualConfig: RailVisualConfig;

    /**
     * Create a new RailRenderer
     * @param scene The Babylon.js scene
     * @param config Optional visual configuration
     */
    constructor(scene: Scene, config?: Partial<RailVisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_RAIL_VISUAL, ...config };
        
        Logger.log(LogCategory.RENDERING, "RailRenderer initialized");
    }

    /**
     * Create a visual representation for a rail
     * @param rail Rail entity or configuration
     * @returns The created mesh
     */
    createRailVisual(rail: Rail | RailConfig): LinesMesh {
        // Get track points
        const trackPoints = 'trackPoints' in rail ? 
            rail.trackPoints : 
            (rail as Rail).trackPoints;
            
        // Get rail ID and operational status
        const id = 'id' in rail ? rail.id : (rail as Rail).railId;
        const isOperational = 'isOperational' in rail ? 
            rail.isOperational : 
            (rail as Rail).isOperational;
            
        // Create the rail mesh
        const railMesh = MeshBuilder.CreateLines(
            `rail_${id}`,
            { 
                points: trackPoints,
                updatable: this.visualConfig.updatable
            },
            this.scene
        );
        
        // Set color based on operational status
        railMesh.color = isOperational ? 
            this.visualConfig.operationalColor : 
            this.visualConfig.damagedColor;
            
        Logger.log(LogCategory.RENDERING, `Created rail visual: ${id}`);
        
        return railMesh;
    }
}
