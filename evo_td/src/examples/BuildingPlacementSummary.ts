/**
 * BuildingPlacementSummary - Demonstrates the new random building configuration system
 */
import { Vector3 } from "@babylonjs/core";
import { Station } from "../entities/Station";
import { Logger, LogCategory } from "../utils/Logger";

/**
 * Create a summary of building placement for demonstration purposes
 */
export class BuildingPlacementSummary {
    /**
     * Generate and log building placement summary for multiple test stations
     */
    static logBuildingPlacementDemo(): void {
        Logger.log(LogCategory.SYSTEM, "=== Random Building Placement Demo ===");
        
        const testStations = [
            {
                id: 'demo_station_a',
                name: 'Central Hub Demo',
                position: new Vector3(0, 0, 0),
                connectedRails: [],
                perimeterRadius: 50,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 8
            },
            {
                id: 'demo_station_b', 
                name: 'Eastern Depot Demo',
                position: new Vector3(100, 0, 0),
                connectedRails: [],
                perimeterRadius: 40,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 6
            },
            {
                id: 'demo_station_c',
                name: 'Northern Outpost Demo', 
                position: new Vector3(0, 0, 100),
                connectedRails: [],
                perimeterRadius: 35,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 5
            }
        ];

        testStations.forEach((config) => {
            const station = new Station(config);
            station.expandStation(); // This triggers building generation

            const buildingData = station.buildingData;
            
            Logger.log(LogCategory.SYSTEM, `Station ${config.name} Building Summary:`, {
                stationId: config.id,
                position: `(${config.position.x}, ${config.position.z})`,
                totalBuildings: buildingData.length,
                expectedBuildings: config.decorativeBuildingCount,
                perimeterRadius: config.perimeterRadius
            });

            // Log each building's details
            buildingData.forEach((building, buildingIndex) => {
                const distanceFromCenter = Vector3.Distance(building.position, config.position);
                Logger.log(LogCategory.SYSTEM, `  Building ${buildingIndex + 1}:`, {
                    type: building.type,
                    position: `(${building.position.x.toFixed(2)}, ${building.position.z.toFixed(2)})`,
                    size: `${building.size.x.toFixed(1)}x${building.size.y.toFixed(1)}x${building.size.z.toFixed(1)}`,
                    distanceFromCenter: distanceFromCenter.toFixed(2),
                    colorIndex: building.colorIndex
                });
            });

            Logger.log(LogCategory.SYSTEM, `--- End of ${config.name} ---`);
        });
        
        Logger.log(LogCategory.SYSTEM, "=== End Building Placement Demo ===");
    }

    static logImprovements(): void {
        Logger.log(LogCategory.SYSTEM, '=== Random Building Placement Improvements ===');
        
        Logger.log(LogCategory.SYSTEM, '✓ Unique Station Configurations');
        Logger.log(LogCategory.SYSTEM, '  • Each station generates its own random building layout');
        Logger.log(LogCategory.SYSTEM, '  • Buildings placed within 2-4 unit radius from station center');
        Logger.log(LogCategory.SYSTEM, '  • Random angles and distances for organic placement');
        
        Logger.log(LogCategory.SYSTEM, '✓ Increased Building Density');
        Logger.log(LogCategory.SYSTEM, '  • 6-10 decorative buildings per station (was 2-4)');
        Logger.log(LogCategory.SYSTEM, '  • Smaller, more varied building sizes');
        Logger.log(LogCategory.SYSTEM, '  • Buildings range from 1.5x6x1.5 towers to 5x4x3 shops');
        
        Logger.log(LogCategory.SYSTEM, '✓ Improved Visual Consistency');
        Logger.log(LogCategory.SYSTEM, '  • Removed perimeter entrance marker spheres');
        Logger.log(LogCategory.SYSTEM, '  • Grey-tone color palette with 5 distinct tones');
        Logger.log(LogCategory.SYSTEM, '  • Consistent rendering between entity logic and visuals');
        
        Logger.log(LogCategory.SYSTEM, '✓ Grey-Tone Color System');
        Logger.log(LogCategory.SYSTEM, '  • Dark grey (0.25), Medium-dark (0.35), Medium (0.45)');
        Logger.log(LogCategory.SYSTEM, '  • Medium-light (0.55), Light grey (0.65)');
        Logger.log(LogCategory.SYSTEM, '  • Slight random variation for natural appearance');
        
        Logger.log(LogCategory.SYSTEM, '=== Benefits ===');
        Logger.log(LogCategory.SYSTEM, '• Each station has unique character and layout');
        Logger.log(LogCategory.SYSTEM, '• More dense, realistic industrial appearance');
        Logger.log(LogCategory.SYSTEM, '• Clean, professional grey-tone aesthetic');
        Logger.log(LogCategory.SYSTEM, '• No visual clutter from unwanted spheres');
        Logger.log(LogCategory.SYSTEM, '• Consistent data flow from entity to renderer');
    }
}
