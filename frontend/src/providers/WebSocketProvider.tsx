import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import websocketService, { ConnectionStatus } from '../services/websocketService';
import { useAppSelector } from '../hooks/redux';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only initialize WebSocket service if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Initialize WebSocket service
    const initializeWebSocket = async () => {
      try {
        await websocketService.initialize();
      } catch (error) {
        console.error('Failed to initialize WebSocket service:', error);
      }
    };

    initializeWebSocket();

    // Set up connection status listener
    const unsubscribe = websocketService.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  // Connect/disconnect based on authentication status
  useEffect(() => {
    if (isAuthenticated) {
      // Connect when user is authenticated (service should already be initialized)
      websocketService.connect().catch(error => {
        console.error('Failed to connect WebSocket after authentication:', error);
      });
    } else {
      // Disconnect when user is not authenticated
      websocketService.disconnect();
      // Reset connection status when not authenticated
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  const connect = async () => {
    try {
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  };

  const disconnect = () => {
    websocketService.disconnect();
  };

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};