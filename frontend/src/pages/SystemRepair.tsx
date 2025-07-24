import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';

interface RepairIssue {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'software' | 'hardware' | 'system' | 'network';
  detected: boolean;
  fixable: boolean;
  estimatedTime: string;
}

interface RepairMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'quick' | 'deep' | 'advanced' | 'factory';
  duration: string;
  riskLevel: 'low' | 'medium' | 'high';
  dataLoss: boolean;
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

const SystemRepair: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<RepairMethod | null>(null);
  const [detectedIssues, setDetectedIssues] = useState<RepairIssue[]>([]);
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairStatus, setRepairStatus] = useState<'idle' | 'scanning' | 'repairing' | 'success' | 'failed'>('idle');
  const [currentStep, setCurrentStep] = useState(1);
  const [scanProgress, setScanProgress] = useState(0);
  const [agreedToRisks, setAgreedToRisks] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);

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

  const repairMethods: RepairMethod[] = [
    {
      id: 'quick-fix',
      name: 'Quick System Fix',
      description: 'Fix common software issues and clear cache',
      icon: WrenchScrewdriverIcon,
      category: 'quick',
      duration: '5-10 minutes',
      riskLevel: 'low',
      dataLoss: false,
    },
    {
      id: 'deep-scan',
      name: 'Deep System Repair',
      description: 'Comprehensive system analysis and repair',
      icon: CpuChipIcon,
      category: 'deep',
      duration: '30-60 minutes',
      riskLevel: 'medium',
      dataLoss: false,
    },
    {
      id: 'advanced-repair',
      name: 'Advanced Recovery',
      description: 'Fix critical system files and boot issues',
      icon: ShieldCheckIcon,
      category: 'advanced',
      duration: '60-120 minutes',
      riskLevel: 'high',
      dataLoss: false,
    },
    {
      id: 'factory-reset',
      name: 'Factory Reset',
      description: 'Complete system restore to factory settings',
      icon: DevicePhoneMobileIcon,
      category: 'factory',
      duration: '20-40 minutes',
      riskLevel: 'high',
      dataLoss: true,
    },
  ];

  const mockIssues: RepairIssue[] = [
    {
      id: 'issue-1',
      name: 'Slow Performance',
      description: 'Device is running slower than normal',
      severity: 'medium',
      category: 'software',
      detected: true,
      fixable: true,
      estimatedTime: '10 minutes',
    },
    {
      id: 'issue-2',
      name: 'Storage Full',
      description: 'Device storage is nearly full',
      severity: 'high',
      category: 'system',
      detected: true,
      fixable: true,
      estimatedTime: '5 minutes',
    },
    {
      id: 'issue-3',
      name: 'App Crashes',
      description: 'Multiple apps are crashing frequently',
      severity: 'high',
      category: 'software',
      detected: true,
      fixable: true,
      estimatedTime: '15 minutes',
    },
    {
      id: 'issue-4',
      name: 'Network Issues',
      description: 'Intermittent connectivity problems',
      severity: 'medium',
      category: 'network',
      detected: true,
      fixable: true,
      estimatedTime: '8 minutes',
    },
    {
      id: 'issue-5',
      name: 'Battery Drain',
      description: 'Unusual battery consumption detected',
      severity: 'low',
      category: 'system',
      detected: true,
      fixable: true,
      estimatedTime: '12 minutes',
    },
  ];

  useEffect(() => {
    // Simulate device scanning
    if (repairStatus === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setDetectedIssues(mockIssues);
            setRepairStatus('idle');
            setCurrentStep(3);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [repairStatus]);

  useEffect(() => {
    // Simulate repair progress
    if (repairStatus === 'repairing') {
      const interval = setInterval(() => {
        setRepairProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Simulate success/failure
            const success = Math.random() > 0.2; // 80% success rate
            setRepairStatus(success ? 'success' : 'failed');
            return 100;
          }
          return prev + Math.random() * 8;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [repairStatus]);

  const handleDeviceSelect = (device: DeviceInfo) => {
    setSelectedDevice(device);
    setCurrentStep(2);
  };

  const handleStartScan = () => {
    setRepairStatus('scanning');
    setScanProgress(0);
  };

  const handleMethodSelect = (method: RepairMethod) => {
    setSelectedMethod(method);
    setCurrentStep(4);
  };

  const handleStartRepair = () => {
    if (!selectedDevice || !selectedMethod || !agreedToRisks) return;
    if (selectedMethod.dataLoss && !backupCreated) return;
    
    setRepairStatus('repairing');
    setRepairProgress(0);
    setCurrentStep(5);
  };

  const handleReset = () => {
    setSelectedDevice(null);
    setSelectedMethod(null);
    setDetectedIssues([]);
    setRepairProgress(0);
    setScanProgress(0);
    setRepairStatus('idle');
    setCurrentStep(1);
    setAgreedToRisks(false);
    setBackupCreated(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'software':
        return DocumentTextIcon;
      case 'hardware':
        return CpuChipIcon;
      case 'system':
        return DevicePhoneMobileIcon;
      case 'network':
        return ShieldCheckIcon;
      default:
        return InformationCircleIcon;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Repair</h1>
          <p className="text-gray-600">Diagnose and fix device issues automatically</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Select Device', completed: currentStep > 1 },
              { step: 2, title: 'Scan Issues', completed: currentStep > 2 },
              { step: 3, title: 'Review Issues', completed: currentStep > 3 },
              { step: 4, title: 'Choose Repair', completed: currentStep > 4 },
              { step: 5, title: 'Repair Process', completed: repairStatus === 'success' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  item.completed || currentStep === item.step
                    ? 'bg-blue-600 border-blue-600 text-white'
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
                    item.completed ? 'bg-blue-600' : 'bg-gray-300'
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Device to Repair</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedDevices.map((device) => (
                <motion.div
                  key={device.id}
                  whileHover={{ scale: 1.02 }}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                  onClick={() => handleDeviceSelect(device)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600 mr-3" />
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

        {/* Step 2: Scan Issues */}
        {currentStep === 2 && selectedDevice && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Scanning Device</h2>
              <p className="text-gray-600 mb-8">Analyzing {selectedDevice.name} for issues...</p>
              
              {repairStatus === 'scanning' ? (
                <div className="mb-8">
                  <ArrowPathIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(scanProgress)}% complete</p>
                </div>
              ) : (
                <div className="mb-8">
                  <WrenchScrewdriverIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6">Ready to scan for issues</p>
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
                  disabled={repairStatus === 'scanning'}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {repairStatus === 'scanning' ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review Issues */}
        {currentStep === 3 && detectedIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Detected Issues</h2>
              <p className="text-gray-600">Found {detectedIssues.length} issues that can be fixed</p>
            </div>

            <div className="space-y-4 mb-6">
              {detectedIssues.map((issue) => {
                const CategoryIcon = getCategoryIcon(issue.category);
                return (
                  <div key={issue.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <CategoryIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="font-medium text-gray-900 mr-3">{issue.name}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getSeverityColor(issue.severity)
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Estimated fix time: {issue.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {issue.fixable ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Scan Again
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Choose Repair Method
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Choose Repair Method */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Repair Method</h2>
              <p className="text-gray-600">Choose the appropriate repair method for your device</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {repairMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMethod?.id === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <Icon className="h-6 w-6 text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">{method.name}</h3>
                          <span className="text-xs text-gray-500 capitalize">{method.category}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getRiskColor(method.riskLevel)
                      }`}>
                        {method.riskLevel} risk
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{method.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data Loss:</span>
                        <span className={`font-medium ${
                          method.dataLoss ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {method.dataLoss ? 'Yes' : 'No'}
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
                className="bg-gray-50 rounded-lg p-4 mb-6"
              >
                <h3 className="font-medium text-gray-900 mb-3">Repair Confirmation</h3>
                
                {selectedMethod.dataLoss && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-800 font-medium mb-1">Data Loss Warning</p>
                        <p className="text-sm text-red-700">This repair method will erase all data on your device. Please ensure you have a backup.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedMethod.dataLoss && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="backup-created"
                        checked={backupCreated}
                        onChange={(e) => setBackupCreated(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="backup-created" className="ml-2 text-sm text-gray-700">
                        I have created a backup of my device data
                      </label>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="agree-risks"
                      checked={agreedToRisks}
                      onChange={(e) => setAgreedToRisks(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agree-risks" className="ml-2 text-sm text-gray-700">
                      I understand the risks and want to proceed with the repair
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
                Back to Issues
              </button>
              <button
                onClick={handleStartRepair}
                disabled={!selectedMethod || !agreedToRisks || (selectedMethod?.dataLoss && !backupCreated)}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Repair
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Repair Process */}
        {currentStep === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <div className="mb-6">
                {repairStatus === 'repairing' && (
                  <ArrowPathIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                )}
                {repairStatus === 'success' && (
                  <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                )}
                {repairStatus === 'failed' && (
                  <XCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
                )}
                
                <h2 className={`text-2xl font-semibold mb-2 ${
                  repairStatus === 'repairing' ? 'text-blue-600' :
                  repairStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {repairStatus === 'repairing' && 'Repairing Device...'}
                  {repairStatus === 'success' && 'Repair Completed Successfully!'}
                  {repairStatus === 'failed' && 'Repair Failed'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {repairStatus === 'repairing' && `Using ${selectedMethod?.name} method`}
                  {repairStatus === 'success' && 'All detected issues have been resolved'}
                  {repairStatus === 'failed' && 'Some issues could not be resolved automatically'}
                </p>
              </div>

              {repairStatus === 'repairing' && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2 max-w-md mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${repairProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(repairProgress)}% complete</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {repairStatus === 'repairing' && (
                  <button
                    onClick={() => {
                      setRepairStatus('idle');
                      setRepairProgress(0);
                    }}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <StopIcon className="h-4 w-4 mr-2" />
                    Stop Repair
                  </button>
                )}
                
                {(repairStatus === 'success' || repairStatus === 'failed') && (
                  <>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Repair Another Device
                    </button>
                    {repairStatus === 'failed' && (
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

export default SystemRepair;