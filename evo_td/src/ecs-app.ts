/**
 * ECS-based implementation of the Train Trading Game
 * This file serves as the entry point for the ECS version of the game
 * Using proper ECS architecture with stations and rails network
 */
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { 
    Engine, 
    Scene, 
    ArcRotateCamera, 
    Vector3, 
    Color3,
    Color4,
    Mesh
} from "@babylonjs/core";

// Import renderers
import { StationRenderer } from "./renderers/StationRenderer";
import { RailRenderer } from "./renderers/RailRenderer";
import { EnemyRenderer } from "./renderers/EnemyRenderer";
import { GroundRenderer } from "./renderers/GroundRenderer";
import { LightRenderer } from "./renderers/LightRenderer";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";

// Import core ECS classes
import { GameObject } from "./core/GameObject";
import { SceneManager } from "./core/SceneManager";
import { StationManager } from "./core/StationManager";

// Import components
import { PositionComponent } from "./components/PositionComponent";
import { MovementComponent } from "./components/MovementComponent";

// Import game entities
import { Station, StationConfig } from "./entities/Station";
import { Rail, RailConfig } from "./entities/Rail";
import { TrainCar, TrainCarConfig } from "./entities/TrainCar";
import { TrainConfig } from "./entities/Train";

// Import UI and utility systems
import { eventStack, EventCategory, EventStack } from "./core/EventStack";
import { Logger, LogCategory } from "./utils/Logger";
import { UISystem } from "./systems/UISystem";

import { UIFactory } from "./ui/UIFactory";
import { EventLogUI } from "./ui/EventLogUI";
import { TrainJourneyControlsUI } from "./ui/TrainJourneyControlsUI";
import { TimeManager } from "./core/TimeManager";

// Import train-related classes for later use
import { Train } from "./entities/Train";
import { TrainSystem } from "./systems/TrainSystem";
import { EnemySystem } from "./systems/EnemySystem";
import { ProjectileSystem } from "./systems/ProjectileSystem";

// Import attachment system components
import { AttachmentFactory } from "./entities/AttachmentFactory";
import { TrainCarModificationUI } from "./ui/TrainCarModificationUI";
import { CSSLoader } from "./utils/CSSLoader";

class ECSApp {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private ground: Mesh;
    private uiElements: HTMLElement[] = [];
    private uiSystem: UISystem;
    private uiFactory: UIFactory;
    private eventLogUI: EventLogUI;
    private trainJourneyControlsUI: TrainJourneyControlsUI;
    private trainModificationUI: TrainCarModificationUI;
    
    // Core ECS systems
    private sceneManager: SceneManager;
    private timeManager: TimeManager;
    private trainSystem: TrainSystem;
    private enemySystem: EnemySystem;
    private projectileSystem: ProjectileSystem;
    private stationManager: StationManager;
    
    // Renderers
    private stationRenderer: StationRenderer;
    private railRenderer: RailRenderer;
    private enemyRenderer: EnemyRenderer;
    private groundRenderer: GroundRenderer;
    private lightRenderer: LightRenderer;
    private projectileRenderer: ProjectileRenderer;
    
    // Game entities
    private stations: Map<string, Station> = new Map();
    private rails: Map<string, Rail> = new Map();
    private trains: Map<string, Train> = new Map();
    
    constructor() {
        eventStack.info(EventCategory.SYSTEM, 'app_init', "Initializing ECS App");
        
        // Initialize file-based logging
        // Remove the legacy file logging initialization
        eventStack.info(EventCategory.SYSTEM, 'logging_ready', 'Event logging system ready');
        
        // Add debug helpers to window for console access
        if (typeof window !== 'undefined') {
            (window as any).exportLogs = () => eventStack.exportLogs();
            (window as any).clearLogs = () => eventStack.clearLogs();
            (window as any).toggleConsole = () => eventStack.toggleConsoleOutput();
            (window as any).toggleVerbose = () => eventStack.toggleVerboseMode();
            eventStack.info(EventCategory.SYSTEM, 'debug_helpers', "Debug helpers added: window.exportLogs(), window.clearLogs(), window.toggleConsole(), window.toggleVerbose()");
            
            eventStack.info(EventCategory.SYSTEM, 'manual_logging', "Manual log generation available via Generate Logs button or window.exportLogs()");
        }
        
        // Load CSS for UI components
        this.loadUIStyles();
        
        // Create the canvas element for the game
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);
        
        // Check WebGL support before initializing engine
        if (!this.isWebGLSupported()) {
            this.showWebGLError();
            return;
        }
        
        try {
            // Initialize the Babylon.js engine with error handling
            this.engine = new Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true,
                antialias: true,
                alpha: false,
                premultipliedAlpha: false,
                powerPreference: "default"
            });
            
            eventStack.info(EventCategory.SYSTEM, 'babylon_init_success', "Babylon.js engine initialized successfully");
        } catch (error) {
            eventStack.error(EventCategory.SYSTEM, 'babylon_init_error', "Failed to initialize Babylon.js engine", { error: error.toString() });
            this.showEngineError(error);
            return;
        }
        
        // Initialize SceneManager with the engine and config first
        this.sceneManager = new SceneManager(
            this.engine,
            {
                fieldOfViewDistance: 500,
                enableCulling: true,
                maxVisibleObjects: 1500,
                debugMode: false
            }
        );
        
        // Use SceneManager's scene
        this.scene = this.sceneManager.scene;
        this.scene.clearColor = new Color4(0.05, 0.05, 0.15, 1); // Dark blue background
        
        try {
            // Initialize core ECS systems
            this.timeManager = new TimeManager();
            // Use global eventStack instance
            
            // Initialize UI system
            this.uiSystem = new UISystem();
            this.uiFactory = new UIFactory(this.uiSystem);
            
            // Initialize StationManager for expanded station features
            this.stationManager = new StationManager(this.timeManager, eventStack, {
                minStationDistance: 30, // Adjusted for close station network
                defaultPerimeterRadius: 50,
                maxStationsPerWorld: 20
            });
            
            // Initialize Train System and connect TimeManager and EventStack
            this.trainSystem = new TrainSystem();
            this.trainSystem.setTimeManager(this.timeManager);
            this.trainSystem.setEventStack(eventStack);
            
            // Initialize renderers
            this.stationRenderer = new StationRenderer(this.sceneManager.scene);
            this.railRenderer = new RailRenderer(this.sceneManager.scene);
            // TrainRenderer removed - trains now use Entity-Level Registration pattern via SceneManager
            this.enemyRenderer = new EnemyRenderer(this.sceneManager.scene);
            this.groundRenderer = new GroundRenderer(this.sceneManager.scene);
            this.lightRenderer = new LightRenderer(this.sceneManager.scene);
            this.projectileRenderer = new ProjectileRenderer(this.sceneManager.scene);
            
            // Initialize ProjectileSystem and connect it to other systems
            this.projectileSystem = new ProjectileSystem(this.projectileRenderer);
            this.projectileSystem.setTimeManager(this.timeManager);
            this.projectileSystem.setEventStack(eventStack);
            this.projectileSystem.setSceneManager(this.sceneManager);
            
            // Set up SceneManager event subscriptions for camera control
            this.sceneManager.subscribeToStationFocusEvents(eventStack);
            
            // Initialize Enemy System with custom spawn configuration
            this.enemySystem = new EnemySystem(this.enemyRenderer, {
                spawnInterval: { min: 8, max: 15 },  // Spawn every 8-15 seconds
                maxEnemies: 12,                      // Max 12 enemies at once
                spawnRadius: 25,                     // Spawn within 25 units of rails
                spawnOnlyWhenTrainMoving: false,     // Always spawn for continuous action
                enemyTypes: {
                    basic: 0.4,                      // 40% basic enemies
                    fast: 0.3,                       // 30% fast enemies  
                    tank: 0.2,                       // 20% tank enemies
                    aggressive: 0.1                  // 10% aggressive enemies
                }
            });
            
            // Connect systems with TimeManager, EventStack, and SceneManager
            this.enemySystem.setTimeManager(this.timeManager);
            this.enemySystem.setEventStack(eventStack);
            this.enemySystem.setSceneManager(this.sceneManager);
            this.enemySystem.setTrainSystem(this.trainSystem);
            
            // TrainRenderer connection removed - trains now use Entity-Level Registration pattern
            
            // Set up camera, lights, and ground
            this.setupCamera();
            this.setupLights();
            this.createGround();
            
            // Build the world: stations and rails
            this.createStationNetwork();
            
            // Create UI elements
            this.createUI();
            
            this.initializeRenderLoop();
            
            // Add some initial events to the event log for demonstration
            eventStack.info(EventCategory.SYSTEM, 'app_initialized', 'ECS Train Trading Game initialized successfully');
            eventStack.info(EventCategory.UI, 'controls_ready', 'Press F1 to toggle event log, M for train modification UI, Space to pause, 1-5 for time speed');
            eventStack.info(EventCategory.UI, 'camera_controls', 'Camera controls: Q = Central Station, W = Eastern Depot, E = Northern Outpost, R = Release focus');
            
            // Log current demo world configuration
            this.logCurrentDemoSetup();
            
            eventStack.info(EventCategory.SYSTEM, 'ecs_app_success', "ECS App initialized successfully with expanded station network");
            
        } catch (error) {
            eventStack.error(EventCategory.SYSTEM, 'ecs_app_init_error', "Failed to initialize ECS App", { error: error.toString() });
            this.showEngineError(error);
            return;
        }
    }
    
    /**
     * Initialize the render loop and event handlers
     */
    private initializeRenderLoop(): void {
        
        // Start time manager
        this.timeManager.start();
        
        // Register tick handler for time-based events
        this.timeManager.onTick((deltaTime: number, _gameTime: number) => {
            // Process any queued events
            eventStack.processGameEvents();
            
            // Update train system with time-scaled delta
            this.trainSystem.update(deltaTime);
            
            // Update enemy system with time-scaled delta
            this.enemySystem.update(deltaTime);
            
            // Update projectile system with time-scaled delta
            this.projectileSystem.update(deltaTime);
        });
        
        // Register the render loop
        this.engine.runRenderLoop(() => {
            // Update SceneManager with deltaTime in seconds
            const deltaTime = this.engine.getDeltaTime() / 1000;
            this.sceneManager.update(deltaTime);
            
            // Note: TrainSystem is now updated in TimeManager tick handler for proper time scaling
            
            // Render the scene
            this.sceneManager.scene.render();
        });
        
        // Handle window resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
        
        // Add keyboard shortcuts
        window.addEventListener("keydown", (ev) => {
            // Toggle inspector with Ctrl+Shift+I
            if (ev.ctrlKey && ev.shiftKey && ev.key === 'I') {
                if (this.sceneManager.scene.debugLayer.isVisible()) {
                    this.sceneManager.scene.debugLayer.hide();
                } else {
                    this.sceneManager.scene.debugLayer.show();
                }
            }
            
            // Toggle event log with F1
            if (ev.key === 'F1') {
                ev.preventDefault();
                this.toggleEventLog();
            }
            
            // Toggle train modification UI with M key
            if (ev.key === 'm' || ev.key === 'M') {
                ev.preventDefault();
                this.toggleTrainModificationUI();
            }
            
            // Time speed shortcuts (1-5 keys)
            if (ev.key >= '1' && ev.key <= '5' && !ev.ctrlKey && !ev.shiftKey) {
                const speedMap = { '1': 1, '2': 4, '3': 8, '4': 16, '5': 32 } as const;
                const speed = speedMap[ev.key as keyof typeof speedMap];
                if (speed) {
                    this.timeManager.setTimeSpeed(speed);
                    if (this.timeManager.isPausedState()) {
                        this.timeManager.setPaused(false);
                    }
                    eventStack.info(EventCategory.UI, 'keyboard_shortcut', `Time speed set to ${speed}x via keyboard`);
                }
            }
            
            // Toggle voxel debug faces with Alt+D
            if (ev.altKey && (ev.key === 'd' || ev.key === 'D')) {
                ev.preventDefault();
                console.log("Alt+D pressed - toggling voxel debug faces");
                eventStack.info(EventCategory.UI, 'keyboard_shortcut_pressed', `Alt+D pressed - toggling voxel debug faces`);
                
                try {
                    const debugEnabled = this.trainSystem.toggleVoxelDebugFaces();
                    console.log(`Voxel debug faces ${debugEnabled ? 'enabled' : 'disabled'} via Alt+D`);
                    eventStack.info(EventCategory.UI, 'keyboard_shortcut', `Voxel debug faces ${debugEnabled ? 'enabled' : 'disabled'} via Alt+D`);
                } catch (error) {
                    console.error("Error toggling voxel debug faces:", error);
                    eventStack.error(EventCategory.UI, 'keyboard_shortcut_error', `Error toggling voxel debug faces: ${error}`);
                }
            }
            
            // Pause with spacebar (but not when typing in inputs)
            if (ev.code === 'Space' && (!ev.target || (ev.target as HTMLElement).tagName !== 'INPUT')) {
                ev.preventDefault();
                const wasPaused = this.timeManager.isPausedState();
                this.timeManager.setPaused(!wasPaused);
                eventStack.info(EventCategory.UI, 'keyboard_shortcut', `Game ${wasPaused ? 'unpaused' : 'paused'} via spacebar`);
            }
            
            // Station camera focus shortcuts (Q, W, E keys)
            if (ev.key === 'q' || ev.key === 'Q') {
                ev.preventDefault();
                // Camera focus functionality to be implemented later
                eventStack.info(EventCategory.UI, 'keyboard_shortcut', 'Camera focused on Central Station via Q key');
            }
            
            if (ev.key === 'w' || ev.key === 'W') {
                ev.preventDefault();
                eventStack.info(EventCategory.UI, 'keyboard_shortcut', 'Camera focused on Eastern Depot via W key');
            }
            
            if (ev.key === 'e' || ev.key === 'E') {
                ev.preventDefault();
                eventStack.info(EventCategory.UI, 'keyboard_shortcut', 'Camera focused on Northern Outpost via E key');
            }
            
            // Release camera focus (R key)
            if (ev.key === 'r' || ev.key === 'R') {
                ev.preventDefault();
                eventStack.info(EventCategory.UI, 'keyboard_shortcut', 'Camera focus released via R key');
            }
        });
    }
    
    /**
     * Set up the camera for the scene
     */
    private setupCamera(): void {
        // Center camera on Central Station position (updated)
        const centralStationPosition = new Vector3(-30, 0, 0);
        
        // Configure the SceneManager's camera instead of creating a new one
        const camera = this.sceneManager.camera as ArcRotateCamera;
        
        // Set camera parameters
        camera.alpha = -Math.PI / 2;    // alpha (rotation around Y axis)
        camera.beta = Math.PI / 4;      // beta (elevation angle) - slightly less steep for better view
        camera.radius = 80;             // radius (distance from target) - adjusted for larger spacing
        camera.target = centralStationPosition;  // target the Central Station
        
        camera.minZ = 0.1;
        camera.maxZ = 1000;
        camera.wheelPrecision = 5;
        camera.lowerRadiusLimit = 10;   // Allow getting closer
        camera.upperRadiusLimit = 300;  // Increased max zoom out for larger world
        
        // Set the camera target in SceneManager
        this.sceneManager.setCameraTarget(centralStationPosition);
        
        // Log camera setup
        eventStack.info(EventCategory.RENDERING, 'camera_setup', "Camera setup complete", {
            position: camera.position.toString(),
            target: camera.target.toString(),
            radius: camera.radius
        });
    }
    
    /**
     * Set up lighting for the scene
     */
    private setupLights(): void {
        // Use the LightRenderer to set up scene lighting
        this.lightRenderer.setupLights();
    }
    
    /**
     * We're no longer using createScene directly since the SceneManager handles the scene.
     * This is kept for reference only.
     * @deprecated Use SceneManager instead
     */
    private createScene(): Scene {
        return this.scene;
    }
    
    /**
     * Create the network of stations and rails using the proper ECS classes
     * TODO: Replace this manual setup with WorldSystem for procedural generation
     */
    private createStationNetwork(): void {
        eventStack.info(EventCategory.SYSTEM, 'station_network_init', "Creating expanded station network with StationManager");
        
        // Define standard station configurations that work with existing StationConfig interface
        const stationConfigs: StationConfig[] = [
            {
                id: 'station_a',
                name: 'Central Station',
                position: new Vector3(-30, 0, 0), // Moved further for better spacing
                connectedRails: ['rail_ab', 'rail_ac'],
                // Expanded station features with more small buildings
                perimeterRadius: 60,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 8 // More buildings for central station
            },
            {
                id: 'station_b',
                name: 'Eastern Depot',
                position: new Vector3(40, 0, 0), // Moved further east
                connectedRails: ['rail_ab'],
                // Smaller station with basic features
                perimeterRadius: 40,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 6 // Medium number of buildings
            },
            {
                id: 'station_c',
                name: 'Northern Outpost',
                position: new Vector3(-15, 0, 35), // Moved further north
                connectedRails: ['rail_ac'],
                // Military-style outpost
                perimeterRadius: 35,
                hasCargoWarehouse: true,
                decorativeBuildingCount: 5 // Fewer buildings for outpost
            }
        ];
        
        // Create expanded stations using StationManager
        for (const config of stationConfigs) {
            const station = this.stationManager.createStation(config);
            
            // Create visual representation using enhanced StationRenderer
            const stationVisualGroup = this.stationRenderer.createExpandedStationVisual(station, this.stations.size);
            
            // Register the main station mesh with the SceneManager
            this.sceneManager.registerGameObject(station, stationVisualGroup.mainMesh);
            
            // Store the station
            this.stations.set(config.id, station);
            
            eventStack.info(EventCategory.SYSTEM, "station_created", `Created expanded station: ${config.name} with perimeter radius ${config.perimeterRadius}`);
        }
        
        // Define rail configurations
        const railConfigs: RailConfig[] = [
            {
                id: 'rail_ab',
                name: 'Central-Eastern Line',
                stationA: 'station_a',
                stationB: 'station_b',
                trackPoints: [
                    new Vector3(-30, 0, 0),   // Station A (updated position)
                    new Vector3(-20, 0, 3),   
                    new Vector3(-10, 0, 5),   
                    new Vector3(0, 0, 6),    
                    new Vector3(10, 0, 5),     
                    new Vector3(20, 0, 3),     
                    new Vector3(30, 0, 1),    
                    new Vector3(35, 0, 0),   
                    new Vector3(40, 0, 0)     // Station B (updated position)
                ],
                isOperational: true
            },
            {
                id: 'rail_ac',
                name: 'Central-Northern Line',
                stationA: 'station_a',
                stationB: 'station_c',
                trackPoints: [
                    new Vector3(-30, 0, 0),   // Station A (updated position)
                    new Vector3(-28, 0, 5),
                    new Vector3(-25, 0, 10),
                    new Vector3(-22, 0, 18),
                    new Vector3(-18, 0, 25),
                    new Vector3(-15, 0, 35)   // Station C (updated position)
                ],
                isOperational: true
            }
        ];
        
        // Create rail entities
        for (const config of railConfigs) {
            const rail = new Rail(config);
            
            // Create a visual representation using the RailRenderer
            const railMesh = this.railRenderer.createRailVisual(config);
            
            // Register the rail with the SceneManager
            this.sceneManager.registerGameObject(rail, railMesh);
            
            // Add rail to TrainSystem for movement calculations
            this.trainSystem.addRail(rail);
            
            // Add rail to EnemySystem for spawn location calculations  
            this.enemySystem.addRail(rail);
            
            // Store the rail
            this.rails.set(config.id, rail);
            
            eventStack.info(EventCategory.SYSTEM, "rail_created", `Created rail: ${config.name}`, {
                id: config.id,
                stationA: config.stationA,
                stationB: config.stationB
            });
        }
        
        eventStack.info(EventCategory.SYSTEM, "world_created", `Created ${this.stations.size} stations and ${this.rails.size} rail lines`);
        
        // Create initial train
        this.createInitialTrain();
    }
    
    /**
     * Create the ground plane
     */
    private createGround(): void {
        // Use the GroundRenderer to create the ground plane
        this.ground = this.groundRenderer.createGround();
    }
    
    /**
     * Create UI elements like buttons and panels
     */
    private createUI(): void {
        // Create event log window first
        this.eventLogUI = new EventLogUI(eventStack);
        
        // Create train car modification UI
        this.trainModificationUI = new TrainCarModificationUI();
        
        // Create time control panel
        this.createTimeControls();
        
        // Create exit button using the UI framework
        const exitButtonGameObject = this.uiFactory.createExitButton(
            'exit-button',
            'Exit App',
            () => this.exitApp(),
            {
                position: 'top-right',
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: '1000'
                }
            }
        );
        
        // Create logs button using the UI framework
        const logsButtonGameObject = this.uiFactory.createLogsButton(
            'logs-button',
            'Generate Logs',
            () => eventStack.exportLogs(),
            {
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: '1000',
                    right: '120px' // Position to the left of exit button
                }
            }
        );
        
        // Log the UI creation - this will appear in the event log
        eventStack.info(EventCategory.UI, 'ui_created', 'UI elements created successfully', { 
            exitButton: 'exit-button',
            logsButton: 'logs-button',
            timeControls: 'time-controls',
            eventLog: 'event-log'
        });
        
        // Log UI creation to traditional logger as well
        Logger.log(LogCategory.UI, 'UI elements created', { 
            exitButton: 'exit-button',
            logsButton: 'logs-button',
            timeControls: 'time-controls',
            eventLog: 'event-log'
        });
    }

    /**
     * Create time control UI panel using CSS classes instead of inline styles
     */
    private createTimeControls(): void {
        // Create main time control container
        const timeControlDiv = document.createElement('div');
        timeControlDiv.id = 'time-controls';
        timeControlDiv.className = 'time-controls';

        // Time speed label
        const timeLabel = document.createElement('div');
        timeLabel.id = 'time-speed-label';
        timeLabel.className = 'time-speed-label';
        
        // Time control buttons container
        const timeButtonsDiv = document.createElement('div');
        timeButtonsDiv.className = 'time-buttons';

        // Create speed buttons
        const timeOptions = [1, 4, 8, 16, 32] as const;
        const speedButtons: HTMLButtonElement[] = [];
        
        const updateSpeedDisplay = () => {
            const currentSpeed = this.timeManager.getSpeed();
            const isPaused = this.timeManager.isPausedState();
            
            if (isPaused) {
                timeLabel.textContent = 'Time Speed: PAUSED';
            } else {
                timeLabel.textContent = `Time Speed: ${currentSpeed}x`;
            }
            
            // Update button appearances using CSS classes
            speedButtons.forEach((button, index) => {
                const speed = timeOptions[index];
                if (speed === currentSpeed && !isPaused) {
                    button.className = 'time-button active';
                } else {
                    button.className = 'time-button';
                }
            });
        };

        timeOptions.forEach((speed) => {
            const timeButton = document.createElement('button');
            timeButton.textContent = `${speed}x`;
            timeButton.className = 'time-button';
            
            timeButton.onclick = () => {
                this.timeManager.setTimeSpeed(speed);
                if (this.timeManager.isPausedState()) {
                    this.timeManager.setPaused(false);
                }
                updateSpeedDisplay();
                // Log to both traditional logger and event stack
                Logger.log(LogCategory.UI, `Time speed changed to ${speed}x`);
                eventStack.info(EventCategory.UI, 'time_speed_changed', `Time speed changed to ${speed}x via UI button`);
            };
            
            speedButtons.push(timeButton);
            timeButtonsDiv.appendChild(timeButton);
        });

        // Pause button
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'PAUSE';
        pauseButton.className = 'pause-button';
        
        pauseButton.onclick = () => {
            const wasPaused = this.timeManager.isPausedState();
            this.timeManager.setPaused(!wasPaused);
            updateSpeedDisplay();
            // Log to both traditional logger and event stack
            Logger.log(LogCategory.UI, `Game ${wasPaused ? 'unpaused' : 'paused'}`);
            eventStack.info(EventCategory.UI, 'game_pause_toggle', `Game ${wasPaused ? 'unpaused' : 'paused'} via UI button`);
        };

        // Game time display
        const gameTimeDiv = document.createElement('div');
        gameTimeDiv.id = 'game-time';
        gameTimeDiv.className = 'game-time-display';

        // Assemble the time control panel
        timeControlDiv.appendChild(timeLabel);
        timeControlDiv.appendChild(timeButtonsDiv);
        timeControlDiv.appendChild(pauseButton);
        timeControlDiv.appendChild(gameTimeDiv);
        document.body.appendChild(timeControlDiv);
        
        // Store reference for cleanup
        this.uiElements.push(timeControlDiv);

        // Set up periodic updates for game time display
        setInterval(() => {
            const state = this.timeManager.getState();
            const gameMinutes = Math.floor(state.gameTime / 60);
            const gameSeconds = Math.floor(state.gameTime % 60);
            gameTimeDiv.innerHTML = `
                Game Time: ${gameMinutes}:${gameSeconds.toString().padStart(2, '0')}<br>
                Real Time: ${Math.floor(state.realTime / 1000)}s
            `;
        }, 100);

        // Initialize display
        updateSpeedDisplay();
        
        // Listen for speed changes from other sources (like voting)
        this.timeManager.onSpeedChange((_newSpeed, _oldSpeed) => {
            updateSpeedDisplay();
        });
    }
    
    /**
     * Create an initial train with a single car
     */
    private createInitialTrain(): void {
        Logger.log(LogCategory.SYSTEM, "Creating initial train");
        
        // Define train configuration
        const trainConfig: TrainConfig = {
            cargoCapacity: 210, // Engine: 50 + Cargo1: 80 + Cargo2: 80 = 210 total
            baseSpeed: 1.0,
            carSpacing: 0.2,
            powerEfficiency: 1.0
        };
        
        // Define train car configurations
        const carConfigs: TrainCarConfig[] = [
            {
                id: 'engine_01',
                type: 'engine',
                length: 1.2,
                cargoCapacity: 50,
                attachmentSlots: 2,
                maxHealth: 100
            },
            {
                id: 'cargo_01',
                type: 'cargo',
                length: 1.0,
                cargoCapacity: 80,
                attachmentSlots: 1,
                maxHealth: 80
            },
            {
                id: 'cargo_02',
                type: 'cargo',
                length: 1.0,
                cargoCapacity: 80,
                attachmentSlots: 1,
                maxHealth: 80
            }
        ];
        
        // Create the train cars with scene for Entity-Level Registration
        const trainCars = carConfigs.map(config => new TrainCar(config, eventStack, this.scene));
        
        // Get the starting station (Station A)
        const startingStation = this.stations.get('station_a');
        if (!startingStation) {
            Logger.log(LogCategory.SYSTEM, "Could not find starting station for train");
            return;
        }
        
        // Get starting position from the station
        const posComponent = startingStation.getComponent<PositionComponent>('position');
        const startPosition = posComponent ? posComponent.getPosition() : { x: 0, y: 0, z: 0 };
        
        // Debug: Log the starting station position
        Logger.log(LogCategory.TRAIN, `Train starting position from station`, {
            stationId: startingStation.id,
            stationPosition: startPosition,
            hasPositionComponent: !!posComponent
        });
        
        // Create the train using the train system
        const train = this.trainSystem.createTrain('player_1', trainConfig, startPosition);
        
        // Associate train cars with the train entity
        for (const car of trainCars) {
            train.addCar(car);
        }
        
        // Initialize car positions now that cars are added to the train
        this.trainSystem.initializeCarPositions(train.id);
        
        Logger.log(LogCategory.TRAIN, `Train cars associated with train`, {
            trainId: train.id,
            carCount: train.getCarCount(),
            cars: train.getCars().map(c => ({ id: c.carId, type: c.carType }))
        });
        
        // Debug: Check train's PositionComponent after creation
        const trainPosComponent = train.getComponent<PositionComponent>('position');
        const debugTrainPosition = trainPosComponent ? trainPosComponent.getPosition() : null;
        Logger.log(LogCategory.RENDERING, `Train entity position after creation`, {
            trainId: train.id,
            entityPosition: debugTrainPosition ? `(${debugTrainPosition.x}, ${debugTrainPosition.y}, ${debugTrainPosition.z})` : 'null',
            expectedPosition: `(${startPosition.x}, ${startPosition.y}, ${startPosition.z})`
        });
        
        // With the new Entity-Level Registration pattern, trains and their voxels
        // automatically register their render components via SceneManager.
        // No manual visual creation needed - the Train entity and its voxels handle this.
        
        // Store the train - SceneManager will auto-discover render components
        this.trains.set(train.id, train);
        
        // With the new Entity-Level Registration pattern, voxels register themselves automatically
        // through their VoxelRenderComponent when created in TrainCar
        Logger.log(LogCategory.SYSTEM, `Train created with Entity-Level Registration pattern`, {
            trainId: train.id,
            carCount: train.getCars().length,
            totalVoxels: train.getCars().reduce((total, car) => total + car.getVoxels().length, 0)
        });
        
        // Set up camera tracking for the train
        this.sceneManager.setCameraTrackingTarget(train);
        
        Logger.log(LogCategory.SYSTEM, `Created initial train: ${train.id} at station_a`, {
            trainPosition: `(${startPosition.x}, ${startPosition.y}, ${startPosition.z})`,
            carCount: trainCars.length,
            totalCapacity: trainConfig.cargoCapacity
        });
        
        // Set up smooth movement: start journey to station B after 3 seconds
        eventStack.info(EventCategory.TRAIN, 'train_created', `Initial train ${train.id} created at Central Station with ${trainCars.length} cars`, {
            trainId: train.id,
            position: startPosition,
            carCount: trainCars.length,
            totalCapacity: trainConfig.cargoCapacity
        });
        
        // Initialize Train Journey Controls UI
        this.trainJourneyControlsUI = new TrainJourneyControlsUI(
            train,
            this.trainSystem,
            eventStack,
            this.stations,
            this.rails
        );
        
        // Demo: Add some sample attachments to the train cars for testing
        this.addDemoAttachments(train);
    }
    
    /**
     * Add demo attachments to a train for testing purposes
     */
    private addDemoAttachments(train: Train): void { 
        const cars = train.getCars();
        if (cars.length === 0) return;

        Logger.log(LogCategory.SYSTEM, `Adding demo turret to train ${train.id}`);

        // Add a single working turret to the front engine car
        const engineCar = cars[0];
        if (engineCar.carType === 'engine') {
            const turret = AttachmentFactory.createBasicTurret(eventStack);
            // Place on the top center of the engine car
            // Grid coordinates: (X=middle of length, Y=middle of width, Z=top height)
            const voxels = engineCar.getVoxels();
            if (voxels.length > 0) {
                // Find a voxel at the top of the car (highest Z value)
                const topVoxels = voxels.filter(v => v.gridPosition.z === Math.max(...voxels.map(vox => vox.gridPosition.z)));
                if (topVoxels.length > 0) {
                    // Get a voxel near the center of the car
                    const centerVoxel = topVoxels.find(v => v.gridPosition.x > 0 && v.gridPosition.y >= 0) || topVoxels[0];
                    const { x, y, z } = centerVoxel.gridPosition;
                    const success = engineCar.addAttachment(turret, 'top', x, y, z);
                    
                    Logger.log(LogCategory.SYSTEM, `Placing turret at grid position (${x}, ${y}, ${z})`);
                    
                    if (success) {
                        // With the new Entity-Level Registration pattern, attachment visuals
                        // will be handled by the car's render component automatically
                        // TODO: Implement attachment visual updates in TrainCarRenderComponent
                        
                        Logger.log(LogCategory.SYSTEM, `Added working turret to engine car`, {
                            carId: engineCar.carId,
                            turretName: turret.getConfig().name,
                            damage: turret.getDamage(),
                            range: turret.getAttackRange(),
                            fireRate: turret.getFireRate(),
                            gridPosition: `(${x}, ${y}, ${z})`
                        });
                    } else {
                        Logger.warn(LogCategory.SYSTEM, `Failed to add demo turret to engine car`);
                    }
                } else {
                    Logger.warn(LogCategory.SYSTEM, `No top voxels found on engine car`);
                }
            } else {
                Logger.warn(LogCategory.SYSTEM, `No voxels found on engine car`);
            }
        } else {
            Logger.warn(LogCategory.SYSTEM, `Engine car not found for turret placement`);
        }

        // Log final train state
        const totalStats = {
            totalCars: cars.length,
            carStats: cars.map(car => ({
                id: car.carId,
                type: car.carType,
                attachments: car.getAttachmentStats()
            }))
        };

        eventStack.info(EventCategory.TRAIN, 'demo_attachments_complete', 
            `Demo turret setup complete for train ${train.id}`, totalStats);
    }
    
    /**
     * Start a train journey along a rail to a target station
     */
    private startTrainJourney(trainId: string, railId: string, targetStationId: string): void {
        const success = this.trainSystem.startRailJourney(trainId, railId, targetStationId);
        
        if (success) {
            Logger.log(LogCategory.SYSTEM, `Started train journey`, {
                trainId,
                railId,
                targetStationId
            });
            eventStack.info(EventCategory.TRAIN, 'journey_started', `Train ${trainId} started journey to ${targetStationId} via ${railId}`, {
                trainId,
                railId,
                targetStationId
            });
        } else {
            Logger.log(LogCategory.SYSTEM, `Failed to start train journey`, {
                trainId,
                railId,
                targetStationId
            });
            eventStack.error(EventCategory.ERROR, 'journey_failed', `Failed to start train journey for ${trainId}`, {
                trainId,
                railId,
                targetStationId
            });
        }
    }
    
    /**
     * Move a train to a target station (deprecated - use startTrainJourney for smooth movement)
     */
    private moveTrainToStation(trainId: string, targetStationId: string): void {
        const train = this.trains.get(trainId);
        const targetStation = this.stations.get(targetStationId);
        
        if (!train || !targetStation) {
            Logger.log(LogCategory.SYSTEM, `Could not move train: train=${!!train}, station=${!!targetStation}`);
            return;
        }
        
        const targetPosComponent = targetStation.getComponent<PositionComponent>('position');
        const targetPosition = targetPosComponent ? targetPosComponent.getPosition() : { x: 0, y: 0, z: 0 };
        
        Logger.log(LogCategory.SYSTEM, `Moving train ${trainId} to ${targetStationId} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
        
        // Simple immediate movement for now - later we'll add smooth animation
        const trainPosComponent = train.getComponent<PositionComponent>('position');
        if (trainPosComponent) {
            trainPosComponent.setPosition(targetPosition);
        }
        
        // Also move the visual representation
        const visualNode = (train as any).visualNode;
        if (visualNode) {
            visualNode.position = new Vector3(targetPosition.x, 0, targetPosition.z);
            Logger.log(LogCategory.RENDERING, `Train visual moved to: ${visualNode.position.toString()}`);
        } else {
            Logger.log(LogCategory.RENDERING, `No visual node found for train ${trainId}`);
        }
        
        Logger.log(LogCategory.SYSTEM, `Train ${trainId} moved to ${targetStationId}`);
    }
    
    /**
     * Clean up and exit the application
     */
    public exitApp(): void {
        // Show confirmation dialog
        const confirmExit = window.confirm("Are you sure you want to exit the ECS app?");
        
        if (confirmExit) {
            Logger.log(LogCategory.UI, "Exiting ECS App...");
            eventStack.info(EventCategory.SYSTEM, 'app_exit', 'ECS App is shutting down...');
            
            // Stop the render loop
            this.engine.stopRenderLoop();
            
            // Clean up UI components
            if (this.eventLogUI) {
                this.eventLogUI.dispose();
            }
            if (this.trainJourneyControlsUI) {
                this.trainJourneyControlsUI.dispose();
            }
            if (this.trainModificationUI) {
                this.trainModificationUI.dispose();
            }
            
            // Stop systems
            this.timeManager.stop();
            
            // Clean up StationManager
            if (this.stationManager) {
                this.stationManager.dispose();
            }
            
            // Properly dispose of the SceneManager
            this.sceneManager.dispose();
            
            // Dispose of the engine
            this.engine.dispose();
            
            // Remove any remaining DOM UI elements
            this.uiElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Remove the canvas
            if (this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
            
            // Add a message to indicate app has been closed
            const exitMessage = document.createElement("div");
            exitMessage.textContent = "ECS App has been closed. Refresh the page to restart.";
            exitMessage.className = 'exit-message';
            
            // Optionally: Create a restart button
            const restartButton = document.createElement("button");
            restartButton.textContent = "Restart App";
            restartButton.className = 'restart-button';
            restartButton.addEventListener("click", () => {
                location.reload();
            });
            exitMessage.appendChild(restartButton);
            
            document.body.appendChild(exitMessage);
            
            console.log("ECS App exit complete");
        }
    }
    
    /**
     * Check if WebGL is supported by the browser
     */
    private isWebGLSupported(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Show error message when WebGL is not supported
     */
    private showWebGLError(): void {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = `
            <h2>WebGL Not Supported</h2>
            <p>Your browser does not support WebGL, which is required to run this application.</p>
            <p>Please try:</p>
            <ul>
                <li>Using a modern browser (Chrome, Firefox, Safari, Edge)</li>
                <li>Enabling hardware acceleration in your browser settings</li>
                <li>Updating your graphics drivers</li>
            </ul>
        `;
        errorDiv.className = 'error-message webgl-error';
        document.body.appendChild(errorDiv);
        
        Logger.log(LogCategory.SYSTEM, "WebGL not supported - showing error message");
    }
    
    /**
     * Show error message when engine initialization fails
     */
    private showEngineError(error: any): void {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = `
            <h2>Engine Initialization Failed</h2>
            <p>Failed to initialize the 3D rendering engine.</p>
            <p><strong>Error:</strong> ${error?.message || error}</p>
            <p>Please try refreshing the page or check the browser console for more details.</p>
        `;
        errorDiv.className = 'error-message engine-error';
        document.body.appendChild(errorDiv);
        
        Logger.log(LogCategory.SYSTEM, "Engine initialization failed:", error);
    }
    
    /**
     * Load UI CSS files
     */
    private loadUIStyles(): void {
        // Create and load CSS links for UI components
        const cssFiles = [
            'src/ui/assets/main.css',
            'src/ui/assets/time-controls.css',
            'src/ui/assets/event-log.css',
            'src/ui/assets/train-car-modification.css'
        ];
        
        cssFiles.forEach(cssFile => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = cssFile;
            document.head.appendChild(link);
        });
        
        eventStack.info(EventCategory.UI, 'ui_css_loaded', 'UI CSS files loaded', { files: cssFiles });
    }
    
    /**
     * Toggle the event log visibility
     */
    private toggleEventLog(): void {
        if (this.eventLogUI) {
            this.eventLogUI.toggle();
            const isVisible = !this.eventLogUI.getCollapsedState();
            eventStack.info(EventCategory.UI, 'event_log_toggle', `Event log ${isVisible ? 'shown' : 'hidden'}`);
        }
    }

    /**
     * Toggle the train modification UI visibility
     */
    private toggleTrainModificationUI(): void {
        if (this.trainModificationUI) {
            // Check if UI is currently displayed
            const isCurrentlyVisible = this.trainModificationUI.isVisible();
            
            if (isCurrentlyVisible) {
                this.trainModificationUI.hide();
            } else {
                // Get the first train and its first car for demo
                const firstTrain = Array.from(this.trains.values())[0];
                if (firstTrain && firstTrain.getCars().length > 0) {
                    const firstCar = firstTrain.getCars()[0];
                    this.trainModificationUI.setCar(firstCar);
                    this.trainModificationUI.show();
                    
                    Logger.log(LogCategory.UI, `Opened train modification UI for car ${firstCar.carId}`, {
                        trainId: firstTrain.id,
                        carType: firstCar.carType,
                        attachmentStats: firstCar.getAttachmentStats()
                    });
                } else {
                    // Fallback: create a demo car if no trains exist
                    const demoCarConfig: TrainCarConfig = {
                        id: 'demo_engine',
                        type: 'engine',
                        length: 2.0,
                        cargoCapacity: 50,
                        maxHealth: 100
                    };
                    const demoCar = new TrainCar(demoCarConfig, eventStack, this.scene);
                    this.trainModificationUI.setCar(demoCar);
                    this.trainModificationUI.show();
                    
                    Logger.log(LogCategory.UI, `Opened train modification UI with demo car (no trains available)`);
                }
            }
            
            eventStack.info(EventCategory.UI, 'train_modification_ui_toggle', `Train modification UI ${isCurrentlyVisible ? 'hidden' : 'shown'}`);
        }
    }

    /**
     * Log the current demo world configuration
     * This is a temporary helper function until we implement the WorldSystem
     */
    private logCurrentDemoSetup(): void {
        Logger.log(LogCategory.SYSTEM, "=== Current Demo World Configuration ===");
        
        // Log station summary
        Logger.log(LogCategory.SYSTEM, `Created ${this.stations.size} stations with unique building configurations:`);
        Array.from(this.stations.values()).forEach(station => {
            const buildingData = station.buildingData;
            Logger.log(LogCategory.SYSTEM, `  ${station.name}: ${buildingData.length} buildings`, {
                stationId: station.stationId,
                position: station.position.toString(),
                perimeterRadius: station.getPerimeter()?.radius || 'N/A',
                hasWarehouse: !!station.getCargoWarehouse()
            });
        });
        
        // Log rail network
        Logger.log(LogCategory.SYSTEM, `Rail network: ${this.rails.size} rails connecting stations`);
        Array.from(this.rails.values()).forEach(rail => {
            Logger.log(LogCategory.SYSTEM, `  ${rail.name}: ${rail.stationA} ↔ ${rail.stationB}`, {
                railId: rail.railId,
                trackPoints: rail.trackPoints.length,
                isOperational: rail.isOperational
            });
        });
        
        // Log train status
        Logger.log(LogCategory.SYSTEM, `Active trains: ${this.trains.size}`);
        Array.from(this.trains.values()).forEach(train => {
            const cars = train.getCars();
            Logger.log(LogCategory.SYSTEM, `  Train ${train.id}: ${cars.length} cars`, {
                totalCars: cars.length,
                carTypes: cars.map(c => c.carType)
            });
        });
        
        Logger.log(LogCategory.SYSTEM, "=== End Demo Configuration ===");
        Logger.log(LogCategory.SYSTEM, "NOTE: Future WorldSystem will handle procedural world generation using Factory patterns and configuration files");
    }

}

// Create the application when the window loads
window.onload = () => {
    const app = new ECSApp();
    console.log("ECS App loaded!");
    
    // Expose for debugging
    (window as any).ecsApp = app;
};

// Expose the class for debugging
(window as any).ECSApp = ECSApp;
