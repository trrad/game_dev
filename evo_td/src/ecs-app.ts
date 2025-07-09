// src/ecs-app.ts - Complete Reactive Input System Integration

import { SceneManager } from "./engine/scene/SceneManager";
import { Vector3 } from "@babylonjs/core";

// ✅ NEW IMPORTS: Complete reactive input system
import { InputStateEntity } from "./engine/inputs/InputStateEntity";
import { ReactiveInputEnricher } from "./engine/inputs/ReactiveInputEnricher";
import { PlayerCharacter } from "./game/entities/PlayerCharacter";
import { NetworkRole } from "./engine/networking/NetworkTypes";
import { SimpleNetworkManager } from "./engine/networking/SimpleNetworkManager";

// ✅ SIMPLE GRID: Much lighter weight approach
import { createSimpleGrid } from "./engine/utils/SimpleGrid";

function setupGameCanvasAndScene(id = "gameCanvas") {
    let canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = id;
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.display = "block";
        document.body.appendChild(canvas);
    }
    const sceneManager = new SceneManager(canvas);
    sceneManager.handleResize();
    sceneManager.start();
    const rootNode = sceneManager.getRootNode();
    return { canvas, sceneManager, rootNode };
}

// ✅ NEW: Setup complete reactive input system with networking
function setupReactiveInputWithNetworking(sceneManager: SceneManager) {
    console.log('🚀 Initializing Complete Reactive Input System with Networking...');
    
    // ✅ STEP 1: Create client and server network managers
    const clientRole: NetworkRole = { isClient: true, isServer: false, ownedByThisClient: true };
    const serverRole: NetworkRole = { isClient: false, isServer: true };
    
    const clientNetworkManager = new SimpleNetworkManager(clientRole);
    const serverNetworkManager = new SimpleNetworkManager(serverRole);
    
    // ✅ STEP 2: Set up mock networking between client and server
    const messageQueue: any[] = [];
    let processingMessages = false;
    
    // Client sends to server
    clientNetworkManager.setSendCallback((message) => {
        console.log(`📤 CLIENT → SERVER:`, message.type, message.propertyName, `(${message.authority}-auth)`);
        messageQueue.push({ to: 'server', message });
        processMessageQueue();
    });
    
    // Server sends to client  
    serverNetworkManager.setSendCallback((message) => {
        console.log(`📤 SERVER → CLIENT:`, message.type, message.propertyName, `(${message.authority}-auth)`);
        messageQueue.push({ to: 'client', message });
        processMessageQueue();
    });
    
    // ✅ STEP 3: Process message queue asynchronously
    function processMessageQueue() {
        if (processingMessages) return;
        processingMessages = true;
        
        setTimeout(() => {
            while (messageQueue.length > 0) {
                const { to, message } = messageQueue.shift();
                
                if (to === 'server') {
                    console.log(`📥 SERVER ← CLIENT:`, message.type, message.propertyName);
                    serverNetworkManager.handleMessage(message);
                } else {
                    console.log(`📥 CLIENT ← SERVER:`, message.type, message.propertyName);
                    clientNetworkManager.handleMessage(message);
                }
            }
            processingMessages = false;
        }, 16); // ~60fps network processing
    }
    
    // ✅ STEP 4: Create global input state entities for both sides
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const serverInputState = new InputStateEntity('server_input', sceneManager.scene, serverRole);
    
    // ✅ STEP 5: Set up client-side input enrichment (only client has DOM access)
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);
    
    console.log('✅ Reactive input system with networking initialized');
    
    return {
        clientNetworkManager,
        serverNetworkManager,
        clientInputState,
        serverInputState,
        inputEnricher
    };
}

// ✅ NEW: Create networked player characters
function createNetworkedPlayerCharacters(
    sceneManager: SceneManager,
    rootNode: any,
    clientNetworkManager: SimpleNetworkManager,
    serverNetworkManager: SimpleNetworkManager,
    clientInputState: InputStateEntity,
    serverInputState: InputStateEntity
) {
    console.log('🎮 Creating Networked Player Characters...');
    
    // ✅ CLIENT PLAYER: Handles input, makes predictions
    const clientPlayer = new PlayerCharacter(
        'player1',
        sceneManager.scene,
        { isClient: true, isServer: false, ownedByThisClient: true },
        clientInputState,
        rootNode
    );
    
    // ✅ SERVER PLAYER: Receives input state, provides authority
    const serverPlayer = new PlayerCharacter(
        'player1', // Same ID - represents same entity on both sides
        sceneManager.scene,
        { isClient: false, isServer: true },
        serverInputState,
        rootNode
    );
    
    // ✅ REGISTER WITH NETWORK MANAGERS
    clientNetworkManager.registerEntity(clientPlayer);
    serverNetworkManager.registerEntity(serverPlayer);
    
    // ✅ POSITION ENTITIES: Offset slightly so we can see both
    clientPlayer.position.set(new Vector3(-1, 0, 0), 'initial_setup');
    serverPlayer.position.set(new Vector3(1, 0, 0), 'initial_setup');
    
    console.log('✅ Networked player characters created and registered');
    
    return { clientPlayer, serverPlayer };
}

// ✅ NEW: Set up comprehensive debugging and monitoring
function setupReactiveInputMonitoring(
    clientInputState: InputStateEntity,
    serverInputState: InputStateEntity,
    clientPlayer: PlayerCharacter,
    serverPlayer: PlayerCharacter,
    clientNetworkManager: SimpleNetworkManager,
    serverNetworkManager: SimpleNetworkManager,
    inputEnricher: ReactiveInputEnricher
) {
    console.log('🔍 Setting up reactive input monitoring...');
    
    // ✅ MONITOR INPUT STATE CHANGES
    const clientMousePos = clientInputState.getVectorProperty('mouseWorldPosition');
    clientMousePos?.onChange((event) => {
        if (Math.random() < 0.02) { // Occasional logging to avoid spam
            console.log(`🖱️ CLIENT: Mouse at (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)})`);
        }
    });
    
    const clientMouseButtons = clientInputState.getCollectionProperty('mouseButtons');
    clientMouseButtons?.itemAddedObservable.add((event) => {
        console.log(`🖱️ CLIENT: Mouse button ${event.value} pressed`);
    });
    
    const clientKeysPressed = clientInputState.getCollectionProperty('keysPressed');
    clientKeysPressed?.itemAddedObservable.add((event) => {
        console.log(`⌨️ CLIENT: Key ${event.value} pressed`);
    });
    
    // ✅ MONITOR GAME STATE CHANGES
    const clientTargetPosition = clientPlayer.getVectorProperty('targetPosition');
    clientTargetPosition?.onChange((event) => {
        console.log(`🎯 CLIENT: Target position → (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
    });
    
    const serverTargetPosition = serverPlayer.getVectorProperty('targetPosition');
    serverTargetPosition?.onChange((event) => {
        console.log(`🎯 SERVER: Target position → (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
    });
    
    // ✅ MONITOR POSITION SYNC
    const clientPosition = clientPlayer.getVectorProperty('position');
    const serverPosition = serverPlayer.getVectorProperty('position');
    
    clientPosition?.onChange((event) => {
        if (event.source !== 'movement_interpolation') {
            console.log(`📍 CLIENT: Position → (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        }
    });
    
    serverPosition?.onChange((event) => {
        if (event.source !== 'movement_interpolation') {
            console.log(`📍 SERVER: Position → (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        }
    });
    
    console.log('✅ Reactive input monitoring active');
}

// ✅ ENHANCED: Main entry point with complete reactive input system
(async () => {
    const { canvas, sceneManager, rootNode } = setupGameCanvasAndScene();
    
    // ✅ ADD SIMPLE GRID: Create visual reference frame using GridMaterial
    console.log('🟫 Creating simple grid for visual reference...');
    const groundGrid = createSimpleGrid(sceneManager.scene, 30); // 30x30 grid
    groundGrid.position.y = -0.1; // Slightly below Y=0
    
    // ✅ STEP 1: Initialize reactive input system with networking
    const {
        clientNetworkManager,
        serverNetworkManager,
        clientInputState,
        serverInputState,
        inputEnricher
    } = setupReactiveInputWithNetworking(sceneManager);
    
    // ✅ STEP 2: Create networked player characters
    const { clientPlayer, serverPlayer } = createNetworkedPlayerCharacters(
        sceneManager,
        rootNode,
        clientNetworkManager,
        serverNetworkManager,
        clientInputState,
        serverInputState
    );
    
    // ✅ STEP 3: Set up monitoring and debugging
    setupReactiveInputMonitoring(
        clientInputState,
        serverInputState,
        clientPlayer,
        serverPlayer,
        clientNetworkManager,
        serverNetworkManager,
        inputEnricher
    );
    
    // ✅ STEP 4: Make everything accessible for debugging
    (window as any).reactiveInputDemo = {
        // Network managers
        clientNetworkManager,
        serverNetworkManager,
        
        // Input state
        clientInputState,
        serverInputState,
        inputEnricher,
        
        // Player characters
        clientPlayer,
        serverPlayer,
        
        // Scene and visuals
        sceneManager,
        groundGrid, // ✅ Simple grid mesh
        
        // ✅ DEBUGGING HELPERS
        getInputState: () => ({
            mouseWorldPos: clientInputState.getCurrentMouseWorldPosition(),
            pickedEntity: clientInputState.getCurrentlyPickedEntity(),
            keysPressed: Array.from(clientInputState.getCollectionProperty('keysPressed')?.getKeys() || []),
            mouseButtons: Array.from(clientInputState.getCollectionProperty('mouseButtons')?.getKeys() || [])
        }),
        
        getPlayerStates: () => ({
            client: {
                targetPosition: clientPlayer.getVectorProperty('targetPosition')?.getValue(),
                position: clientPlayer.getVectorProperty('position')?.getValue(),
                health: clientPlayer.getNumericProperty('health')?.getValue(),
                unitState: clientPlayer.getEnumProperty('unitState')?.getValue()
            },
            server: {
                targetPosition: serverPlayer.getVectorProperty('targetPosition')?.getValue(),
                position: serverPlayer.getVectorProperty('position')?.getValue(),
                health: serverPlayer.getNumericProperty('health')?.getValue(),
                unitState: serverPlayer.getEnumProperty('unitState')?.getValue()
            }
        }),
        
        getNetworkStats: () => ({
            client: clientNetworkManager.getAuthorityStats(),
            server: serverNetworkManager.getAuthorityStats()
        }),
        
        getInputPerformance: () => inputEnricher.getPerformanceStats(),
        
        // ✅ TESTING HELPERS
        simulateClick: (x: number, z: number) => {
            console.log(`🧪 Simulating click at (${x}, ${z})`);
            clientInputState.updateMouseContext(
                new Vector3(0.5, 0.5, 0), // Screen position
                new Vector3(x, 0, z),     // World position
                undefined,                // No picked entity
                undefined,                // No picked UI
                new Vector3(0, 1, 0),     // Surface normal
                5                         // Raycast distance
            );
            clientInputState.addClickEvent(0, []); // Left click
        },
        
        simulateKeyPress: (keyCode: string) => {
            console.log(`🧪 Simulating key press: ${keyCode}`);
            clientInputState.updateKeyPressed(keyCode, true, []);
        },
        
        simulateKeyRelease: (keyCode: string) => {
            console.log(`🧪 Simulating key release: ${keyCode}`);
            clientInputState.updateKeyPressed(keyCode, false, []);
        },
        
        // ✅ AUTHORITY TESTING
        debugAuthority: () => {
            console.log('🔍 Authority Configuration:');
            clientNetworkManager.debugAuthority();
            serverNetworkManager.debugAuthority();
        },
        
        // ✅ PREDICTION vs AUTHORITY TESTING
        testPredictionCorrection: () => {
            console.log('🧪 Testing client prediction vs server authority...');
            
            // Client predicts movement to (5, 0, 5)
            clientPlayer.getVectorProperty('targetPosition')?.set(new Vector3(5, 0, 5), 'client_prediction');
            
            // Server corrects to (3, 0, 3) after 1 second
            setTimeout(() => {
                serverPlayer.getVectorProperty('targetPosition')?.set(new Vector3(3, 0, 3), 'server_authority');
                console.log('🔧 Server correction applied - client should sync to server position');
            }, 1000);
        },
        
        // ✅ VISUAL HELPERS
        toggleGrid: () => {
            groundGrid.isVisible = !groundGrid.isVisible;
            console.log(`🟫 Ground grid ${groundGrid.isVisible ? 'shown' : 'hidden'}`);
        },
        
        resetPlayerPositions: () => {
            console.log('🔄 Resetting player positions to start positions');
            clientPlayer.position.set(new Vector3(-2, 0, 0), 'manual_reset');
            serverPlayer.position.set(new Vector3(2, 0, 0), 'manual_reset');
        },
        
        moveCameraToOverview: () => {
            sceneManager.camera.setTarget(Vector3.Zero());
            sceneManager.camera.radius = 15;
            sceneManager.camera.beta = Math.PI / 4; // 45 degree angle
            console.log('📹 Camera moved to overview position');
        }
    };
    
    // ✅ SETUP BETTER CAMERA POSITION for viewing the grid
    sceneManager.camera.setTarget(Vector3.Zero());
    sceneManager.camera.radius = 12;
    sceneManager.camera.beta = Math.PI / 3; // 60 degree angle
    sceneManager.camera.alpha = 0; // Front view initially
    
    console.log(`
🎯 Complete Reactive Input System Demo Ready with Simple Grid!

✅ FEATURES ACTIVE:
- Simple grid using Babylon.js GridMaterial (lightweight!)
- Global reactive input state with client authority
- Continuous 3D mouse position enrichment  
- Pure reactive game logic (no DOM events in PlayerCharacter)
- Client prediction + server authority with automatic correction
- Full network sync with authority validation
- Performance monitoring and debugging tools
- Visual feedback with colored spheres and effect flashes

🎮 WHAT TO TRY:
1. Click anywhere on the grid - watch client prediction + server authority flow
2. Press WASD keys - watch reactive keyboard movement  
3. Observe console logs for complete reactive flow
4. Watch players move relative to the grid reference
5. Check authority separation working correctly

🧪 CONSOLE COMMANDS:
- reactiveInputDemo.getInputState()           // Current input state
- reactiveInputDemo.getPlayerStates()         // Client vs server player state  
- reactiveInputDemo.simulateClick(5, 3)       // Test click at grid position (5,3)
- reactiveInputDemo.testPredictionCorrection() // Test client prediction vs server authority
- reactiveInputDemo.toggleGrid()              // Show/hide ground grid
- reactiveInputDemo.resetPlayerPositions()    // Reset to start positions
- reactiveInputDemo.moveCameraToOverview()    // Better camera angle

🔍 VISUAL REFERENCE:
- Blue sphere: CLIENT player entity (predictions)
- Green sphere: SERVER player entity (authority)  
- Grid: 1 unit per square, thick lines every 5 units
- Flashes: Cyan=valid move, Red=rejected, Purple=interaction

The complete reactive input architecture is now working with simple GridMaterial!
    `);
})();
