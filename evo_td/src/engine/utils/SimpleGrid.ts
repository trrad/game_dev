// src/engine/utils/SimpleGrid.ts - Ultra lightweight, no dependencies

import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';

export function createSimpleGrid(scene: Scene, size: number = 20): Mesh {
    // Create ground plane with subdivisions for wireframe effect
    const ground = MeshBuilder.CreateGround(
        "simpleGrid", 
        { 
            width: size, 
            height: size, 
            subdivisions: size // Creates grid subdivisions
        }, 
        scene
    );

    // Create simple material
    const material = new StandardMaterial("gridMaterial", scene);
    material.diffuseColor = new Color3(0.2, 0.2, 0.3);  // Dark background
    material.wireframe = true;                           // Show as wireframe = grid!
    material.alpha = 0.6;

    ground.material = material;
    
    console.log(`🟫 Ultra simple grid created: ${size}x${size} using wireframe`);
    
    return ground;
}

// Alternative: Solid ground with grid lines
export function createSolidGrid(scene: Scene, size: number = 20): Mesh {
    const ground = MeshBuilder.CreateGround(
        "solidGrid", 
        { width: size, height: size }, 
        scene
    );

    const material = new StandardMaterial("solidGridMaterial", scene);
    material.diffuseColor = new Color3(0.1, 0.15, 0.2);  // Dark blue-gray
    material.specularColor = new Color3(0.1, 0.1, 0.1);  // Low shine
    
    ground.material = material;
    
    console.log(`🟫 Solid grid created: ${size}x${size} using basic material`);
    
    return ground;
}