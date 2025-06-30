/**
 * GroundRenderer - Responsible for creating and managing the ground plane
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, DynamicTexture, Mesh } from "@babylonjs/core";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Ground visual style configuration
 */
export interface GroundVisualConfig {
    width: number;
    height: number;
    yOffset: number;
    baseColor: string;
    gridColor: string;
    gridSpacing: number;
    textureSize: number;
    lineWidth: number;
}

/**
 * Default visual configuration for the ground
 */
const DEFAULT_GROUND_VISUAL: GroundVisualConfig = {
    width: 300,
    height: 300,
    yOffset: -0.01,  // Slightly below zero so objects sit on it properly
    baseColor: "#1a2b1a",
    gridColor: "#4CAF50",
    gridSpacing: 64,
    textureSize: 1024,
    lineWidth: 2
};

/**
 * Handles the rendering of the ground plane
 */
export class GroundRenderer {
    private scene: Scene;
    private visualConfig: GroundVisualConfig;

    /**
     * Create a new GroundRenderer
     * @param scene The Babylon.js scene
     * @param config Optional visual configuration
     */
    constructor(scene: Scene, config?: Partial<GroundVisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_GROUND_VISUAL, ...config };
        
        Logger.log(LogCategory.RENDERING, "GroundRenderer initialized");
    }

    /**
     * Create a ground plane with grid texture
     * @returns The created ground mesh
     */
    createGround(): Mesh {
        // Create the ground plane mesh
        const ground = MeshBuilder.CreateGround(
            "ground",
            { 
                width: this.visualConfig.width, 
                height: this.visualConfig.height 
            },
            this.scene
        );
        
        // Create ground material
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        
        // Create a dynamic texture for the grid pattern
        const gridTexture = this.createGridTexture();
        
        // Apply the texture to the ground
        groundMaterial.diffuseTexture = gridTexture;
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        ground.material = groundMaterial;
        
        // Position slightly below zero so objects sit on it properly
        ground.position.y = this.visualConfig.yOffset;
        
        Logger.log(LogCategory.RENDERING, "Created ground plane with grid texture");
        
        return ground;
    }
    
    /**
     * Create a grid texture for the ground
     * @returns The created dynamic texture
     */
    private createGridTexture(): DynamicTexture {
        // Create dynamic texture
        const gridTexture = new DynamicTexture(
            "gridTexture", 
            this.visualConfig.textureSize, 
            this.scene, 
            true
        );
        const ctx = gridTexture.getContext();
        
        // Fill with base color
        ctx.fillStyle = this.visualConfig.baseColor;
        ctx.fillRect(0, 0, this.visualConfig.textureSize, this.visualConfig.textureSize);
        
        // Draw grid lines
        ctx.strokeStyle = this.visualConfig.gridColor;
        ctx.lineWidth = this.visualConfig.lineWidth;
        
        // Draw vertical lines
        for (let x = 0; x <= this.visualConfig.textureSize; x += this.visualConfig.gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.visualConfig.textureSize);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.visualConfig.textureSize; y += this.visualConfig.gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.visualConfig.textureSize, y);
            ctx.stroke();
        }
        
        // Update the texture
        gridTexture.update();
        
        return gridTexture;
    }
}
