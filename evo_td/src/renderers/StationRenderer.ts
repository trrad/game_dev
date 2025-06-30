/**
 * StationRenderer - Responsible for creating and managing visual representations of stations
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, PointLight } from "@babylonjs/core";
import { Station, StationConfig } from "../entities/Station";
import { PositionComponent } from "../components/PositionComponent";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Station visual style configuration
 */
export interface StationVisualConfig {
    width: number;
    height: number;
    depth: number;
    yOffset: number;
    colors: Color3[];
}

/**
 * Default visual configuration for stations
 */
const DEFAULT_STATION_VISUAL: StationVisualConfig = {
    width: 2.5,    // Diameter for cylinder
    height: 1.5,   // Height for cylinder 
    depth: 2.5,    // Not used for cylinder, but kept for interface compatibility
    yOffset: 0.75, // Position above ground (half the height + small offset)
    colors: [
        new Color3(0.9, 0.9, 0.2), // Brighter Yellow
        new Color3(0.2, 0.9, 0.2), // Brighter Green
        new Color3(0.2, 0.2, 0.9)  // Brighter Blue
    ]
};

/**
 * Handles the rendering aspects of Station entities
 */
export class StationRenderer {
    private scene: Scene;
    private visualConfig: StationVisualConfig;

    /**
     * Create a new StationRenderer
     * @param scene The Babylon.js scene
     * @param config Optional visual configuration
     */
    constructor(scene: Scene, config?: Partial<StationVisualConfig>) {
        this.scene = scene;
        this.visualConfig = { ...DEFAULT_STATION_VISUAL, ...config };
        
        Logger.log(LogCategory.RENDERING, "StationRenderer initialized");
    }

    /**
     * Create a visual mesh for a station
     * @param station Station entity or configuration
     * @param colorIndex Color index to use from the color array
     * @returns The created mesh
     */
    createStationVisual(station: Station | StationConfig, colorIndex: number = 0): Mesh {
        // Get the station position and ID
        let position: Vector3;
        let id: string;
        
        if ('id' in station && 'position' in station) {
            // It's a StationConfig
            id = station.id;
            position = (station as StationConfig).position.clone();
        } else {
            // It's a Station instance - get position from PositionComponent
            const stationInstance = station as Station;
            id = stationInstance.stationId;
            const posComponent = stationInstance.getComponent<PositionComponent>('position');
            const pos3D = posComponent ? posComponent.getPosition() : { x: 0, y: 0, z: 0 };
            position = new Vector3(pos3D.x, pos3D.y, pos3D.z);
        }
        
        Logger.log(LogCategory.RENDERING, `Creating station visual: ${id} at (${position.x}, ${position.y}, ${position.z})`);
        
        // Create the station mesh - using a cylinder for a more distinctive look
        const stationMesh = MeshBuilder.CreateCylinder(
            `station_${id}`,
            { 
                diameter: this.visualConfig.width,
                height: this.visualConfig.height,
                tessellation: 8  // 8-sided cylinder for nice appearance
            },
            this.scene
        );
        
        // Position the mesh
        stationMesh.position = new Vector3(
            position.x, 
            this.visualConfig.yOffset, // Always override Y
            position.z
        );
        
        // Ensure the mesh is visible and not culled
        stationMesh.isVisible = true;
        stationMesh.alwaysSelectAsActiveMesh = true;
        stationMesh.checkCollisions = false; // Disable collisions for better visibility
        stationMesh.receiveShadows = true; // Enable shadow reception for better visuals
        
        // Add material with distinctive color and make it more visible
        const material = new StandardMaterial(`station_${id}_mat`, this.scene);
        const selectedColor = this.visualConfig.colors[colorIndex % this.visualConfig.colors.length];
        material.diffuseColor = selectedColor;
        material.specularColor = new Color3(0.3, 0.3, 0.3); // Add some specular highlight
        material.emissiveColor = new Color3(0.1, 0.1, 0.1); // Add slight emissive glow
        stationMesh.material = material;
        
        // Add a point light glow at the station (like the original app.ts)
        const glow = new PointLight(`${id}_glow`, 
            new Vector3(position.x, this.visualConfig.yOffset + 2, position.z), 
            this.scene
        );
        glow.diffuse = selectedColor;
        glow.intensity = 0.7;
        glow.range = 10;
        
        Logger.log(LogCategory.RENDERING, `Created station visual: ${id}`);
        
        return stationMesh;
    }
}
