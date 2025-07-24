import { io, Socket } from 'socket.io-client';
import apiClient from './apiClient';

interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  id?: string;
}

type EventHandler = (data: unknown) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;
  private url: string;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(url?: string) {
    // Convert ws:// to http:// for Socket.IO
    const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    this.url = String(wsUrl).replace(/^ws/, 'http');
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = apiClient.getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Convert ws:// to http:// for Socket.IO
      const httpUrl = this.url.replace('ws://', 'http://').replace('wss://', 'https://');
      
      this.socket = io(httpUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventHandlers();

      // Wait for connection with extended timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('Socket.IO connection timeout after 30 seconds');
          reject(new Error('Socket.IO connection timeout'));
        }, 30000); // Increased timeout to 30 seconds

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          console.log('Socket.IO connection established successfully');
          this.handleOpen();
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('Socket.IO connection error:', error);
          this.handleError(error);
          reject(new Error(`Socket.IO connection failed: ${error.message || error}`));
        });

        // Add additional debugging
        this.socket!.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected during connection attempt:', reason);
        });
      });
    } catch (error) {
      this.isConnecting = false;
      console.error('Socket.IO connection failed:', error);
      throw error;
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  send(message: WebSocketMessage): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket.IO is not connected. Message not sent:', message);
      return;
    }

    try {
      this.socket.emit(message.type, message.payload);
    } catch (error) {
      console.error('Failed to send Socket.IO message:', error);
    }
  }

  // Event handling
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: unknown): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket.IO is not connected. Event not emitted:', event);
      return;
    }

    try {
      this.socket.emit(event, data);
    } catch (error) {
      console.error('Failed to emit Socket.IO event:', error);
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): string {
    if (!this.socket) return 'DISCONNECTED';
    
    if (this.socket.connected) {
      return 'CONNECTED';
    } else if (this.isConnecting) {
      return 'CONNECTING';
    } else {
      return 'DISCONNECTED';
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.handleOpen();
    });

    this.socket.on('disconnect', (reason) => {
      this.handleClose(reason);
    });

    this.socket.on('connect_error', (error) => {
      this.handleError(error);
    });

    // Handle all other events
    this.socket.onAny((eventName, ...args) => {
      this.handleMessage(eventName, args[0]);
    });
  }

  private handleOpen(): void {
    console.log('Socket.IO connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.emitToHandlers('connection', { status: 'connected' });
  }

  private handleMessage(eventName: string, data: unknown): void {
    try {
      // Handle heartbeat responses
      if (eventName === 'pong') {
        return;
      }

      // Emit to registered handlers
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in Socket.IO event handler for ${eventName}:`, error);
          }
        });
      }

      // Emit to generic message handlers
      const messageHandlers = this.eventHandlers.get('message');
      if (messageHandlers) {
        messageHandlers.forEach(handler => {
          try {
            handler({ type: eventName, payload: data });
          } catch (error) {
            console.error('Error in Socket.IO message handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to handle Socket.IO message:', error);
    }
  }

  private handleClose(reason: string): void {
    console.log('Socket.IO disconnected:', reason);
    this.isConnecting = false;

    // Emit disconnect event
    this.emitToHandlers('connection', { 
      status: 'disconnected', 
      reason: reason 
    });
  }

  private handleError(error: unknown): void {
    console.error('Socket.IO error:', error);
    this.isConnecting = false;
    
    // Emit error event
    this.emitToHandlers('error', { error: 'Socket.IO connection error', details: error });
  }

  private emitToHandlers(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in Socket.IO event handler for ${event}:`, error);
        }
      });
    }
  }

  // Socket.IO handles heartbeat and reconnection automatically
  // These methods are kept for compatibility but are no-ops
  private clearTimers(): void {
    // Socket.IO handles this automatically
  }

  // Utility methods (kept for compatibility)
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
const websocketClient = new WebSocketClient(
  import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
);

export default websocketClient;