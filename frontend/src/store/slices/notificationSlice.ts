import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'transfer' | 'recovery' | 'subscription' | 'security';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'transfer' | 'recovery' | 'subscription' | 'security' | 'marketing';
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    transferId?: string;
    deviceId?: string;
    subscriptionId?: string;
    errorCode?: string;
    [key: string]: any;
  };
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationPreferences {
  email: {
    transferComplete: boolean;
    recoveryComplete: boolean;
    subscriptionChanges: boolean;
    securityAlerts: boolean;
    marketing: boolean;
    systemUpdates: boolean;
  };
  push: {
    transferComplete: boolean;
    recoveryComplete: boolean;
    subscriptionChanges: boolean;
    securityAlerts: boolean;
    marketing: boolean;
    systemUpdates: boolean;
  };
  inApp: {
    transferComplete: boolean;
    recoveryComplete: boolean;
    subscriptionChanges: boolean;
    securityAlerts: boolean;
    marketing: boolean;
    systemUpdates: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  markingAsRead: string[]; // notification IDs being marked as read
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  error: null,
  markingAsRead: []
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async (params: {
    limit?: number;
    offset?: number;
    category?: string;
    unreadOnly?: boolean;
  } = {}, { rejectWithValue }) => {
    try {
      // Mock implementation - return empty notifications for now
      return { notifications: [], unreadCount: 0 };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      // Mock implementation
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      // Mock implementation
      return 'All notifications marked as read';
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notification/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      // Mock implementation
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notification');
    }
  }
);

export const deleteAllNotifications = createAsyncThunk(
  'notification/deleteAllNotifications',
  async (category?: string, { rejectWithValue }) => {
    try {
      // Mock implementation
      return category || 'all';
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notifications');
    }
  }
);

export const fetchNotificationPreferences = createAsyncThunk(
  'notification/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      // Mock implementation - return default preferences
      const defaultPreferences: NotificationPreferences = {
        email: {
          transferComplete: true,
          recoveryComplete: true,
          subscriptionChanges: true,
          securityAlerts: true,
          marketing: false,
          systemUpdates: true
        },
        push: {
          transferComplete: true,
          recoveryComplete: true,
          subscriptionChanges: true,
          securityAlerts: true,
          marketing: false,
          systemUpdates: true
        },
        inApp: {
          transferComplete: true,
          recoveryComplete: true,
          subscriptionChanges: true,
          securityAlerts: true,
          marketing: false,
          systemUpdates: true
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC'
        }
      };
      return defaultPreferences;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notification preferences');
    }
  }
);

export const updateNotificationPreferences = createAsyncThunk(
  'notification/updatePreferences',
  async (preferences: Partial<NotificationPreferences>, { rejectWithValue }) => {
    try {
      // Mock implementation - return updated preferences
      return preferences;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update notification preferences');
    }
  }
);

export const sendTestNotification = createAsyncThunk(
  'notification/sendTest',
  async (type: 'email' | 'push', { rejectWithValue }) => {
    try {
      // Mock implementation
      return `Test ${type} notification sent`;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send test notification');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsReadLocally: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsReadLocally: (state) => {
      state.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
        }
      });
      state.unreadCount = 0;
    },
    removeNotificationLocally: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index >= 0) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
    updateNotificationPreferencesLocally: (state, action: PayloadAction<Partial<NotificationPreferences>>) => {
      if (state.preferences) {
        state.preferences = { ...state.preferences, ...action.payload };
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.preferences = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Mark notification as read
      .addCase(markNotificationAsRead.pending, (state, action) => {
        state.markingAsRead.push(action.meta.arg);
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        state.markingAsRead = state.markingAsRead.filter(id => id !== notificationId);
        
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.markingAsRead = state.markingAsRead.filter(id => id !== action.meta.arg);
        state.error = action.payload as string;
      })
      
      // Mark all notifications as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          if (!notification.read) {
            notification.read = true;
            notification.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const index = state.notifications.findIndex(n => n.id === notificationId);
        if (index >= 0) {
          const notification = state.notifications[index];
          if (!notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Delete all notifications
      .addCase(deleteAllNotifications.fulfilled, (state, action) => {
        const category = action.payload;
        if (category === 'all') {
          state.notifications = [];
          state.unreadCount = 0;
        } else {
          const deletedCount = state.notifications.filter(n => n.category === category && !n.read).length;
          state.notifications = state.notifications.filter(n => n.category !== category);
          state.unreadCount = Math.max(0, state.unreadCount - deletedCount);
        }
      })
      .addCase(deleteAllNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch notification preferences
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update notification preferences
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Send test notification
      .addCase(sendTestNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  addNotification,
  markAsReadLocally,
  markAllAsReadLocally,
  removeNotificationLocally,
  updateNotificationPreferencesLocally,
  clearNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;