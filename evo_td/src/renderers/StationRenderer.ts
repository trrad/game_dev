/**
 * StationRenderer - Responsible for creating and managing visual representations of stations
 */
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, PointLight } from "@babylonjs/core";
import { Station, StationConfig, StationBuildingData } from "../entities/Station";
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

    /**
     * Create visual representation for an expanded station with perimeter and buildings
     */
    createExpandedStationVisual(station: Station, colorIndex: number = 0): { mainMesh: Mesh, perimeterMesh?: Mesh, buildingMeshes: Mesh[] } {
        const result = {
            mainMesh: this.createStationVisual(station, colorIndex),
            perimeterMesh: undefined as Mesh | undefined,
            buildingMeshes: [] as Mesh[]
        };

        // Create perimeter visualization if station is expanded
        if (station.isExpanded) {
            const perimeter = station.getPerimeter();
            if (perimeter) {
                result.perimeterMesh = this.createPerimeterVisual(perimeter, station.stationId, colorIndex);
            }

            // Create building visuals (placeholder for now)
            result.buildingMeshes = this.createBuildingVisuals(station, colorIndex);
        }

        return result;
    }

    /**
     * Create visual representation of the station perimeter
     */
    private createPerimeterVisual(perimeter: any, stationId: string, colorIndex: number): Mesh {
        // Create a ground disc to show the station perimeter
        const perimeterMesh = MeshBuilder.CreateGround(
            `station_${stationId}_perimeter`,
            {
                width: perimeter.radius * 2,
                height: perimeter.radius * 2,
                subdivisions: 32
            },
            this.scene
        );

        // Position at the perimeter center
        perimeterMesh.position = perimeter.center.clone();
        perimeterMesh.position.y = -0.1; // Slightly below ground level

        // Create semi-transparent material
        const perimeterMaterial = new StandardMaterial(`station_${stationId}_perimeter_mat`, this.scene);
        const baseColor = this.visualConfig.colors[colorIndex % this.visualConfig.colors.length];
        perimeterMaterial.diffuseColor = baseColor;
        perimeterMaterial.alpha = 0.2; // Semi-transparent
        perimeterMaterial.emissiveColor = baseColor.scale(0.1);
        
        perimeterMesh.material = perimeterMaterial;

        // Note: Entrance markers completely removed - no sphere markers
        Logger.log(LogCategory.RENDERING, `Created perimeter visual for station: ${stationId}`);
        return perimeterMesh;
    }

    /**
     * Create visual representations of buildings within the station
     */
    private createBuildingVisuals(station: Station, colorIndex: number): Mesh[] {
        const buildingMeshes: Mesh[] = [];
        
        // Create cargo warehouse visual if it exists
        const warehouse = station.getCargoWarehouse();
        if (warehouse) {
            const perimeter = station.getPerimeter();
            if (perimeter) {
                const warehouseMesh = this.createWarehouseVisual(station.stationId, perimeter, colorIndex);
                buildingMeshes.push(warehouseMesh);
            }
        }

        // Create decorative buildings using the station's actual building data
        const buildingData = station.buildingData;
        buildingData.forEach((building, index) => {
            const buildingMesh = this.createBuildingFromData(
                station.stationId, 
                building, 
                index
            );
            buildingMeshes.push(buildingMesh);
        });

        Logger.log(LogCategory.RENDERING, `Created ${buildingMeshes.length} building visuals for station: ${station.stationId} (${buildingData.length} decorative buildings)`);
        return buildingMeshes;
    }

    /**
     * Create visual for cargo warehouse
     */
    private createWarehouseVisual(stationId: string, perimeter: any, _colorIndex: number): Mesh {
        // Use same controlled position as in Station entity
        const stationCenter = perimeter.center;
        const position = new Vector3(
            stationCenter.x + 2.5, // 2.5 units east of center
            stationCenter.y,
            stationCenter.z - 1.5  // 1.5 units south of center
        );
        
        const warehouse = MeshBuilder.CreateBox(
            `station_${stationId}_warehouse`,
            { width: 12, height: 6, depth: 8 },
            this.scene
        );

        warehouse.position = position;
        warehouse.position.y = 3; // Half the height to sit on ground

        // Create warehouse material (more industrial looking)
        const material = new StandardMaterial(`station_${stationId}_warehouse_mat`, this.scene);
        material.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown/industrial color
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        warehouse.material = material;

        return warehouse;
    }    /**
     * Create visual for building based on station's building data
     */
    private createBuildingFromData(stationId: string, buildingData: any, index: number): Mesh {
        const building = MeshBuilder.CreateBox(
            `station_${stationId}_building_${index}`,
            { 
                width: buildingData.size.x, 
                height: buildingData.size.y, 
                depth: buildingData.size.z 
            },
            this.scene
        );

        // Position the building using the stored position data
        building.position.x = buildingData.position.x;
        building.position.z = buildingData.position.z;
        building.position.y = buildingData.size.y / 2; // Half height to sit on ground

        // Create grey-tone materials with more variation
        const material = new StandardMaterial(`station_${stationId}_building_${index}_mat`, this.scene);
        
        // Generate varied grey tones (darker to lighter)
        const greyTones = [
            new Color3(0.25, 0.25, 0.25), // Dark grey
            new Color3(0.35, 0.35, 0.35), // Medium-dark grey
            new Color3(0.45, 0.45, 0.45), // Medium grey
            new Color3(0.55, 0.55, 0.55), // Medium-light grey
            new Color3(0.65, 0.65, 0.65)  // Light grey
        ];
        
        const selectedTone = greyTones[buildingData.colorIndex % greyTones.length];
        
        // Add slight random variation to the selected tone
        const variation = 0.05;
        material.diffuseColor = new Color3(
            Math.max(0.1, Math.min(0.8, selectedTone.r + (Math.random() - 0.5) * variation)),
            Math.max(0.1, Math.min(0.8, selectedTone.g + (Math.random() - 0.5) * variation)),
            Math.max(0.1, Math.min(0.8, selectedTone.b + (Math.random() - 0.5) * variation))
        );
        
        material.specularColor = new Color3(0.1, 0.1, 0.1); // Low specular for matte look

        building.material = material;
        return building;
    }

    /**
     * Update visual configuration for stations
     */
    updateVisualConfig(config: Partial<StationVisualConfig>): void {
        this.visualConfig = { ...this.visualConfig, ...config };
        Logger.log(LogCategory.RENDERING, 'StationRenderer visual configuration updated');
    }
}
