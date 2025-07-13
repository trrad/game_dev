// src/ecs-app.ts - Pure Reactive Architecture Demo

import { SceneManager } from "./engine/scene/SceneManager";
import { Vector3, MeshBuilder, Color3, DefaultRenderingPipeline, ArcRotateCamera, StandardMaterial } from "@babylonjs/core";

import { EntityFactory } from "./engine/core/EntityFactory";
import { GameWorld } from "./game/systems/GameWorld";
import './game/entities/Ball'; // Registers Ball entities

import { InputStateEntity } from "./engine/inputs/InputStateEntity";
import { ReactiveInputEnricher } from "./engine/inputs/ReactiveInputEnricher";
import { NetworkReactiveEntity } from "./engine/networking/NetworkReactiveEntity";
import { NaturalSyncNetworkManager } from "./engine/networking/NaturalSyncNetworkManager";
import { NetworkRole } from "./engine/networking/NetworkTypes";
import { ConfigurableTimers } from "./engine/utils/ConfigurableTimers";

// ============================================================================
// 🚀 PURE REACTIVE ARCHITECTURE DEMO
// ============================================================================

function setupPureReactiveGame() {
    // ✅ Standard scene setup
    let canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "gameCanvas";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.display = "block";
        document.body.appendChild(canvas);
    }

    const sceneManager = new SceneManager(canvas);
    sceneManager.handleResize();
    sceneManager.start();

    // ✅ Enable state history for lag compensation
    NetworkReactiveEntity.enableStateHistory(1000);
    console.log('🕒 State history enabled for lag compensation');

    // Scene setup
    setupEnvironment(sceneManager);

    // ✅ Network managers with Natural Sync
    const clientRole: NetworkRole = { isClient: true, isServer: false, ownedByThisClient: true };
    const serverRole: NetworkRole = { isClient: false, isServer: true };

    const clientNetworkManager = new NaturalSyncNetworkManager(clientRole);
    const serverNetworkManager = new NaturalSyncNetworkManager(serverRole);

    // ✅ Simulated network delay (in production: SocketClient/SocketServer)
    let networkDelay = 0;
    
    clientNetworkManager.setSendCallback((message) => {
        setTimeout(() => {
            serverNetworkManager.handleMessage(message);
        }, networkDelay);
    });

    serverNetworkManager.setSendCallback((message) => {
        setTimeout(() => {
            clientNetworkManager.handleMessage(message);
        }, networkDelay);
    });

    // ✅ INPUT STATE: Client-authoritative reactive input
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);

    // ✅ ENTITIES: Create client and server balls
    const clientBall = EntityFactory.create(
        'ball',
        'ball1', // Same networkId
        sceneManager.scene,
        clientRole,
        new Vector3(-3, 0.5, 0)
    );

    const serverBall = EntityFactory.create(
        'ball',
        'ball1', // Same networkId 
        null, // Server doesn't need scene
        serverRole,
        new Vector3(3, 0.5, 0)
    );

    // ✅ GAME WORLD: Server-side only for lag compensation
    const gameWorld = new GameWorld(null);
    gameWorld.addEntity(serverBall);
    (serverBall as any).setGameWorld(gameWorld);

    // ✅ INPUT OBSERVATION: Both entities observe input (core game logic)
    // Client: For immediate prediction
    // Server: For authoritative updates with lag compensation
    
    // Server needs the replicated InputStateEntity
    const serverInputState = new InputStateEntity('client_input', null, serverRole);
    serverNetworkManager.registerEntity(serverInputState as any);
    
    // BOTH observe input - this is the key to lag compensation!
    (clientBall as any).observeInputState(clientInputState);
    (serverBall as any).observeInputState(serverInputState);
    
    console.log('📡 Pure reactive lag compensation established:');
    console.log('  1. User input → Updates client InputStateEntity');
    console.log('  2. Client Ball observes → Immediate prediction');
    console.log('  3. Natural Sync → Input propagates to server');
    console.log('  4. Server Ball observes → Processes with lag compensation');
    console.log('  5. Server state updates → Natural Sync back to client');
    console.log('  6. Client reconciles → Continues from server state');

    // ✅ REGISTER ENTITIES: Natural sync handles everything
    clientNetworkManager.registerEntity(clientBall as any);
    serverNetworkManager.registerEntity(serverBall as any);
    clientNetworkManager.registerEntity(clientInputState as any);

    // ✅ CLIENT GAME LOOP: Fixed tick for game logic, native rate for visuals
    ConfigurableTimers.createTimer(sceneManager.scene, 'gameLogic', () => {
        (clientBall as any).updateGameLogic(0.05); // 20Hz like server
    }, 'client_game_logic');

    // Visual updates at render rate
    sceneManager.scene.onBeforeRenderObservable.add(() => {
        const deltaTime = sceneManager.scene.getEngine().getDeltaTime() / 1000;
        (clientBall as any).updateVisuals(deltaTime);
    });

    // ✅ SERVER GAME LOOP: Through GameWorld
    let gameLoopRunning = true;
    let lastGameUpdateTime = performance.now();
    
    function serverGameLoop() {
        if (!gameLoopRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastGameUpdateTime) / 1000;
        lastGameUpdateTime = currentTime;
        
        // GameWorld manages tick frequencies and entity updates
        gameWorld.update(deltaTime);
        
        requestAnimationFrame(serverGameLoop);
    }
    
    serverGameLoop();

    // ✅ Camera follows client ball
    setupCamera(sceneManager, clientBall);

    // ✅ Focus canvas for keyboard input
    canvas.tabIndex = 0;
    canvas.focus();

    // ✅ Debug interface
    (window as any).pureReactive = {
        clientBall,
        serverBall,
        clientInputState,
        serverInputState,
        clientNetworkManager,
        serverNetworkManager,
        gameWorld,
        
        // Network delay controls
        setPing: (ms: number) => { 
            networkDelay = ms;
            console.log(`🌐 Network delay set to ${ms}ms`);
        },
        noPing: () => { networkDelay = 0; console.log('🌐 Network delay: 0ms'); },
        lowPing: () => { networkDelay = 50; console.log('🌐 Network delay: 50ms'); },
        highPing: () => { networkDelay = 200; console.log('🌐 Network delay: 200ms'); },
        
        // Debug commands
        showStats: () => {
            console.log('📊 System Stats:');
            console.log('  Client Network:', clientNetworkManager.getNaturalSyncStats());
            console.log('  Server Network:', serverNetworkManager.getNaturalSyncStats());
            console.log('  Game World:', gameWorld.getStats());
            console.log('  Client Input Rate:', clientInputState.getNumericProperty('clientInputRate')?.getValue());
            console.log('  Server Input Rate:', serverInputState.getNumericProperty('serverInputRate')?.getValue());
        },
        
        // Visual separation for debugging
        separateBalls: () => {
            clientBall.getVectorProperty('position')?.set(new Vector3(-5, 0.5, 0), 'debug');
            serverBall.getVectorProperty('position')?.set(new Vector3(5, 0.5, 0), 'debug');
            console.log('🎾 Balls separated for visual debugging');
        },
        
        // Test movement
        testClick: (x: number, z: number) => {
            const clickEvent = {
                timestamp: Date.now(),
                sequenceId: Date.now(),
                button: 0,
                screenPosition: { x: 0.5, y: 0.5 },
                worldPosition: new Vector3(x, 0, z),
                pickedEntityId: '', // Ground click
                modifierKeys: []
            };
            clientInputState.getCollectionProperty('recentClicks')
                ?.addItem(`test_${Date.now()}`, clickEvent, 'test');
        },
        
        // Game loop control
        stopGameLoop: () => { gameLoopRunning = false; },
        startGameLoop: () => { 
            if (!gameLoopRunning) {
                gameLoopRunning = true;
                lastGameUpdateTime = performance.now();
                serverGameLoop();
            }
        }
    };

    logArchitectureOverview();
}

// Helper functions remain the same...
function setupEnvironment(sceneManager: SceneManager) {
    const scene = sceneManager.scene;
    
    // Fog
    scene.fogMode = 1; 
    scene.fogColor = new Color3(0.42, 0.22, 0.55);
    scene.fogDensity = 0.012;

    // Skybox
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
    const skyMat = new StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.diffuseColor = new Color3(0.18, 0.13, 0.28);
    skyMat.emissiveColor = new Color3(0.45, 0.38, 0.65);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;

    // Ground
    const ground = MeshBuilder.CreateGround("ground", {
        width: 100,
        height: 100,
        subdivisions: 50
    }, scene);
    
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.45, 0.45, 0.48);
    groundMat.specularColor = Color3.Black();
    ground.material = groundMat;
    ground.enableEdgesRendering();
    ground.edgesWidth = 1.0;
    ground.edgesColor = new Color3(0.7, 0.7, 0.9).toColor4(0.7);

    // DOF
    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [sceneManager.camera]);
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfField.focalLength = 80;
    pipeline.depthOfField.fStop = 2.8;
    pipeline.depthOfField.focusDistance = 500;
}

function setupCamera(sceneManager: SceneManager, target: any) {
    sceneManager.camera.detachControl();
    sceneManager.camera.dispose();
    
    const arcRotateCamera = new ArcRotateCamera(
        "arcRotateCamera",
        Math.PI / 4,
        Math.PI / 3,
        18,
        target.mesh.position,
        sceneManager.scene
    );
    
    arcRotateCamera.lowerRadiusLimit = 8;
    arcRotateCamera.upperRadiusLimit = 40;
    arcRotateCamera.lowerBetaLimit = Math.PI / 6;
    arcRotateCamera.upperBetaLimit = Math.PI / 2.1;
    arcRotateCamera.attachControl(sceneManager.scene.getEngine().getRenderingCanvas()!, true);
    
    sceneManager.scene.activeCamera = arcRotateCamera;
    
    sceneManager.scene.onBeforeRenderObservable.add(() => {
        arcRotateCamera.target.copyFrom(target.mesh.position);
    });
}

function logArchitectureOverview() {
    console.log(`
🎯 PURE REACTIVE LAG COMPENSATION DEMO
=====================================

✅ ARCHITECTURE:
- Input is reactive state with client authority
- Game logic in base class runs on BOTH client & server
- Client observes its own input → immediate prediction
- Server observes same input → authoritative update
- Natural Sync handles all network propagation

✅ KEY INSIGHT:
The same observeInputState() code provides:
- Client: Immediate response (prediction)
- Server: Delayed response with authority
No separate prediction logic needed!

🎮 COMMANDS:
pureReactive.setPing(200)      // Simulate network delay
pureReactive.testClick(5, 5)   // Test movement
pureReactive.showStats()       // View system statistics
pureReactive.separateBalls()   // Visual debugging

🔍 OBSERVE:
1. Click ground → Both balls move immediately
2. Server ball is authoritative (after delay)
3. Client reconciles to server position
4. Input rate tracking in stats
    `);
}

// Start the game
setupPureReactiveGame();