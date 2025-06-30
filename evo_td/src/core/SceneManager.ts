/**
 * SceneManager handles the visual representation of the game world,
 * bridging the ECS system with the 3D rendering engine.
 * It manages:
 * - Field of view and culling for performance
 * - Creation and management of visual representations for game objects
 * - Hierarchical object support (e.g., trains with cars and attachments)
 * - Scene optimization and performance controls
 * 
 * Supports both simple mesh objects and complex hierarchical objects:
 * - Simple objects: Stations, Rails (single AbstractMesh)
 * - Hierarchical objects: Trains (TransformNode with child car meshes)
 *   - Train cars can have attachments (nested hierarchy)
 *   - Child meshes are cached for performance optimization
 *   - Position updates affect the entire hierarchy
 */

import {
    Engine,
    Scene,
    Vector3,
    Mesh,
    AbstractMesh,
    TransformNode,
    Camera,
    ArcRotateCamera,
    HemisphericLight,
    DirectionalLight,
    Color3,
    MeshBuilder,
    StandardMaterial
} from "@babylonjs/core";

import { GameObject } from './GameObject';
import { PositionComponent } from '../components/PositionComponent';
import { TimeManager } from '../game/TimeManager';
import { Logger, LogCategory } from '../utils/Logger';

/**
 * Configuration options for SceneManager
 */
export interface SceneManagerConfig {
    /** Max visible distance for objects (field of view) */
    fieldOfViewDistance: number;
    /** Whether to enable culling of distant objects */
    enableCulling: boolean;
    /** Maximum number of objects to render at once */
    maxVisibleObjects: number;
    /** Debug mode */
    debugMode: boolean;
}

/**
 * Camera tracking configuration
 */
export interface CameraTrackingConfig {
    /** Camera field of view distance (smaller than SceneManager FoV) */
    cameraFovDistance: number;
    /** Camera follow smoothing factor (0-1, higher = more responsive) */
    followSmoothness: number;
    /** Camera height offset above the tracked object */
    heightOffset: number;
    /** Camera distance behind/around the tracked object */
    followDistance: number;
    /** Whether camera tracking is enabled */
    enabled: boolean;
    /** Whether to show camera FoV debug visualization */
    showCameraFovDebug: boolean;
    /** Minimum zoom distance (closest) */
    minZoomDistance: number;
    /** Maximum zoom distance (farthest) */
    maxZoomDistance: number;
    /** Camera elevation angle (in radians, lower = more cinematic) */
    elevationAngle: number;
    /** Pan offset along train length (0 = center, negative = towards back, positive = towards front) */
    panOffset: number;
    /** Maximum pan distance along train */
    maxPanDistance: number;
    /** Camera azimuth angle around the train (radians, 0 = behind, PI/2 = right side) */
    azimuthAngle: number;
    /** Maximum azimuth rotation allowed (limits camera rotation around train) */
    maxAzimuthAngle: number;
}

/**
 * Default configuration for SceneManager
 */
const DEFAULT_CONFIG: SceneManagerConfig = {
    fieldOfViewDistance: 100,
    enableCulling: true,
    maxVisibleObjects: 1000,
    debugMode: false
};

/**
 * Default camera tracking configuration
 */
const DEFAULT_CAMERA_TRACKING: CameraTrackingConfig = {
    cameraFovDistance: 30, // Smaller than SceneManager FoV
    followSmoothness: 0.1,
    heightOffset: 8, // Lower for more cinematic feel
    followDistance: 20,
    enabled: true,
    showCameraFovDebug: false,
    minZoomDistance: 5, // Allow zooming very close for detailed view
    maxZoomDistance: 50, // Reasonable max distance
    elevationAngle: Math.PI / 8, // 22.5 degrees - lower, more cinematic angle
    panOffset: 0, // Start centered on train
    maxPanDistance: 25, // Allow panning about the length of a medium train
    azimuthAngle: 0, // Start behind the train
    maxAzimuthAngle: Math.PI / 3 // Allow 60 degrees rotation in either direction
};

/**
 * Visual representation mapping for a game object
 * Can be either a single mesh or a transform node with child meshes
 */
interface VisualMapping {
    gameObject: GameObject;
    visual: AbstractMesh | TransformNode;
    lastUpdateTime: number;
    isTransformNode: boolean; // Track whether this is a TransformNode for optimization
    childMeshes?: AbstractMesh[]; // Cache child meshes for performance
}

/**
 * Manages the 3D scene and visual representations of game objects
 */
export class SceneManager {
    /** The Babylon Scene instance */
    public scene: Scene;
    /** Main camera */
    public camera: Camera;
    /** Configuration settings */
    private config: SceneManagerConfig;
    /** Camera tracking configuration */
    private cameraTrackingConfig: CameraTrackingConfig;
    /** Map of game object IDs to their visual representations */
    private visualMappings: Map<string, VisualMapping> = new Map();
    /** Time manager reference */
    private timeManager: TimeManager;
    /** Camera target position */
    private cameraTarget: Vector3;
    /** Current tracked object ID (typically a train) */
    private trackedObjectId: string | null = null;
    /** Smooth camera position for interpolation */
    private smoothCameraPosition: Vector3;
    /** Current camera pan offset along the tracked object */
    private currentPanOffset: number = 0;
    /** Field of view sphere for debugging */
    private fovSphere: Mesh | null = null;
    /** Camera field of view sphere for debugging */
    private cameraFovSphere: Mesh | null = null;
    /** Last time the scene was updated */
    private lastUpdateTime: number = 0;
    /** Delta time accumulator for fixed timestep updates */
    private deltaTimeAccumulator: number = 0;
    /** Fixed update interval in seconds */
    private readonly FIXED_TIMESTEP: number = 1/60;

    /**
     * Create a new SceneManager
     * @param engine The Babylon Engine instance
     * @param config Optional configuration settings
     * @param cameraTrackingConfig Optional camera tracking configuration
     */
    constructor(
        private engine: Engine,
        config: Partial<SceneManagerConfig> = {},
        cameraTrackingConfig: Partial<CameraTrackingConfig> = {}
    ) {
        // Apply default config with overrides
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cameraTrackingConfig = { ...DEFAULT_CAMERA_TRACKING, ...cameraTrackingConfig };
        
        // Create scene
        this.scene = new Scene(engine);
        
        // Set up basic camera with cinematic positioning
        this.cameraTarget = new Vector3(0, 0, 0);
        this.smoothCameraPosition = new Vector3(0, this.cameraTrackingConfig.heightOffset, -this.cameraTrackingConfig.followDistance);
        this.currentPanOffset = this.cameraTrackingConfig.panOffset;
        
        this.camera = new ArcRotateCamera(
            "mainCamera",
            Math.PI / 2, // Azimuth angle (side to side)
            this.cameraTrackingConfig.elevationAngle, // Lower elevation for cinematic feel
            this.cameraTrackingConfig.followDistance,
            this.cameraTarget,
            this.scene
        );
        this.camera.attachControl(engine.getRenderingCanvas(), true);
        
        // Set camera zoom limits
        if (this.camera instanceof ArcRotateCamera) {
            this.camera.lowerRadiusLimit = this.cameraTrackingConfig.minZoomDistance;
            this.camera.upperRadiusLimit = this.cameraTrackingConfig.maxZoomDistance;
        }
        
        // Set up basic lighting
        const hemiLight = new HemisphericLight(
            "hemiLight", 
            new Vector3(0, 1, 0), 
            this.scene
        );
        hemiLight.intensity = 0.7;
        
        const dirLight = new DirectionalLight(
            "dirLight",
            new Vector3(0.5, -1, 1),
            this.scene
        );
        dirLight.intensity = 0.5;

        // Create time manager
        this.timeManager = new TimeManager();

        // Set up debug visualization if needed
        this.setupDebugVisuals();
        
        Logger.log(LogCategory.SYSTEM, "SceneManager initialized", { 
            fieldOfView: this.config.fieldOfViewDistance,
            cullingEnabled: this.config.enableCulling
        });
    }

    /**
     * Set up debug visual elements
     */
    private setupDebugVisuals(): void {
        if (this.config.debugMode) {
            // Create field of view sphere for debugging (SceneManager FoV)
            this.fovSphere = MeshBuilder.CreateSphere(
                "fovSphere", 
                { diameter: this.config.fieldOfViewDistance * 2 }, 
                this.scene
            );
            const fovMaterial = new StandardMaterial("fovSphereMat", this.scene);
            fovMaterial.diffuseColor = new Color3(0.2, 0.4, 0.8);
            fovMaterial.alpha = 0.1;
            fovMaterial.wireframe = true;
            this.fovSphere.material = fovMaterial;
            this.fovSphere.isPickable = false;
        }

        if (this.cameraTrackingConfig.showCameraFovDebug) {
            this.setupCameraFovDebugSphere();
        }
    }

    /**
     * Create camera FoV debug sphere
     */
    private setupCameraFovDebugSphere(): void {
        this.cameraFovSphere = MeshBuilder.CreateSphere(
            "cameraFovSphere", 
            { diameter: this.cameraTrackingConfig.cameraFovDistance * 2 }, 
            this.scene
        );
        const cameraFovMaterial = new StandardMaterial("cameraFovSphereMat", this.scene);
        cameraFovMaterial.diffuseColor = new Color3(0.8, 0.4, 0.2);
        cameraFovMaterial.alpha = 0.15;
        cameraFovMaterial.wireframe = true;
        this.cameraFovSphere.material = cameraFovMaterial;
        this.cameraFovSphere.isPickable = false;
    }

    /**
     * Helper method to collect child meshes from a visual (for TransformNode optimization)
     */
    private collectChildMeshes(visual: TransformNode): AbstractMesh[] {
        const meshes: AbstractMesh[] = [];
        const collectFromNode = (node: any) => {
            if (node instanceof AbstractMesh) {
                meshes.push(node);
            }
            if (node.getChildren) {
                node.getChildren().forEach((child: any) => collectFromNode(child));
            }
        };
        visual.getChildren().forEach(child => collectFromNode(child));
        return meshes;
    }

    /**
     * Helper method to set visibility for a visual (works for both mesh and transform node)
     */
    private setVisualVisibility(visual: AbstractMesh | TransformNode, visible: boolean, childMeshes?: AbstractMesh[]): void {
        if (visual instanceof AbstractMesh) {
            visual.isVisible = visible;
        } else {
            // For TransformNode, use cached child meshes if available for performance
            if (childMeshes) {
                childMeshes.forEach(mesh => mesh.isVisible = visible);
            } else {
                // Fallback to traversing children
                visual.getChildren().forEach(child => {
                    if (child instanceof AbstractMesh) {
                        child.isVisible = visible;
                    }
                });
            }
        }
    }

    /**
     * Helper method to get the position of a visual (works for both mesh and transform node)
     */
    private getVisualPosition(visual: AbstractMesh | TransformNode): Vector3 {
        return visual.position;
    }

    /**
     * Register a game object for visual representation
     * @param gameObject The game object to register
     * @param visual The visual representation (mesh or transform node) to associate with the game object
     */
    registerGameObject(gameObject: GameObject, visual: AbstractMesh | TransformNode): void {
        const isTransformNode = visual instanceof TransformNode && !(visual instanceof AbstractMesh);
        
        // For TransformNode, collect child meshes for performance optimization
        const childMeshes = isTransformNode ? this.collectChildMeshes(visual as TransformNode) : undefined;
        
        this.visualMappings.set(gameObject.id, {
            gameObject,
            visual,
            lastUpdateTime: 0,
            isTransformNode,
            childMeshes
        });

        // If the object has a position component, update the visual position immediately
        const posComponent = gameObject.getComponent<PositionComponent>("position");
        if (posComponent) {
            const pos = posComponent.getPosition();
            visual.position = new Vector3(pos.x, pos.y, pos.z);
            
            const rot = posComponent.getRotation();
            visual.rotation = new Vector3(rot.x, rot.y, rot.z);
        }

        Logger.log(LogCategory.SYSTEM, `Registered visual for GameObject: ${gameObject.id}`, {
            objectType: gameObject.type,
            visualName: visual.name,
            visualType: isTransformNode ? 'TransformNode' : 'AbstractMesh',
            childCount: isTransformNode ? visual.getChildren().length : 0,
            childMeshCount: childMeshes ? childMeshes.length : 0
        });
    }

    /**
     * Helper method to dispose a visual and all its resources
     */
    private disposeVisual(visual: AbstractMesh | TransformNode, childMeshes?: AbstractMesh[]): void {
        if (visual instanceof AbstractMesh) {
            visual.dispose();
        } else {
            // For TransformNode, dispose all child meshes
            if (childMeshes) {
                childMeshes.forEach(mesh => mesh.dispose());
            } else {
                // Fallback to traversing children
                const children = visual.getChildren();
                children.forEach(child => {
                    if (child instanceof AbstractMesh) {
                        child.dispose();
                    }
                });
            }
            visual.dispose();
        }
    }

    /**
     * Unregister a game object from visual tracking
     * @param gameObjectId The ID of the game object to unregister
     * @param dispose Whether to dispose the visual resources (default: false)
     */
    unregisterGameObject(gameObjectId: string, dispose: boolean = false): void {
        const mapping = this.visualMappings.get(gameObjectId);
        if (mapping) {
            if (dispose) {
                this.disposeVisual(mapping.visual, mapping.childMeshes);
            }
            this.visualMappings.delete(gameObjectId);
            
            Logger.log(LogCategory.SYSTEM, `Unregistered visual for GameObject: ${gameObjectId}`, {
                disposed: dispose,
                isTransformNode: mapping.isTransformNode,
                childMeshCount: mapping.childMeshes?.length || 0
            });
        }
    }

    /**
     * Set camera target position
     * @param position Position to focus the camera on
     */
    setCameraTarget(position: Vector3): void {
        this.cameraTarget = position.clone();
        if (this.camera instanceof ArcRotateCamera) {
            this.camera.target = this.cameraTarget;
        }

        // Move FOV sphere if it exists
        if (this.fovSphere) {
            this.fovSphere.position = this.cameraTarget;
        }
    }

    /**
     * Update the visual state of all tracked game objects
     * @param deltaTime Time since last update (in seconds)
     */
    update(deltaTime: number): void {
        // Get the current game time scaling factor
        const timeScale = this.timeManager.getSpeed();
        
        // Accumulate delta time for fixed timestep updates
        this.deltaTimeAccumulator += deltaTime * timeScale;
        
        // Update camera tracking to follow tracked object
        this.updateCameraTracking(deltaTime);
        
        // Update visual representation for all game objects using fixed timestep
        while (this.deltaTimeAccumulator >= this.FIXED_TIMESTEP) {
            this.updateVisuals(this.FIXED_TIMESTEP);
            this.deltaTimeAccumulator -= this.FIXED_TIMESTEP;
        }
        
        // Update object visibility based on culling settings
        this.updateObjectVisibility();
        
        // Update debug visualization if enabled
        this.updateDebugVisuals();
        
        this.lastUpdateTime = performance.now();
    }

    /**
     * Update object visibility based on distance from camera and fog of war around tracked train
     */
    private updateObjectVisibility(): void {
        if (!this.config.enableCulling) {
            // If culling is disabled, make all objects visible
            for (const mapping of this.visualMappings.values()) {
                this.setVisualVisibility(mapping.visual, true, mapping.childMeshes);
            }
            
            // Log when culling is disabled for debugging
            if (this.config.debugMode) {
                Logger.log(LogCategory.PERFORMANCE, `Culling disabled - ensuring ${this.visualMappings.size} objects are visible`);
            }
            return;
        }

        // Get camera position and tracked object position for fog of war
        const cameraPosition = this.camera.position;
        let fogOfWarCenter: Vector3 | null = null;
        
        // If we have a tracked object, use it as the center for fog of war
        if (this.trackedObjectId) {
            const trackedMapping = this.visualMappings.get(this.trackedObjectId);
            if (trackedMapping) {
                fogOfWarCenter = this.getVisualPosition(trackedMapping.visual);
            }
        }
        
        // If no tracked object, use camera position as fallback
        if (!fogOfWarCenter) {
            fogOfWarCenter = cameraPosition.clone();
        }
        
        // Calculate distances and sort objects by distance
        const distancedObjects = Array.from(this.visualMappings.values()).map(mapping => {
            const visualPosition = this.getVisualPosition(mapping.visual);
            const distanceFromCamera = Vector3.Distance(visualPosition, cameraPosition);
            const distanceFromFogCenter = Vector3.Distance(visualPosition, fogOfWarCenter!);
            return { mapping, distanceFromCamera, distanceFromFogCenter };
        }).sort((a, b) => a.distanceFromCamera - b.distanceFromCamera);
        
        // Apply visibility based on distance and fog of war
        const maxObjects = this.config.maxVisibleObjects;
        distancedObjects.forEach((obj, index) => {
            // Check SceneManager field of view (larger area for background processing)
            const isWithinSceneFOV = obj.distanceFromCamera <= this.config.fieldOfViewDistance;
            
            // Check camera field of view (smaller area for "fog of war" effect)
            const isWithinCameraFOV = obj.distanceFromFogCenter <= this.cameraTrackingConfig.cameraFovDistance;
            
            // Check object limit
            const isWithinObjectLimit = index < maxObjects;
            
            // Always show the tracked object itself
            const isTrackedObject = obj.mapping.gameObject.id === this.trackedObjectId;
            
            // Show if within camera FoV (fog of war), unless it's beyond scene FoV or object limit
            const shouldBeVisible = (isWithinCameraFOV || isTrackedObject) && isWithinSceneFOV && isWithinObjectLimit;
            
            this.setVisualVisibility(obj.mapping.visual, shouldBeVisible, obj.mapping.childMeshes);
            
            // Log visibility changes for debugging
            if (this.config.debugMode && (obj.mapping.gameObject.type === 'enemy' || obj.mapping.gameObject.type === 'station')) {
                const visualPosition = this.getVisualPosition(obj.mapping.visual);
                Logger.log(LogCategory.PERFORMANCE, `${obj.mapping.gameObject.type} visibility: ${obj.mapping.gameObject.id}`, {
                    distanceFromCamera: obj.distanceFromCamera.toFixed(2),
                    distanceFromFogCenter: obj.distanceFromFogCenter.toFixed(2),
                    sceneFovDistance: this.config.fieldOfViewDistance,
                    cameraFovDistance: this.cameraTrackingConfig.cameraFovDistance,
                    isWithinSceneFOV,
                    isWithinCameraFOV,
                    isWithinObjectLimit,
                    isTrackedObject,
                    visible: shouldBeVisible,
                    cameraPosition: `(${cameraPosition.x.toFixed(1)}, ${cameraPosition.y.toFixed(1)}, ${cameraPosition.z.toFixed(1)})`,
                    fogCenter: `(${fogOfWarCenter.x.toFixed(1)}, ${fogOfWarCenter.y.toFixed(1)}, ${fogOfWarCenter.z.toFixed(1)})`,
                    visualPosition: `(${visualPosition.x.toFixed(1)}, ${visualPosition.y.toFixed(1)}, ${visualPosition.z.toFixed(1)})`
                });
            }
        });
    }

    /**
     * Update visual representations of all game objects
     * @param fixedDeltaTime Fixed delta time for update (in seconds)
     */
    private updateVisuals(fixedDeltaTime: number): void {
        // First update all game objects' logic
        for (const mapping of this.visualMappings.values()) {
            // Call the update method on each GameObject
            mapping.gameObject.update(fixedDeltaTime);
        }
        
        // Update positions and rotations for all tracked objects
        for (const mapping of this.visualMappings.values()) {
            const posComponent = mapping.gameObject.getComponent<PositionComponent>("position");
            if (!posComponent) continue;
            
            const pos = posComponent.getPosition();
            const rot = posComponent.getRotation();
            
            // Update visual position from component
            // Only update if the visual is not a station mesh (they have fixed Y positions)
            // For trains (TransformNode), we update the whole transform
            if (!mapping.visual.name.includes("station_")) {
                mapping.visual.position.x = pos.x;
                mapping.visual.position.y = pos.y;
                mapping.visual.position.z = pos.z;
            } else {
                // For station visuals, only update X and Z
                mapping.visual.position.x = pos.x;
                mapping.visual.position.z = pos.z;
                // Keep Y as set by the StationRenderer
            }
            
            // Update visual rotation
            mapping.visual.rotation.x = rot.x;
            mapping.visual.rotation.y = rot.y;
            mapping.visual.rotation.z = rot.z;
            
            mapping.lastUpdateTime = performance.now();
        }
        
        // Update object visibility based on distance and other factors
        this.updateObjectVisibility();
    }

    /**
     * Update debug visuals if debug mode is enabled
     */
    private updateDebugVisuals(): void {
        if (!this.config.debugMode) return;
        
        // Update FOV sphere position to follow camera target
        if (this.fovSphere) {
            this.fovSphere.position = this.cameraTarget;
        }
    }

    /**
     * Toggle debug visualization
     * @param enabled Whether debug mode should be enabled
     */
    setDebugMode(enabled: boolean): void {
        this.config.debugMode = enabled;
        
        if (enabled && !this.fovSphere) {
            this.setupDebugVisuals();
        } else if (!enabled && this.fovSphere) {
            this.fovSphere.dispose();
            this.fovSphere = null;
        }
        
        Logger.log(LogCategory.SYSTEM, `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update field of view distance
     * @param distance New FOV distance
     */
    setFieldOfViewDistance(distance: number): void {
        this.config.fieldOfViewDistance = distance;
        
        // Update FOV sphere if it exists
        if (this.fovSphere) {
            this.fovSphere.scaling.setAll(distance / (this.config.fieldOfViewDistance / 2));
        }
        
        Logger.log(LogCategory.SYSTEM, `Field of view distance updated: ${distance}`);
    }

    /**
     * Set maximum number of visible objects
     * @param maxObjects Maximum number of visible objects
     */
    setMaxVisibleObjects(maxObjects: number): void {
        this.config.maxVisibleObjects = maxObjects;
        Logger.log(LogCategory.SYSTEM, `Max visible objects updated: ${maxObjects}`);
    }

    /**
     * Toggle object culling
     * @param enabled Whether culling should be enabled
     */
    setCullingEnabled(enabled: boolean): void {
        this.config.enableCulling = enabled;
        Logger.log(LogCategory.SYSTEM, `Culling ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Create a default visual representation for a game object
     * @param gameObject The game object to create a visual for
     * @returns The created mesh
     */
    createDefaultVisual(gameObject: GameObject): AbstractMesh {
        const mesh = MeshBuilder.CreateBox(
            `visual_${gameObject.id}`,
            { width: 1, height: 1, depth: 1 },
            this.scene
        );
        
        const material = new StandardMaterial(`mat_${gameObject.id}`, this.scene);
        material.diffuseColor = new Color3(0.5, 0.5, 0.5);
        mesh.material = material;
        
        // Register the visual
        this.registerGameObject(gameObject, mesh);
        
        return mesh;
    }

    /**
     * Get time manager instance
     */
    getTimeManager(): TimeManager {
        return this.timeManager;
    }

    /**
     * Start scene rendering and updates
     */
    start(): void {
        // Start the time manager
        this.timeManager.start();
        
        Logger.log(LogCategory.SYSTEM, "SceneManager started");
    }

    /**
     * Stop scene rendering and updates
     */
    stop(): void {
        // Stop the time manager
        this.timeManager.stop();
        
        Logger.log(LogCategory.SYSTEM, "SceneManager stopped");
    }

    /**
     * Set the active camera for the scene
     * @param camera The camera to set as active
     */
    setActiveCamera(camera: Camera): void {
        this.camera = camera;
        this.scene.activeCamera = camera;
        
        // If this is an ArcRotateCamera, update the target
        if (camera instanceof ArcRotateCamera) {
            camera.target = this.cameraTarget;
        }
        
        Logger.log(LogCategory.SYSTEM, "Active camera set", { 
            cameraName: camera.name
        });
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Clean up all visual mappings
        for (const mapping of this.visualMappings.values()) {
            if (mapping.visual instanceof AbstractMesh) {
                mapping.visual.dispose();
            } else {
                // For TransformNode, dispose all child meshes
                mapping.visual.getChildren().forEach(child => {
                    if (child instanceof AbstractMesh) {
                        child.dispose();
                    }
                });
                mapping.visual.dispose();
            }
        }
        this.visualMappings.clear();
        
        // Clean up debug visuals
        if (this.fovSphere) {
            this.fovSphere.dispose();
            this.fovSphere = null;
        }
        
        Logger.log(LogCategory.SYSTEM, "SceneManager disposed");
    }
    
    /**
     * Get the visual representation for a game object by ID
     * @param gameObjectId The ID of the game object
     * @returns The visual representing the game object, or undefined if not found
     */
    getVisualForGameObject(gameObjectId: string): AbstractMesh | TransformNode | undefined {
        const mapping = this.visualMappings.get(gameObjectId);
        return mapping?.visual;
    }

    /**
     * Add a child visual to an existing hierarchical game object (e.g., add car to train)
     * @param parentGameObjectId The ID of the parent game object
     * @param childVisual The child visual to add
     * @param relativePosition Optional relative position for the child
     * @returns Whether the operation was successful
     */
    addChildToHierarchicalObject(parentGameObjectId: string, childVisual: AbstractMesh, relativePosition?: Vector3): boolean {
        const mapping = this.visualMappings.get(parentGameObjectId);
        if (!mapping || !mapping.isTransformNode) {
            Logger.log(LogCategory.SYSTEM, `Cannot add child: parent object not found or not hierarchical: ${parentGameObjectId}`);
            return false;
        }

        // Parent the child to the transform node
        childVisual.parent = mapping.visual;
        
        // Set relative position if provided
        if (relativePosition) {
            childVisual.position = relativePosition;
        }

        // Update cached child meshes
        if (mapping.childMeshes) {
            mapping.childMeshes.push(childVisual);
        } else {
            mapping.childMeshes = this.collectChildMeshes(mapping.visual as TransformNode);
        }

        Logger.log(LogCategory.SYSTEM, `Added child visual to hierarchical object: ${parentGameObjectId}`, {
            childName: childVisual.name,
            relativePosition: relativePosition?.toString() || 'default',
            totalChildMeshes: mapping.childMeshes.length
        });

        return true;
    }

    /**
     * Remove a child visual from a hierarchical game object
     * @param parentGameObjectId The ID of the parent game object
     * @param childVisual The child visual to remove
     * @param dispose Whether to dispose the child (default: true)
     * @returns Whether the operation was successful
     */
    removeChildFromHierarchicalObject(parentGameObjectId: string, childVisual: AbstractMesh, dispose: boolean = true): boolean {
        const mapping = this.visualMappings.get(parentGameObjectId);
        if (!mapping || !mapping.isTransformNode) {
            Logger.log(LogCategory.SYSTEM, `Cannot remove child: parent object not found or not hierarchical: ${parentGameObjectId}`);
            return false;
        }

        // Remove from cached child meshes
        if (mapping.childMeshes) {
            const index = mapping.childMeshes.indexOf(childVisual);
            if (index >= 0) {
                mapping.childMeshes.splice(index, 1);
            }
        }

        // Unparent the child
        childVisual.parent = null;

        if (dispose) {
            childVisual.dispose();
        }

        Logger.log(LogCategory.SYSTEM, `Removed child visual from hierarchical object: ${parentGameObjectId}`, {
            childName: childVisual.name,
            disposed: dispose,
            remainingChildMeshes: mapping.childMeshes?.length || 0
        });

        return true;
    }

    /**
     * Set the object to track with the camera (typically a train)
     * @param gameObjectId The ID of the game object to track
     */
    setTrackedObject(gameObjectId: string | null): void {
        this.trackedObjectId = gameObjectId;
        
        if (gameObjectId) {
            Logger.log(LogCategory.SYSTEM, `Camera now tracking object: ${gameObjectId}`);
            
            // Update camera target to the tracked object immediately
            const trackedMapping = this.visualMappings.get(gameObjectId);
            if (trackedMapping) {
                const trackedPosition = this.getVisualPosition(trackedMapping.visual);
                this.setCameraTarget(trackedPosition);
            }
        } else {
            Logger.log(LogCategory.SYSTEM, "Camera tracking disabled");
        }
    }

    /**
     * Get the currently tracked object ID
     */
    getTrackedObjectId(): string | null {
        return this.trackedObjectId;
    }

    /**
     * Update camera tracking to follow the tracked object
     */
    private updateCameraTracking(deltaTime: number): void {
        if (!this.cameraTrackingConfig.enabled || !this.trackedObjectId) {
            return;
        }

        const trackedMapping = this.visualMappings.get(this.trackedObjectId);
        if (!trackedMapping) {
            return;
        }

        const trackedPosition = this.getVisualPosition(trackedMapping.visual);
        
        // Get the train's forward direction (assuming it's a train)
        const trackedRotation = trackedMapping.visual.rotation || new Vector3(0, 0, 0);
        const trainForward = new Vector3(
            Math.sin(trackedRotation.y),
            0,
            Math.cos(trackedRotation.y)
        );
        
        // Calculate panned position along the train's length
        const pannedPosition = trackedPosition.add(trainForward.scale(this.currentPanOffset));
        
        // Calculate desired camera target (the panned position)
        const desiredTarget = pannedPosition.clone();
        desiredTarget.y += 1; // Slight offset up from ground level
        
        // Calculate camera position with cinematic angle and azimuth
        const distance = this.camera instanceof ArcRotateCamera ? this.camera.radius : this.cameraTrackingConfig.followDistance;
        const elevation = this.cameraTrackingConfig.elevationAngle;
        
        // Base azimuth relative to train's orientation
        const trainAzimuth = trackedRotation.y; // Train's current facing direction
        const relativeAzimuth = this.cameraTrackingConfig.azimuthAngle; // Our camera offset
        const finalAzimuth = trainAzimuth + relativeAzimuth;
        
        const desiredCameraPosition = new Vector3(
            desiredTarget.x + Math.cos(finalAzimuth) * Math.cos(elevation) * distance,
            desiredTarget.y + Math.sin(elevation) * distance,
            desiredTarget.z + Math.sin(finalAzimuth) * Math.cos(elevation) * distance
        );

        // Smooth interpolation towards desired positions
        const smoothness = this.cameraTrackingConfig.followSmoothness;
        
        // Update camera target
        this.cameraTarget = Vector3.Lerp(
            this.cameraTarget,
            desiredTarget,
            smoothness * deltaTime * 60
        );

        // Apply to camera with cinematic positioning
        if (this.camera instanceof ArcRotateCamera) {
            this.camera.target = this.cameraTarget;
            
            // Smoothly update the camera's alpha (azimuth) and beta (elevation)
            const targetAlpha = finalAzimuth + Math.PI; // Add PI because ArcRotateCamera's alpha is opposite
            const targetBeta = Math.PI / 2 - elevation; // Convert from elevation to ArcRotateCamera's beta
            
            // Normalize angles to avoid sudden jumps
            let alphaDiff = targetAlpha - this.camera.alpha;
            while (alphaDiff > Math.PI) alphaDiff -= 2 * Math.PI;
            while (alphaDiff < -Math.PI) alphaDiff += 2 * Math.PI;
            
            this.camera.alpha += alphaDiff * smoothness * deltaTime * 60;
            this.camera.beta = Vector3.Lerp(
                new Vector3(0, this.camera.beta, 0),
                new Vector3(0, targetBeta, 0),
                smoothness * deltaTime * 60
            ).y;
            
            // Update radius (zoom distance)
            this.camera.radius = Vector3.Lerp(
                new Vector3(this.camera.radius, 0, 0),
                new Vector3(distance, 0, 0),
                smoothness * deltaTime * 60
            ).x;
        }
        
        // Update debug spheres to follow the tracked object
        this.updateDebugSpheresPosition();
    }

    /**
     * Update debug sphere positions to follow camera target
     */
    private updateDebugSpheresPosition(): void {
        // Update FOV sphere position to follow camera target
        if (this.fovSphere) {
            this.fovSphere.position = this.cameraTarget.clone();
        }
        
        // Update camera FoV sphere position to follow camera target
        if (this.cameraFovSphere) {
            this.cameraFovSphere.position = this.cameraTarget.clone();
        }
    }

    /**
     * Set camera field of view distance (user adjustable for fog of war)
     */
    setCameraFovDistance(distance: number): void {
        // Clamp the distance to reasonable bounds
        this.cameraTrackingConfig.cameraFovDistance = Math.max(5, Math.min(distance, this.config.fieldOfViewDistance * 0.8));
        
        Logger.log(LogCategory.SYSTEM, `Camera field of view distance updated: ${this.cameraTrackingConfig.cameraFovDistance}`);
        
        // Update camera FoV sphere if it exists
        if (this.cameraFovSphere) {
            this.cameraFovSphere.scaling.setAll(this.cameraTrackingConfig.cameraFovDistance / 15); // Scale relative to default radius
        }
        
        // Also adjust camera distance for zoom effect
        if (this.camera instanceof ArcRotateCamera) {
            this.camera.radius = Math.max(10, Math.min(distance * 1.2, 80));
        }
    }

    /**
     * Get current camera field of view distance
     */
    getCameraFovDistance(): number {
        return this.cameraTrackingConfig.cameraFovDistance;
    }

    /**
     * Set camera pan offset along the tracked train
     * @param offset Pan offset (-maxPanDistance to +maxPanDistance)
     */
    setCameraPanOffset(offset: number): void {
        this.currentPanOffset = Math.max(-this.cameraTrackingConfig.maxPanDistance, 
                                        Math.min(offset, this.cameraTrackingConfig.maxPanDistance));
        Logger.log(LogCategory.SYSTEM, `Camera pan offset updated: ${this.currentPanOffset.toFixed(1)}`);
    }

    /**
     * Pan camera relative to current position
     * @param deltaOffset Amount to pan by
     */
    panCamera(deltaOffset: number): void {
        this.setCameraPanOffset(this.currentPanOffset + deltaOffset);
    }

    /**
     * Reset camera pan to center of train
     */
    resetCameraPan(): void {
        this.setCameraPanOffset(0);
    }

    /**
     * Set camera zoom distance
     * @param distance Zoom distance (minZoomDistance to maxZoomDistance)
     */
    setCameraZoom(distance: number): void {
        if (this.camera instanceof ArcRotateCamera) {
            const clampedDistance = Math.max(this.cameraTrackingConfig.minZoomDistance, 
                                            Math.min(distance, this.cameraTrackingConfig.maxZoomDistance));
            this.camera.radius = clampedDistance;
            Logger.log(LogCategory.SYSTEM, `Camera zoom updated: ${clampedDistance.toFixed(1)}`);
        }
    }

    /**
     * Adjust camera zoom relative to current zoom
     * @param deltaZoom Amount to zoom by (negative = zoom in, positive = zoom out)
     */
    adjustCameraZoom(deltaZoom: number): void {
        if (this.camera instanceof ArcRotateCamera) {
            this.setCameraZoom(this.camera.radius + deltaZoom);
        }
    }

    /**
     * Set camera elevation angle for cinematic control
     * @param angle Elevation angle in radians
     */
    setCameraElevation(angle: number): void {
        this.cameraTrackingConfig.elevationAngle = Math.max(0.1, Math.min(angle, Math.PI / 2 - 0.1));
        Logger.log(LogCategory.SYSTEM, `Camera elevation updated: ${(this.cameraTrackingConfig.elevationAngle * 180 / Math.PI).toFixed(1)}°`);
    }

    /**
     * Set camera azimuth angle (rotation around the train)
     * @param angle Azimuth angle in radians (0 = behind, PI/2 = right side, -PI/2 = left side)
     */
    setCameraAzimuth(angle: number): void {
        const clampedAngle = Math.max(-this.cameraTrackingConfig.maxAzimuthAngle, 
                                     Math.min(angle, this.cameraTrackingConfig.maxAzimuthAngle));
        this.cameraTrackingConfig.azimuthAngle = clampedAngle;
        Logger.log(LogCategory.SYSTEM, `Camera azimuth updated: ${(clampedAngle * 180 / Math.PI).toFixed(1)}°`);
    }

    /**
     * Adjust camera azimuth relative to current azimuth
     * @param deltaAngle Amount to rotate by in radians (positive = clockwise when viewed from above)
     */
    adjustCameraAzimuth(deltaAngle: number): void {
        this.setCameraAzimuth(this.cameraTrackingConfig.azimuthAngle + deltaAngle);
    }

    /**
     * Reset camera azimuth to behind the train
     */
    resetCameraAzimuth(): void {
        this.setCameraAzimuth(0);
    }

    /**
     * Get current camera azimuth angle
     */
    getCameraAzimuth(): number {
        return this.cameraTrackingConfig.azimuthAngle;
    }

    /**
     * Toggle camera FoV debug visualization
     */
    setCameraFovDebugEnabled(enabled: boolean): void {
        this.cameraTrackingConfig.showCameraFovDebug = enabled;
        
        if (enabled && !this.cameraFovSphere) {
            this.setupCameraFovDebugSphere();
        } else if (!enabled && this.cameraFovSphere) {
            this.cameraFovSphere.dispose();
            this.cameraFovSphere = null;
        }
        
        Logger.log(LogCategory.SYSTEM, `Camera FoV debug ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get camera tracking configuration
     */
    getCameraTrackingConfig(): CameraTrackingConfig {
        return { ...this.cameraTrackingConfig };
    }
}
