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
import { TrainRenderer } from "./renderers/TrainRenderer";
import { GroundRenderer } from "./renderers/GroundRenderer";
import { LightRenderer } from "./renderers/LightRenderer";

// Import core ECS classes
import { GameObject } from "./core/GameObject";
import { SceneManager } from "./core/SceneManager";

// Import components
import { PositionComponent } from "./components/PositionComponent";
import { MovementComponent } from "./components/MovementComponent";

// Import game entities
import { Station, StationConfig } from "./game/Station";
import { Rail, RailConfig } from "./game/Rail";
import { TrainCar, TrainCarConfig } from "./game/TrainCar";
import { TrainConfig } from "./types/TrainConfig";

// Import UI and utility systems
import { Logger, LogCategory } from "./utils/Logger";
import { UISystem } from "./systems/UISystem";
import { UIFactory } from "./ui/UIFactory";
import { EventLogUI } from "./ui/EventLogUI";
import { TrainJourneyControlsUI } from "./ui/TrainJourneyControlsUI";
import { TimeManager } from "./game/TimeManager";
import { EventStack } from "./game/EventStack";

// Import train-related classes for later use
import { Train } from "./entities/Train";
import { TrainSystem } from "./systems/TrainSystem";

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
    
    // Core ECS systems
    private sceneManager: SceneManager;
    private timeManager: TimeManager;
    private eventStack: EventStack;
    private trainSystem: TrainSystem;
    
    // Renderers
    private stationRenderer: StationRenderer;
    private railRenderer: RailRenderer;
    private trainRenderer: TrainRenderer;
    private groundRenderer: GroundRenderer;
    private lightRenderer: LightRenderer;
    
    // Game entities
    private stations: Map<string, Station> = new Map();
    private rails: Map<string, Rail> = new Map();
    private trains: Map<string, Train> = new Map();
    
    constructor() {
        Logger.log(LogCategory.SYSTEM, "Initializing ECS App");
        
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
            
            Logger.log(LogCategory.SYSTEM, "Babylon.js engine initialized successfully");
        } catch (error) {
            Logger.log(LogCategory.SYSTEM, "Failed to initialize Babylon.js engine:", error);
            this.showEngineError(error);
            return;
        }
        
        // Initialize SceneManager with the engine and config first
        this.sceneManager = new SceneManager(
            this.engine,
            {
                fieldOfViewDistance: 500,
                enableCulling: true,
                maxVisibleObjects: 500,
                debugMode: false
            }
        );
        
        // Use SceneManager's scene
        this.scene = this.sceneManager.scene;
        this.scene.clearColor = new Color4(0.05, 0.05, 0.15, 1); // Dark blue background
        
        try {
            // Initialize core ECS systems
            this.timeManager = new TimeManager();
            this.eventStack = new EventStack();
            
            // Initialize UI system
            this.uiSystem = new UISystem();
            this.uiFactory = new UIFactory(this.uiSystem);
            
            // Initialize Train System and connect TimeManager
            this.trainSystem = new TrainSystem();
            this.trainSystem.setTimeManager(this.timeManager);
            
            // Initialize renderers
            this.stationRenderer = new StationRenderer(this.sceneManager.scene);
            this.railRenderer = new RailRenderer(this.sceneManager.scene);
            this.trainRenderer = new TrainRenderer(this.sceneManager.scene);
            this.groundRenderer = new GroundRenderer(this.sceneManager.scene);
            this.lightRenderer = new LightRenderer(this.sceneManager.scene);
            
            // Connect TrainRenderer to TrainSystem for visual updates
            this.trainSystem.setTrainRenderer(this.trainRenderer);
            
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
            this.eventStack.logEvent(LogCategory.SYSTEM, 'app_initialized', 'ECS Train Trading Game initialized successfully');
            this.eventStack.logEvent(LogCategory.UI, 'controls_ready', 'Press F1 to toggle event log, Space to pause, 1-5 for time speed');
            
            Logger.log(LogCategory.SYSTEM, "ECS App initialized successfully with station network");
            
        } catch (error) {
            Logger.log(LogCategory.SYSTEM, "Failed to initialize ECS App:", error);
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
            this.eventStack.processAll();
            
            // Update train system with time-scaled delta
            this.trainSystem.update(deltaTime);
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
            
            // Time speed shortcuts (1-5 keys)
            if (ev.key >= '1' && ev.key <= '5' && !ev.ctrlKey && !ev.shiftKey) {
                const speedMap = { '1': 1, '2': 4, '3': 8, '4': 16, '5': 32 } as const;
                const speed = speedMap[ev.key as keyof typeof speedMap];
                if (speed) {
                    this.timeManager.setTimeSpeed(speed);
                    if (this.timeManager.isPausedState()) {
                        this.timeManager.setPaused(false);
                    }
                    this.eventStack.logEvent(LogCategory.UI, 'keyboard_shortcut', `Time speed set to ${speed}x via keyboard`);
                }
            }
            
            // Pause with spacebar (but not when typing in inputs)
            if (ev.code === 'Space' && (!ev.target || (ev.target as HTMLElement).tagName !== 'INPUT')) {
                ev.preventDefault();
                const wasPaused = this.timeManager.isPausedState();
                this.timeManager.setPaused(!wasPaused);
                this.eventStack.logEvent(LogCategory.UI, 'keyboard_shortcut', `Game ${wasPaused ? 'unpaused' : 'paused'} via spacebar`);
            }
        });
    }
    
    /**
     * Set up the camera for the scene
     */
    private setupCamera(): void {
        // Center camera on Central Station position
        const centralStationPosition = new Vector3(-20, 0, 0);
        
        // Setup camera
        const camera = new ArcRotateCamera(
            "camera", 
            -Math.PI / 2,    // alpha (rotation around Y axis)
            Math.PI / 4,     // beta (elevation angle) - slightly less steep for better view
            50,              // radius (distance from target) - much closer zoom
            centralStationPosition,  // target the Central Station
            this.scene
        );
        
        camera.attachControl(this.canvas, true);
        camera.minZ = 0.1;
        camera.maxZ = 1000;
        camera.wheelPrecision = 5;
        camera.lowerRadiusLimit = 10;   // Allow getting closer
        camera.upperRadiusLimit = 200;  // Reduced max zoom out
        
        // Register camera with SceneManager and make it the active camera
        this.sceneManager.setActiveCamera(camera);
        this.scene.activeCamera = camera;
        
        // Log camera setup
        Logger.log(LogCategory.RENDERING, "Camera setup complete", {
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
     */
    private createStationNetwork(): void {
        Logger.log(LogCategory.SYSTEM, "Creating station network");
        
        // Define station configurations
        const stationConfigs: StationConfig[] = [
            {
                id: 'station_a',
                name: 'Central Station',
                position: new Vector3(-20, 0, 0), // Let StationRenderer handle height
                connectedRails: ['rail_ab', 'rail_ac']
            },
            {
                id: 'station_b',
                name: 'Eastern Depot',
                position: new Vector3(20, 0, 0), // Let StationRenderer handle height
                connectedRails: ['rail_ab']
            },
            {
                id: 'station_c',
                name: 'Northern Outpost',
                position: new Vector3(-10, 0, 15), // Let StationRenderer handle height
                connectedRails: ['rail_ac']
            }
        ];
        
        // Debug log all station configurations
        Logger.log(LogCategory.SYSTEM, "Station configurations:", stationConfigs.map(s => ({
            id: s.id,
            position: `(${s.position.x}, ${s.position.y}, ${s.position.z})`
        })));
        
        // Create station entities
        for (const config of stationConfigs) {
            const station = new Station(config);
            
            // Get the station index for color selection
            const stationIndex = stationConfigs.findIndex(s => s.id === config.id);
            
            // Create a visual mesh for the station using the StationRenderer
            const stationMesh = this.stationRenderer.createStationVisual(config, stationIndex);
            
            // Register the station with the SceneManager
            this.sceneManager.registerGameObject(station, stationMesh);
            
            // Store the station
            this.stations.set(config.id, station);
            
            Logger.log(LogCategory.SYSTEM, `Created station: ${config.name} at (${config.position.x}, ${config.position.y}, ${config.position.z})`);
        }
        
        // Define rail configurations
        const railConfigs: RailConfig[] = [
            {
                id: 'rail_ab',
                name: 'Central-Eastern Line',
                stationA: 'station_a',
                stationB: 'station_b',
                trackPoints: [
                    new Vector3(-20, 0, 0),   // Station A
                    new Vector3(-15, 0, 3),   
                    new Vector3(-10, 0, 5),   
                    new Vector3(-5, 0, 6),    
                    new Vector3(0, 0, 5),     
                    new Vector3(5, 0, 3),     
                    new Vector3(10, 0, 1),    
                    new Vector3(15, 0, -2),   
                    new Vector3(20, 0, 0)     // Station B
                ],
                isOperational: true
            },
            {
                id: 'rail_ac',
                name: 'Central-Northern Line',
                stationA: 'station_a',
                stationB: 'station_c',
                trackPoints: [
                    new Vector3(-20, 0, 0),
                    new Vector3(-18, 0, 3),
                    new Vector3(-16, 0, 6),
                    new Vector3(-14, 0, 9),
                    new Vector3(-12, 0, 12),
                    new Vector3(-10, 0, 15)
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
            
            // Store the rail
            this.rails.set(config.id, rail);
            
            Logger.log(LogCategory.SYSTEM, `Created rail: ${config.name}`, {
                id: config.id,
                stationA: config.stationA,
                stationB: config.stationB
            });
        }
        
        Logger.log(LogCategory.SYSTEM, `Created ${this.stations.size} stations and ${this.rails.size} rail lines`);
        
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
        this.eventLogUI = new EventLogUI(this.eventStack);
        
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
        
        // Log the UI creation - this will appear in the event log
        this.eventStack.logEvent(LogCategory.UI, 'ui_created', 'UI elements created successfully', { 
            exitButton: 'exit-button',
            timeControls: 'time-controls',
            eventLog: 'event-log'
        });
        
        // Log UI creation to traditional logger as well
        Logger.log(LogCategory.UI, 'UI elements created', { 
            exitButton: 'exit-button',
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
                this.eventStack.logEvent(LogCategory.UI, 'time_speed_changed', `Time speed changed to ${speed}x via UI button`);
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
            this.eventStack.logEvent(LogCategory.UI, 'game_pause_toggle', `Game ${wasPaused ? 'unpaused' : 'paused'} via UI button`);
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
     * Create an initial train with a single car for debugging
     */
    private createInitialTrain(): void {
        Logger.log(LogCategory.SYSTEM, "Creating initial train");
        
        // Define train configuration
        const trainConfig: TrainConfig = {
            cargoCapacity: 50, // Just the engine
            baseSpeed: 1.0,
            carSpacing: 0.15, // Match the renderer's smaller spacing
            powerEfficiency: 1.0
        };
        
        // Define train car configurations - engine + 2 cargo cars
        const carConfigs: TrainCarConfig[] = [
            {
                id: 'engine_01',
                type: 'engine',
                length: 3.5, // Match the TrainRenderer's new length
                cargoCapacity: 50,
                attachmentSlots: 2,
                maxHealth: 100
            },
            {
                id: 'cargo_01',
                type: 'cargo',
                length: 3.5, // Match the TrainRenderer's new length
                cargoCapacity: 100,
                attachmentSlots: 1,
                maxHealth: 75
            },
            {
                id: 'cargo_02',
                type: 'cargo',
                length: 3.5, // Match the TrainRenderer's new length
                cargoCapacity: 100,
                attachmentSlots: 1,
                maxHealth: 75
            }
        ];
        
        // Create the train cars
        const trainCars = carConfigs.map(config => new TrainCar(config));
        
        // Get the starting station (Station A)
        const startingStation = this.stations.get('station_a');
        if (!startingStation) {
            Logger.log(LogCategory.SYSTEM, "Could not find starting station for train");
            return;
        }
        
        // Get starting position from the station
        const posComponent = startingStation.getComponent<PositionComponent>('position');
        const startPosition = posComponent ? posComponent.getPosition() : { x: 0, y: 0, z: 0 };
          // Create the train using the train system
        const train = this.trainSystem.createTrain('player_1', trainConfig, startPosition);
        
        // Add cars to the train (now handled by TrainSystem for authoritative positioning)
        this.trainSystem.addCarsToTrain(train.id, trainCars);

        // Debug: Check train's PositionComponent after creation
        const trainPosComponent = train.getComponent<PositionComponent>('position');
        const trainPosition = trainPosComponent ? trainPosComponent.getPosition() : null;
        Logger.log(LogCategory.RENDERING, `Train entity position after creation`, {
            trainId: train.id,
            entityPosition: trainPosition ? `(${trainPosition.x}, ${trainPosition.y}, ${trainPosition.z})` : 'null',
            expectedPosition: `(${startPosition.x}, ${startPosition.y}, ${startPosition.z})`
        });

        // Create visual representation for the train
        const trainVisual = this.trainRenderer.createTrainVisual(trainCars, train.id);
        
        // Initialize car positions at the station (this will be updated by TrainSystem)
        this.trainSystem.initializeTrainAtStation(train.id, 'station_a');
        
        Logger.log(LogCategory.RENDERING, `Train visual positioned`, {
            trainId: train.id,
            visualPosition: trainVisual.position.toString(),
            stationPosition: `(${startPosition.x}, ${startPosition.y}, ${startPosition.z})`,
            childMeshes: trainVisual.getChildren().length,
            isEnabled: trainVisual.isEnabled(),
            isDisposed: trainVisual.isDisposed(),
            sceneId: trainVisual.getScene()?.uid || 'no scene'
        });
        
        // Debug: List all child meshes
        trainVisual.getChildren().forEach((child, index) => {
            Logger.log(LogCategory.RENDERING, `Train child ${index}:`, {
                name: child.name,
                position: (child as any).position?.toString() || 'no position',
                isVisible: (child as any).isVisible || 'unknown',
                isEnabled: child.isEnabled(),
                type: child.getClassName()
            });
        });
        
        // Store the train and register it with SceneManager (now supports TransformNode)
        this.trains.set(train.id, train);
        this.sceneManager.registerGameObject(train, trainVisual);
        
        Logger.log(LogCategory.SYSTEM, `Created initial train: ${train.id} at station_a`, {
            trainPosition: `(${startPosition.x}, ${startPosition.y}, ${startPosition.z})`,
            visualPosition: trainVisual.position.toString(),
            carCount: trainCars.length,
            totalCapacity: trainConfig.cargoCapacity
        });
        
        // Set up smooth movement: start journey to station B after 3 seconds
        this.eventStack.logEvent(LogCategory.TRAIN, 'train_created', `Initial train ${train.id} created at Central Station with ${trainCars.length} cars`, {
            trainId: train.id,
            position: startPosition,
            carCount: trainCars.length,
            totalCapacity: trainConfig.cargoCapacity
        });
        
        // Initialize Train Journey Controls UI
        this.trainJourneyControlsUI = new TrainJourneyControlsUI(
            train,
            this.trainSystem,
            this.eventStack,
            this.stations,
            this.rails
        );
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
            this.eventStack.logEvent(LogCategory.TRAIN, 'journey_started', `Train ${trainId} started journey to ${targetStationId} via ${railId}`, {
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
            this.eventStack.logEvent(LogCategory.ERROR, 'journey_failed', `Failed to start train journey for ${trainId}`, {
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
            this.eventStack.logEvent(LogCategory.SYSTEM, 'app_exit', 'ECS App is shutting down...');
            
            // Stop the render loop
            this.engine.stopRenderLoop();
            
            // Clean up UI components
            if (this.eventLogUI) {
                this.eventLogUI.dispose();
            }
            if (this.trainJourneyControlsUI) {
                this.trainJourneyControlsUI.dispose();
            }
            this.uiSystem.dispose();
            
            // Stop systems
            this.timeManager.stop();
            
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
            'src/ui/assets/event-log.css'
        ];
        
        cssFiles.forEach(cssFile => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = cssFile;
            document.head.appendChild(link);
        });
        
        Logger.log(LogCategory.UI, 'UI CSS files loaded', { files: cssFiles });
    }
    
    /**
     * Toggle the event log visibility
     */
    private toggleEventLog(): void {
        if (this.eventLogUI) {
            this.eventLogUI.toggle();
            const isVisible = !this.eventLogUI.getCollapsedState();
            this.eventStack.logEvent(LogCategory.UI, 'event_log_toggle', `Event log ${isVisible ? 'shown' : 'hidden'}`);
        }
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
