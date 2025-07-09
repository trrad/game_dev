// src/minimal-reactive-test.ts - Test your reactive property system with minimal behaviors
// Uses NetworkReactiveEntity, InputStateEntity, and property schemas - just simplified

import { SceneManager } from "./engine/scene/SceneManager";
import { Vector3, MeshBuilder, StandardMaterial, Color3, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { createSimpleGrid } from "./engine/utils/SimpleGrid";

// Use your existing architecture
import { InputStateEntity } from "./engine/inputs/InputStateEntity";
import { ReactiveInputEnricher } from "./engine/inputs/ReactiveInputEnricher";
import { NetworkReactiveEntity } from "./engine/networking/NetworkReactiveEntity";
import { SimpleNetworkManager } from "./engine/networking/SimpleNetworkManager";
import { NetworkRole, EntitySchema } from "./engine/networking/NetworkTypes";

// ============================================================================
// 🎯 MINIMAL SCHEMA - Just the properties we need for 3 behaviors
// ============================================================================

const MINIMAL_BALL_SCHEMA: EntitySchema = {
    entityType: 'minimal_ball',
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
// 🎾 MINIMAL BALL - Uses your NetworkReactiveEntity system
// ============================================================================

class MinimalReactiveBall extends NetworkReactiveEntity {
    public mesh: any;
    public material: StandardMaterial;
    private ballType: string;
    private scene: any;

    constructor(
        networkId: string,
        scene: any,
        role: NetworkRole,
        startPos: Vector3,
        ballType: 'CLIENT' | 'SERVER'
    ) {
        super('minimal_ball', networkId, scene, role);
        
        this.scene = scene;
        this.ballType = ballType;
        
        // ✅ Create properties from schema using your system
        this.createPropertiesFromSchema(MINIMAL_BALL_SCHEMA);
        
        // ✅ Set initial position
        this.getVectorProperty('position')?.set(startPos, 'initial_setup');
        this.getVectorProperty('targetPosition')?.set(startPos, 'initial_setup');
        
        this.createVisual();
        this.setupBehaviors();
        this.setupRoleBehaviors();
        
        console.log(`🎾 ${ballType} MinimalReactiveBall created using NetworkReactiveEntity`);
    }

    private createVisual(): void {
        // Create sphere mesh
        this.mesh = MeshBuilder.CreateSphere(`${this.ballType}_ball`, { diameter: 1 }, this.scene);
        
        // Create material
        this.material = new StandardMaterial(`${this.ballType}_material`, this.scene);
        this.mesh.material = this.material;
        
        // ✅ Set up Actions for click interactions using your input system
        this.setupMeshActions();
        
        console.log(`🎨 ${this.ballType} ball visual created`);
    }

    private setupMeshActions(): void {
        this.mesh.actionManager = new ActionManager(this.scene);
        
        // ✅ BEHAVIOR 1: Click to cycle colors
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnLeftPickTrigger,
            () => {
                if (this.getRole().isServer) {
                    // Server authority: cycle color state
                    const colorState = this.getNumericProperty('colorState');
                    const currentState = colorState?.getValue() || 0;
                    const newState = (currentState + 1) % 3;
                    colorState?.set(newState, 'click_color_cycle');
                    
                    console.log(`🎨 ${this.ballType} ball clicked - server set color state: ${newState}`);
                }
            }
        ));
        
        // ✅ BEHAVIOR 2: Hover effects
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOverTrigger,
            () => {
                if (this.getRole().isServer) {
                    this.getBooleanProperty('isHovered')?.setTrue('hover_enter');
                    console.log(`🖱️ ${this.ballType} ball hovered`);
                }
            }
        ));
        
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOutTrigger,
            () => {
                if (this.getRole().isServer) {
                    this.getBooleanProperty('isHovered')?.setFalse('hover_exit');
                    console.log(`🖱️ ${this.ballType} ball unhovered`);
                }
            }
        ));
    }

    protected setupBehaviors(): void {
        // ✅ REACTIVE: Position changes update mesh
        const position = this.getVectorProperty('position');
        position?.onChange((event) => {
            if (this.mesh) {
                this.mesh.position.copyFrom(event.to);
                console.log(`📍 ${this.ballType} ball position updated: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
            }
        });

        // ✅ REACTIVE: Color state changes update visual
        const colorState = this.getNumericProperty('colorState');
        colorState?.onChange((event) => {
            this.updateColor();
            console.log(`🎨 ${this.ballType} ball color state: ${event.to} [${event.source}]`);
        });

        // ✅ REACTIVE: Hover state changes update visual
        const isHovered = this.getBooleanProperty('isHovered');
        isHovered?.onChange((event) => {
            this.updateColor();
            console.log(`🖱️ ${this.ballType} ball hover: ${event.to} [${event.source}]`);
        });

        // ✅ REACTIVE: Target position changes trigger movement
        const targetPosition = this.getVectorProperty('targetPosition');
        targetPosition?.onChange((event) => {
            this.getBooleanProperty('isMoving')?.setTrue('movement_start');
            console.log(`🎯 ${this.ballType} ball target: (${event.to.x.toFixed(1)}, ${event.to.z.toFixed(1)}) [${event.source}]`);
        });

        // ✅ REACTIVE: Movement updates
        this.setupMovementBehavior();
    }

    private setupMovementBehavior(): void {
        // Simple movement interpolation using your reactive properties
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
                // Reached target
                isMoving.setFalse('movement_complete');
                console.log(`🏁 ${this.ballType} ball reached target`);
            } else {
                // Move towards target
                const deltaTime = 0.016; // ~60fps
                const movement = direction.normalize().scale(speed * deltaTime);
                const newPos = currentPos.add(movement);
                position.set(newPos, 'movement_interpolation');
            }
        };

        // Update movement every frame
        this.scene.onBeforeRenderObservable.add(updateMovement);
    }

    private updateColor(): void {
        const colorState = this.getNumericProperty('colorState')?.getValue() || 0;
        const isHovered = this.getBooleanProperty('isHovered')?.isTrue() || false;

        let baseColor: Color3;
        switch (colorState) {
            case 0: baseColor = this.ballType === 'CLIENT' ? Color3.Blue() : Color3.Green(); break;
            case 1: baseColor = Color3.Yellow(); break;
            case 2: baseColor = Color3.Red(); break;
            default: baseColor = Color3.White(); break;
        }

        // Brighten if hovered
        if (isHovered) {
            baseColor = baseColor.add(new Color3(0.3, 0.3, 0.3));
        }

        this.material.diffuseColor = baseColor;
        this.material.emissiveColor = baseColor.scale(0.2);
    }

    protected setupClientBehaviors(): void {
        console.log(`💻 ${this.ballType} client behaviors set up`);
    }

    protected setupServerBehaviors(): void {
        console.log(`🖥️ ${this.ballType} server behaviors set up`);
    }

    // ✅ PUBLIC API: Move ball using reactive properties
    public moveTo(target: Vector3, source: string): void {
        if (this.getRole().isServer) {
            this.getVectorProperty('targetPosition')?.set(target, source);
        }
    }

    // ✅ PUBLIC API: Cycle color using reactive properties
    public cycleColor(source: string): void {
        if (this.getRole().isServer) {
            const colorState = this.getNumericProperty('colorState');
            const currentState = colorState?.getValue() || 0;
            const newState = (currentState + 1) % 3;
            colorState?.set(newState, source);
        }
    }
}

// ============================================================================
// 🎮 MINIMAL INPUT HANDLER - Uses your InputStateEntity system
// ============================================================================

class MinimalReactiveInputHandler {
    private inputState: InputStateEntity;
    private clientBall: MinimalReactiveBall;
    private serverBall: MinimalReactiveBall;

    constructor(inputState: InputStateEntity, clientBall: MinimalReactiveBall, serverBall: MinimalReactiveBall) {
        this.inputState = inputState;
        this.clientBall = clientBall;
        this.serverBall = serverBall;
        
        this.setupInputObservation();
    }

    private setupInputObservation(): void {
        // ✅ BEHAVIOR 3: Ground clicks move both balls
        const recentClicks = this.inputState.getCollectionProperty('recentClicks');
        recentClicks?.itemAddedObservable.add((event) => {
            const clickEvent = event.value as any;
            
            // Only process clicks without picked entity (ground clicks)
            if (!clickEvent.pickedEntityId) {
                const worldPos = clickEvent.worldPosition;
                console.log(`🖱️ Ground click at (${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)})`);
                
                // Move server ball (authority)
                this.serverBall.moveTo(worldPos, 'ground_click_server');
                
                // Move client ball (prediction) - will be overridden by server
                this.clientBall.moveTo(worldPos, 'ground_click_prediction');
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

        this.clientBall.moveTo(clientPos.add(offset), 'keyboard_prediction');
        this.serverBall.moveTo(serverPos.add(offset), 'keyboard_server');
    }
}

// ============================================================================
// 🚀 MAIN SETUP - Using your reactive architecture
// ============================================================================

function setupMinimalReactiveTest() {
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

    // ✅ Network setup using your system
    const clientRole: NetworkRole = { isClient: true, isServer: false, ownedByThisClient: true };
    const serverRole: NetworkRole = { isClient: false, isServer: true };

    const clientNetworkManager = new SimpleNetworkManager(clientRole);
    const serverNetworkManager = new SimpleNetworkManager(serverRole);

    // ✅ FIXED: Simple message queue without bloat
    const messageQueue: any[] = [];
    let processingMessages = false;

    clientNetworkManager.setSendCallback((message) => {
        messageQueue.push({ to: 'server', message });
        processMessageQueue();
    });

    serverNetworkManager.setSendCallback((message) => {
        messageQueue.push({ to: 'client', message });
        processMessageQueue();
    });

    function processMessageQueue() {
        if (processingMessages) return;
        processingMessages = true;
        
        setTimeout(() => {
            while (messageQueue.length > 0) {
                const { to, message } = messageQueue.shift();
                
                if (to === 'server') {
                    serverNetworkManager.handleMessage(message);
                } else {
                    clientNetworkManager.handleMessage(message);
                }
            }
            processingMessages = false;
        }, 16);
    }

    // ✅ Input system using your architecture
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);

    // ✅ Create balls using your NetworkReactiveEntity system
    const clientBall = new MinimalReactiveBall(
        'ball1',
        sceneManager.scene,
        clientRole,
        new Vector3(-3, 0, 0),
        'CLIENT'
    );

    const serverBall = new MinimalReactiveBall(
        'ball1',
        sceneManager.scene,
        serverRole,
        new Vector3(3, 0, 0),
        'SERVER'
    );

    // ✅ Register with network managers
    clientNetworkManager.registerEntity(clientBall);
    serverNetworkManager.registerEntity(serverBall);

    // ✅ Input handling using your reactive system
    const inputHandler = new MinimalReactiveInputHandler(clientInputState, clientBall, serverBall);

    // ✅ Camera
    sceneManager.camera.setTarget(Vector3.Zero());
    sceneManager.camera.radius = 15;
    sceneManager.camera.beta = Math.PI / 3;

    // ✅ Make canvas focusable for keyboard
    canvas.tabIndex = 0;
    canvas.focus();

    // ✅ Global debugging
    (window as any).minimalReactiveTest = {
        clientBall,
        serverBall,
        inputHandler,
        clientInputState,
        clientNetworkManager,
        serverNetworkManager,

        testClick: (x: number, z: number) => {
            console.log(`🧪 Testing movement to (${x}, ${z})`);
            clientBall.moveTo(new Vector3(x, 0, z), 'test_client');
            serverBall.moveTo(new Vector3(x, 0, z), 'test_server');
        },

        testColors: () => {
            console.log('🧪 Testing color cycling');
            clientBall.cycleColor('test_client');
            serverBall.cycleColor('test_server');
        },

        checkNetwork: () => {
            console.log('Network stats:', {
                client: clientNetworkManager.getAuthorityStats(),
                server: serverNetworkManager.getAuthorityStats()
            });
        }
    };

    console.log(`
🎾 MINIMAL REACTIVE PROPERTY TEST READY!

✅ USING YOUR ARCHITECTURE:
- NetworkReactiveEntity with schema-driven properties
- InputStateEntity with enriched input
- SimpleNetworkManager with authority patterns
- ReactiveInputEnricher for 3D picking

🎮 BEHAVIORS TO TEST:
1. Click on GROUND → Both balls move (reactive position properties)
2. Press WASD → Both balls move by direction
3. Click on BALLS → Cycle colors (reactive color properties)
4. Hover on BALLS → Brighter colors (reactive hover properties)

🧪 CONSOLE COMMANDS:
- minimalReactiveTest.testClick(5, 3)    // Test movement
- minimalReactiveTest.testColors()       // Test color cycling
- minimalReactiveTest.checkNetwork()     // Check network sync

This tests your reactive property + networking system with minimal complexity!
    `);
}

// Start the test
setupMinimalReactiveTest();