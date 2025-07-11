// src/ecs-app.ts - Clean version using modular Ball entities + Lag Compensation

import { SceneManager } from "./engine/scene/SceneManager";
import { Vector3, MeshBuilder, Color3, DefaultRenderingPipeline, ArcRotateCamera, StandardMaterial } from "@babylonjs/core";

// Use modular Ball entities instead of inline definitions
import { EntityFactory } from "./engine/core/EntityFactory";
import { GameWorld } from "./game/systems/GameWorld";
import './game/entities/Ball'; // This registers Ball entities with EntityFactory

// Use your existing architecture with Natural Sync
import { InputStateEntity } from "./engine/inputs/InputStateEntity";
import { ReactiveInputEnricher } from "./engine/inputs/ReactiveInputEnricher";
import { NetworkReactiveEntity } from "./engine/networking/NetworkReactiveEntity";
import { NaturalSyncNetworkManager } from "./engine/networking/NaturalSyncNetworkManager";
import { NetworkRole } from "./engine/networking/NetworkTypes";

// ============================================================================
// 🎮 ENHANCED INPUT HANDLER - Now with Lag Compensation Support
// ============================================================================

class EnhancedReactiveInputHandler {
    private inputState: InputStateEntity;
    private clientBall: any; // Using EntityFactory entities
    private serverBall: any;
    private gameWorld: GameWorld;

    constructor(
        inputState: InputStateEntity, 
        clientBall: any, 
        serverBall: any,
        gameWorld: GameWorld
    ) {
        this.inputState = inputState;
        this.clientBall = clientBall;
        this.serverBall = serverBall;
        this.gameWorld = gameWorld;
        
        this.setupInputObservation();
    }

    private setupInputObservation(): void {
        // ✅ ENHANCED: Ground clicks with lag compensation option
        const recentClicks = this.inputState.getCollectionProperty('recentClicks');
        recentClicks?.itemAddedObservable.add((event) => {
            const clickEvent = event.value as any;
            
            // ✅ Only process as ground click if NO entity was picked
            if (!clickEvent.pickedEntityId || clickEvent.pickedEntityId === '') {
                const worldPos = clickEvent.worldPosition;
                console.log(`🖱️ Ground click at (${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)})`);
                
                // ✅ NEW: Use lag compensation for server movement
                console.log('🕒 Processing with lag compensation (simulated 100ms lag)');
                this.gameWorld.processClientInput({
                    timestamp: Date.now() - 100, // Simulate 100ms client→server lag
                    sequenceId: Date.now(),
                    entityId: this.serverBall.getNetworkId(),
                    action: 'moveTo',
                    parameters: { target: worldPos, source: 'lag_compensated_ground_click' },
                    clientId: 'main_client'
                });
                
                // Client still does immediate prediction
                this.clientBall.moveTo(worldPos, 'client_prediction_ground_click');
                
            } else {
                console.log(`🎯 Entity click on: ${clickEvent.pickedEntityId} - ignoring ground movement`);
            }
        });

        // ✅ KEYBOARD: WASD movement using your input system
        const keysPressed = this.inputState.getCollectionProperty('keysPressed');
        keysPressed?.itemAddedObservable.add((event) => {
            this.handleKeyPress(event.value as string);
        });

        console.log('🎮 Enhanced reactive input handling set up with lag compensation');
    }

    private handleKeyPress(keyCode: string): void {
        const moveDistance = 2.0;
        let offset = Vector3.Zero();

        switch (keyCode) {
            case 'KeyW': offset.z = moveDistance; break;
            case 'KeyS': offset.z = -moveDistance; break;
            case 'KeyA': offset.x = -moveDistance; break;
            case 'KeyD': offset.x = moveDistance; break;
            default: return;
        }

        console.log(`⌨️ Key pressed: ${keyCode}`);

        // Get current positions
        const clientPos = this.clientBall.getVectorProperty('position')?.getValue() || Vector3.Zero();
        const serverPos = this.serverBall.getVectorProperty('position')?.getValue() || Vector3.Zero();

        // ✅ ENHANCED: Server movement with lag compensation
        this.gameWorld.processClientInput({
            timestamp: Date.now() - 80, // Simulate 80ms keyboard input lag
            sequenceId: Date.now(),
            entityId: this.serverBall.getNetworkId(),
            action: 'moveTo',
            parameters: { target: serverPos.add(offset), source: `lag_compensated_keyboard_${keyCode}` },
            clientId: 'main_client'
        });

        // Client immediate prediction
        this.clientBall.moveTo(clientPos.add(offset), `client_prediction_keyboard_${keyCode}`);
    }
}

// ============================================================================
// 🚀 MAIN SETUP - Clean Modular Architecture + Lag Compensation
// ============================================================================

function setupCleanModularGame() {
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

    // ✅ ENHANCED: Enable state history for lag compensation
    NetworkReactiveEntity.enableStateHistory(1000); // 1 second buffer
    console.log('🕒 State history enabled for lag compensation');

    // --- Environmental Setup (unchanged) ---
    const scene = sceneManager.scene;
    scene.fogMode = 1; 
    scene.fogColor = new Color3(0.42, 0.22, 0.55);
    scene.fogDensity = 0.012;

    // --- Gradient Skybox (unchanged) ---
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
    const skyMat = new StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.diffuseColor = new Color3(0.18, 0.13, 0.28);
    skyMat.emissiveColor = new Color3(0.45, 0.38, 0.65);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
    skybox.renderingGroupId = 0;

    // --- Hilly Ground (unchanged) ---
    const groundSize = 100;
    const subdivisions = 100;
    const minHeight = -1;
    const maxHeight = 5;
    
    function generateHeightMapDataURL(size: number = 256): string {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const imgData = ctx.createImageData(size, size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const nx = (x / size) * Math.PI * 2;
                const ny = (y / size) * Math.PI * 2;
                let h = 0.5 + 0.5 * Math.sin(nx) * Math.cos(ny);
                h += 0.2 * Math.sin(nx * 2 + ny * 1.5);
                h += 0.1 * Math.cos(nx * 3 - ny * 2);
                h = Math.max(0, Math.min(1, h));
                const val = Math.floor(h * 255);
                const idx = (y * size + x) * 4;
                imgData.data[idx] = val;
                imgData.data[idx + 1] = val;
                imgData.data[idx + 2] = val;
                imgData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL();
    }
    
    const heightMapURL = generateHeightMapDataURL(256);
    let ground: any;
    MeshBuilder.CreateGroundFromHeightMap(
        "ground",
        heightMapURL,
        {
            width: groundSize,
            height: groundSize,
            subdivisions: subdivisions,
            minHeight: minHeight,
            maxHeight: maxHeight,
            onReady: (mesh) => {
                ground = mesh;
                ground.position.y = -0.1;
                const greyMat = new StandardMaterial("greyMat", scene);
                greyMat.diffuseColor = new Color3(0.45, 0.45, 0.48);
                greyMat.specularColor = Color3.Black();
                ground.material = greyMat;
                ground.enableEdgesRendering();
                ground.edgesWidth = 1.0;
                ground.edgesColor = new Color3(0.7, 0.7, 0.9).toColor4(0.7);
            }
        },
        scene
    );

    // --- Depth of Field (unchanged) ---
    const pipeline = new DefaultRenderingPipeline(
        "defaultPipeline",
        true,
        sceneManager.scene,
        [sceneManager.camera]
    );
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfField.focalLength = 80;
    pipeline.depthOfField.fStop = 2.8;
    pipeline.depthOfField.focusDistance = 500;

    // ✅ NATURAL SYNC: Network setup using automatic property sync
    const clientRole: NetworkRole = { isClient: true, isServer: false, ownedByThisClient: true };
    const serverRole: NetworkRole = { isClient: false, isServer: true };

    const clientNetworkManager = new NaturalSyncNetworkManager(clientRole);
    const serverNetworkManager = new NaturalSyncNetworkManager(serverRole);

    // ✅ PING SIMULATION: Network delay configuration (unchanged)
    let networkPingMs = 0;
    const messageQueue: any[] = [];
    let processingMessages = false;

    clientNetworkManager.setSendCallback((message) => {
        const delayedMessage = {
            to: 'server',
            message,
            timestamp: Date.now(),
            deliverAt: Date.now() + networkPingMs
        };
        messageQueue.push(delayedMessage);
        processMessageQueue();
    });

    serverNetworkManager.setSendCallback((message) => {
        const delayedMessage = {
            to: 'client',
            message,
            timestamp: Date.now(),
            deliverAt: Date.now() + networkPingMs
        };
        messageQueue.push(delayedMessage);
        processMessageQueue();
    });

    function processMessageQueue() {
        if (processingMessages || messageQueue.length === 0) return;
        processingMessages = true;
        
        setTimeout(() => {
            const currentTime = Date.now();
            const readyMessages = messageQueue.filter(item => currentTime >= item.deliverAt);
            const delayedMessages = messageQueue.filter(item => currentTime < item.deliverAt);
            
            readyMessages.forEach(({ to, message }) => {
                try {
                    if (to === 'server') {
                        serverNetworkManager.handleMessage(message);
                    } else {
                        clientNetworkManager.handleMessage(message);
                    }
                } catch (error) {
                    console.error(`Error processing message:`, error);
                }
            });
            
            messageQueue.length = 0;
            messageQueue.push(...delayedMessages);
            processingMessages = false;
            
            if (messageQueue.length > 0) {
                setTimeout(processMessageQueue, 10);
            }
        }, 1);
    }

    // ✅ Input system using your architecture
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);

    // ✅ MODULAR ENTITIES: Use EntityFactory instead of inline classes
    const clientBall = EntityFactory.create(
        'ball',
        'ball1', // Same networkId - same entity
        sceneManager.scene,
        clientRole,
        new Vector3(-3, 0.5, 0)
    );

    const serverBall = EntityFactory.create(
        'ball',
        'ball1', // Same networkId - same entity  
        sceneManager.scene,
        serverRole,
        new Vector3(3, 0.5, 0)
    );

    console.log('🎾 Created modular Ball entities using EntityFactory');

    // ✅ ENHANCED: Create GameWorld for lag compensation
    const gameWorld = new GameWorld(sceneManager.scene);
    gameWorld.addEntity(serverBall);
    console.log('🌍 GameWorld created with lag compensation support');

    // ✅ ENHANCED: Game loop with lag compensation
    sceneManager.scene.onBeforeRenderObservable.add(() => {
        gameWorld.update(0.016); // 60fps delta time
    });

    // --- ArcRotateCamera setup (unchanged) ---
    sceneManager.camera.detachControl();
    sceneManager.camera.dispose();
    const arcRotateCamera = new ArcRotateCamera(
        "arcRotateCamera",
        Math.PI / 4,
        Math.PI / 3,
        18,
        clientBall.mesh.position,
        scene
    );
    arcRotateCamera.lowerRadiusLimit = 8;
    arcRotateCamera.upperRadiusLimit = 40;
    arcRotateCamera.lowerBetaLimit = Math.PI / 6;
    arcRotateCamera.upperBetaLimit = Math.PI / 2.1;
    arcRotateCamera.attachControl(canvas, true);
    scene.activeCamera = arcRotateCamera;

    scene.onBeforeRenderObservable.add(() => {
        arcRotateCamera.target.copyFrom(clientBall.mesh.position);
    });

    // ✅ NATURAL SYNC: Clean registration
    clientNetworkManager.registerEntity(clientBall as any);
    serverNetworkManager.registerEntity(serverBall as any);

    // ✅ ENHANCED: Input handler with lag compensation
    const inputHandler = new EnhancedReactiveInputHandler(
        clientInputState, 
        clientBall, 
        serverBall,
        gameWorld
    );

    // ✅ Make canvas focusable for keyboard
    canvas.tabIndex = 0;
    canvas.focus();

    // ✅ ENHANCED: Debugging with lag compensation features
    (window as any).extensionTest = {
        clientBall,
        serverBall,
        inputHandler,
        clientInputState,
        clientNetworkManager,
        serverNetworkManager,
        gameWorld, // ✅ NEW

        // ✅ ENHANCED: Movement testing with lag compensation
        testMovement: (x: number, z: number) => {
            console.log(`🧪 Testing modular entity movement to (${x}, ${z})`);
            clientBall.moveTo(new Vector3(x, 0.5, z), 'test_client_modular');
            serverBall.moveTo(new Vector3(x, 0.5, z), 'test_server_modular');
        },

        // ✅ NEW: Lag compensation testing
        testLagCompensation: (x: number, z: number, lagMs: number = 150) => {
            console.log(`🕒 Testing lag compensation: (${x}, ${z}) with ${lagMs}ms lag`);
            
            gameWorld.processClientInput({
                timestamp: Date.now() - lagMs,
                sequenceId: Date.now(),
                entityId: serverBall.getNetworkId(),
                action: 'moveTo',
                parameters: { target: new Vector3(x, 0.5, z), source: 'test_lag_compensation' },
                clientId: 'test_player'
            });
        },

        // ✅ NEW: Compare immediate vs lag compensated
        testComparison: (x: number, z: number) => {
            console.log('🔄 Testing: Immediate vs Lag Compensated');
            
            console.log('  1. Immediate movement (left side):');
            this.testMovement(x - 3, z);
            
            setTimeout(() => {
                console.log('  2. Lag compensated movement (right side, 200ms lag):');
                this.testLagCompensation(x + 3, z, 200);
            }, 2000);
        },

        // ✅ ENHANCED: Color testing
        testColors: () => {
            console.log('🧪 Testing modular entity color cycling');
            clientBall.cycleColor('test_client_modular');
            serverBall.cycleColor('test_server_modular');
        },

        separateBalls: () => {
            console.log('🧪 Separating modular entities');
            clientBall.moveTo(new Vector3(-5, 0.5, 0), 'test_separate');
            serverBall.moveTo(new Vector3(5, 0.5, 0), 'test_separate');
        },

        showEntityInfo: () => {
            console.log('🔍 Modular Entity Info:', {
                client: clientBall.getExtensionType(),
                server: serverBall.getExtensionType(),
                sameNetworkId: clientBall.getNetworkId() === serverBall.getNetworkId(),
                networkId: clientBall.getNetworkId(),
                clientRender: 'SPHERE (blue family)',
                serverRender: 'CUBE (green family)',
                clientAuthorities: clientBall.getClientAuthProperties(),
                serverAuthorities: serverBall.getServerAuthProperties(),
                stateHistoryEnabled: NetworkReactiveEntity.isStateHistoryEnabled()
            });
        },

        debugSync: () => {
            console.log('🔍 Enhanced Natural Sync Debug:');
            clientNetworkManager.debugNaturalSync();
            serverNetworkManager.debugNaturalSync();
        },

        // ✅ NEW: Lag compensation stats
        getLagStats: () => {
            const stats = gameWorld.getStats();
            console.log('📊 Lag Compensation Stats:', stats);
            return stats;
        },

        // ✅ PING SIMULATION CONTROLS (unchanged)
        setPing: (ms: number) => {
            networkPingMs = ms;
            console.log(`🌐 Network ping simulation set to ${ms}ms`);
        },

        getPing: () => {
            console.log(`🌐 Current network ping: ${networkPingMs}ms`);
            return networkPingMs;
        },

        noPing: () => {
            networkPingMs = 0;
            console.log('🌐 Network ping simulation disabled (0ms)');
        },

        lowPing: () => {
            networkPingMs = 50;
            console.log('🌐 Low ping simulation: 50ms');
        },

        mediumPing: () => {
            networkPingMs = 200;
            console.log('🌐 Medium ping simulation: 200ms');
        },

        highPing: () => {
            networkPingMs = 400;
            console.log('🌐 High ping simulation: 400ms');
        }
    };

    console.log(`
🎾 MODULAR BALL ENTITIES + LAG COMPENSATION READY! ✅

✅ CLEAN MODULAR ARCHITECTURE:
- ✅ BaseBall: Shared reactive game logic (imported from game/entities/Ball/)
- ✅ ClientBall: Client-specific extensions (blue sphere, prediction, rendering)
- ✅ ServerBall: Server-specific extensions (green cube, validation, authority)
- ✅ EntityFactory: Clean entity creation and registration
- ✅ No more inline entity definitions - pure modular approach

✅ LAG COMPENSATION FEATURES:
- ✅ State History: 1 second buffer for server-side rewinding
- ✅ GameWorld: Lag compensation processing with input timestamps
- ✅ Enhanced Input: All ground clicks now use lag compensation by default
- ✅ Fast-Forward: Replay simulation after historical processing

🎮 ENHANCED BEHAVIORS TO TEST:
1. Click on GROUND → Watch lag compensation with 100ms simulated lag
2. Press WASD → Server processes with 80ms lag compensation
3. Click on SHAPES → Both change colors together (synced state)
4. Use extensionTest commands for targeted testing

🧪 ENHANCED CONSOLE COMMANDS:
- extensionTest.testLagCompensation(5, 3, 200)  // Test 200ms lag compensation
- extensionTest.testComparison(5, 3)           // Compare immediate vs lag compensated
- extensionTest.getLagStats()                  // Get lag compensation performance
- extensionTest.showEntityInfo()               // Show modular entity details
- extensionTest.setPing(200)                   // Add network simulation on top

🔍 WHAT TO WATCH FOR:
- Console logs: "⏪ Rewinding world to..." and "⏩ Fast-forwarding..."
- Smooth movement despite simulated lag
- Blue sphere (client) immediate prediction
- Green cube (server) lag compensated authority

🎯 READY FOR PRODUCTION:
- Modular entity architecture ✅
- Lag compensation system ✅  
- State history working ✅
- Network authority patterns ✅
- Build system ready for Phase 2 ✅
    `);
}

// Start the clean modular game with lag compensation
setupCleanModularGame();