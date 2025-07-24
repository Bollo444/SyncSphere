import websocketClient from './websocketClient';
import { WebSocketMessage } from './types';
import toast from 'react-hot-toast';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketServiceConfig {
  autoConnect?: boolean;
  showConnectionStatus?: boolean;
}

class WebSocketService {
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private config: WebSocketServiceConfig;
  private isInitialized = false;

  constructor(config: WebSocketServiceConfig = {}) {
    this.config = {
      autoConnect: true,
      showConnectionStatus: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Set up connection status handlers
    websocketClient.on('connection', this.handleConnectionChange.bind(this));
    websocketClient.on('error', this.handleError.bind(this));

    this.isInitialized = true;

    if (this.config.autoConnect) {
      await this.connect();
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('WebSocket service: Starting connection...');
      this.setConnectionStatus('connecting');
      
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await websocketClient.connect();
      console.log('WebSocket service: Connection successful');
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.setConnectionStatus('error');
      if (this.config.showConnectionStatus) {
        toast.error(`Failed to connect to real-time updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      throw error;
    }
  }

  disconnect(): void {
    websocketClient.disconnect();
    this.setConnectionStatus('disconnected');
  }

  // Connection status management
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  // Event handling
  on(event: string, handler: (data: any) => void): () => void {
    websocketClient.on(event, handler);
    
    // Return unsubscribe function
    return () => {
      websocketClient.off(event, handler);
    };
  }

  off(event: string, handler: (data: any) => void): void {
    websocketClient.off(event, handler);
  }

  emit(event: string, data: any): void {
    if (!this.isConnected()) {
      console.warn('Cannot emit event: WebSocket not connected');
      return;
    }
    websocketClient.emit(event, data);
  }

  // Specialized methods for common use cases
  
  // Subscribe to recovery progress updates
  subscribeToRecoveryProgress(sessionId: string, callback: (progress: any) => void): () => void {
    const handler = (data: any) => {
      if (data.sessionId === sessionId) {
        callback(data);
      }
    };
    
    return this.on('recovery:progress', handler);
  }

  // Subscribe to transfer progress updates
  subscribeToTransferProgress(sessionId: string, callback: (progress: any) => void): () => void {
    const handler = (data: any) => {
      if (data.sessionId === sessionId) {
        callback(data);
      }
    };
    
    return this.on('transfer:progress', handler);
  }

  // Subscribe to device status updates
  subscribeToDeviceStatus(deviceId: string, callback: (status: any) => void): () => void {
    const handler = (data: any) => {
      if (data.deviceId === deviceId) {
        callback(data);
      }
    };
    
    return this.on('device:status', handler);
  }

  // Subscribe to notifications
  subscribeToNotifications(callback: (notification: any) => void): () => void {
    return this.on('notification', callback);
  }

  // Subscribe to system alerts
  subscribeToSystemAlerts(callback: (alert: any) => void): () => void {
    return this.on('system:alert', callback);
  }

  // Join a room (for targeted updates)
  joinRoom(roomId: string): void {
    this.emit('join:room', { roomId });
  }

  // Leave a room
  leaveRoom(roomId: string): void {
    this.emit('leave:room', { roomId });
  }

  // Send heartbeat manually (usually handled automatically)
  sendHeartbeat(): void {
    this.emit('ping', {});
  }

  private handleConnectionChange(data: any): void {
    switch (data.status) {
      case 'connected':
        this.setConnectionStatus('connected');
        if (this.config.showConnectionStatus) {
          toast.success('Connected to real-time updates');
        }
        break;
      case 'disconnected':
        this.setConnectionStatus('disconnected');
        if (this.config.showConnectionStatus && data.code !== 1000) {
          toast.error('Disconnected from real-time updates');
        }
        break;
      case 'failed':
        this.setConnectionStatus('error');
        if (this.config.showConnectionStatus) {
          toast.error('Failed to maintain real-time connection');
        }
        break;
    }
  }

  private handleError(data: any): void {
    console.error('WebSocket service error:', data);
    this.setConnectionStatus('error');
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in connection status callback:', error);
        }
      });
    }
  }
}

// Create and export singleton instance
const websocketService = new WebSocketService({
  autoConnect: true,
  showConnectionStatus: true
});

export default websocketService;