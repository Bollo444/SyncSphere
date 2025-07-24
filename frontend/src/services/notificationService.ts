import websocketService from './websocketService';
import toast from 'react-hot-toast';

export interface NotificationData {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  actionUrl?: string;
  actionText?: string;
  persistent?: boolean;
  showToast?: boolean;
  timestamp?: string;
  read?: boolean;
  userId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners = new Set<(notifications: NotificationData[]) => void>();

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    // Listen for incoming notifications from WebSocket
    websocketService.on('notification', (data: NotificationData) => {
      this.addNotification(data);
    });

    // Listen for notification updates
    websocketService.on('notification:update', (data: { id: string; updates: Partial<NotificationData> }) => {
      this.updateNotification(data.id, data.updates);
    });

    // Listen for notification removal
    websocketService.on('notification:remove', (data: { id: string }) => {
      this.removeNotification(data.id);
    });

    // Listen for bulk notification operations
    websocketService.on('notification:clear', (data: { userId?: string; category?: string }) => {
      this.clearNotifications(data.userId, data.category);
    });
  }

  // Add a new notification
  addNotification(notification: NotificationData) {
    const newNotification: NotificationData = {
      id: notification.id || this.generateId(),
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      showToast: true,
      persistent: false,
      priority: 'medium',
      ...notification
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.notifyListeners();

    // Show toast notification if enabled
    if (newNotification.showToast) {
      this.showToast(newNotification);
    }

    return newNotification;
  }

  // Update an existing notification
  updateNotification(id: string, updates: Partial<NotificationData>) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index] = { ...this.notifications[index], ...updates };
      this.notifyListeners();
    }
  }

  // Remove a notification
  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Clear notifications
  clearNotifications(userId?: string, category?: string) {
    if (userId || category) {
      this.notifications = this.notifications.filter(n => {
        if (userId && n.userId !== userId) return true;
        if (category && n.category !== category) return true;
        return false;
      });
    } else {
      this.notifications = [];
    }
    this.notifyListeners();
  }

  // Mark notification as read
  markAsRead(id: string) {
    this.updateNotification(id, { read: true });
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
      }
    });
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  // Get unread notifications
  getUnreadNotifications(): NotificationData[] {
    return this.notifications.filter(n => !n.read);
  }

  // Get notifications by category
  getNotificationsByCategory(category: string): NotificationData[] {
    return this.notifications.filter(n => n.category === category);
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: NotificationData[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Send notification to server (for broadcasting to other clients)
  async sendNotification(notification: NotificationData) {
    if (websocketService.isConnected()) {
      websocketService.emit('notification:send', notification);
    } else {
      console.warn('Cannot send notification: WebSocket not connected');
    }
  }

  // Convenience methods for different notification types
  showSuccess(title: string, message?: string, options?: Partial<NotificationData>) {
    return this.addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }

  showError(title: string, message?: string, options?: Partial<NotificationData>) {
    return this.addNotification({
      type: 'error',
      title,
      message,
      priority: 'high',
      ...options
    });
  }

  showWarning(title: string, message?: string, options?: Partial<NotificationData>) {
    return this.addNotification({
      type: 'warning',
      title,
      message,
      priority: 'medium',
      ...options
    });
  }

  showInfo(title: string, message?: string, options?: Partial<NotificationData>) {
    return this.addNotification({
      type: 'info',
      title,
      message,
      priority: 'low',
      ...options
    });
  }

  // Show operation progress notifications
  showOperationStart(operationType: string, operationId: string) {
    return this.addNotification({
      id: `${operationType}-${operationId}`,
      type: 'info',
      title: `${operationType} started`,
      message: 'Operation is in progress...',
      persistent: true,
      showToast: false,
      category: 'operation'
    });
  }

  showOperationProgress(operationType: string, operationId: string, progress: number) {
    this.updateNotification(`${operationType}-${operationId}`, {
      title: `${operationType} in progress`,
      message: `${progress}% complete`,
    });
  }

  showOperationComplete(operationType: string, operationId: string, success: boolean = true) {
    this.updateNotification(`${operationType}-${operationId}`, {
      type: success ? 'success' : 'error',
      title: `${operationType} ${success ? 'completed' : 'failed'}`,
      message: success ? 'Operation completed successfully' : 'Operation failed',
      persistent: false,
      showToast: true
    });
  }

  private showToast(notification: NotificationData) {
    const toastOptions = {
      duration: this.getToastDuration(notification.type, notification.priority),
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      case 'error':
        toast.error(notification.title, toastOptions);
        break;
      case 'warning':
        toast(notification.title, { ...toastOptions, icon: '⚠️' });
        break;
      case 'info':
      default:
        toast(notification.title, { ...toastOptions, icon: 'ℹ️' });
        break;
    }
  }

  private getToastDuration(type: string, priority?: string) {
    if (priority === 'urgent') return 8000;
    if (priority === 'high') return 6000;
    
    switch (type) {
      case 'error':
        return 6000;
      case 'warning':
        return 5000;
      case 'success':
        return 4000;
      default:
        return 4000;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.notifications]);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();

export default notificationService;