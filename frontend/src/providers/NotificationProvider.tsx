import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNotifications } from '../hooks/useWebSocket';
import NotificationToast from '../components/Notifications/NotificationToast';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: any[];
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  showNotification: (notification: any) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  enableToasts?: boolean;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  enableToasts = true,
  toastPosition = 'top-right'
}) => {
  const { notifications, clearNotifications, removeNotification } = useNotifications();

  // Handle system notifications
  useEffect(() => {
    // Listen for specific notification types and show appropriate toasts
    const recentNotifications = notifications.filter(notification => {
      const notificationTime = new Date(notification.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - notificationTime;
      return timeDiff < 2000; // Show toasts for notifications from last 2 seconds
    });

    recentNotifications.forEach(notification => {
      if (notification.showToast !== false) {
        showToastNotification(notification);
      }
    });
  }, [notifications]);

  const showToastNotification = (notification: any) => {
    const toastOptions = {
      duration: getToastDuration(notification.type),
      position: toastPosition as any,
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      case 'error':
        toast.error(notification.title, toastOptions);
        break;
      case 'warning':
        toast(notification.title, {
          ...toastOptions,
          icon: '⚠️',
        });
        break;
      case 'info':
      default:
        toast(notification.title, {
          ...toastOptions,
          icon: 'ℹ️',
        });
        break;
    }
  };

  const getToastDuration = (type: string) => {
    switch (type) {
      case 'error':
        return 6000; // 6 seconds for errors
      case 'warning':
        return 5000; // 5 seconds for warnings
      case 'success':
        return 4000; // 4 seconds for success
      default:
        return 4000; // 4 seconds for info
    }
  };

  const showNotification = (notification: any) => {
    // This would typically send the notification to the backend
    // which would then broadcast it via WebSocket
    console.log('Showing notification:', notification);
    
    // For now, we'll just show a toast directly
    showToastNotification(notification);
  };

  const contextValue: NotificationContextType = {
    notifications,
    clearNotifications,
    removeNotification,
    showNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {enableToasts && <NotificationToast position={toastPosition} />}
    </NotificationContext.Provider>
  );
};