import { SceneManager, SceneManagerConfig } from '../../core/SceneManager';
import { GameObject } from '../../core/GameObject';
import { PositionComponent } from '../../components/PositionComponent';
import { 
    Vector3, 
    Engine, 
    AbstractMesh, 
    Mesh, 
    Scene 
} from '@babylonjs/core';

// Now we're using the mocked babylonjs classes from @babylonjs/core

describe('SceneManager', () => {
    let sceneManager: SceneManager;
    let engine: Engine;
    let config: SceneManagerConfig;

    beforeEach(() => {
        // Create a mock engine with a canvas from jsdom
        engine = new Engine(document.createElement('canvas'));
        
        config = {
            fieldOfViewDistance: 50,
            enableCulling: true,
            maxVisibleObjects: 100,
            debugMode: false
        };

        sceneManager = new SceneManager(engine, config);
    });

    afterEach(() => {
        sceneManager.dispose();
    });

    test('should be created with proper configuration', () => {
        expect(sceneManager).toBeDefined();
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.config.fieldOfViewDistance).toBe(50);
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.config.enableCulling).toBe(true);
    });

    test('should register and unregister game objects correctly', () => {
        // Create a game object
        const gameObject = new GameObject('testObject');
        
        // Add position component to the game object
        const positionComp = new PositionComponent();
        positionComp.setPosition({ x: 10, y: 5, z: 2 });
        gameObject.addComponent(positionComp);

        // Create a mesh
        const mesh = new Mesh('testMesh', sceneManager.scene);

        // Register the game object
        sceneManager.registerGameObject(gameObject, mesh);
        
        // Verify mesh position is updated from the position component
        expect(mesh.position.x).toBe(10);
        expect(mesh.position.y).toBe(5);
        expect(mesh.position.z).toBe(2);

        // Unregister the game object
        sceneManager.unregisterGameObject(gameObject.id);
        
        // Verify the game object is no longer tracked
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.visualMappings.has(gameObject.id)).toBe(false);
    });

    test('should update visual positions when game object position changes', () => {
        // Create a game object with position
        const gameObject = new GameObject('testObject');
        const positionComp = new PositionComponent();
        positionComp.setPosition({ x: 0, y: 0, z: 0 });
        gameObject.addComponent(positionComp);

        // Create a mesh
        const mesh = new Mesh('testMesh', sceneManager.scene);

        // Register the game object
        sceneManager.registerGameObject(gameObject, mesh);
        
        // Change position
        positionComp.setPosition({ x: 20, y: 15, z: 10 });
        
        // Use a larger delta time to ensure the update happens
        // SceneManager uses a fixed timestep of 1/60, so we need at least that much
        sceneManager.update(1/60 + 0.001); // Slightly more than one frame
        
        // Verify mesh position is updated
        expect(mesh.position.x).toBe(20);
        expect(mesh.position.y).toBe(15);
        expect(mesh.position.z).toBe(10);
    });

    test('should cull objects outside field of view', () => {
        // Create game objects at different distances
        const createObjectAtDistance = (distance: number) => {
            const gameObject = new GameObject(`object_${distance}`);
            const positionComp = new PositionComponent();
            positionComp.setPosition({ x: 0, y: 0, z: distance });
            gameObject.addComponent(positionComp);
            
            const mesh = new Mesh(`mesh_${distance}`, sceneManager.scene);
            sceneManager.registerGameObject(gameObject, mesh);
            
            return { gameObject, mesh };
        };

        // Create objects inside and outside FOV
        const insideObj = createObjectAtDistance(40);
        const outsideObj = createObjectAtDistance(60);
        
        // Set camera position to origin
        // @ts-ignore - Mock camera position
        sceneManager.camera = { position: { x: 0, y: 0, z: 0 } };
        
        // Update culling
        // @ts-ignore - Calling private method for testing
        sceneManager.updateObjectVisibility();
        
        // Verify visibility
        expect(insideObj.mesh.isVisible).toBe(true);
        expect(outsideObj.mesh.isVisible).toBe(false);
    });

    test('should change configuration properties correctly', () => {
        // Change field of view
        sceneManager.setFieldOfViewDistance(75);
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.config.fieldOfViewDistance).toBe(75);
        
        // Change max visible objects
        sceneManager.setMaxVisibleObjects(200);
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.config.maxVisibleObjects).toBe(200);
        
        // Toggle culling
        sceneManager.setCullingEnabled(false);
        // @ts-ignore - Accessing private property for testing
        expect(sceneManager.config.enableCulling).toBe(false);
    });

    test('should create default visual for game object', () => {
        const gameObject = new GameObject('visualTest');
        
        // The createDefaultVisual method will create a mesh using MeshBuilder
        const result = sceneManager.createDefaultVisual(gameObject);
        
        // Verify the mesh was created and registered
        expect(result).toBeDefined();
        expect(result.name).toContain('visual_');
        expect(result.material).toBeDefined();
        
        // Check if the game object was registered correctly
        // @ts-ignore - Access private property for testing
        expect(sceneManager.visualMappings.has(gameObject.id)).toBe(true);
    });
});
