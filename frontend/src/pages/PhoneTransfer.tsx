import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  WifiIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { transferAPI, deviceAPI } from '../services/api';
import { Device, TransferSession } from '../services/types';
import { useTransferProgress, useWebSocketRoom } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';



interface TransferData {
  contacts: { count: number; size: number; selected: boolean };
  photos: { count: number; size: number; selected: boolean };
  videos: { count: number; size: number; selected: boolean };
  music: { count: number; size: number; selected: boolean };
  documents: { count: number; size: number; selected: boolean };
  messages: { count: number; size: number; selected: boolean };
  callLogs: { count: number; size: number; selected: boolean };
  calendar: { count: number; size: number; selected: boolean };
}



const PhoneTransfer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [step, setStep] = useState<'setup' | 'connect' | 'select' | 'transfer'>('setup');
  const [sourceDevice, setSourceDevice] = useState<Device | null>(null);
  const [targetDevice, setTargetDevice] = useState<Device | null>(null);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [transferData, setTransferData] = useState<TransferData>({
    contacts: { count: 1250, size: 2.5, selected: true },
    photos: { count: 3420, size: 1250.8, selected: true },
    videos: { count: 156, size: 2100.3, selected: true },
    music: { count: 890, size: 450.2, selected: false },
    documents: { count: 234, size: 125.6, selected: true },
    messages: { count: 5670, size: 89.4, selected: true },
    callLogs: { count: 1890, size: 5.2, selected: false },
    calendar: { count: 145, size: 1.8, selected: true }
  });
  const [transferSession, setTransferSession] = useState<TransferSession | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'wifi' | 'qr'>('wifi');

  // Use WebSocket for real-time progress updates
  const { progress: transferProgress } = useTransferProgress(transferSession?.id || null);
  
  // Join WebSocket room for this transfer session
  useWebSocketRoom(transferSession ? `transfer:${transferSession.id}` : null);

  const dataTypeIcons = {
    contacts: UserIcon,
    photos: PhotoIcon,
    videos: VideoCameraIcon,
    music: MusicalNoteIcon,
    documents: DocumentIcon,
    messages: ChatBubbleLeftRightIcon,
    callLogs: PhoneIcon,
    calendar: CalendarIcon
  };

  const dataTypeLabels = {
    contacts: 'Contacts',
    photos: 'Photos',
    videos: 'Videos',
    music: 'Music',
    documents: 'Documents',
    messages: 'Messages',
    callLogs: 'Call Logs',
    calendar: 'Calendar'
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await deviceAPI.getDevices();
        setAvailableDevices(response.data);
      } catch (error: any) {
        console.error('Failed to fetch devices:', error);
        toast.error('Failed to load devices. Please try again.');
      }
    };

    fetchDevices();
  }, []);

  // Handle real-time transfer progress updates from WebSocket
  useEffect(() => {
    if (transferProgress) {
      // Update transfer session with real-time progress
      setTransferSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progress: transferProgress.progress || prev.progress,
          status: transferProgress.status || prev.status,
          currentItem: transferProgress.currentItem || prev.currentItem,
          transferredItems: transferProgress.transferredItems || prev.transferredItems,
          speed: transferProgress.speed || prev.speed,
          timeRemaining: transferProgress.timeRemaining || prev.timeRemaining
        };
      });

      // Handle completion
      if (transferProgress.status === 'completed') {
        toast.success('Transfer completed successfully!');
      } else if (transferProgress.status === 'failed') {
        toast.error('Transfer failed. Please try again.');
      }
    }
  }, [transferProgress]);

  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      // Refresh devices list from API
      const response = await deviceAPI.getDevices();
      setAvailableDevices(response.data);
      toast.success('Device scan completed');
    } catch (error: any) {
      console.error('Failed to scan for devices:', error);
      toast.error(error.message || 'Failed to scan for devices');
    } finally {
      setIsScanning(false);
    }
  };

  const connectDevice = async (device: Device, role: 'source' | 'target') => {
    try {
      // Validate device connection via API
      const otherDevice = role === 'source' ? targetDevice : sourceDevice;
      if (otherDevice) {
        const validationResponse = await transferAPI.validateDevices({
          sourceDeviceId: role === 'source' ? device.id : otherDevice.id,
          targetDeviceId: role === 'target' ? device.id : otherDevice.id
        });
        
        if (!validationResponse.data.valid) {
          toast.error(validationResponse.data.message || 'Device validation failed');
          return;
        }
      }
      
      // Update device connection status
      await deviceAPI.updateDevice(device.id, { isConnected: true });
      
      const connectedDevice = { ...device, isConnected: true };
      
      if (role === 'source') {
        setSourceDevice(connectedDevice);
      } else {
        setTargetDevice(connectedDevice);
      }
      
      toast.success(`Connected to ${device.name}`);
      
      if (sourceDevice && role === 'target' || targetDevice && role === 'source') {
        setStep('select');
      }
    } catch (error: any) {
      console.error('Failed to connect device:', error);
      toast.error(error.message || 'Failed to connect to device');
    }
  };

  const toggleDataType = (type: keyof TransferData) => {
    setTransferData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        selected: !prev[type].selected
      }
    }));
  };

  const selectAllData = () => {
    setTransferData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key as keyof TransferData].selected = true;
      });
      return updated;
    });
  };

  const deselectAllData = () => {
    setTransferData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key as keyof TransferData].selected = false;
      });
      return updated;
    });
  };

  const startTransfer = async () => {
    if (!sourceDevice || !targetDevice) {
      toast.error('Please connect both devices');
      return;
    }

    const selectedData = Object.entries(transferData).filter(([_, data]) => data.selected);
    if (selectedData.length === 0) {
      toast.error('Please select data to transfer');
      return;
    }

    try {
      // Start transfer session via API
      const response = await transferAPI.startTransfer({
        sourceDeviceId: sourceDevice.id,
        targetDeviceId: targetDevice.id,
        dataTypes: selectedData.map(([type, _]) => type),
        connectionMethod,
        transferOptions: {
          overwriteExisting: false,
          compressData: true
        }
      });
      
      const session = response.data;
      setTransferSession(session);
      setStep('transfer');
      
      // Real-time updates will be handled by the WebSocket hook
      // No need for polling anymore!
      
    } catch (error: any) {
      console.error('Failed to start transfer:', error);
      toast.error(error.message || 'Failed to start transfer. Please try again.');
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getTotalSelectedSize = () => {
    return Object.values(transferData)
      .filter(data => data.selected)
      .reduce((sum, data) => sum + data.size, 0);
  };

  const getTotalSelectedItems = () => {
    return Object.values(transferData)
      .filter(data => data.selected)
      .reduce((sum, data) => sum + data.count, 0);
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Connection Method</h2>
        <p className="text-gray-600">Select how you want to connect your devices</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
            connectionMethod === 'wifi'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setConnectionMethod('wifi')}
        >
          <div className="text-center">
            <WifiIcon className="h-12 w-12 mx-auto text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Wi-Fi Connection</h3>
            <p className="text-gray-600 text-sm">
              Connect devices over the same Wi-Fi network for fast, reliable transfer
            </p>
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
            connectionMethod === 'qr'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setConnectionMethod('qr')}
        >
          <div className="text-center">
            <QrCodeIcon className="h-12 w-12 mx-auto text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Code</h3>
            <p className="text-gray-600 text-sm">
              Scan QR code to establish direct connection between devices
            </p>
          </div>
        </motion.div>
      </div>
      
      <div className="text-center">
        <button
          onClick={() => setStep('connect')}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderConnectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Devices</h2>
        <p className="text-gray-600">Select source and target devices for the transfer</p>
      </div>
      
      <div className="flex items-center justify-center space-x-8">
        {/* Source Device */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Device</h3>
          {sourceDevice ? (
            <div className="bg-success-50 border border-success-200 rounded-xl p-4 w-64">
              <DevicePhoneMobileIcon className="h-12 w-12 mx-auto text-success-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">{sourceDevice.name}</div>
              <div className="text-xs text-gray-600">{sourceDevice.model}</div>
              <div className="text-xs text-success-600 mt-1">Connected</div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 w-64">
              <DevicePhoneMobileIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <div className="text-sm text-gray-600">Select source device</div>
            </div>
          )}
        </div>
        
        <ArrowRightIcon className="h-8 w-8 text-gray-400" />
        
        {/* Target Device */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Device</h3>
          {targetDevice ? (
            <div className="bg-success-50 border border-success-200 rounded-xl p-4 w-64">
              <DevicePhoneMobileIcon className="h-12 w-12 mx-auto text-success-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">{targetDevice.name}</div>
              <div className="text-xs text-gray-600">{targetDevice.model}</div>
              <div className="text-xs text-success-600 mt-1">Connected</div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 w-64">
              <DevicePhoneMobileIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <div className="text-sm text-gray-600">Select target device</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Available Devices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Available Devices</h3>
          <button
            onClick={scanForDevices}
            disabled={isScanning}
            className="flex items-center px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isScanning ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Scan for Devices'
            )}
          </button>
        </div>
        
        <div className="space-y-3">
          {availableDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <DevicePhoneMobileIcon className="h-8 w-8 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{device.name}</div>
                  <div className="text-sm text-gray-600">{device.model} • {device.osVersion}</div>
                  <div className="text-xs text-gray-500">
                    Battery: {device.batteryLevel}% • Storage: {device.storageUsed}GB/{device.storageTotal}GB
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => connectDevice(device, 'source')}
                  disabled={device.id === sourceDevice?.id}
                  className="px-3 py-1 text-sm text-primary-600 border border-primary-600 rounded hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {device.id === sourceDevice?.id ? 'Source' : 'Set as Source'}
                </button>
                <button
                  onClick={() => connectDevice(device, 'target')}
                  disabled={device.id === targetDevice?.id}
                  className="px-3 py-1 text-sm text-success-600 border border-success-600 rounded hover:bg-success-50 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {device.id === targetDevice?.id ? 'Target' : 'Set as Target'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Data to Transfer</h2>
        <p className="text-gray-600">Choose what data you want to transfer between devices</p>
      </div>
      
      {/* Summary */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-primary-800">
            <span className="font-medium">{getTotalSelectedItems().toLocaleString()}</span> items selected
            <span className="mx-2">•</span>
            <span className="font-medium">{formatFileSize(getTotalSelectedSize())}</span> total size
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={selectAllData}
              className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded hover:bg-primary-100 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAllData}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>
      
      {/* Data Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(transferData).map(([type, data]) => {
          const Icon = dataTypeIcons[type as keyof typeof dataTypeIcons];
          return (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                data.selected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleDataType(type as keyof TransferData)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-8 w-8 ${
                    data.selected ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-900">
                      {dataTypeLabels[type as keyof typeof dataTypeLabels]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {data.count.toLocaleString()} items • {formatFileSize(data.size)}
                    </div>
                  </div>
                </div>
                
                <input
                  type="checkbox"
                  checked={data.selected}
                  onChange={() => toggleDataType(type as keyof TransferData)}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="text-center">
        <button
          onClick={startTransfer}
          disabled={getTotalSelectedItems() === 0}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Start Transfer
        </button>
      </div>
    </div>
  );

  const renderTransferStep = () => {
    if (!transferSession) return null;
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {transferSession.status === 'completed' ? 'Transfer Completed!' : 'Transferring Data'}
          </h2>
          <p className="text-gray-600">
            {transferSession.status === 'completed'
              ? 'All selected data has been successfully transferred'
              : 'Please keep both devices connected during the transfer'
            }
          </p>
        </div>
        
        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {transferSession.status === 'completed' ? (
                <CheckCircleIcon className="h-8 w-8 text-success-600" />
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              )}
              <div>
                <div className="font-medium text-gray-900">{transferSession.currentItem}</div>
                <div className="text-sm text-gray-600">
                  {transferSession.transferredItems.toLocaleString()} of {transferSession.totalItems.toLocaleString()} items
                </div>
              </div>
            </div>
            
            {transferSession.status === 'transferring' && (
              <div className="flex items-center space-x-4">
                <div className="text-right text-sm text-gray-600">
                  <div>{transferSession.speed?.toFixed(1) || 0} MB/s</div>
                  <div>{formatTime(transferSession.timeRemaining || 0)} remaining</div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        await transferAPI.pauseTransfer(transferSession.id);
                        toast.success('Transfer paused');
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to pause transfer');
                      }
                    }}
                    className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await transferAPI.cancelTransfer(transferSession.id);
                        setTransferSession(null);
                        setStep('setup');
                        setSourceDevice(null);
                        setTargetDevice(null);
                        toast.success('Transfer cancelled');
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to cancel transfer');
                      }
                    }}
                    className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {transferSession.status === 'paused' && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-yellow-600 font-medium">Transfer Paused</div>
                <button
                  onClick={async () => {
                    try {
                      await transferAPI.resumeTransfer(transferSession.id);
                      toast.success('Transfer resumed');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to resume transfer');
                    }
                  }}
                  className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  Resume
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(transferSession.progress)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-primary-600 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${transferSession.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
        
        {/* Device Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Source Device</h3>
            <div className="flex items-center space-x-3">
              <DevicePhoneMobileIcon className="h-8 w-8 text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">{transferSession.sourceDevice.name}</div>
                <div className="text-xs text-gray-600">{transferSession.sourceDevice.model}</div>
                <div className="text-xs text-success-600">Connected</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Target Device</h3>
            <div className="flex items-center space-x-3">
              <DevicePhoneMobileIcon className="h-8 w-8 text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">{transferSession.targetDevice.name}</div>
                <div className="text-xs text-gray-600">{transferSession.targetDevice.model}</div>
                <div className="text-xs text-success-600">Connected</div>
              </div>
            </div>
          </div>
        </div>
        
        {transferSession.status === 'completed' && (
          <div className="text-center">
            <button
              onClick={() => {
                setStep('setup');
                setSourceDevice(null);
                setTargetDevice(null);
                setTransferSession(null);
              }}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Start New Transfer
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phone Transfer</h1>
            <p className="text-gray-600 mt-1">
              Transfer data between mobile devices quickly and securely
            </p>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center space-x-2">
            {['setup', 'connect', 'select', 'transfer'].map((stepName, index) => {
              const isActive = step === stepName;
              const isCompleted = ['setup', 'connect', 'select', 'transfer'].indexOf(step) > index;
              
              return (
                <React.Fragment key={stepName}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : isCompleted
                      ? 'bg-success-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 ${
                      isCompleted ? 'bg-success-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        {step === 'setup' && renderSetupStep()}
        {step === 'connect' && renderConnectStep()}
        {step === 'select' && renderSelectStep()}
        {step === 'transfer' && renderTransferStep()}
      </div>
    </div>
  );
};

export default PhoneTransfer;