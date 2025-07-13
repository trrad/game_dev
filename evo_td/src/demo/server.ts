// src/demo/server.ts

import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { EntityFactory } from '@engine/core/EntityFactory';
import { GameWorld } from '@game/systems/GameWorld';
import { NaturalSyncNetworkManager } from '@engine/networking/NaturalSyncNetworkManager';
import { NetworkRole } from '@engine/networking/NetworkTypes';
import { NetworkReactiveEntity } from '@engine/networking/NetworkReactiveEntity';

// Register entities (decorators auto-register with EntityFactory)
import '@game/entities/Player/PlayerEntity';
import '@game/entities/Station/StationEntity';

/**
 * Server Demo - Authoritative game server with NullEngine
 */
function startServerDemo() {
    console.log(`
🖥️ REACTIVE MULTIPLAYER SERVER DEMO
===================================
Build target: ${process.env.BUILD_TARGET}
Features:
- Server-only validation with @ServerOnly
- Lag compensation with state history
- NullEngine for headless operation
- Automatic resource generation
`);

    // Create NullEngine and Scene for game logic
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Enable state history for lag compensation
    NetworkReactiveEntity.enableStateHistory(1000); // 1 second buffer
    
    // Create game world
    const gameWorld = new GameWorld(scene, {
        // Custom tick frequencies if needed
        gameLogic: 20,      // 20Hz
        networkSync: 20,    // 20Hz
        spatial: 10,        // 10Hz
        healthRegen: 0.5    // 0.5Hz
    });
    
    // Network setup
    const serverRole: NetworkRole = { 
        isClient: false, 
        isServer: true 
    };
    
    const networkManager = new NaturalSyncNetworkManager(serverRole);
    
    // Simulate network communication (in production: SocketServer)
    simulateNetworkLayer(networkManager);
    
    // Create server-side player
    const player = EntityFactory.create(
        'player',
        'player_1',
        scene,
        serverRole,
        new Vector3(0, 1, -5)
    );
    
    gameWorld.addEntity(player);
    networkManager.registerEntity(player);
    
    // Create server-side stations
    const stations = [
        { id: 'station_1', pos: new Vector3(-8, 0, 0), resources: 500, type: 'energy' },
        { id: 'station_2', pos: new Vector3(8, 0, 0), resources: 200, type: 'materials' },
        { id: 'station_3', pos: new Vector3(0, 0, 8), resources: 800, type: 'data' }
    ];
    
    stations.forEach(config => {
        const station = EntityFactory.create(
            'station',
            config.id,
            scene,
            serverRole,
            config.pos
        );
        
        // Set initial state
        station.getNumericProperty('resourceCount')?.set(config.resources, 'initial');
        station.getEnumProperty('resourceType')?.set(config.type as any, 'initial');
        
        gameWorld.addEntity(station);
        networkManager.registerEntity(station);
    });
    
    // Start game loop
    let running = true;
    let lastUpdateTime = Date.now();
    
    function gameLoop() {
        if (!running) return;
        
        const now = Date.now();
        const deltaTime = (now - lastUpdateTime) / 1000;
        lastUpdateTime = now;
        
        // Update game world (handles tick frequencies)
        gameWorld.update(deltaTime);
        
        // Use setImmediate for Node.js event loop
        setImmediate(gameLoop);
    }
    
    gameLoop();
    
    // Server monitoring
    startServerMonitoring(gameWorld, networkManager);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        running = false;
        gameWorld.dispose();
        scene.dispose();
        engine.dispose();
        process.exit(0);
    });
    
    console.log('✅ Server is running (press Ctrl+C to stop)\n');
}

function simulateNetworkLayer(networkManager: any): void {
    // In production, this would be handled by SocketServer
    // For demo, we'll simulate some client inputs
    
    let messageDelay = 50; // Simulated network delay
    
    networkManager.setSendCallback((message: any) => {
        // In production: socket.emit(message)
        console.log(`📤 Server would send:`, {
            type: message.type,
            entity: message.entityId,
            property: message.propertyName,
            value: message.data?.value
        });
    });
    
    // Simulate client inputs periodically
    setInterval(() => {
        // Simulate player movement input
        const clickPosition = new Vector3(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
        );
        
        const inputMessage = {
            type: 'property_update',
            entityId: 'player_1',
            propertyName: 'targetPosition',
            data: { value: clickPosition },
            authority: 'client',
            timestamp: Date.now() - messageDelay,
            senderId: 'demo_client'
        };
        
        console.log(`📥 Simulated client input: move to ${formatVector(clickPosition)}`);
        networkManager.handleMessage(inputMessage);
        
    }, 5000); // Every 5 seconds
}

function startServerMonitoring(gameWorld: any, networkManager: any): void {
    // Stats reporting
    setInterval(() => {
        const stats = gameWorld.getStats();
        const netStats = networkManager.getNaturalSyncStats();
        
        console.log('📊 Server Stats:', {
            entities: stats.entityCount,
            simTime: new Date(stats.currentSimTime).toISOString(),
            inputsProcessed: stats.inputsProcessed,
            network: {
                sent: netStats.messagesSent,
                received: netStats.messagesReceived
            }
        });
        
        // Show resource counts
        const stations = ['station_1', 'station_2', 'station_3'];
        stations.forEach(id => {
            const entity = networkManager.entities.get(id);
            if (entity) {
                const resources = entity.getNumericProperty('resourceCount')?.getValue();
                const type = entity.getEnumProperty('resourceType')?.getValue();
                console.log(`  ${id}: ${resources} ${type}`);
            }
        });
        
    }, 10000); // Every 10 seconds
    
    // Simulate some game events
    setTimeout(() => {
        console.log('\n🎮 Simulating player damage...');
        const player = networkManager.entities.get('player_1');
        if (player) {
            const health = player.getNumericProperty('health');
            health?.subtractValue(30, 'environmental_damage');
        }
    }, 3000);
    
    // Global commands
    (global as any).server = {
        gameWorld,
        networkManager,
        
        damagePlayer: (amount: number = 20) => {
            const player = networkManager.entities.get('player_1');
            player?.getNumericProperty('health')?.subtractValue(amount, 'admin_damage');
        },
        
        setResources: (stationId: string, amount: number) => {
            const station = networkManager.entities.get(stationId);
            station?.getNumericProperty('resourceCount')?.set(amount, 'admin_set');
        },
        
        showValidation: () => {
            const player = networkManager.entities.get('player_1');
            if (player && typeof player.getValidationData === 'function') {
                console.log('Validation data:', player.getValidationData());
            }
        }
    };
}

function formatVector(v: Vector3): string {
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
}

// Start the server
startServerDemo();