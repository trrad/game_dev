// src/demos/SpatialNetworkDemo.ts - Clear Client/Server Patterns Demo

import { SceneManager } from '../engine/scene/SceneManager';
import { SimpleNetworkManager } from '../engine/networking/SimpleNetworkManager';
import { SocketClient } from '../engine/networking/SocketClient';
import { GameSocketServer } from '../engine/networking/SocketServer';
import { NetworkRole } from '../engine/networking/NetworkTypes';
import { ServerAuthoritativeWanderer } from '../game/entities/ServerAuthoratitiveWanderer';
import { PlayerCharacter } from '../game/entities/PlayerCharacter';
import { GameNodeObject } from '../engine/core/GameNodeObject';
import { Scene, Vector3, Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { ObservableFactory } from '../engine/scene/ObservableFactory'; // <-- Add correct import path

/**
 * DEMO SCENE: Spatial Networking Patterns
 * 
 * DEMONSTRATES:
 * 1. Client prediction + server authority (PlayerCharacter)
 * 2. Server-only simulation (ServerAuthoritativeWanderer)  
 * 3. Proximity detection between entities
 * 4. Clear separation: what runs where
 * 
 * INTERACTION PATTERN:
 * - Client: Click to move YOUR unit (green) with instant feedback
 * - Server: Controls wandering blue unit + validates all moves
 * - Proximity: Blue unit pauses when near green unit (server decides)
 */

export interface DemoConfig {
    role: 'server' | 'client';
    serverUrl?: string;
    enableUI?: boolean;
    debugNetworking?: boolean;
}

export class SpatialNetworkDemo {
    private sceneManager: SceneManager;
    private networkManager: SimpleNetworkManager;
    private socketClient?: SocketClient;
    private socketServer?: GameSocketServer;
    private entities: Map<string, GameNodeObject> = new Map();
    private config: DemoConfig;
    private debugUI?: HTMLElement;

    constructor(canvas: HTMLCanvasElement, config: DemoConfig) {
        this.config = config;
        this.sceneManager = new SceneManager(canvas);
        
        // Initialize networking based on role
        const role: NetworkRole = {
            isServer: config.role === 'server',
            isClient: config.role === 'client',
            ownedByThisClient: config.role === 'client'
        };
        
        this.networkManager = new SimpleNetworkManager(role);
        this.setupNetworking();
        this.createDemoScene();
        
        if (config.enableUI) {
            this.createDebugUI();
        }
        
        console.log(`🎮 ${config.role.toUpperCase()} DEMO: Spatial networking patterns initialized`);
    }

    private setupNetworking(): void {
        if (this.config.role === 'server') {
            this.socketServer = new GameSocketServer(this.networkManager);
            this.socketServer.start(8080).then(() => {
                console.log('🖥️ SERVER: Socket server started on port 8080');
            });
        } else {
            this.socketClient = new SocketClient(
                this.networkManager, 
                this.config.serverUrl || 'http://localhost:8080'
            );
            console.log('💻 CLIENT: Connecting to server...');
        }
    }

    private createDemoScene(): void {
        this.createEnvironment();
        this.createDemoEntities();
        this.setupSpatialInteractions();
        this.sceneManager.start();
        
        console.log(`✅ ${this.config.role.toUpperCase()}: Demo scene created`);
        this.logDemoInstructions();
    }

    private createEnvironment(): void {
        // Create ground plane
        const ground = MeshBuilder.CreateGround("ground", { width: 12, height: 12 }, this.sceneManager.scene);
        const groundMaterial = new StandardMaterial("groundMat", this.sceneManager.scene);
        groundMaterial.diffuseColor = new Color3(0.1, 0.3, 0.1);
        ground.material = groundMaterial;
        ground.position.y = -0.1;

        // Create boundary markers
        this.createBoundaryMarkers();
    }

    private createBoundaryMarkers(): void {
        const boundarySize = 5;
        const corners = [
            new Vector3(-boundarySize, 0, -boundarySize),
            new Vector3(boundarySize, 0, -boundarySize),
            new Vector3(boundarySize, 0, boundarySize),
            new Vector3(-boundarySize, 0, boundarySize)
        ];

        corners.forEach((corner, i) => {
            const marker = MeshBuilder.CreateBox(`boundary_${i}`, { size: 0.2 }, this.sceneManager.scene);
            marker.position = corner;
            const material = new StandardMaterial(`boundaryMat_${i}`, this.sceneManager.scene);
            material.diffuseColor = new Color3(1, 1, 0); // Yellow
            marker.material = material;
        });
    }

    private createDemoEntities(): void {
        const role: NetworkRole = {
            isServer: this.config.role === 'server',
            isClient: this.config.role === 'client',
            ownedByThisClient: this.config.role === 'client'
        };

        // 🔵 SERVER-AUTHORITATIVE WANDERER (Blue)
        // Server controls ALL movement, client just displays
        const wanderer = new ServerAuthoritativeWanderer(
            'demo_wanderer', 
            this.sceneManager.scene, 
            role,
            this.sceneManager.getRootNode()
        );
        wanderer.setPosition(0, 0, -2);
        this.addVisualIndicator(wanderer, 'blue', '🔵 SERVER: Auto-wanderer');
        this.entities.set('demo_wanderer', wanderer);
        this.networkManager.registerEntity(wanderer);

        // 🟢 CLIENT-PREDICTIVE TARGET (Green) 
        // Client predicts movement, server validates
        if (this.config.role === 'client') {
            const target = new PlayerCharacter(
                'demo_target',
                this.sceneManager.scene,
                role,
                this.sceneManager.getRootNode()
            );
            target.setPosition(0, 0, 2);
            this.addVisualIndicator(target, 'green', '🟢 CLIENT: Click-to-move (YOURS)');
            this.entities.set('demo_target', target);
            this.networkManager.registerEntity(target);
        }

        console.log(`🎭 ${this.config.role.toUpperCase()}: Created demo entities`);
    }

    private addVisualIndicator(entity: GameNodeObject, color: string, label: string): void {
        // Create colored sphere for the entity
        const sphere = MeshBuilder.CreateSphere(`${entity.id}_visual`, { diameter: 1 }, this.sceneManager.scene);
        const material = new StandardMaterial(`${entity.id}_mat`, this.sceneManager.scene);
        
        switch (color) {
            case 'blue':
                material.diffuseColor = new Color3(0.3, 0.5, 1);
                material.emissiveColor = new Color3(0.1, 0.1, 0.3);
                break;
            case 'green':
                material.diffuseColor = new Color3(0.3, 1, 0.3);
                material.emissiveColor = new Color3(0.1, 0.3, 0.1);
                break;
        }
        
        sphere.material = material;
        sphere.parent = entity.getNodeComponent().getTransformNode();
        
        console.log(`👁️ ${this.config.role.toUpperCase()}: ${label} visual created`);
    }
    private setupSpatialInteractions(): void {
        // This demonstrates spatial interaction patterns:
        // Server detects proximity and affects wanderer state
        // Client sees the results through network sync

        if (this.config.role === 'server') {
            console.log('🔗 SERVER: Setting up spatial proximity detection');

            const wanderer = this.entities.get('demo_wanderer');
            const target = this.entities.get('demo_target');
            const scene = this.sceneManager.scene;

            if (wanderer && target) {
                const proximityTracker = ObservableFactory.createDistanceTracker(
                    wanderer, target, 3.0, scene, 'near_target'
                );

                proximityTracker.observable.add((data: { withinThreshold: boolean }) => {
                    if (data.withinThreshold) {
                        (wanderer as any).getCollectionProperty('nearbyEntities')?.addItem(target.id, target.id, 'proximity');
                    } else {
                        (wanderer as any).getCollectionProperty('nearbyEntities')?.removeItem(target.id, 'proximity');
                    }
                });
            }
        }

        console.log(`🔗 ${this.config.role.toUpperCase()}: Spatial interactions configured`);
    }

    private createDebugUI(): void {
        this.debugUI = document.createElement('div');
        this.debugUI.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            min-width: 300px;
        `;
        
        document.body.appendChild(this.debugUI);
        this.updateDebugUI();
        
        // Update debug UI periodically
        setInterval(() => this.updateDebugUI(), 1000);
    }

    private updateDebugUI(): void {
        if (!this.debugUI) return;
        
        const connectionStatus = this.config.role === 'server' 
            ? `Server: ${this.socketServer?.getConnectedClientCount() || 0} clients`
            : `Client: ${this.socketClient?.isConnected() ? 'Connected' : 'Disconnected'}`;
            
        const entityStates = Array.from(this.entities.values()).map(entity => {
            const pos = entity.getWorldPosition();
            return `${entity.id}: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`;
        }).join('\n');

        this.debugUI.innerHTML = `
            <h3>🎮 ${this.config.role.toUpperCase()} DEMO</h3>
            <div><strong>Network:</strong> ${connectionStatus}</div>
            <div><strong>Entities:</strong></div>
            <pre>${entityStates}</pre>
            <div><strong>Role:</strong> ${this.config.role}</div>
            ${this.config.role === 'client' ? '<div><strong>Click to move green unit!</strong></div>' : ''}
        `;
    }

    private logDemoInstructions(): void {
        const instructions = this.config.role === 'server' 
            ? `
🖥️ SERVER DEMO RUNNING:
- Blue wanderer moves automatically (server authority)
- Accepts client connections on port 8080
- Validates all client inputs
- Manages spatial interactions

👀 Watch for:
- Wanderer pausing when players get close
- Server rejecting invalid moves
- Health regeneration (server-only)
`
            : `
💻 CLIENT DEMO RUNNING:
- 🟢 Click anywhere to move YOUR green unit
- Movement is instantly predicted
- Server validates and may correct position
- 🔵 Blue wanderer is controlled by server

👀 Watch for:
- Instant click response (prediction)
- Smooth server corrections
- Proximity affecting wanderer behavior
`;

        console.log(instructions);
    }

    public start(): void {
        this.sceneManager.handleResize();
        console.log(`🚀 ${this.config.role.toUpperCase()} DEMO: Started!`);
    }

    public dispose(): void {
        this.entities.forEach(entity => entity.dispose());
        this.entities.clear();
        
        if (this.socketClient) {
            this.socketClient.disconnect();
        }
        
        if (this.socketServer) {
            this.socketServer.stop();
        }
        
        if (this.debugUI) {
            document.body.removeChild(this.debugUI);
        }
        
        console.log(`🛑 ${this.config.role.toUpperCase()} DEMO: Disposed`);
    }
}

// ============================================================================
// DEMO ENTRY POINTS - Clear separation of client vs server startup
// ============================================================================

/**
 * 🖥️ START SERVER DEMO
 * Run this to start the authoritative server
 */
export function startServerDemo(canvas: HTMLCanvasElement): SpatialNetworkDemo {
    return new SpatialNetworkDemo(canvas, {
        role: 'server',
        enableUI: true,
        debugNetworking: true
    });
}

/**
 * 💻 START CLIENT DEMO  
 * Run this to connect as a client
 */
export function startClientDemo(canvas: HTMLCanvasElement, serverUrl?: string): SpatialNetworkDemo {
    return new SpatialNetworkDemo(canvas, {
        role: 'client',
        serverUrl: serverUrl || 'http://localhost:8080',
        enableUI: true,
        debugNetworking: true
    });
}

// ============================================================================
// GLOBAL DEMO HELPERS - For easy testing
// ============================================================================

// Make demo functions available globally for easy testing
(window as any).startServerDemo = startServerDemo;
(window as any).startClientDemo = startClientDemo;

console.log(`
🎯 SPATIAL NETWORKING DEMO LOADED

Server: startServerDemo(canvas)
Client: startClientDemo(canvas)

Example:
const canvas = document.querySelector('canvas');
const demo = startServerDemo(canvas); // or startClientDemo(canvas)
`);