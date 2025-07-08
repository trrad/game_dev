import { Server as HttpServer, createServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
// FIXED: Correct relative import paths
import { SimpleNetworkManager } from './SimpleNetworkManager';
import { NetworkMessage } from './NetworkTypes';

export class GameSocketServer {
    private httpServer: HttpServer;
    private io: SocketServer;
    private networkManager: SimpleNetworkManager;
    private connectedClients: Map<string, Socket> = new Map();

    // FIXED: Use underscore prefix for unused parameter to suppress TS6133 warning
    constructor(networkManager: SimpleNetworkManager, _port: number = 8080) {
        this.networkManager = networkManager;
        this.httpServer = createServer();
        this.io = new SocketServer(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            transports: ['websocket']
        });

        this.setupSocketEvents();
        this.connectNetworkManager();
    }

    private setupSocketEvents(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log(`👤 Client ${socket.id} connected`);
            this.connectedClients.set(socket.id, socket);

            socket.on('network_message', (message: NetworkMessage) => {
                console.log(`📡 Received from ${socket.id}:`, message.type, message.entityId);
                
                // Add sender ID for server validation
                message.senderId = socket.id;
                this.networkManager.handleMessage(message);
            });

            socket.on('disconnect', () => {
                console.log(`👋 Client ${socket.id} disconnected`);
                this.connectedClients.delete(socket.id);
            });

            socket.on('error', (error) => {
                console.error(`Socket error from ${socket.id}:`, error);
            });
        });
    }

    private connectNetworkManager(): void {
        // Connect SimpleNetworkManager to Socket.io
        this.networkManager.setSendCallback((message: NetworkMessage) => {
            console.log('📡 Broadcasting:', message.type, message.entityId);
            
            // Broadcast to all connected clients
            this.io.emit('network_message', message);
        });
    }

    start(port: number = 8080): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.listen(port, () => {
                console.log(`🚀 Game server running on port ${port}`);
                resolve();
            });
        });
    }

    stop(): void {
        this.io.close();
        this.httpServer.close();
    }

    getConnectedClientCount(): number {
        return this.connectedClients.size;
    }
}