// src/demo/client.ts

import { SceneManager } from '@engine/scene/SceneManager';
import { Vector3, Color3, HemisphericLight, DirectionalLight, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { EntityFactory } from '@engine/core/EntityFactory';
import { NaturalSyncNetworkManager } from '@engine/networking/NaturalSyncNetworkManager';
import { NetworkRole } from '@engine/networking/NetworkTypes';
import { InputStateEntity } from '@engine/inputs/InputStateEntity';
import { ReactiveInputEnricher } from '@engine/inputs/ReactiveInputEnricher';
import { debugDecorators } from '@engine/core/ReactiveDecorators';

// Register entities (decorators auto-register with EntityFactory)
import '@game/entities/Player/PlayerEntity';
import '@game/entities/Station/StationEntity';

/**
 * Client Demo - Shows decorated entities with reactive properties
 */
function startClientDemo() {
    console.log(`
🎮 REACTIVE MULTIPLAYER CLIENT DEMO
===================================
Build target: ${process.env.BUILD_TARGET}
Features:
- Decorated entities with @ClientOnly/@ServerOnly
- ActionManager-based 3D UI
- Reactive property synchronization
- Visual debugging

Controls:
- Click ground to move player
- Click station to select
- Right-click station for menu
`);

    // Create canvas
    let canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '100vh';
        canvas.style.display = 'block';
        document.body.appendChild(canvas);
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
    }

    // Initialize scene
    const sceneManager = new SceneManager(canvas);
    const scene = sceneManager.scene;
    
    // Enhanced lighting
    setupLighting(scene);
    
    // Create ground with grid
    const ground = createGround(scene);
    
    // Create environment
    createEnvironment(scene);
    
    // Create game world - CLIENT ALSO USES GAMEWORLD!
    const gameWorld = new GameWorld(scene, {
        gameLogic: 20,      // Same as server
        networkSync: 20,    // Same as server
        spatial: 10,        // Same as server
        healthRegen: 0.5,   // Same as server
        rendering: 60,      // Client-only: smooth visuals
        clientEffects: 30   // Client-only: effects
    });
    
    // Network setup
    const clientRole: NetworkRole = { 
        isClient: true, 
        isServer: false, 
        ownedByThisClient: true 
    };
    
    const networkManager = new NaturalSyncNetworkManager(clientRole);
    
    // Create input state entity
    const inputState = new InputStateEntity('client_input', scene, clientRole);
    const inputEnricher = new ReactiveInputEnricher(scene, inputState);
    networkManager.registerEntity(inputState);
    
    // Create player
    const player = EntityFactory.create(
        'player',
        'player_1',
        scene,
        clientRole,
        new Vector3(0, 1, -5)
    );
    
    gameWorld.addEntity(player);
    networkManager.registerEntity(player);
    
    // Player observes input (same as server!)
    player.observeInputState(inputState);
    
    // Create stations
    const stations = [
        { id: 'station_1', pos: new Vector3(-8, 0, 0), resources: 500 },
        { id: 'station_2', pos: new Vector3(8, 0, 0), resources: 200 },
        { id: 'station_3', pos: new Vector3(0, 0, 8), resources: 800 }
    ];
    
    stations.forEach(config => {
        const station = EntityFactory.create(
            'station',
            config.id,
            scene,
            { isClient: true, isServer: false }, // Not owned by this client
            config.pos
        );
        
        // Set initial resources
        station.getNumericProperty('resourceCount')?.set(config.resources, 'initial');
        
        gameWorld.addEntity(station);
        networkManager.registerEntity(station);
    });
    
    // Camera follows player
    setupCamera(sceneManager, player);
    
    // CLIENT GAME LOOP - Uses GameWorld!
    let lastUpdateTime = performance.now();
    
    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const deltaTime = (now - lastUpdateTime) / 1000;
        lastUpdateTime = now;
        
        // GameWorld handles all tick frequencies
        gameWorld.update(deltaTime);
        
        // Update debug stats
        updateDebugStats(player, scene);
    });
    
    // Start render loop
    sceneManager.start();
    
    // Focus canvas for input
    canvas.tabIndex = 0;
    canvas.focus();
    
    // Debug interface
    setupDebugInterface({
        player,
        stations,
        networkManager,
        inputState,
        sceneManager
    });
    
    // UI overlay
    createUIOverlay();
}

function setupLighting(scene: any): void {
    // Ambient light
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.6;
    ambient.diffuse = new Color3(0.8, 0.85, 1);
    
    // Directional light for shadows
    const directional = new DirectionalLight('directional', new Vector3(-1, -2, -1), scene);
    directional.intensity = 0.4;
    directional.diffuse = new Color3(1, 0.95, 0.8);
}

function createGround(scene: any): any {
    const ground = MeshBuilder.CreateGround('ground', {
        width: 40,
        height: 40,
        subdivisions: 20
    }, scene);
    
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.2, 0.3, 0.2);
    groundMat.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;
    
    // Enable edge rendering for grid effect
    ground.enableEdgesRendering();
    ground.edgesWidth = 2.0;
    ground.edgesColor = new Color3(0.3, 0.4, 0.3).toColor4(0.5);
    
    return ground;
}

function createEnvironment(scene: any): void {
    // Add some obstacles/decoration
    for (let i = 0; i < 5; i++) {
        const obstacle = MeshBuilder.CreateBox(`obstacle_${i}`, {
            width: 2,
            height: 3,
            depth: 2
        }, scene);
        
        obstacle.position = new Vector3(
            (Math.random() - 0.5) * 30,
            1.5,
            (Math.random() - 0.5) * 30
        );
        
        const obstacleMat = new StandardMaterial(`obstacleMat_${i}`, scene);
        obstacleMat.diffuseColor = new Color3(0.4, 0.4, 0.5);
        obstacle.material = obstacleMat;
        
        // Not pickable - optimization
        obstacle.isPickable = false;
    }
}

function setupCamera(sceneManager: any, target: any): void {
    const camera = sceneManager.camera;
    camera.radius = 15;
    camera.beta = Math.PI / 3;
    
    // Follow player
    sceneManager.scene.onBeforeRenderObservable.add(() => {
        const pos = target.getVectorProperty('position')?.getValue();
        if (pos) {
            camera.target = pos;
        }
    });
}

function setupDebugInterface(refs: any): void {
    (window as any).demo = {
        ...refs,
        
        // Debug decorated methods
        debugPlayer: () => {
            refs.player.debugDecorators();
            debugDecorators(refs.player);
        },
        
        debugStation: (index: number = 0) => {
            const station = refs.stations[index];
            if (station) {
                const entity = refs.networkManager.entities.get(station.id);
                entity?.debugDecorators();
            }
        },
        
        // Test interactions
        damagePlayer: (amount: number = 20) => {
            const health = refs.player.getNumericProperty('health');
            health?.subtractValue(amount, 'debug_damage');
        },
        
        healPlayer: () => {
            refs.player.getNumericProperty('health')?.set(100, 'debug_heal');
        },
        
        transferResources: (fromIndex: number = 0, toIndex: number = 1, amount: number = 50) => {
            const from = refs.stations[fromIndex];
            const to = refs.stations[toIndex];
            
            if (from && to) {
                console.log(`Transferring ${amount} resources from ${from.id} to ${to.id}`);
                // In real implementation, this would go through server
            }
        },
        
        // Network stats
        showStats: () => {
            console.log('📊 Client Statistics:');
            console.log('  Network:', refs.networkManager.getNaturalSyncStats());
            console.log('  Entities:', refs.networkManager.entities.size);
            console.log('  FPS:', refs.sceneManager.engine.getFps().toFixed(1));
        }
    };
    
    console.log(`
🛠️ Debug Commands:
demo.debugPlayer()         - Show player decorators
demo.debugStation(0)       - Show station decorators
demo.damagePlayer(20)      - Damage player
demo.healPlayer()          - Heal player
demo.showStats()           - Show statistics
    `);
}

function createUIOverlay(): void {
    const ui = document.createElement('div');
    ui.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        color: white;
        font-family: monospace;
        font-size: 14px;
        background: rgba(0,0,0,0.7);
        padding: 10px;
        border-radius: 5px;
        pointer-events: none;
    `;
    
    ui.innerHTML = `
        <div>REACTIVE MULTIPLAYER DEMO</div>
        <div style="margin-top: 10px;">
            Click ground to move<br>
            Click stations to interact<br>
            Right-click for menu
        </div>
    `;
    
    document.body.appendChild(ui);
}

// Start the demo
startClientDemo();