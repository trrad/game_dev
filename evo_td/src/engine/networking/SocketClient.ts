// FINAL FIX: Most compatible Socket.IO client approach
import { SimpleNetworkManager } from './SimpleNetworkManager';
import { NetworkMessage } from './NetworkTypes';

// Use require for socket.io-client to avoid import issues
const io = require('socket.io-client');

// Generic socket type to avoid import conflicts
interface SocketInterface {
    on(event: string, callback: Function): void;
    emit(event: string, data?: any): void;
    disconnect(): void;
}

export class SocketClient {
    private socket: SocketInterface;
    private networkManager: SimpleNetworkManager;
    private connected = false;

    constructor(networkManager: SimpleNetworkManager, serverUrl: string = 'http://localhost:8080') {
        this.networkManager = networkManager;
        this.socket = io(serverUrl, {
            transports: ['websocket'],
            upgrade: true
        });
        
        this.setupSocketEvents();
        this.connectNetworkManager();
    }

    private setupSocketEvents(): void {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.connected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.connected = false;
        });

        this.socket.on('network_message', (message: NetworkMessage) => {
            console.log('📡 Received:', message.type, message.entityId);
            this.networkManager.handleMessage(message);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }

    private connectNetworkManager(): void {
        // Connect SimpleNetworkManager to Socket.io
        this.networkManager.setSendCallback((message: NetworkMessage) => {
            if (this.connected) {
                console.log('📤 Sending:', message.type, message.entityId);
                this.socket.emit('network_message', message);
            } else {
                console.warn('Cannot send message - not connected to server');
            }
        });
    }

    isConnected(): boolean {
        return this.connected;
    }

    disconnect(): void {
        this.socket.disconnect();
    }
}