import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { deviceAPI } from '../../services/api';

interface Device {
  id: string;
  name: string;
  type: 'ios' | 'android' | 'windows' | 'mac';
  model: string;
  osVersion: string;
  serialNumber?: string;
  isConnected: boolean;
  lastConnected: string;
  storageTotal: number; // in GB
  storageUsed: number; // in GB
  batteryLevel?: number;
  status: 'online' | 'offline' | 'syncing' | 'error';
  capabilities: {
    dataRecovery: boolean;
    phoneTransfer: boolean;
    backup: boolean;
    screenUnlock: boolean;
    systemRepair: boolean;
  };
  metadata: {
    manufacturer: string;
    color?: string;
    carrier?: string;
    imei?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DeviceConnection {
  deviceId: string;
  connectionType: 'usb' | 'wifi' | 'bluetooth';
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  progress?: number;
  error?: string;
}

interface DeviceState {
  devices: Device[];
  connectedDevices: Device[];
  currentDevice: Device | null;
  connections: DeviceConnection[];
  loading: boolean;
  error: string | null;
  scanningForDevices: boolean;
}

const initialState: DeviceState = {
  devices: [],
  connectedDevices: [],
  currentDevice: null,
  connections: [],
  loading: false,
  error: null,
  scanningForDevices: false
};

// Async thunks
export const fetchDevices = createAsyncThunk(
  'device/fetchDevices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.getDevices();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch devices');
    }
  }
);

export const scanForDevices = createAsyncThunk(
  'device/scanForDevices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.scanDevice('scan');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to scan for devices');
    }
  }
);

export const connectDevice = createAsyncThunk(
  'device/connectDevice',
  async (deviceInfo: { type: string; identifier: string }, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.addDevice(deviceInfo);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to connect device');
    }
  }
);

export const disconnectDevice = createAsyncThunk(
  'device/disconnectDevice',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      await deviceAPI.deleteDevice(deviceId);
      return deviceId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to disconnect device');
    }
  }
);

export const removeDevice = createAsyncThunk(
  'device/removeDevice',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      await deviceAPI.deleteDevice(deviceId);
      return deviceId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove device');
    }
  }
);

export const updateDeviceName = createAsyncThunk(
  'device/updateDeviceName',
  async ({ deviceId, name }: { deviceId: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.updateDevice(deviceId, { name });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update device name');
    }
  }
);

export const getDeviceInfo = createAsyncThunk(
  'device/getDeviceInfo',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.getDeviceData(deviceId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get device info');
    }
  }
);

export const checkDeviceCompatibility = createAsyncThunk(
  'device/checkCompatibility',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await deviceAPI.getDeviceData(deviceId);
      return { deviceId, capabilities: response.data.capabilities };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check device compatibility');
    }
  }
);

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentDevice: (state, action: PayloadAction<Device | null>) => {
      state.currentDevice = action.payload;
    },
    updateConnectionStatus: (state, action: PayloadAction<DeviceConnection>) => {
      const existingIndex = state.connections.findIndex(
        conn => conn.deviceId === action.payload.deviceId
      );
      
      if (existingIndex >= 0) {
        state.connections[existingIndex] = action.payload;
      } else {
        state.connections.push(action.payload);
      }
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      state.connections = state.connections.filter(
        conn => conn.deviceId !== action.payload
      );
    },
    updateDeviceStatus: (state, action: PayloadAction<{ deviceId: string; status: Device['status'] }>) => {
      const device = state.devices.find(d => d.id === action.payload.deviceId);
      if (device) {
        device.status = action.payload.status;
        device.isConnected = action.payload.status === 'online' || action.payload.status === 'syncing';
      }
      
      // Update connected devices list
      state.connectedDevices = state.devices.filter(d => d.isConnected);
    },
    clearDevices: (state) => {
      state.devices = [];
      state.connectedDevices = [];
      state.currentDevice = null;
      state.connections = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch devices
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
        state.connectedDevices = action.payload.filter((device: Device) => device.isConnected);
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Scan for devices
      .addCase(scanForDevices.pending, (state) => {
        state.scanningForDevices = true;
        state.error = null;
      })
      .addCase(scanForDevices.fulfilled, (state, action) => {
        state.scanningForDevices = false;
        // Merge new devices with existing ones
        const existingIds = state.devices.map(d => d.id);
        const newDevices = action.payload.filter((device: Device) => !existingIds.includes(device.id));
        state.devices = [...state.devices, ...newDevices];
      })
      .addCase(scanForDevices.rejected, (state, action) => {
        state.scanningForDevices = false;
        state.error = action.payload as string;
      })
      
      // Connect device
      .addCase(connectDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectDevice.fulfilled, (state, action) => {
        state.loading = false;
        const device = action.payload;
        const existingIndex = state.devices.findIndex(d => d.id === device.id);
        
        if (existingIndex >= 0) {
          state.devices[existingIndex] = device;
        } else {
          state.devices.push(device);
        }
        
        state.connectedDevices = state.devices.filter(d => d.isConnected);
      })
      .addCase(connectDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Disconnect device
      .addCase(disconnectDevice.fulfilled, (state, action) => {
        const deviceId = action.payload;
        const device = state.devices.find(d => d.id === deviceId);
        if (device) {
          device.isConnected = false;
          device.status = 'offline';
        }
        state.connectedDevices = state.devices.filter(d => d.isConnected);
        
        // Remove connection
        state.connections = state.connections.filter(conn => conn.deviceId !== deviceId);
      })
      .addCase(disconnectDevice.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Remove device
      .addCase(removeDevice.fulfilled, (state, action) => {
        const deviceId = action.payload;
        state.devices = state.devices.filter(d => d.id !== deviceId);
        state.connectedDevices = state.connectedDevices.filter(d => d.id !== deviceId);
        state.connections = state.connections.filter(conn => conn.deviceId !== deviceId);
        
        if (state.currentDevice?.id === deviceId) {
          state.currentDevice = null;
        }
      })
      .addCase(removeDevice.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update device name
      .addCase(updateDeviceName.fulfilled, (state, action) => {
        const updatedDevice = action.payload;
        const index = state.devices.findIndex(d => d.id === updatedDevice.id);
        if (index >= 0) {
          state.devices[index] = updatedDevice;
        }
        
        if (state.currentDevice?.id === updatedDevice.id) {
          state.currentDevice = updatedDevice;
        }
      })
      .addCase(updateDeviceName.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Get device info
      .addCase(getDeviceInfo.fulfilled, (state, action) => {
        const deviceInfo = action.payload;
        const index = state.devices.findIndex(d => d.id === deviceInfo.id);
        if (index >= 0) {
          state.devices[index] = deviceInfo;
        }
        
        if (state.currentDevice?.id === deviceInfo.id) {
          state.currentDevice = deviceInfo;
        }
      })
      .addCase(getDeviceInfo.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Check device compatibility
      .addCase(checkDeviceCompatibility.fulfilled, (state, action) => {
        const { deviceId, capabilities } = action.payload;
        const device = state.devices.find(d => d.id === deviceId);
        if (device) {
          device.capabilities = capabilities;
        }
      })
      .addCase(checkDeviceCompatibility.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  setCurrentDevice,
  updateConnectionStatus,
  removeConnection,
  updateDeviceStatus,
  clearDevices
} = deviceSlice.actions;

export default deviceSlice.reducer;