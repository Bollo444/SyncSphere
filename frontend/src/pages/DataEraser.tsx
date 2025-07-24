import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  DocumentIcon,
  FolderIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DevicePhoneMobileIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';

interface EraseMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  passes: number;
  security: 'basic' | 'military' | 'government';
  duration: string;
  recoverable: boolean;
}

interface DataCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  count: number;
  size: string;
  selected: boolean;
  critical: boolean;
}

interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  os: string;
  version: string;
  isConnected: boolean;
  batteryLevel?: number;
  storageUsed?: number;
  storageTotal?: number;
}

const DataEraser: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<EraseMethod | null>(null);
  const [dataCategories, setDataCategories] = useState<DataCategory[]>([]);
  const [eraseProgress, setEraseProgress] = useState(0);
  const [eraseStatus, setEraseStatus] = useState<'idle' | 'scanning' | 'erasing' | 'success' | 'failed'>('idle');
  const [currentStep, setCurrentStep] = useState(1);
  const [scanProgress, setScanProgress] = useState(0);
  const [agreedToRisks, setAgreedToRisks] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [currentPass, setCurrentPass] = useState(0);

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
      storageUsed: 128,
      storageTotal: 256,
    },
    {
      id: 'device-2',
      name: 'Samsung Galaxy S23',
      model: 'SM-S911B',
      os: 'Android',
      version: '14',
      isConnected: true,
      batteryLevel: 72,
      storageUsed: 89,
      storageTotal: 128,
    },
  ]);

  const eraseMethods: EraseMethod[] = [
    {
      id: 'quick-erase',
      name: 'Quick Erase',
      description: 'Single pass overwrite - fast but less secure',
      icon: TrashIcon,
      passes: 1,
      security: 'basic',
      duration: '5-15 minutes',
      recoverable: true,
    },
    {
      id: 'secure-erase',
      name: 'Secure Erase',
      description: 'DoD 5220.22-M standard - 3 pass overwrite',
      icon: ShieldCheckIcon,
      passes: 3,
      security: 'military',
      duration: '30-60 minutes',
      recoverable: false,
    },
    {
      id: 'military-erase',
      name: 'Military Grade',
      description: 'DoD 5220.22-M ECE - 7 pass overwrite',
      icon: ShieldCheckIcon,
      passes: 7,
      security: 'military',
      duration: '2-4 hours',
      recoverable: false,
    },
    {
      id: 'government-erase',
      name: 'Government Grade',
      description: 'NSA approved - 35 pass Gutmann method',
      icon: ShieldCheckIcon,
      passes: 35,
      security: 'government',
      duration: '8-12 hours',
      recoverable: false,
    },
  ];

  const mockDataCategories: DataCategory[] = [
    {
      id: 'photos',
      name: 'Photos & Images',
      description: 'All image files including camera roll',
      icon: PhotoIcon,
      count: 2847,
      size: '12.3 GB',
      selected: false,
      critical: true,
    },
    {
      id: 'videos',
      name: 'Videos',
      description: 'Video files and recordings',
      icon: VideoCameraIcon,
      count: 156,
      size: '8.7 GB',
      selected: false,
      critical: true,
    },
    {
      id: 'documents',
      name: 'Documents',
      description: 'PDFs, Word docs, spreadsheets',
      icon: DocumentIcon,
      count: 423,
      size: '1.2 GB',
      selected: false,
      critical: true,
    },
    {
      id: 'music',
      name: 'Music & Audio',
      description: 'Music files and audio recordings',
      icon: MusicalNoteIcon,
      count: 1205,
      size: '4.8 GB',
      selected: false,
      critical: false,
    },
    {
      id: 'apps',
      name: 'App Data',
      description: 'Application data and caches',
      icon: DevicePhoneMobileIcon,
      count: 89,
      size: '3.4 GB',
      selected: false,
      critical: false,
    },
    {
      id: 'system',
      name: 'System Files',
      description: 'OS files and system data',
      icon: FolderIcon,
      count: 0,
      size: '15.2 GB',
      selected: false,
      critical: true,
    },
  ];

  useEffect(() => {
    // Simulate data scanning
    if (eraseStatus === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setDataCategories(mockDataCategories);
            setEraseStatus('idle');
            setCurrentStep(3);
            return 100;
          }
          return prev + Math.random() * 12;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [eraseStatus]);

  useEffect(() => {
    // Simulate erase progress
    if (eraseStatus === 'erasing' && selectedMethod) {
      const interval = setInterval(() => {
        setEraseProgress(prev => {
          const increment = Math.random() * (100 / (selectedMethod.passes * 20));
          const newProgress = prev + increment;
          
          // Update current pass
          const newPass = Math.floor((newProgress / 100) * selectedMethod.passes) + 1;
          setCurrentPass(Math.min(newPass, selectedMethod.passes));
          
          if (newProgress >= 100) {
            clearInterval(interval);
            // Simulate success/failure
            const success = Math.random() > 0.1; // 90% success rate
            setEraseStatus(success ? 'success' : 'failed');
            return 100;
          }
          return newProgress;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [eraseStatus, selectedMethod]);

  const handleDeviceSelect = (device: DeviceInfo) => {
    setSelectedDevice(device);
    setCurrentStep(2);
  };

  const handleStartScan = () => {
    setEraseStatus('scanning');
    setScanProgress(0);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setDataCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, selected: !cat.selected } : cat
    ));
  };

  const handleSelectAll = () => {
    const allSelected = dataCategories.every(cat => cat.selected);
    setDataCategories(prev => prev.map(cat => ({ ...cat, selected: !allSelected })));
  };

  const handleMethodSelect = (method: EraseMethod) => {
    setSelectedMethod(method);
    setCurrentStep(4);
  };

  const handleStartErase = () => {
    if (!selectedDevice || !selectedMethod || !agreedToRisks || confirmationText !== 'ERASE') return;
    
    setEraseStatus('erasing');
    setEraseProgress(0);
    setCurrentPass(1);
    setCurrentStep(5);
  };

  const handleReset = () => {
    setSelectedDevice(null);
    setSelectedMethod(null);
    setDataCategories([]);
    setEraseProgress(0);
    setScanProgress(0);
    setEraseStatus('idle');
    setCurrentStep(1);
    setAgreedToRisks(false);
    setConfirmationText('');
    setCurrentPass(0);
  };

  const getSecurityColor = (security: string) => {
    switch (security) {
      case 'basic':
        return 'text-yellow-600 bg-yellow-100';
      case 'military':
        return 'text-orange-600 bg-orange-100';
      case 'government':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const selectedCategories = dataCategories.filter(cat => cat.selected);
  const totalSelectedSize = selectedCategories.reduce((total, cat) => {
    const size = parseFloat(cat.size.replace(' GB', ''));
    return total + size;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Eraser</h1>
          <p className="text-gray-600">Securely and permanently delete sensitive data</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">Critical Warning</h3>
              <p className="text-sm text-red-700">
                Data erasure is permanent and irreversible. Ensure you have backups of any important data before proceeding.
                This tool should only be used when you want to permanently destroy data.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Select Device', completed: currentStep > 1 },
              { step: 2, title: 'Scan Data', completed: currentStep > 2 },
              { step: 3, title: 'Choose Data', completed: currentStep > 3 },
              { step: 4, title: 'Erase Method', completed: currentStep > 4 },
              { step: 5, title: 'Erase Process', completed: eraseStatus === 'success' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  item.completed || currentStep === item.step
                    ? 'bg-red-600 border-red-600 text-white'
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
                    item.completed ? 'bg-red-600' : 'bg-gray-300'
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Device for Data Erasure</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedDevices.map((device) => (
                <motion.div
                  key={device.id}
                  whileHover={{ scale: 1.02 }}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-red-300 hover:shadow-md transition-all"
                  onClick={() => handleDeviceSelect(device)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="h-8 w-8 text-red-600 mr-3" />
                      <div>
                        <h3 className="font-medium text-gray-900">{device.name}</h3>
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
                    {device.batteryLevel && (
                      <div className="flex justify-between">
                        <span>Battery:</span>
                        <span>{device.batteryLevel}%</span>
                      </div>
                    )}
                    {device.storageUsed && device.storageTotal && (
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span>{device.storageUsed}GB / {device.storageTotal}GB</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Scan Data */}
        {currentStep === 2 && selectedDevice && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Scanning Device Data</h2>
              <p className="text-gray-600 mb-8">Analyzing data on {selectedDevice.name}...</p>
              
              {eraseStatus === 'scanning' ? (
                <div className="mb-8">
                  <ArrowPathIcon className="h-16 w-16 text-red-600 mx-auto mb-4 animate-spin" />
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(scanProgress)}% complete</p>
                </div>
              ) : (
                <div className="mb-8">
                  <TrashIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6">Ready to scan for data</p>
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
                  disabled={eraseStatus === 'scanning'}
                  className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {eraseStatus === 'scanning' ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Choose Data */}
        {currentStep === 3 && dataCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Data to Erase</h2>
                <p className="text-gray-600">Choose which data categories to permanently delete</p>
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {dataCategories.every(cat => cat.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {dataCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      category.selected
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={category.selected}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className={`h-6 w-6 mr-3 ${
                          category.selected ? 'text-red-600' : 'text-gray-600'
                        }`} />
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-medium text-gray-900 mr-2">{category.name}</h3>
                            {category.critical && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{category.size}</div>
                        <div className="text-sm text-gray-600">
                          {category.count > 0 ? `${category.count.toLocaleString()} items` : 'System data'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCategories.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-red-800 mb-2">Selected for Erasure</h3>
                <div className="text-sm text-red-700">
                  <p>{selectedCategories.length} categories selected</p>
                  <p>Total size: {totalSelectedSize.toFixed(1)} GB</p>
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
                disabled={selectedCategories.length === 0}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Choose Erase Method
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Erase Method */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Erasure Method</h2>
              <p className="text-gray-600">Choose the security level for data destruction</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {eraseMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMethod?.id === method.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:shadow-md'
                    }`}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <Icon className="h-6 w-6 text-red-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">{method.name}</h3>
                          <span className="text-xs text-gray-500">{method.passes} pass{method.passes > 1 ? 'es' : ''}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getSecurityColor(method.security)
                      }`}>
                        {method.security}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{method.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recoverable:</span>
                        <span className={`font-medium ${
                          method.recoverable ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {method.recoverable ? 'Possibly' : 'No'}
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
                className="bg-red-50 rounded-lg p-4 mb-6"
              >
                <h3 className="font-medium text-red-900 mb-3">Final Confirmation Required</h3>
                
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-red-800 font-medium mb-1">This action cannot be undone!</p>
                      <p className="text-sm text-red-700">
                        You are about to permanently erase {selectedCategories.length} data categories 
                        ({totalSelectedSize.toFixed(1)} GB) using {selectedMethod.name}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="agree-risks"
                      checked={agreedToRisks}
                      onChange={(e) => setAgreedToRisks(e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agree-risks" className="ml-2 text-sm text-red-800">
                      I understand this will permanently destroy the selected data
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-red-800 mb-2">
                      Type "ERASE" to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                      placeholder="Type ERASE here"
                    />
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
                onClick={handleStartErase}
                disabled={!selectedMethod || !agreedToRisks || confirmationText !== 'ERASE'}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Start Erasure
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Erase Process */}
        {currentStep === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <div className="mb-6">
                {eraseStatus === 'erasing' && (
                  <ArrowPathIcon className="h-16 w-16 text-red-600 mx-auto mb-4 animate-spin" />
                )}
                {eraseStatus === 'success' && (
                  <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                )}
                {eraseStatus === 'failed' && (
                  <XCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
                )}
                
                <h2 className={`text-2xl font-semibold mb-2 ${
                  eraseStatus === 'erasing' ? 'text-red-600' :
                  eraseStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {eraseStatus === 'erasing' && 'Erasing Data...'}
                  {eraseStatus === 'success' && 'Data Erased Successfully!'}
                  {eraseStatus === 'failed' && 'Erasure Failed'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {eraseStatus === 'erasing' && `Using ${selectedMethod?.name} method`}
                  {eraseStatus === 'success' && 'All selected data has been permanently destroyed'}
                  {eraseStatus === 'failed' && 'Some data could not be erased'}
                </p>
              </div>

              {eraseStatus === 'erasing' && selectedMethod && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${eraseProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{Math.round(eraseProgress)}% complete</p>
                  <p className="text-xs text-gray-500">
                    Pass {currentPass} of {selectedMethod.passes}
                  </p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {eraseStatus === 'erasing' && (
                  <button
                    onClick={() => {
                      setEraseStatus('idle');
                      setEraseProgress(0);
                    }}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <StopIcon className="h-4 w-4 mr-2" />
                    Stop Erasure
                  </button>
                )}
                
                {(eraseStatus === 'success' || eraseStatus === 'failed') && (
                  <>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Erase Another Device
                    </button>
                    {eraseStatus === 'failed' && (
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

export default DataEraser;