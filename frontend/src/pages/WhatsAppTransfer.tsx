import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  MicrophoneIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  UserGroupIcon,
  UserIcon,
  InformationCircleIcon,
  CloudArrowDownIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';

interface WhatsAppData {
  id: string;
  type: 'chat' | 'group' | 'media' | 'document';
  name: string;
  messageCount: number;
  size: string;
  lastMessage: string;
  selected: boolean;
  hasMedia: boolean;
}

interface TransferMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  speed: 'fast' | 'medium' | 'slow';
  reliability: 'high' | 'medium' | 'low';
  requiresBackup: boolean;
}

interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  os: string;
  version: string;
  isConnected: boolean;
  batteryLevel?: number;
  whatsappVersion?: string;
  hasWhatsApp: boolean;
}

const WhatsAppTransfer: React.FC = () => {
  const dispatch = useDispatch();
  const [sourceDevice, setSourceDevice] = useState<DeviceInfo | null>(null);
  const [targetDevice, setTargetDevice] = useState<DeviceInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<TransferMethod | null>(null);
  const [whatsappData, setWhatsappData] = useState<WhatsAppData[]>([]);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'scanning' | 'transferring' | 'success' | 'failed'>('idle');
  const [currentStep, setCurrentStep] = useState(1);
  const [scanProgress, setScanProgress] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const [currentTransferItem, setCurrentTransferItem] = useState('');

  // Mock data - replace with actual device detection
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([
    {
      id: 'device-1',
      name: 'iPhone 14 Pro',
      model: 'iPhone14,3',
      os: 'iOS',
      version: '17.2',
      isConnected: true,
      batteryLevel: 85,
      whatsappVersion: '23.24.79',
      hasWhatsApp: true,
    },
    {
      id: 'device-2',
      name: 'Samsung Galaxy S23',
      model: 'SM-S911B',
      os: 'Android',
      version: '14',
      isConnected: true,
      batteryLevel: 72,
      whatsappVersion: '2.23.24.14',
      hasWhatsApp: true,
    },
    {
      id: 'device-3',
      name: 'iPhone 12',
      model: 'iPhone13,2',
      os: 'iOS',
      version: '16.7',
      isConnected: true,
      batteryLevel: 45,
      whatsappVersion: null,
      hasWhatsApp: false,
    },
  ]);

  const transferMethods: TransferMethod[] = [
    {
      id: 'direct-transfer',
      name: 'Direct Transfer',
      description: 'Transfer data directly between devices via USB/WiFi',
      icon: ArrowRightIcon,
      speed: 'fast',
      reliability: 'high',
      requiresBackup: false,
    },
    {
      id: 'backup-restore',
      name: 'Backup & Restore',
      description: 'Create backup on source device and restore on target',
      icon: CloudArrowDownIcon,
      speed: 'medium',
      reliability: 'high',
      requiresBackup: true,
    },
    {
      id: 'cloud-sync',
      name: 'Cloud Sync',
      description: 'Sync data through WhatsApp cloud backup',
      icon: ShieldCheckIcon,
      speed: 'slow',
      reliability: 'medium',
      requiresBackup: true,
    },
  ];

  const mockWhatsAppData: WhatsAppData[] = [
    {
      id: 'chat-1',
      type: 'chat',
      name: 'John Doe',
      messageCount: 1247,
      size: '45.2 MB',
      lastMessage: 'Hey, how are you doing?',
      selected: false,
      hasMedia: true,
    },
    {
      id: 'group-1',
      type: 'group',
      name: 'Family Group',
      messageCount: 3456,
      size: '156.8 MB',
      lastMessage: 'Happy birthday! 🎉',
      selected: false,
      hasMedia: true,
    },
    {
      id: 'chat-2',
      type: 'chat',
      name: 'Sarah Wilson',
      messageCount: 892,
      size: '23.1 MB',
      lastMessage: 'See you tomorrow!',
      selected: false,
      hasMedia: false,
    },
    {
      id: 'group-2',
      type: 'group',
      name: 'Work Team',
      messageCount: 2134,
      size: '89.4 MB',
      lastMessage: 'Meeting at 3 PM',
      selected: false,
      hasMedia: true,
    },
    {
      id: 'chat-3',
      type: 'chat',
      name: 'Mom',
      messageCount: 5678,
      size: '234.7 MB',
      lastMessage: 'Love you too! ❤️',
      selected: false,
      hasMedia: true,
    },
  ];

  useEffect(() => {
    // Simulate WhatsApp data scanning
    if (transferStatus === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 10, 100); // Cap at 100%
          if (newProgress >= 100) {
            clearInterval(interval);
            setWhatsappData(mockWhatsAppData);
            setTransferStatus('idle');
            setCurrentStep(3);
            return 100;
          }
          return newProgress;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [transferStatus]);

  useEffect(() => {
    // Simulate transfer progress
    if (transferStatus === 'transferring') {
      const selectedData = whatsappData.filter(data => data.selected);
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        setTransferProgress(prev => {
          const increment = Math.random() * 5;
          const newProgress = Math.min(prev + increment, 100); // Cap at 100%
          
          // Update current transfer item
          const progressIndex = Math.floor((newProgress / 100) * selectedData.length);
          if (progressIndex < selectedData.length && progressIndex !== currentIndex) {
            setCurrentTransferItem(selectedData[progressIndex].name);
            currentIndex = progressIndex;
          }
          
          if (newProgress >= 100) {
            clearInterval(interval);
            // Simulate success/failure
            const success = Math.random() > 0.15; // 85% success rate
            setTransferStatus(success ? 'success' : 'failed');
            return 100;
          }
          return newProgress;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [transferStatus, whatsappData]);

  const handleDeviceSelect = (device: DeviceInfo, type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceDevice(device);
      // Reset target if same device selected
      if (targetDevice?.id === device.id) {
        setTargetDevice(null);
      }
    } else {
      setTargetDevice(device);
      // Reset source if same device selected
      if (sourceDevice?.id === device.id) {
        setSourceDevice(null);
      }
    }
    
    if (sourceDevice && targetDevice && sourceDevice.id !== device.id) {
      setCurrentStep(2);
    }
  };

  const handleStartScan = () => {
    setTransferStatus('scanning');
    setScanProgress(0);
  };

  const handleDataToggle = (dataId: string) => {
    setWhatsappData(prev => prev.map(data => 
      data.id === dataId ? { ...data, selected: !data.selected } : data
    ));
  };

  const handleSelectAll = () => {
    const allSelected = whatsappData.every(data => data.selected);
    setWhatsappData(prev => prev.map(data => ({ ...data, selected: !allSelected })));
  };

  const handleMethodSelect = (method: TransferMethod) => {
    setSelectedMethod(method);
    setCurrentStep(4);
  };

  const handleStartTransfer = () => {
    if (!sourceDevice || !targetDevice || !selectedMethod || !agreedToTerms) return;
    if (selectedMethod.requiresBackup && !backupCreated) return;
    
    setTransferStatus('transferring');
    setTransferProgress(0);
    setCurrentStep(5);
  };

  const handleReset = () => {
    setSourceDevice(null);
    setTargetDevice(null);
    setSelectedMethod(null);
    setWhatsappData([]);
    setTransferProgress(0);
    setScanProgress(0);
    setTransferStatus('idle');
    setCurrentStep(1);
    setAgreedToTerms(false);
    setBackupCreated(false);
    setCurrentTransferItem('');
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'slow':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDataIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return UserIcon;
      case 'group':
        return UserGroupIcon;
      case 'media':
        return PhotoIcon;
      case 'document':
        return DocumentIcon;
      default:
        return ChatBubbleLeftRightIcon;
    }
  };

  const selectedData = whatsappData.filter(data => data.selected);
  const totalSelectedSize = selectedData.reduce((total, data) => {
    const size = parseFloat(data.size.replace(' MB', ''));
    return total + size;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Transfer</h1>
          <p className="text-gray-600">Transfer WhatsApp chats, media, and data between devices</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Select Devices', completed: currentStep > 1 },
              { step: 2, title: 'Scan WhatsApp', completed: currentStep > 2 },
              { step: 3, title: 'Choose Data', completed: currentStep > 3 },
              { step: 4, title: 'Transfer Method', completed: currentStep > 4 },
              { step: 5, title: 'Transfer Process', completed: transferStatus === 'success' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  item.completed || currentStep === item.step
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {item.completed ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{item.step}</span>
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  item.completed || currentStep === item.step ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {item.title}
                </span>
                {index < 4 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    item.completed ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Device Selection */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Source and Target Devices</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Source Device */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Source Device (From)</h3>
                <div className="space-y-4">
                  {connectedDevices.filter(device => device.hasWhatsApp).map((device) => (
                    <motion.div
                      key={`source-${device.id}`}
                      whileHover={{ scale: 1.02 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        sourceDevice?.id === device.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                      }`}
                      onClick={() => handleDeviceSelect(device, 'source')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <DevicePhoneMobileIcon className="h-8 w-8 text-green-600 mr-3" />
                          <div>
                            <h4 className="font-medium text-gray-900">{device.name}</h4>
                            <p className="text-sm text-gray-600">{device.model}</p>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          device.isConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>OS:</span>
                          <span>{device.os} {device.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WhatsApp:</span>
                          <span>{device.whatsappVersion}</span>
                        </div>
                        {device.batteryLevel && (
                          <div className="flex justify-between">
                            <span>Battery:</span>
                            <span>{device.batteryLevel}%</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Target Device */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Target Device (To)</h3>
                <div className="space-y-4">
                  {connectedDevices.map((device) => (
                    <motion.div
                      key={`target-${device.id}`}
                      whileHover={{ scale: 1.02 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        targetDevice?.id === device.id
                          ? 'border-blue-500 bg-blue-50'
                          : sourceDevice?.id === device.id
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      onClick={() => sourceDevice?.id !== device.id && handleDeviceSelect(device, 'target')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <h4 className="font-medium text-gray-900">{device.name}</h4>
                            <p className="text-sm text-gray-600">{device.model}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!device.hasWhatsApp && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              No WhatsApp
                            </span>
                          )}
                          <div className={`w-3 h-3 rounded-full ${
                            device.isConnected ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>OS:</span>
                          <span>{device.os} {device.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WhatsApp:</span>
                          <span>{device.whatsappVersion || 'Not installed'}</span>
                        </div>
                        {device.batteryLevel && (
                          <div className="flex justify-between">
                            <span>Battery:</span>
                            <span>{device.batteryLevel}%</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {sourceDevice && targetDevice && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-medium text-green-800">{sourceDevice.name}</span>
                    <ArrowRightIcon className="h-5 w-5 text-green-600 mx-4 inline" />
                    <span className="font-medium text-green-800">{targetDevice.name}</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Continue to Scan
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 2: Scan WhatsApp */}
        {currentStep === 2 && sourceDevice && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Scanning WhatsApp Data</h2>
              <p className="text-gray-600 mb-8">Analyzing WhatsApp data on {sourceDevice.name}...</p>
              
              {transferStatus === 'scanning' ? (
                <div className="mb-8">
                  <ChatBubbleLeftRightIcon className="h-16 w-16 text-green-600 mx-auto mb-4 animate-pulse" />
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(scanProgress)}% complete</p>
                </div>
              ) : (
                <div className="mb-8">
                  <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6">Ready to scan WhatsApp data</p>
                </div>
              )}
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back to Devices
                </button>
                <button
                  onClick={handleStartScan}
                  disabled={transferStatus === 'scanning'}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {transferStatus === 'scanning' ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Choose Data */}
        {currentStep === 3 && whatsappData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Select WhatsApp Data</h2>
                <p className="text-gray-600">Choose which chats and data to transfer</p>
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {whatsappData.every(data => data.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {whatsappData.map((data) => {
                const Icon = getDataIcon(data.type);
                return (
                  <div
                    key={data.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      data.selected
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleDataToggle(data.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={data.selected}
                          onChange={() => handleDataToggle(data.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className={`h-6 w-6 mr-3 ${
                          data.selected ? 'text-green-600' : 'text-gray-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="font-medium text-gray-900 mr-2">{data.name}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              data.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {data.type}
                            </span>
                            {data.hasMedia && (
                              <PhotoIcon className="h-4 w-4 text-gray-400 ml-2" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{data.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{data.size}</div>
                        <div className="text-sm text-gray-600">
                          {data.messageCount.toLocaleString()} messages
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-green-800 mb-2">Selected for Transfer</h3>
                <div className="text-sm text-green-700">
                  <p>{selectedData.length} items selected</p>
                  <p>Total size: {totalSelectedSize.toFixed(1)} MB</p>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Scan Again
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={selectedData.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Choose Transfer Method
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Transfer Method */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Transfer Method</h2>
              <p className="text-gray-600">Choose how to transfer your WhatsApp data</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {transferMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMethod?.id === method.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                    }`}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <div className="text-center mb-4">
                      <Icon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-medium text-gray-900">{method.name}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 text-center">{method.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Speed:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getSpeedColor(method.speed)
                        }`}>
                          {method.speed}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reliability:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getReliabilityColor(method.reliability)
                        }`}>
                          {method.reliability}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Backup:</span>
                        <span className={`font-medium ${
                          method.requiresBackup ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {method.requiresBackup ? 'Required' : 'Not needed'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {selectedMethod && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 rounded-lg p-4 mb-6"
              >
                <h3 className="font-medium text-green-900 mb-3">Transfer Confirmation</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Transfer Details</p>
                      <p className="text-sm text-blue-700">
                        Transferring {selectedData.length} items ({totalSelectedSize.toFixed(1)} MB) 
                        from {sourceDevice?.name} to {targetDevice?.name} using {selectedMethod.name}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedMethod.requiresBackup && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="backup-created"
                        checked={backupCreated}
                        onChange={(e) => setBackupCreated(e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="backup-created" className="ml-2 text-sm text-green-800">
                        I have created a backup of the source device
                      </label>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agree-terms" className="ml-2 text-sm text-green-800">
                      I understand that this will overwrite WhatsApp data on the target device
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back to Data Selection
              </button>
              <button
                onClick={handleStartTransfer}
                disabled={!selectedMethod || !agreedToTerms || (selectedMethod?.requiresBackup && !backupCreated)}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Transfer
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Transfer Process */}
        {currentStep === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <div className="mb-6">
                {transferStatus === 'transferring' && (
                  <ArrowPathIcon className="h-16 w-16 text-green-600 mx-auto mb-4 animate-spin" />
                )}
                {transferStatus === 'success' && (
                  <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                )}
                {transferStatus === 'failed' && (
                  <XCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
                )}
                
                <h2 className={`text-2xl font-semibold mb-2 ${
                  transferStatus === 'transferring' ? 'text-green-600' :
                  transferStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transferStatus === 'transferring' && 'Transferring WhatsApp Data...'}
                  {transferStatus === 'success' && 'Transfer Completed Successfully!'}
                  {transferStatus === 'failed' && 'Transfer Failed'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {transferStatus === 'transferring' && `Using ${selectedMethod?.name} method`}
                  {transferStatus === 'success' && 'All selected WhatsApp data has been transferred'}
                  {transferStatus === 'failed' && 'Some data could not be transferred'}
                </p>
              </div>

              {transferStatus === 'transferring' && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transferProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{Math.round(transferProgress)}% complete</p>
                  {currentTransferItem && (
                    <p className="text-xs text-gray-500">Transferring: {currentTransferItem}</p>
                  )}
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {transferStatus === 'transferring' && (
                  <button
                    onClick={() => {
                      setTransferStatus('idle');
                      setTransferProgress(0);
                    }}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <StopIcon className="h-4 w-4 mr-2" />
                    Stop Transfer
                  </button>
                )}
                
                {(transferStatus === 'success' || transferStatus === 'failed') && (
                  <>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Transfer Another Device
                    </button>
                    {transferStatus === 'failed' && (
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Try Different Method
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTransfer;