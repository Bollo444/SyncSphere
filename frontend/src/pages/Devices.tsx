import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  WifiIcon,
  BoltIcon,
  CircleStackIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { deviceAPI } from '../services/api';
import { Device } from '../services/types';
import toast from 'react-hot-toast';



const Devices: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState<string | null>(null);

  const deviceTypeIcons = {
    phone: DevicePhoneMobileIcon,
    tablet: DeviceTabletIcon,
    computer: ComputerDesktopIcon
  };

  const platformColors = {
    ios: 'bg-gray-100 text-gray-800',
    android: 'bg-green-100 text-green-800',
    windows: 'bg-blue-100 text-blue-800',
    macos: 'bg-gray-100 text-gray-800',
    linux: 'bg-orange-100 text-orange-800'
  };

  const statusColors = {
    online: 'bg-success-100 text-success-800',
    offline: 'bg-gray-100 text-gray-800',
    syncing: 'bg-primary-100 text-primary-800',
    error: 'bg-error-100 text-error-800'
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await deviceAPI.getDevices();
        setDevices(response.data);
      } catch (err: any) {
        console.error('Failed to fetch devices:', err);
        setError(err.message || 'Failed to load devices');
        toast.error('Could not load devices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    
    // Set up refresh interval (every 30 seconds)
    const intervalId = setInterval(fetchDevices, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      // First, scan for new devices (this would trigger a network scan on the backend)
      // For now, we'll just refresh the devices list
      const response = await deviceAPI.getDevices();
      setDevices(response.data);
      toast.success('Device scan completed');
    } catch (error: any) {
      console.error('Failed to scan for devices:', error);
      toast.error(error.message || 'Failed to scan for devices');
    } finally {
      setIsScanning(false);
    }
  };

  const connectDevice = async (deviceId: string) => {
    try {
      // Update device status via API
      await deviceAPI.updateDevice(deviceId, { 
        isConnected: true, 
        status: 'online', 
        lastSeen: new Date().toISOString() 
      });
      
      // Update local state
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, isConnected: true, status: 'online', lastSeen: new Date().toISOString() }
          : device
      ));
      toast.success('Device connected successfully');
    } catch (error: any) {
      console.error('Failed to connect device:', error);
      toast.error(error.message || 'Failed to connect device');
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      // Update device status via API
      await deviceAPI.updateDevice(deviceId, { 
        isConnected: false, 
        status: 'offline' 
      });
      
      // Update local state
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, isConnected: false, status: 'offline' }
          : device
      ));
      toast.success('Device disconnected');
    } catch (error: any) {
      console.error('Failed to disconnect device:', error);
      toast.error(error.message || 'Failed to disconnect device');
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      // Remove device via API
      await deviceAPI.deleteDevice(deviceId);
      
      // Update local state
      setDevices(prev => prev.filter(device => device.id !== deviceId));
      toast.success('Device removed successfully');
    } catch (error: any) {
      console.error('Failed to remove device:', error);
      toast.error(error.message || 'Failed to remove device');
    }
  };

  const toggleSync = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      const newSyncState = !device?.syncEnabled;
      
      // Update device sync setting via API
      await deviceAPI.updateDevice(deviceId, { 
        syncEnabled: newSyncState 
      });
      
      // Update local state
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, syncEnabled: newSyncState }
          : device
      ));
      
      toast.success(`Sync ${newSyncState ? 'enabled' : 'disabled'} for ${device?.name}`);
    } catch (error: any) {
      console.error('Failed to toggle sync:', error);
      toast.error(error.message || 'Failed to toggle sync');
    }
  };

  const toggleBackup = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      const newBackupState = !device?.backupEnabled;
      
      // Update device backup setting via API
      await deviceAPI.updateDevice(deviceId, { 
        backupEnabled: newBackupState 
      });
      
      // Update local state
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, backupEnabled: newBackupState }
          : device
      ));
      
      toast.success(`Backup ${newBackupState ? 'enabled' : 'disabled'} for ${device?.name}`);
    } catch (error: any) {
      console.error('Failed to toggle backup:', error);
      toast.error(error.message || 'Failed to toggle backup');
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) {
      return `${mb} MB`;
    }
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getFilteredDevices = () => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           device.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredDevices = getFilteredDevices();
  const connectedDevices = devices.filter(d => d.isConnected).length;
  const totalStorage = devices.reduce((sum, d) => sum + d.storageTotal, 0);
  const usedStorage = devices.reduce((sum, d) => sum + d.storageUsed, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Connected Devices</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor all your connected devices
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={scanForDevices}
              disabled={isScanning}
              className="flex items-center px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isScanning ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Scan
                </>
              )}
            </button>
            
            <button
              onClick={() => setShowAddDevice(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Device
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <WifiIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-bold text-gray-900">{connectedDevices}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <CircleStackIcon className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalStorage)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-error-100 rounded-lg">
              <CircleStackIcon className="h-6 w-6 text-error-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Used Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(usedStorage)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="syncing">Syncing</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredDevices.length} of {devices.length} devices
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Devices</h3>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading devices...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load devices</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
          {filteredDevices.map((device) => {
            const Icon = deviceTypeIcons[device.type];
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Icon className="h-10 w-10 text-gray-600" />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        device.isConnected ? 'bg-success-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">{device.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[device.status]
                        }`}>
                          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          platformColors[device.platform]
                        }`}>
                          {device.platform.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                        <span>{device.model} • {device.osVersion}</span>
                        <span>•</span>
                        <span>{device.ipAddress}</span>
                        <span>•</span>
                        <span>Last seen: {formatLastSeen(device.lastSeen)}</span>
                        {device.batteryLevel && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <BoltIcon className="h-4 w-4" />
                              <span>{device.batteryLevel}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                        <span>Storage: {formatFileSize(device.storageUsed)} / {formatFileSize(device.storageTotal)}</span>
                        <span>•</span>
                        <span>Transfers: {device.transfersCount}</span>
                        <span>•</span>
                        <span>Recovered: {formatFileSize(device.dataRecovered)}</span>
                      </div>
                      
                      {/* Storage Bar */}
                      <div className="mt-3 w-64">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Storage Usage</span>
                          <span>{Math.round((device.storageUsed / device.storageTotal) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${(device.storageUsed / device.storageTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Quick Settings */}
                      <div className="flex items-center space-x-4 mt-3">
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={device.syncEnabled}
                            onChange={() => toggleSync(device.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-gray-700">Auto Sync</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={device.backupEnabled}
                            onChange={() => toggleBackup(device.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-gray-700">Auto Backup</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {device.isConnected ? (
                      <button
                        onClick={() => disconnectDevice(device.id)}
                        className="px-3 py-1 text-sm text-error-600 border border-error-600 rounded hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectDevice(device.id)}
                        className="px-3 py-1 text-sm text-primary-600 border border-primary-600 rounded hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowDeviceMenu(showDeviceMenu === device.id ? null : device.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      
                      {showDeviceMenu === device.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowDeviceMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Cog6ToothIcon className="h-4 w-4 mr-3" />
                              Settings
                            </button>
                            <button
                              onClick={async () => {
                                setShowDeviceMenu(null);
                                try {
                                  // Test device connection
                                  const response = await deviceAPI.scanDevice(device.id);
                                  if (response.data.status === 'success') {
                                    toast.success('Device connection test successful');
                                  } else {
                                    toast.error('Device connection test failed');
                                  }
                                } catch (error: any) {
                                  toast.error(error.message || 'Connection test failed');
                                }
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <ArrowPathIcon className="h-4 w-4 mr-3" />
                              Test Connection
                            </button>
                            <button
                              onClick={() => {
                                removeDevice(device.id);
                                setShowDeviceMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                            >
                              <TrashIcon className="h-4 w-4 mr-3" />
                              Remove Device
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {filteredDevices.length === 0 && (
            <div className="p-12 text-center">
              <DevicePhoneMobileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Connect your first device to get started'
                }
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default Devices;