import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService, { ConnectionStatus } from '../services/websocketService';

// Hook for WebSocket connection status
export const useWebSocketConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>(websocketService.getConnectionStatus());
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');
    });

    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    try {
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  return {
    status,
    isConnected,
    connect,
    disconnect
  };
};

// Hook for subscribing to WebSocket events
export const useWebSocketEvent = <T = unknown>(
  event: string,
  handler: (data: T) => void,
  dependencies: unknown[] = []
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    const unsubscribe = websocketService.on(event, wrappedHandler);
    return unsubscribe;
  }, [event, ...dependencies]);
};

// Hook for recovery progress updates
export const useRecoveryProgress = (sessionId: string | null) => {
  const [progress, setProgress] = useState<{
    status: string;
    percentage: number;
    currentStep: string;
    estimatedTime?: number;
  } | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setProgress(null);
      setIsActive(false);
      return;
    }

    setIsActive(true);
    const unsubscribe = websocketService.subscribeToRecoveryProgress(
      sessionId,
      (progressData) => {
        setProgress(progressData);
        
        // Mark as inactive if completed or failed
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          setIsActive(false);
        }
      }
    );

    return () => {
      unsubscribe();
      setIsActive(false);
    };
  }, [sessionId]);

  return { progress, isActive };
};

// Hook for transfer progress updates
export const useTransferProgress = (sessionId: string | null) => {
  const [progress, setProgress] = useState<{
    status: string;
    percentage: number;
    currentStep: string;
    estimatedTime?: number;
  } | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setProgress(null);
      setIsActive(false);
      return;
    }

    setIsActive(true);
    const unsubscribe = websocketService.subscribeToTransferProgress(
      sessionId,
      (progressData) => {
        setProgress(progressData);
        
        // Mark as inactive if completed or failed
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          setIsActive(false);
        }
      }
    );

    return () => {
      unsubscribe();
      setIsActive(false);
    };
  }, [sessionId]);

  return { progress, isActive };
};

// Hook for device status updates
export const useDeviceStatus = (deviceId: string | null) => {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    batteryLevel?: number;
    storageInfo?: unknown;
    lastSeen: string;
  } | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setStatus(null);
      return;
    }

    const unsubscribe = websocketService.subscribeToDeviceStatus(
      deviceId,
      (statusData) => {
        setStatus(statusData);
      }
    );

    return unsubscribe;
  }, [deviceId]);

  return status;
};

// Hook for real-time notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    read: boolean;
  }>>([]);

  useEffect(() => {
    // Import notification service dynamically to avoid circular dependencies
    import('../services/notificationService').then(({ default: notificationService }) => {
      // Get initial notifications
      setNotifications(notificationService.getNotifications());
      
      // Subscribe to changes
      const unsubscribe = notificationService.subscribe((newNotifications) => {
        setNotifications(newNotifications);
      });

      return unsubscribe;
    });
  }, []);

  const clearNotifications = useCallback(async () => {
    const { default: notificationService } = await import('../services/notificationService');
    notificationService.clearNotifications();
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    const { default: notificationService } = await import('../services/notificationService');
    notificationService.removeNotification(id);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const { default: notificationService } = await import('../services/notificationService');
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { default: notificationService } = await import('../services/notificationService');
    notificationService.markAllAsRead();
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification,
    markAsRead,
    markAllAsRead
  };
};

// Hook for system alerts
export const useSystemAlerts = () => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
  }>>([]);

  useEffect(() => {
    const unsubscribe = websocketService.subscribeToSystemAlerts(
      (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10
      }
    );

    return unsubscribe;
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    alerts,
    clearAlerts,
    removeAlert
  };
};

// Hook for joining/leaving rooms
export const useWebSocketRoom = (roomId: string | null) => {
  useEffect(() => {
    if (!roomId) return;

    // Join room when component mounts or roomId changes
    websocketService.joinRoom(roomId);

    // Leave room when component unmounts or roomId changes
    return () => {
      websocketService.leaveRoom(roomId);
    };
  }, [roomId]);
};

// Generic hook for WebSocket subscriptions with cleanup
export const useWebSocketSubscription = <T>(
  subscriptionFn: (callback: (data: T) => void) => () => void,
  dependencies: unknown[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSubscribed(true);
    const unsubscribe = subscriptionFn((newData: T) => {
      setData(newData);
    });

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, dependencies);

  return { data, isSubscribed };
};