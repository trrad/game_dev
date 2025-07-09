// src/ecs-app.ts - Fixed: Server ball visibility + color changes working

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
// 🎾 MINIMAL BALL - Fixed visibility and color issues
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
        
        this.createVisual();
        this.setupBehaviors();
        this.setupRoleBehaviors();
        
        // ✅ FIXED: Set initial state AFTER behaviors are set up so color updates trigger
        this.getVectorProperty('position')?.set(startPos, 'initial_setup');
        this.getVectorProperty('targetPosition')?.set(startPos, 'initial_setup');
        
        // ✅ FIXED: Force initial color update
        this.updateColor();
        
        console.log(`🎾 ${ballType} initial state: pos(${startPos.x}, ${startPos.z}), color: ${this.getNumericProperty('colorState')?.getValue()}`);
        
        console.log(`🎾 ${ballType} MinimalReactiveBall created using NetworkReactiveEntity`);
    }

    private createVisual(): void {
        // Create sphere mesh
        this.mesh = MeshBuilder.CreateSphere(`${this.ballType}_ball`, { diameter: 1 }, this.scene);
        
        // ✅ FIXED: Set mesh name for entity picking (matches expected pattern)
        this.mesh.name = `entity_${this.getNetworkId()}`;
        
        // Create material
        this.material = new StandardMaterial(`${this.ballType}_material`, this.scene);
        this.mesh.material = this.material;
        
        // ✅ FIXED: Always make mesh visible (both client and server balls should be visible for demo)
        this.mesh.isVisible = true;
        
        // ✅ Set up Actions for click interactions
        this.setupMeshActions();
        
        console.log(`🎨 ${this.ballType} ball visual created and visible with entity name: ${this.mesh.name}`);
    }

    private setupMeshActions(): void {
        this.mesh.actionManager = new ActionManager(this.scene);
        
        // ✅ FIXED: Click handling for both client and server balls
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnLeftPickTrigger,
            () => {
                // ✅ BEHAVIOR 1: Click to cycle colors with proper authority handling
                this.handleColorCycleClick();
                
                console.log(`🎨 ${this.ballType} ball clicked - processing color cycle`);
            }
        ));
        
        // ✅ FIXED: Hover effects with proper authority handling  
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOverTrigger,
            () => {
                this.handleHoverEnter();
                console.log(`🖱️ ${this.ballType} ball hovered`);
            }
        ));
        
        this.mesh.actionManager.registerAction(new ExecuteCodeAction(
            ActionManager.OnPointerOutTrigger,
            () => {
                this.handleHoverExit();
                console.log(`🖱️ ${this.ballType} ball unhovered`);
            }
        ));
    }

    // ✅ FIXED: Proper color cycle handling with authority
    private handleColorCycleClick(): void {
        const colorState = this.getNumericProperty('colorState');
        if (!colorState) return;
        
        const currentState = colorState.getValue() || 0;
        const newState = (currentState + 1) % 3;
        
        // Always update the property - reactive system handles network sync based on authority
        colorState.set(newState, `click_color_cycle_${this.ballType}`);
        
        console.log(`🎨 ${this.ballType} ball color state changed: ${currentState} → ${newState}`);
    }

    // ✅ FIXED: Proper hover handling with authority
    private handleHoverEnter(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setTrue(`hover_enter_${this.ballType}`);
        }
    }

    private handleHoverExit(): void {
        const isHovered = this.getBooleanProperty('isHovered');
        if (isHovered) {
            isHovered.setFalse(`hover_exit_${this.ballType}`);
        }
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

        // ✅ FIXED: Color state changes update visual immediately
        const colorState = this.getNumericProperty('colorState');
        colorState?.onChange((event) => {
            this.updateColor();
            console.log(`🎨 ${this.ballType} ball color state: ${event.to} [${event.source}]`);
        });

        // ✅ FIXED: Hover state changes update visual immediately
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

    // ✅ FIXED: More distinct colors and proper hover effects
    private updateColor(): void {
        const colorState = this.getNumericProperty('colorState')?.getValue() || 0;
        const isHovered = this.getBooleanProperty('isHovered')?.isTrue() || false;

        let baseColor: Color3;
        
        // Different base colors for client vs server balls to make them easily distinguishable
        if (this.ballType === 'CLIENT') {
            switch (colorState) {
                case 0: baseColor = Color3.Blue(); break;     // Blue
                case 1: baseColor = Color3.Cyan(); break;     // Cyan  
                case 2: baseColor = Color3.Purple(); break;   // Purple
                default: baseColor = Color3.White(); break;
            }
        } else { // SERVER
            switch (colorState) {
                case 0: baseColor = Color3.Green(); break;    // Green
                case 1: baseColor = Color3.Yellow(); break;   // Yellow
                case 2: baseColor = Color3.Red(); break;      // Red
                default: baseColor = Color3.Gray(); break;
            }
        }

        // ✅ FIXED: More noticeable hover effect
        if (isHovered) {
            baseColor = baseColor.add(new Color3(0.5, 0.5, 0.5)); // Brighter when hovered
        }

        this.material.diffuseColor = baseColor;
        this.material.emissiveColor = baseColor.scale(0.3); // More emissive for better visibility
        
        // ✅ FIXED: Force material update
        this.material.markDirty();
    }

    protected setupClientBehaviors(): void {
        console.log(`💻 ${this.ballType} client behaviors set up`);
    }

    protected setupServerBehaviors(): void {
        console.log(`🖥️ ${this.ballType} server behaviors set up`);
    }

    // ✅ PUBLIC API: Move ball using reactive properties
    public moveTo(target: Vector3, source: string): void {
        // Always allow movement - reactive system handles authority through network sync
        this.getVectorProperty('targetPosition')?.set(target, source);
    }

    // ✅ PUBLIC API: Cycle color using reactive properties
    public cycleColor(source: string): void {
        // Always allow color changes - reactive system handles authority through network sync
        const colorState = this.getNumericProperty('colorState');
        const currentState = colorState?.getValue() || 0;
        const newState = (currentState + 1) % 3;
        colorState?.set(newState, source);
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

    // ✅ FIXED: More reliable message queue processing
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
        if (processingMessages || messageQueue.length === 0) return;
        processingMessages = true;
        
        // Process immediately but yield to prevent blocking
        setTimeout(() => {
            const batch = messageQueue.splice(0, 5); // Process up to 5 messages per frame
            
            batch.forEach(({ to, message }) => {
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
            
            processingMessages = false;
            
            // Continue processing if more messages exist
            if (messageQueue.length > 0) {
                processMessageQueue();
            }
        }, 1);
    }

    // ✅ Input system using your architecture
    const clientInputState = new InputStateEntity('client_input', sceneManager.scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(sceneManager.scene, clientInputState);

    // ✅ FIXED: Create balls with different positions and ensure they're both visible
    const clientBall = new MinimalReactiveBall(
        'ball1',
        sceneManager.scene,
        clientRole,
        new Vector3(-3, 0.5, 0), // Slightly elevated for visibility
        'CLIENT'
    );

    const serverBall = new MinimalReactiveBall(
        'ball2', // ✅ FIXED: Different network ID for server ball
        sceneManager.scene,
        serverRole,
        new Vector3(3, 0.5, 0), // Slightly elevated for visibility
        'SERVER'
    );

    // ✅ FIXED: Register both entities with both managers for proper cross-sync
    clientNetworkManager.registerEntity(clientBall);
    clientNetworkManager.registerEntity(serverBall); // Client needs to receive server ball updates
    serverNetworkManager.registerEntity(clientBall); // Server needs to receive client ball updates  
    serverNetworkManager.registerEntity(serverBall);

    // ✅ Input handling using your reactive system
    const inputHandler = new MinimalReactiveInputHandler(clientInputState, clientBall, serverBall);

    // ✅ Camera positioning for better view of both balls
    sceneManager.camera.setTarget(Vector3.Zero());
    sceneManager.camera.radius = 12;
    sceneManager.camera.beta = Math.PI / 4; // Better angle
    sceneManager.camera.alpha = Math.PI / 4; // Angled view

    // ✅ Make canvas focusable for keyboard
    canvas.tabIndex = 0;
    canvas.focus();

    // ✅ ENHANCED: Global debugging with more useful test functions
    (window as any).minimalReactiveTest = {
        clientBall,
        serverBall,
        inputHandler,
        clientInputState,
        clientNetworkManager,
        serverNetworkManager,

        testClick: (x: number, z: number) => {
            console.log(`🧪 Testing movement to (${x}, ${z})`);
            clientBall.moveTo(new Vector3(x, 0.5, z), 'test_client');
            serverBall.moveTo(new Vector3(x, 0.5, z), 'test_server');
        },

        testColors: () => {
            console.log('🧪 Testing color cycling');
            clientBall.cycleColor('test_client');
            serverBall.cycleColor('test_server');
        },

        separateBalls: () => {
            console.log('🧪 Separating balls for visibility');
            clientBall.moveTo(new Vector3(-5, 0.5, 0), 'test_separate');
            serverBall.moveTo(new Vector3(5, 0.5, 0), 'test_separate');
        },

        checkNetwork: () => {
            console.log('📊 Network stats:', {
                client: clientNetworkManager.getAuthorityStats(),
                server: serverNetworkManager.getAuthorityStats(),
                messageQueue: messageQueue.length,
                entities: {
                    clientBall: clientBall.getNetworkId(),
                    serverBall: serverBall.getNetworkId(),
                    clientBallMesh: clientBall.mesh?.name || 'no mesh',
                    serverBallMesh: serverBall.mesh?.name || 'no mesh'
                }
            });
        },

        checkColors: () => {
            console.log('🎨 Current colors:', {
                client: clientBall.getNumericProperty('colorState')?.getValue(),
                server: serverBall.getNumericProperty('colorState')?.getValue()
            });
        }
    };

    console.log(`
🎾 MINIMAL REACTIVE PROPERTY TEST READY! ✅ FIXED v2

✅ NEW FIXES APPLIED:
- Fixed "No entity found for message: ball2" (both entities registered with both network managers)
- Fixed click handling overlap (ground clicks only when no entity picked)  
- Fixed entity picking (proper mesh naming for detection)
- Both balls now visible immediately with proper network sync

✅ ORIGINAL FIXES:
- Server ball visible with distinct colors
- Color changes work for both balls (authority handled by reactive system)
- More distinct colors (Blue/Cyan/Purple for CLIENT, Green/Yellow/Red for SERVER)
- Better hover effects and improved message queue processing

✅ USING YOUR ARCHITECTURE:
- NetworkReactiveEntity with schema-driven properties
- InputStateEntity with enriched input
- SimpleNetworkManager with authority patterns
- ReactiveInputEnricher for 3D picking

🎮 BEHAVIORS TO TEST:
1. Click on GROUND → Both balls move (reactive position properties)
2. Press WASD → Both balls move by direction  
3. Click on BALLS → Cycle colors ONLY (no movement!)
4. Hover on BALLS → Brighter colors (reactive hover properties)

🧪 CONSOLE COMMANDS:
- minimalReactiveTest.testClick(5, 3)     // Test movement
- minimalReactiveTest.testColors()        // Test color cycling
- minimalReactiveTest.separateBalls()     // Move balls apart for testing
- minimalReactiveTest.checkColors()       // Check current color states
- minimalReactiveTest.checkNetwork()      // Check network sync + entity info

Both balls should be immediately visible with proper click handling!
    `);
}

// Start the test
setupMinimalReactiveTest();