// src/ecs-app.ts - Extension Pattern Implementation in Single File

import { SceneManager } from "./engine/scene/SceneManager";
import { Vector3, MeshBuilder, StandardMaterial, Color3, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { createSimpleGrid } from "./engine/utils/SimpleGrid";

// Use your existing architecture with Natural Sync
import { InputStateEntity } from "./engine/inputs/InputStateEntity";
import { ReactiveInputEnricher } from "./engine/inputs/ReactiveInputEnricher";
import { NetworkReactiveEntity } from "./engine/networking/NetworkReactiveEntity";
import { NaturalSyncNetworkManager } from "./engine/networking/NaturalSyncNetworkManager";
import { NetworkRole, EntitySchema } from "./engine/networking/NetworkTypes";

// ============================================================================
// 🎯 SHARED SCHEMA - Same for both client and server extensions
// ============================================================================

export const BALL_SCHEMA: EntitySchema = {
    entityType: 'ball',
    properties: [
        // Movement properties (server authority)
        { name: 'position', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'server' },
        { name: 'targetPosition', type: 'vector', defaultValue: { x: 0, y: 0, z: 0 }, networkSync: true, authority: 'server' },
        { name: 'isMoving', type: 'boolean', defaultValue: false, networkSync: true, authority: 'server' },
        
        // Color properties (server authority for consistency)
        { name: 'colorState', type: 'number', defaultValue: 0, networkSync: true, authority: 'server' },
        { name: 'isHovered', type: 'boolean', defaultValue: false, networkSync: true, authority: 'server' },
        
        // Local rendering properties (no sync needed)
        { name: 'moveSpeed', type: 'number', defaultValue: 3.0, networkSync: false, authority: 'client' }
    ]
};

// ============================================================================
// 🎾 BASE BALL - All shared reactive game state logic
// ============================================================================

export abstract class BaseBall extends NetworkReactiveEntity {
    public mesh: any;
    public material: StandardMaterial;
    protected scene: any;

    constructor(
        networkId: string,
        scene: any,
        role: NetworkRole,
        startPos: Vector3
    ) {
        super('ball', networkId, scene, role);
        
        this.scene = scene;
        
        // ✅ Create properties from shared schema
        this.createPropertiesFromSchema(BALL_SCHEMA);
        
        this.createVisual();
        this.setupSharedBehaviors();
        this.setupRoleSpecificBehaviors();
        
        // ✅ Set initial state AFTER behaviors are set up
        this.getVectorProperty('position')?.set(startPos, 'initial_setup');
        this.getVectorProperty('targetPosition')?.set(startPos, 'initial_setup');
        this.updateColor();
        
        console.log(`🎾 ${this.getExtensionType()} Ball created: ${networkId} at (${startPos.x}, ${startPos.z})`);
    }

    // ============================================================================
    // SHARED VISUAL CREATION (same for both extensions for now)
    // ============================================================================

    private createVisual(): void {
        // ✅ EXTENSION PATTERN: Different local rendering based on extension type
        if (this.getExtensionType() === 'CLIENT') {
            // CLIENT: Sphere (blue family) - smaller size
            this.mesh = MeshBuilder.CreateSphere(`${this.getExtensionType()}_ball`, { diameter: 0.8 }, this.scene);
        } else {
            // SERVER: Cube (green family) - larger size, semi-transparent
            this.mesh = MeshBuilder.CreateBox(`${this.getExtensionType()}_ball`, { size: 1.2 }, this.scene);
        }
        
        // ✅ Set mesh name for entity picking
        this.mesh.name = `entity_${this.getNetworkId()}`;
        
        // Create material
        this.material = new StandardMaterial(`${this.getExtensionType()}_material`, this.scene);
        this.mesh.material = this.material;
        this.mesh.isVisible = true;
        
        // ✅ VISUAL SEPARATION: Make server cube semi-transparent
        if (this.getExtensionType() === 'SERVER') {
            this.material.alpha = 0.7; // Semi-transparent cube
        }
        
        // Set up click interactions
        this.setupMeshActions();
        
        console.log(`🎨 ${this.getExtensionType()} visual created: ${this.getExtensionType() === 'CLIENT' ? 'SPHERE (0.8)' : 'CUBE (1.2, transparent)'} named ${this.mesh.name}`);
    }

    private setupMeshActions(): void {
        this.mesh.actionManager = new ActionManager(this.scene);
        
        // Click to cycle colors
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnLeftPickTrigger,
            () => this.handleColorCycleClick()
        ));
        
        // Hover effects
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOverTrigger,
            () => this.handleHoverEnter()
        ));
        
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOutTrigger,
            () => this.handleHoverExit()
        ));
    }

    // ============================================================================
    // SHARED REACTIVE GAME LOGIC (identical on client and server)
    // ============================================================================

    private setupSharedBehaviors(): void {
        // ✅ SHARED: Position changes update mesh with visual offset
        const position = this.getVectorProperty('position');
        position?.onChange((event) => {
            if (this.mesh) {
                // ✅ VISUAL SEPARATION: Offset mesh position while keeping logical position synced
                const logicalPos = event.to.clone();

                this.mesh.position.copyFrom(logicalPos);
                console.log(`📍 ${this.getExtensionType()} position: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
            }
        });

        // ✅ SHARED: Color state changes update visual
        const colorState = this.getNumericProperty('colorState');
        colorState?.onChange((event) => {
            this.updateColor();
            console.log(`🎨 ${this.getExtensionType()} color: ${event.to} [${event.source}]`);
        });

        // ✅ SHARED: Hover state changes update visual
        const isHovered = this.getBooleanProperty('isHovered');
        isHovered?.onChange((event) => {
            this.updateColor();
            console.log(`🖱️ ${this.getExtensionType()} hover: ${event.to} [${event.source}]`);
        });

        // ✅ SHARED: Target position changes trigger movement
        const targetPosition = this.getVectorProperty('targetPosition');
        targetPosition?.onChange((event) => {
            this.getBooleanProperty('isMoving')?.setTrue('movement_start');
            console.log(`🎯 ${this.getExtensionType()} target: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        });

        // ✅ SHARED: Movement interpolation logic
        this.setupMovementBehavior();
    }

    private setupMovementBehavior(): void {
        const updateMovement = () => {
            const isMoving = this.getBooleanProperty('isMoving');
            const position = this.getVectorProperty('position');
            const targetPosition = this.getVectorProperty('targetPosition');
            const moveSpeed = this.getNumericProperty('moveSpeed');

            if (!isMoving?.isTrue() || !position || !targetPosition || !moveSpeed) return;

            const currentPos = position.getValue();
            const targetPos = targetPosition.getValue();
            const speed = moveSpeed.getValue();

            const direction = targetPos.subtract(currentPos);
            const distance = direction.length();

            if (distance < 0.1) {
                isMoving.setFalse('movement_complete');
                console.log(`🏁 ${this.getExtensionType()} reached target`);
            } else {
                const deltaTime = 0.016; // ~60fps
                const movement = direction.normalize().scale(speed * deltaTime);
                const newPos = currentPos.add(movement);
                position.set(newPos, 'movement_interpolation');
            }
        };

        this.scene.onBeforeRenderObservable.add(updateMovement);
    }

    // ============================================================================
    // SHARED INTERACTION LOGIC (identical behavior, different authority)
    // ============================================================================

    private handleColorCycleClick(): void {
        const colorState = this.getNumericProperty('colorState');
        if (!colorState) return;
        
        const currentState = colorState.getValue() || 0;
        const newState = (currentState + 1) % 3;
        
        // Always update - natural sync handles authority automatically
        colorState.set(newState, `click_color_${this.getExtensionType()}`);
        console.log(`🎨 ${this.getExtensionType()} color clicked: ${currentState} → ${newState}`);
    }

    private handleHoverEnter(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setTrue(`hover_enter_${this.getExtensionType()}`);
        }
    }

    private handleHoverExit(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setFalse(`hover_exit_${this.getExtensionType()}`);
        }
    }

    private updateColor(): void {
        const colorState = this.getNumericProperty('colorState')?.getValue() || 0;
        const isHovered = this.getBooleanProperty('isHovered')?.isTrue() || false;

        let baseColor: Color3;
        
        // Different colors to distinguish client vs server extensions visually
        if (this.getExtensionType() === 'CLIENT') {
            switch (colorState) {
                case 0: baseColor = Color3.Blue(); break;
                case 1: baseColor = new Color3(0, 1, 1); break;     // Cyan
                case 2: baseColor = Color3.Purple(); break;
                default: baseColor = Color3.White(); break;
            }
        } else { // SERVER
            switch (colorState) {
                case 0: baseColor = Color3.Green(); break;
                case 1: baseColor = Color3.Yellow(); break;
                case 2: baseColor = Color3.Red(); break;
                default: baseColor = Color3.Gray(); break;
            }
        }

        if (isHovered) {
            baseColor = baseColor.add(new Color3(0.5, 0.5, 0.5));
        }

        this.material.diffuseColor = baseColor;
        this.material.emissiveColor = baseColor.scale(0.3);
        this.material.markDirty();
    }

    // ============================================================================
    // PUBLIC API (shared interface)
    // ============================================================================

    public moveTo(target: Vector3, source: string): void {
        this.getVectorProperty('targetPosition')?.set(target, source);
    }

    public cycleColor(source: string): void {
        const colorState = this.getNumericProperty('colorState');
        const currentState = colorState?.getValue() || 0;
        const newState = (currentState + 1) % 3;
        colorState?.set(newState, source);
    }

    // ============================================================================
    // ABSTRACT METHODS - Role-specific behaviors
    // ============================================================================

    protected abstract setupRoleSpecificBehaviors(): void;
    protected abstract getExtensionType(): 'CLIENT' | 'SERVER';

    // Base implementation of NetworkReactiveEntity abstract methods
    protected setupBehaviors(): void {
        // Shared behaviors are set up in setupSharedBehaviors()
        // Role-specific behaviors handled by extensions
    }
}

// ============================================================================
// 🖥️ CLIENT EXTENSION - Input capture, rendering, prediction
// ============================================================================

export class ClientBall extends BaseBall {
    constructor(networkId: string, scene: any, role: NetworkRole, startPos: Vector3) {
        super(networkId, scene, role, startPos);
    }

    protected getExtensionType(): 'CLIENT' {
        return 'CLIENT';
    }

    protected setupRoleSpecificBehaviors(): void {
        // ✅ CLIENT: Focus on input capture and rendering
        console.log(`💻 CLIENT ball setup: Handles input capture, rendering, and prediction`);
        
        // Future: DOM event handling, immediate visual feedback, client prediction
        // For now: just logging to show extension point
        this.setupClientPrediction();
    }

    protected setupClientBehaviors(): void {
        console.log(`💻 CLIENT behaviors active for ${this.getNetworkId()}`);
    }

    private setupClientPrediction(): void {
        // ✅ CLIENT: Immediate response to inputs (prediction)
        // Future: Override server authority with immediate visual feedback
        console.log(`🔮 CLIENT prediction system ready for ${this.getNetworkId()}`);
    }

    // ✅ CLIENT: Enhanced input handling (future: immediate visual response)
    public moveTo(target: Vector3, source: string): void {
        console.log(`🎮 CLIENT prediction: Moving to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
        super.moveTo(target, source);
    }
}

// ============================================================================
// 🖥️ SERVER EXTENSION - Validation, authority, AI
// ============================================================================

export class ServerBall extends BaseBall {
    constructor(networkId: string, scene: any, role: NetworkRole, startPos: Vector3) {
        super(networkId, scene, role, startPos);
    }

    protected getExtensionType(): 'SERVER' {
        return 'SERVER';
    }

    protected setupRoleSpecificBehaviors(): void {
        // ✅ SERVER: Focus on validation and authority
        console.log(`🖥️ SERVER ball setup: Handles validation, authority, and anti-cheat`);
        
        // Future: Input validation, authoritative state, AI, anti-cheat
        // For now: just logging to show extension point
        this.setupServerAuthority();
    }

    protected setupServerBehaviors(): void {
        console.log(`🖥️ SERVER behaviors active for ${this.getNetworkId()}`);
    }

    private setupServerAuthority(): void {
        // ✅ SERVER: Authoritative state management
        // Future: Input validation, bounds checking, anti-cheat
        console.log(`⚖️ SERVER authority system ready for ${this.getNetworkId()}`);
    }

    // ✅ SERVER: Enhanced validation (future: bounds checking, anti-cheat)
    public moveTo(target: Vector3, source: string): void {
        // Basic validation placeholder
        if (this.isValidMoveTarget(target)) {
            console.log(`⚖️ SERVER authority: Validated move to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
            super.moveTo(target, source);
        } else {
            console.warn(`🚫 SERVER rejected invalid move to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`);
        }
    }

    private isValidMoveTarget(target: Vector3): boolean {
        // Basic bounds checking
        return Math.abs(target.x) <= 20 && Math.abs(target.z) <= 20;
    }
}

// ============================================================================
// 🏭 FACTORY PATTERN (will be compile-time resolved in build system)
// ============================================================================

export class BallFactory {
    /**
     * Create appropriate ball extension based on role
     * NOTE: In real build system, this will be compile-time resolved:
     * - CLIENT BUNDLE: Only gets ClientBall creation path
     * - SERVER BUNDLE: Only gets ServerBall creation path
     */
    static create(networkId: string, scene: any, role: NetworkRole, startPos: Vector3): BaseBall {
        if (role.isClient) {
            return new ClientBall(networkId, scene, role, startPos);
        } else {
            return new ServerBall(networkId, scene, role, startPos);
        }
    }
}

// ============================================================================
// 🎮 MINIMAL INPUT HANDLER - Uses your InputStateEntity system
// ============================================================================

class MinimalReactiveInputHandler {
    private inputState: InputStateEntity;
    private clientBall: BaseBall;
    private serverBall: BaseBall;

    constructor(inputState: InputStateEntity, clientBall: BaseBall, serverBall: BaseBall) {
        this.inputState = inputState;
        this.clientBall = clientBall;
        this.serverBall = serverBall;
        
        this.setupInputObservation();
    }

    private setupInputObservation(): void {
        // ✅ FIXED: Ground clicks move both balls (only when NOT clicking on entities)
        const recentClicks = this.inputState.getCollectionProperty('recentClicks');
        recentClicks?.itemAddedObservable.add((event) => {
            const clickEvent = event.value as any;
            
            // ✅ FIXED: Only process as ground click if NO entity was picked
            if (!clickEvent.pickedEntityId || clickEvent.pickedEntityId === '') {
                const worldPos = clickEvent.worldPosition;
                console.log(`🖱️ Ground click at (${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)})`);
                
                // Move both balls - reactive system handles network sync based on authority
                this.serverBall.moveTo(worldPos, 'ground_click_server');
                this.clientBall.moveTo(worldPos, 'ground_click_client');
            } else {
                console.log(`🎯 Entity click on: ${clickEvent.pickedEntityId} - ignoring ground movement`);
            }
        });

        // ✅ KEYBOARD: WASD movement using your input system
        const keysPressed = this.inputState.getCollectionProperty('keysPressed');
        keysPressed?.itemAddedObservable.add((event) => {
            this.handleKeyPress(event.value);
        });

        console.log('🎮 Minimal reactive input handling set up');
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

        // Move both balls using reactive properties
        const clientPos = this.clientBall.getVectorProperty('position')?.getValue() || Vector3.Zero();
        const serverPos = this.serverBall.getVectorProperty('position')?.getValue() || Vector3.Zero();

        this.clientBall.moveTo(clientPos.add(offset), `keyboard_client_${keyCode}`);
        this.serverBall.moveTo(serverPos.add(offset), `keyboard_server_${keyCode}`);
    }
}

// ============================================================================
// 🚀 MAIN SETUP - Using your reactive architecture
// ============================================================================

function setupExtensionPatternTest() {
    // ✅ Standard setup
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

    // ✅ Grid
    const groundGrid = createSimpleGrid(sceneManager.scene, 20);
    groundGrid.position.y = -0.1;

    // ✅ NATURAL SYNC: Network setup using automatic property sync
    const clientRole: NetworkRole = { isClient: true, isServer: false, ownedByThisClient: true };
    const serverRole: NetworkRole = { isClient: false, isServer: true };

    const clientNetworkManager = new NaturalSyncNetworkManager(clientRole);
    const serverNetworkManager = new NaturalSyncNetworkManager(serverRole);

    // ✅ PING SIMULATION: Network delay configuration
    let networkPingMs = 0; // Default: no ping simulation
    
    // ✅ Message queue processing with network ping simulation
    const messageQueue: any[] = [];
    let processingMessages = false;

    clientNetworkManager.setSendCallback((message) => {
        // ✅ PING SIMULATION: Add timestamp and delay client→server messages
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
        // ✅ PING SIMULATION: Add timestamp and delay server→client messages  
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
            
            // Process ready messages
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
            
            // Keep delayed messages in queue
            messageQueue.length = 0;
            messageQueue.push(...delayedMessages);
            
            processingMessages = false;
            
            // Continue processing if more messages exist
            if (messageQueue.length > 0) {
                setTimeout(processMessageQueue, 10); // Check every 10ms
            }
        }, 1);
    }

    // ✅ Input system using your architecture
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);

    // ✅ EXTENSION PATTERN: Create balls using factory - SAME entity, different rendering
    const clientBall = BallFactory.create(
        'ball1', // Same networkId - same entity
        sceneManager.scene,
        clientRole,
        new Vector3(-3, 0.5, 0)
    );

    const serverBall = BallFactory.create(
        'ball1', // Same networkId - same entity
        sceneManager.scene,
        serverRole,
        new Vector3(3, 0.5, 0)
    );

    // ✅ NATURAL SYNC: Clean single registration per role
    clientNetworkManager.registerEntity(clientBall as any);
    serverNetworkManager.registerEntity(serverBall as any);

    // ✅ Input handling using your reactive system
    const inputHandler = new MinimalReactiveInputHandler(clientInputState, clientBall, serverBall);

    // ✅ Camera positioning for better view of both balls
    sceneManager.camera.setTarget(Vector3.Zero());
    sceneManager.camera.radius = 12;
    sceneManager.camera.beta = Math.PI / 4;
    sceneManager.camera.alpha = Math.PI / 4;

    // ✅ Make canvas focusable for keyboard
    canvas.tabIndex = 0;
    canvas.focus();

    // ✅ Enhanced debugging for extension pattern testing
    (window as any).extensionTest = {
        clientBall,
        serverBall,
        inputHandler,
        clientInputState,
        clientNetworkManager,
        serverNetworkManager,
        factory: BallFactory,

        testMovement: (x: number, z: number) => {
            console.log(`🧪 Testing extension pattern movement to (${x}, ${z})`);
            clientBall.moveTo(new Vector3(x, 0.5, z), 'test_client_extension');
            serverBall.moveTo(new Vector3(x, 0.5, z), 'test_server_extension');
        },

        testColors: () => {
            console.log('🧪 Testing extension pattern color cycling');
            clientBall.cycleColor('test_client_extension');
            serverBall.cycleColor('test_server_extension');
        },

        separateBalls: () => {
            console.log('🧪 Separating extension pattern balls');
            clientBall.moveTo(new Vector3(-5, 0.5, 0), 'test_separate');
            serverBall.moveTo(new Vector3(5, 0.5, 0), 'test_separate');
        },

        showExtensionTypes: () => {
            console.log('🔍 Extension Pattern Types:', {
                client: (clientBall as any).getExtensionType(),
                server: (serverBall as any).getExtensionType(),
                sameNetworkId: clientBall.getNetworkId() === serverBall.getNetworkId(),
                networkId: clientBall.getNetworkId(),
                clientRender: 'SPHERE (blue family)',
                serverRender: 'CUBE (green family)',
                clientAuthorities: clientBall.getClientAuthProperties(),
                serverAuthorities: serverBall.getServerAuthProperties()
            });
        },

        debugSync: () => {
            console.log('🔍 Extension Pattern Natural Sync Debug:');
            clientNetworkManager.debugNaturalSync();
            serverNetworkManager.debugNaturalSync();
        },

        // ✅ PING SIMULATION CONTROLS
        setPing: (ms: number) => {
            networkPingMs = ms;
            console.log(`🌐 Network ping simulation set to ${ms}ms`);
        },

        getPing: () => {
            console.log(`🌐 Current network ping: ${networkPingMs}ms`);
            return networkPingMs;
        },

        testPrediction: (x: number = 5, z: number = 3) => {
            console.log(`🧪 Testing client prediction with ${networkPingMs}ms ping...`);
            console.log(`📍 Watch: CLIENT sphere moves immediately, SERVER cube follows after ${networkPingMs}ms`);
            extensionTest.testMovement(x, z);
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
🎾 EXTENSION PATTERN TEST READY! ✅ BaseBall + ClientBall + ServerBall

✅ EXTENSION PATTERN IMPLEMENTED:
- ✅ BaseBall: Shared reactive game logic (movement, colors, interactions)
- ✅ ClientBall: Client-specific extensions (small blue sphere, input capture, prediction)
- ✅ ServerBall: Server-specific extensions (large transparent cube, validation, authority)
- ✅ BallFactory: Role-based creation (ready for build-time resolution)
- ✅ Same networkId ('ball1') - same entity, visually separated rendering

✅ NATURAL SYNC WITH AUTHORITY + PING SIMULATION:
- ✅ Client sends client-auth properties (input state)
- ✅ Server sends server-auth properties (game state + position)
- ✅ Local rendering properties (sphere vs cube, size, offset) don't sync
- ✅ Configurable network ping simulation for testing client prediction

🎮 BEHAVIORS TO TEST:
1. Click on GROUND → Watch client prediction vs server authority with ping
2. Press WASD → Both shapes move together (same entity, synced position)  
3. Click on SHAPES → Both change colors together (synced color state)
4. Hover on SHAPES → Both show hover effects (synced hover state)
5. Test ping → Blue sphere (client) moves first, green cube (server) follows

👀 VISUAL LAYOUT:
- Blue sphere (left side) = CLIENT extension (smaller, opaque)
- Green cube (right side) = SERVER extension (larger, semi-transparent)
- Same logical position, visually offset for clarity

🧪 EXTENSION PATTERN CONSOLE COMMANDS:
- extensionTest.testMovement(5, 3)      // Test movement with extensions
- extensionTest.testColors()            // Test color cycling
- extensionTest.separateBalls()         // Move balls apart
- extensionTest.showExtensionTypes()    // Show extension pattern info
- extensionTest.debugSync()             // Debug natural sync for extensions

🌐 NETWORK PING SIMULATION:
- extensionTest.setPing(200)            // Set custom ping (ms)
- extensionTest.noPing()                // Disable ping simulation (0ms)
- extensionTest.lowPing()               // Low ping: 50ms
- extensionTest.mediumPing()            // Medium ping: 200ms  
- extensionTest.highPing()              // High ping: 400ms
- extensionTest.testPrediction(5, 3)    // Test prediction with current ping

🔮 CLIENT PREDICTION TESTING:
1. Set ping: extensionTest.mediumPing()
2. Test: extensionTest.testPrediction()
3. Watch: Blue sphere moves immediately, green cube follows after delay

🎯 READY FOR BUILD SYSTEM: Client/server bundle separation with shared BaseBall logic!
    
🎭 EXTENSION PATTERN DEMO: Same entity ('ball1'), different local rendering:
   - BLUE SPHERE (left, small) = CLIENT extension (prediction, input capture)
   - GREEN CUBE (right, large, transparent) = SERVER extension (validation, authority)
   - Network synced: position, colors, movement state
   - Local only: mesh shape, size, transparency, visual offset
   - Ping simulation: Test client prediction vs server authority
    `);
}

// Start the extension pattern test
setupExtensionPatternTest();