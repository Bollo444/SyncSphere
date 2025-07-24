import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { analyticsAPI } from '../../services/api';

interface AnalyticsData {
  overview: {
    totalDataRecoveries: number;
    totalPhoneTransfers: number;
    totalStorageUsed: number; // in GB
    totalDevicesConnected: number;
    successRate: number; // percentage
    averageTransferTime: number; // in minutes
  };
  timeSeriesData: {
    date: string;
    dataRecoveries: number;
    phoneTransfers: number;
    storageUsed: number;
    transferTime: number;
  }[];
  deviceBreakdown: {
    deviceType: string;
    count: number;
    percentage: number;
  }[];
  dataTypeBreakdown: {
    dataType: string;
    count: number;
    size: number; // in MB
    percentage: number;
  }[];
  performanceMetrics: {
    averageSpeed: number; // MB/s
    peakSpeed: number; // MB/s
    averageSuccessRate: number; // percentage
    errorRate: number; // percentage
  };
  usagePatterns: {
    mostActiveHour: number;
    mostActiveDay: string;
    peakUsagePeriod: string;
    averageSessionDuration: number; // in minutes
  };
}

interface UserActivity {
  id: string;
  type: 'data_recovery' | 'phone_transfer' | 'backup' | 'device_connection' | 'login' | 'subscription_change';
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  deviceInfo?: {
    type: string;
    model: string;
    os: string;
  };
  location?: {
    country: string;
    city: string;
    ip: string;
  };
  duration?: number; // in seconds
  status: 'success' | 'failed' | 'in_progress';
}

interface AnalyticsState {
  data: AnalyticsData | null;
  activities: UserActivity[];
  loading: boolean;
  error: string | null;
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    activityTypes: string[];
    deviceTypes: string[];
    status: string[];
  };
}

const initialState: AnalyticsState = {
  data: null,
  activities: [],
  loading: false,
  error: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  },
  filters: {
    activityTypes: [],
    deviceTypes: [],
    status: []
  }
};

// Async thunks
export const fetchAnalyticsData = createAsyncThunk(
  'analytics/fetchData',
  async (params: {
    startDate: string;
    endDate: string;
    granularity?: 'day' | 'week' | 'month';
  }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getAnalytics(params.startDate, params.endDate);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics data');
    }
  }
);

export const fetchUserActivities = createAsyncThunk(
  'analytics/fetchActivities',
  async (params: {
    startDate: string;
    endDate: string;
    types?: string[];
    deviceTypes?: string[];
    status?: string[];
    limit?: number;
    offset?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getAnalytics(params.startDate, params.endDate);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user activities');
    }
  }
);

export const exportAnalyticsData = createAsyncThunk(
  'analytics/exportData',
  async (params: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'pdf' | 'excel';
    includeActivities: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.exportAnalytics(params.startDate, params.endDate, params.format);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `analytics-${params.startDate}-to-${params.endDate}.${params.format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return 'Analytics data exported successfully';
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export analytics data');
    }
  }
);

export const trackUserAction = createAsyncThunk(
  'analytics/trackAction',
  async (actionData: {
    type: UserActivity['type'];
    description: string;
    metadata?: Record<string, any>;
    deviceInfo?: UserActivity['deviceInfo'];
    duration?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getAnalytics(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to track user action');
    }
  }
);

export const getDeviceAnalytics = createAsyncThunk(
  'analytics/getDeviceAnalytics',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getAnalytics(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch device analytics');
    }
  }
);

export const getTransferAnalytics = createAsyncThunk(
  'analytics/getTransferAnalytics',
  async (transferId: string, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getAnalytics(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transfer analytics');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.dateRange = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<AnalyticsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        activityTypes: [],
        deviceTypes: [],
        status: []
      };
    },
    addActivity: (state, action: PayloadAction<UserActivity>) => {
      state.activities.unshift(action.payload);
      // Keep only the latest 100 activities in memory
      if (state.activities.length > 100) {
        state.activities = state.activities.slice(0, 100);
      }
    },
    updateActivityStatus: (state, action: PayloadAction<{
      activityId: string;
      status: UserActivity['status'];
      duration?: number;
    }>) => {
      const { activityId, status, duration } = action.payload;
      const activity = state.activities.find(a => a.id === activityId);
      if (activity) {
        activity.status = status;
        if (duration !== undefined) {
          activity.duration = duration;
        }
      }
    },
    clearAnalytics: (state) => {
      state.data = null;
      state.activities = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch analytics data
      .addCase(fetchAnalyticsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAnalyticsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch user activities
      .addCase(fetchUserActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.activities = action.payload;
      })
      .addCase(fetchUserActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Export analytics data
      .addCase(exportAnalyticsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportAnalyticsData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportAnalyticsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Track user action
      .addCase(trackUserAction.fulfilled, (state, action) => {
        state.activities.unshift(action.payload);
        // Keep only the latest 100 activities in memory
        if (state.activities.length > 100) {
          state.activities = state.activities.slice(0, 100);
        }
      })
      .addCase(trackUserAction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Get device analytics
      .addCase(getDeviceAnalytics.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Get transfer analytics
      .addCase(getTransferAnalytics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  setDateRange,
  setFilters,
  clearFilters,
  addActivity,
  updateActivityStatus,
  clearAnalytics
} = analyticsSlice.actions;

export default analyticsSlice.reducer;