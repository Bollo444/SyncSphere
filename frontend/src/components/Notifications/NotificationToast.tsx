import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

interface NotificationToastProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  position = 'top-right',
  maxVisible = 3
}) => {
  const { notifications, removeNotification } = useNotifications();

  // Show toast notifications for new notifications
  useEffect(() => {
    const recentNotifications = notifications.slice(0, maxVisible);
    
    recentNotifications.forEach((notification) => {
      // Only show toast for very recent notifications (within last 5 seconds)
      const notificationTime = new Date(notification.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - notificationTime;
      
      if (timeDiff < 5000 && !notification.toastShown) {
        // Mark as shown to prevent duplicate toasts
        notification.toastShown = true;
        
        // Show appropriate toast based on type
        switch (notification.type) {
          case 'success':
            toast.success(notification.title, {
              duration: 4000,
              position: 'top-right'
            });
            break;
          case 'error':
            toast.error(notification.title, {
              duration: 6000,
              position: 'top-right'
            });
            break;
          case 'warning':
            toast(notification.title, {
              duration: 5000,
              position: 'top-right',
              icon: '⚠️'
            });
            break;
          default:
            toast(notification.title, {
              duration: 4000,
              position: 'top-right',
              icon: 'ℹ️'
            });
        }
      }
    });
  }, [notifications, maxVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Get recent notifications that should be shown as persistent toasts
  const visibleNotifications = notifications
    .filter(n => {
      const notificationTime = new Date(n.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - notificationTime;
      // Show notifications from last 30 seconds that are marked as persistent
      return timeDiff < 30000 && n.persistent;
    })
    .slice(0, maxVisible);

  return (
    <div className={`fixed z-50 ${getPositionClasses()} space-y-2`}>
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 100 : -100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 100 : -100 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`
              max-w-sm w-full bg-white rounded-lg shadow-lg border p-4
              ${getNotificationColors(notification.type)}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {notification.title}
                </p>
                
                {notification.message && (
                  <p className="text-sm mt-1 opacity-90">
                    {notification.message}
                  </p>
                )}
                
                {notification.actionUrl && (
                  <div className="mt-2">
                    <a
                      href={notification.actionUrl}
                      className="text-sm font-medium underline hover:no-underline"
                    >
                      {notification.actionText || 'View Details'}
                    </a>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;