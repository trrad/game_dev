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
import { RenderComponent } from '../renderers/RenderComponent';
import { TimeManager } from './TimeManager';
import { EventStack } from './EventStack';
import { ObjectTracker } from '../utils/ObjectTracker';
import { eventStack, EventCategory } from './EventStack';

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
 * Default configuration for SceneManager
 */
const DEFAULT_CONFIG: SceneManagerConfig = {
    fieldOfViewDistance: 100,
    enableCulling: true,
    maxVisibleObjects: 1000,
    debugMode: false
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
    /** Map of game object IDs to their visual representations */
    private visualMappings: Map<string, VisualMapping> = new Map();
    /** Time manager reference */
    private timeManager: TimeManager;
    /** Camera target position */
    private cameraTarget: Vector3;
    /** GameObject to track with camera (optional) */
    private cameraTrackingTarget: GameObject | null = null;
    /** Field of view sphere for debugging */
    private fovSphere: Mesh | null = null;
    /** Last time the scene was updated */
    private lastUpdateTime: number = 0;
    /** Delta time accumulator for fixed timestep updates */
    private deltaTimeAccumulator: number = 0;
    /** Fixed update interval in seconds */
    private readonly FIXED_TIMESTEP: number = 1/60;
    /** Event stack for event-driven features */
    private eventStack: EventStack | null = null;
    /** Set of GameObjects already discovered and processed for auto-registration */
    private discoveredObjects: Set<string> = new Set();
    /** Station focus state */
    private isStationFocused: boolean = false;
    private focusedStationId: string | null = null;
    private originalCameraPosition: Vector3 | null = null;
    private originalCameraTarget: Vector3 | null = null;

    /**
     * Create a new SceneManager
     * @param engine The Babylon Engine instance
     * @param config Optional configuration settings
     */
    constructor(
        private engine: Engine,
        config: Partial<SceneManagerConfig> = {}
    ) {
        // Apply default config with overrides
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // Create scene
        this.scene = new Scene(engine);
        
        // Set up basic camera
        this.cameraTarget = new Vector3(0, 0, 0);
        this.camera = new ArcRotateCamera(
            "mainCamera",
            Math.PI / 2,
            Math.PI / 3,
            20,
            this.cameraTarget,
            this.scene
        );
        this.camera.attachControl(engine.getRenderingCanvas(), true);
        
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
        
        eventStack.info(EventCategory.SYSTEM, "scene_manager_initialized", "SceneManager initialized", { 
            fieldOfView: this.config.fieldOfViewDistance,
            cullingEnabled: this.config.enableCulling
        });
    }

    /**
     * Set up debug visual elements
     */
    private setupDebugVisuals(): void {
        if (this.config.debugMode) {
            // Create field of view sphere for debugging
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

        eventStack.info(EventCategory.SYSTEM, "visual_registered", `Registered visual for GameObject: ${gameObject.id}`, {
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
            
            eventStack.info(EventCategory.SYSTEM, "visual_unregistered", `Unregistered visual for GameObject: ${gameObjectId}`, {
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
     * Set a GameObject for the camera to automatically track
     * @param gameObject GameObject to track, or null to stop tracking
     */
    setCameraTrackingTarget(gameObject: GameObject | null): void {
        this.cameraTrackingTarget = gameObject;
        
        if (gameObject) {
            eventStack.info(EventCategory.RENDERING, "camera_tracking", `Camera now tracking GameObject: ${gameObject.id}`);
        } else {
            eventStack.info(EventCategory.RENDERING, "camera_tracking_cleared", `Camera tracking cleared`);
        }
    }

    /**
     * Get the currently tracked GameObject
     */
    getCameraTrackingTarget(): GameObject | null {
        return this.cameraTrackingTarget;
    }

    /**
     * Auto-discover and register GameObjects with RenderComponents
     * This enables the Entity-Level Registration pattern where any GameObject
     * with a RenderComponent is automatically picked up for rendering
     */
    private discoverAndRegisterRenderableObjects(): void {
        // Get all active GameObjects by type (we need to check all known types)
        const gameObjectTypes = ['train', 'trainCar', 'trainCarVoxel', 'station', 'rail', 'enemy', 'projectile', 'weapon'];
        const allObjects: GameObject[] = [];
        
        for (const type of gameObjectTypes) {
            const objectsOfType = ObjectTracker.getObjectsByType(type);
            allObjects.push(...objectsOfType);
        }
        
        for (const gameObject of allObjects) {
            // Skip if we've already discovered and processed this object
            if (this.discoveredObjects.has(gameObject.id)) {
                continue;
            }
            
            // Look for any RenderComponent on the GameObject
            const renderComponent = gameObject.getComponent<RenderComponent>('render') || 
                                  gameObject.getComponent<RenderComponent>('voxelRender');
            
            if (renderComponent) {
                // Ensure the render component is attached
                if (!renderComponent['_gameObject']) {
                    renderComponent.attachTo(gameObject);
                }
                
                // Make sure onAttach was called to create the visual
                if (renderComponent['onAttach'] && !renderComponent.getMesh()) {
                    renderComponent['onAttach']();
                }
                
                // Get the mesh from the render component
                const visual = renderComponent.getMesh();
                if (visual) {
                    this.registerGameObject(gameObject, visual);
                } else {
                    eventStack.warn(EventCategory.RENDERING, "no_visual_mesh", `GameObject has RenderComponent but no visual mesh`, {
                        objectId: gameObject.id,
                        renderComponentType: renderComponent.type
                    });
                }
            }
            
            // Mark as discovered (whether it had a render component or not)
            this.discoveredObjects.add(gameObject.id);
        }
    }

    /**
     * Update camera position based on tracking target
     */
    private updateCameraTracking(): void {
        if (!this.cameraTrackingTarget) return;

        // Get the target's position component
        const posComponent = this.cameraTrackingTarget.getComponent('position') as PositionComponent;
        if (!posComponent) return;

        const targetPos = posComponent.getPosition();
        const newTarget = new Vector3(targetPos.x, targetPos.y, targetPos.z);

        // Update camera target to follow the tracked object
        this.setCameraTarget(newTarget);
    }

    /**
     * Update the visual state of all tracked game objects
     * @param deltaTime Time since last update (in seconds)
     */
    update(deltaTime: number): void {
        // Auto-discover new GameObjects with RenderComponents
        this.discoverAndRegisterRenderableObjects();
        
        // Get the current game time scaling factor
        const timeScale = this.timeManager.getSpeed();
        
        // Accumulate delta time for fixed timestep updates
        this.deltaTimeAccumulator += deltaTime * timeScale;
        
        // Update visual representation for all game objects using fixed timestep
        while (this.deltaTimeAccumulator >= this.FIXED_TIMESTEP) {
            this.updateVisuals(this.FIXED_TIMESTEP);
            this.deltaTimeAccumulator -= this.FIXED_TIMESTEP;
        }
        
        // Update object visibility based on culling settings
        this.updateObjectVisibility();
        
        // Update debug visualization if enabled
        this.updateDebugVisuals();
        
        // Update camera tracking if a target is set
        this.updateCameraTracking();
        
        this.lastUpdateTime = performance.now();
    }

    /**
     * Update object visibility based on distance from camera
     */
    private updateObjectVisibility(): void {
        if (!this.config.enableCulling) {
            // If culling is disabled, make all objects visible
            for (const mapping of this.visualMappings.values()) {
                this.setVisualVisibility(mapping.visual, true, mapping.childMeshes);
            }
            
            // Log when culling is disabled for debugging
            if (this.config.debugMode) {
                eventStack.debug(EventCategory.SYSTEM, "culling_disabled", `Culling disabled - ensuring ${this.visualMappings.size} objects are visible`);
            }
            return;
        }

        // Get camera position
        const cameraPosition = this.camera.position;
        
        // Calculate distances and sort objects by distance
        const distancedObjects = Array.from(this.visualMappings.values()).map(mapping => {
            const visualPosition = this.getVisualPosition(mapping.visual);
            const distance = Vector3.Distance(visualPosition, cameraPosition);
            return { mapping, distance };
        }).sort((a, b) => a.distance - b.distance);
        
        // Apply visibility based on distance and max visible objects
        const maxObjects = this.config.maxVisibleObjects;
        distancedObjects.forEach((obj, index) => {
            const isWithinFOV = obj.distance <= this.config.fieldOfViewDistance;
            const isWithinObjectLimit = index < maxObjects;
            const shouldBeVisible = isWithinFOV && isWithinObjectLimit;
            this.setVisualVisibility(obj.mapping.visual, shouldBeVisible, obj.mapping.childMeshes);
            
            // Log visibility changes for debugging
            if (this.config.debugMode && (obj.mapping.gameObject.type === 'station' || obj.mapping.gameObject.type === 'rail')) {
                const visualPosition = this.getVisualPosition(obj.mapping.visual);
                eventStack.debug(EventCategory.SYSTEM, "visibility_check", `${obj.mapping.gameObject.type} visibility: ${obj.mapping.gameObject.id}`, {
                    distance: obj.distance.toFixed(2), 
                    fieldOfViewDistance: this.config.fieldOfViewDistance,
                    isWithinFOV,
                    isWithinObjectLimit,
                    visible: shouldBeVisible,
                    cullingEnabled: this.config.enableCulling,
                    cameraPosition: `(${cameraPosition.x.toFixed(1)}, ${cameraPosition.y.toFixed(1)}, ${cameraPosition.z.toFixed(1)})`,
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
            
            // Check if this GameObject has a RenderComponent that should handle its own positioning
            const renderComponent = mapping.gameObject.getComponent<RenderComponent>('render') || 
                                  mapping.gameObject.getComponent<RenderComponent>('voxelRender');
            
            if (renderComponent) {
                // Let the RenderComponent handle positioning (includes Y offset, etc.)
                renderComponent['updatePosition']?.();
            } else {
                // Legacy positioning for objects without RenderComponents
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
            }
            
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
        
        eventStack.info(EventCategory.SYSTEM, "debug_mode_toggle", `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
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
        
        eventStack.info(EventCategory.SYSTEM, "fov_distance_updated", `Field of view distance updated: ${distance}`);
    }

    /**
     * Set maximum number of visible objects
     * @param maxObjects Maximum number of visible objects
     */
    setMaxVisibleObjects(maxObjects: number): void {
        this.config.maxVisibleObjects = maxObjects;
        eventStack.info(EventCategory.SYSTEM, "max_objects_updated", `Max visible objects updated: ${maxObjects}`);
    }

    /**
     * Toggle object culling
     * @param enabled Whether culling should be enabled
     */
    setCullingEnabled(enabled: boolean): void {
        this.config.enableCulling = enabled;
        eventStack.info(EventCategory.SYSTEM, "culling_toggle", `Culling ${enabled ? 'enabled' : 'disabled'}`);
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
        
        eventStack.info(EventCategory.SYSTEM, "scene_manager_started", "SceneManager started");
    }

    /**
     * Stop scene rendering and updates
     */
    stop(): void {
        // Stop the time manager
        this.timeManager.stop();
        
        eventStack.info(EventCategory.SYSTEM, "scene_manager_stopped", "SceneManager stopped");
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
        
        eventStack.info(EventCategory.SYSTEM, "active_camera_set", "Active camera set", { 
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
        
        eventStack.info(EventCategory.SYSTEM, "scene_manager_disposed", "SceneManager disposed");
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
            eventStack.warn(EventCategory.SYSTEM, "add_child_failed", `Cannot add child: parent object not found or not hierarchical: ${parentGameObjectId}`);
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

        eventStack.info(EventCategory.SYSTEM, "child_added", `Added child visual to hierarchical object: ${parentGameObjectId}`, {
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
            eventStack.warn(EventCategory.SYSTEM, "remove_child_failed", `Cannot remove child: parent object not found or not hierarchical: ${parentGameObjectId}`);
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

        eventStack.info(EventCategory.SYSTEM, "child_removed", `Removed child visual from hierarchical object: ${parentGameObjectId}`, {
            childName: childVisual.name,
            disposed: dispose,
            remainingChildMeshes: mapping.childMeshes?.length || 0
        });

        return true;
    }

    /**
     * Focus the camera on a specific station for detailed view
     * @param stationId The ID of the station to focus on
     */
    focusCameraOnStation(stationId: string): void {
        const mapping = this.visualMappings.get(stationId);
        if (!mapping) {
            eventStack.warn(EventCategory.SYSTEM, "station_focus_failed", `Cannot focus camera on station: Station ID not found: ${stationId}`);
            return;
        }

        // Store original camera state if this is an ArcRotateCamera
        if (this.camera instanceof ArcRotateCamera) {
            if (!this.isStationFocused) {
                this.originalCameraPosition = this.camera.position.clone();
                this.originalCameraTarget = this.camera.target.clone();
            }

            const stationPosition = this.getVisualPosition(mapping.visual);
            
            // Position camera for station overview
            this.camera.target = stationPosition;
            this.camera.radius = 100; // Distance for good perimeter view
            this.camera.beta = Math.PI / 4; // Fixed angle for top-down view
        }

        this.isStationFocused = true;
        this.focusedStationId = stationId;
        
        eventStack.info(EventCategory.SYSTEM, "station_focused", `Camera focused on station: ${stationId}`);
    }

    /**
     * Release camera focus and return to original position
     */
    releaseCameraFocus(): void {
        if (!this.isStationFocused || !this.originalCameraPosition || !this.originalCameraTarget) {
            return;
        }

        // Restore original camera state if this is an ArcRotateCamera
        if (this.camera instanceof ArcRotateCamera) {
            this.camera.position = this.originalCameraPosition;
            this.camera.target = this.originalCameraTarget;
        }

        this.isStationFocused = false;
        this.focusedStationId = null;
        this.originalCameraPosition = null;
        this.originalCameraTarget = null;
        
        eventStack.info(EventCategory.SYSTEM, "camera_focus_released", "Camera focus released, returned to original position");
    }

    /**
     * Subscribe to station focus events from the event system
     * @param eventStack The EventStack instance to subscribe to
     */
    subscribeToStationFocusEvents(eventStack: EventStack): void {
        this.eventStack = eventStack;
        
        eventStack.info(EventCategory.SYSTEM, "events_subscribed", "SceneManager subscribed to station focus events");
    }
}
