import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DevicePhoneMobileIcon,
  LockClosedIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';

interface UnlockMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  supported: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  successRate: number;
}

interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  os: string;
  version: string;
  lockType: 'pin' | 'pattern' | 'password' | 'fingerprint' | 'face' | 'unknown';
  isConnected: boolean;
  batteryLevel?: number;
}

const ScreenUnlock: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<UnlockMethod | null>(null);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [unlockStatus, setUnlockStatus] = useState<'idle' | 'scanning' | 'unlocking' | 'success' | 'failed'>('idle');
  const [showWarning, setShowWarning] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Mock data - replace with actual device detection
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([
    {
      id: 'device-1',
      name: 'iPhone 14 Pro',
      model: 'iPhone14,3',
      os: 'iOS',
      version: '17.2',
      lockType: 'pin',
      isConnected: true,
      batteryLevel: 85,
    },
    {
      id: 'device-2',
      name: 'Samsung Galaxy S23',
      model: 'SM-S911B',
      os: 'Android',
      version: '14',
      lockType: 'pattern',
      isConnected: true,
      batteryLevel: 72,
    },
  ]);

  const unlockMethods: UnlockMethod[] = [
    {
      id: 'bruteforce-pin',
      name: 'PIN Brute Force',
      description: 'Systematically try common PIN combinations',
      icon: LockClosedIcon,
      supported: true,
      difficulty: 'medium',
      estimatedTime: '15-45 minutes',
      successRate: 75,
    },
    {
      id: 'pattern-analysis',
      name: 'Pattern Analysis',
      description: 'Analyze screen smudges and common patterns',
      icon: DevicePhoneMobileIcon,
      supported: true,
      difficulty: 'easy',
      estimatedTime: '5-15 minutes',
      successRate: 85,
    },
    {
      id: 'password-dictionary',
      name: 'Password Dictionary',
      description: 'Try common passwords and variations',
      icon: DocumentTextIcon,
      supported: true,
      difficulty: 'hard',
      estimatedTime: '30-90 minutes',
      successRate: 45,
    },
    {
      id: 'exploit-vulnerability',
      name: 'System Exploit',
      description: 'Use known security vulnerabilities',
      icon: ShieldCheckIcon,
      supported: false,
      difficulty: 'hard',
      estimatedTime: '10-30 minutes',
      successRate: 90,
    },
  ];

  useEffect(() => {
    // Simulate device scanning
    if (unlockStatus === 'scanning') {
      const timer = setTimeout(() => {
        setUnlockStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [unlockStatus]);

  useEffect(() => {
    // Simulate unlock progress
    if (unlockStatus === 'unlocking') {
      const interval = setInterval(() => {
        setUnlockProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Simulate success/failure
            const success = Math.random() > 0.3; // 70% success rate
            setUnlockStatus(success ? 'success' : 'failed');
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [unlockStatus]);

  const handleDeviceSelect = (device: DeviceInfo) => {
    setSelectedDevice(device);
    setCurrentStep(2);
  };

  const handleMethodSelect = (method: UnlockMethod) => {
    if (!method.supported) return;
    setSelectedMethod(method);
    setCurrentStep(3);
  };

  const handleStartUnlock = () => {
    if (!selectedDevice || !selectedMethod || !agreedToTerms) return;
    setUnlockStatus('unlocking');
    setUnlockProgress(0);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setSelectedDevice(null);
    setSelectedMethod(null);
    setUnlockProgress(0);
    setUnlockStatus('idle');
    setCurrentStep(1);
    setAgreedToTerms(false);
  };

  const handleScanDevices = () => {
    setUnlockStatus('scanning');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'unlocking':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Screen Unlock</h1>
          <p className="text-gray-600">Unlock locked devices using advanced techniques</p>
        </div>

        {/* Warning Banner */}
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Legal Notice</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  This tool should only be used on devices you own or have explicit permission to unlock. 
                  Unauthorized access to devices may violate local laws and regulations.
                </p>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  I understand and agree
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Select Device', completed: currentStep > 1 },
              { step: 2, title: 'Choose Method', completed: currentStep > 2 },
              { step: 3, title: 'Confirm & Start', completed: currentStep > 3 },
              { step: 4, title: 'Unlock Process', completed: unlockStatus === 'success' },
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
                {index < 3 && (
                  <div className={`w-16 h-0.5 mx-4 ${
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Connected Devices</h2>
              <button
                onClick={handleScanDevices}
                disabled={unlockStatus === 'scanning'}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {unlockStatus === 'scanning' ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                )}
                {unlockStatus === 'scanning' ? 'Scanning...' : 'Scan for Devices'}
              </button>
            </div>

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
                    <div className="flex justify-between">
                      <span>Lock Type:</span>
                      <span className="capitalize">{device.lockType}</span>
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
          </motion.div>
        )}

        {/* Step 2: Method Selection */}
        {currentStep === 2 && selectedDevice && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Unlock Method</h2>
              <p className="text-gray-600">Choose the best method for {selectedDevice.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: method.supported ? 1.02 : 1 }}
                    className={`border rounded-lg p-4 transition-all ${
                      method.supported
                        ? 'border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-md'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <Icon className={`h-6 w-6 mr-3 ${
                          method.supported ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{method.name}</h3>
                          {!method.supported && (
                            <span className="text-xs text-red-600">Not Available</span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getDifficultyColor(method.difficulty)
                      }`}>
                        {method.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Time:</span>
                        <span className="font-medium">{method.estimatedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="font-medium">{method.successRate}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back to Devices
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && selectedDevice && selectedMethod && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Confirm Unlock Process</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Selected Device</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span>{selectedDevice.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">OS:</span>
                    <span>{selectedDevice.os} {selectedDevice.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lock Type:</span>
                    <span className="capitalize">{selectedDevice.lockType}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Unlock Method</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span>{selectedMethod.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="capitalize">{selectedMethod.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span>{selectedMethod.successRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">Important Disclaimer</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• This process may take significant time to complete</li>
                    <li>• Multiple attempts may be required for success</li>
                    <li>• Device data will not be modified or deleted</li>
                    <li>• You confirm you own this device or have permission to unlock it</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="agree-terms" className="ml-2 text-sm text-gray-700">
                I understand the risks and confirm I have the right to unlock this device
              </label>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back to Methods
              </button>
              <button
                onClick={handleStartUnlock}
                disabled={!agreedToTerms}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Unlock Process
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Unlock Process */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-center">
              <div className="mb-6">
                {unlockStatus === 'unlocking' && (
                  <ArrowPathIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                )}
                {unlockStatus === 'success' && (
                  <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                )}
                {unlockStatus === 'failed' && (
                  <LockClosedIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
                )}
                
                <h2 className={`text-2xl font-semibold mb-2 ${getStatusColor(unlockStatus)}`}>
                  {unlockStatus === 'unlocking' && 'Unlocking Device...'}
                  {unlockStatus === 'success' && 'Device Unlocked Successfully!'}
                  {unlockStatus === 'failed' && 'Unlock Failed'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {unlockStatus === 'unlocking' && `Using ${selectedMethod?.name} method`}
                  {unlockStatus === 'success' && 'The device has been successfully unlocked'}
                  {unlockStatus === 'failed' && 'The unlock process was unsuccessful'}
                </p>
              </div>

              {unlockStatus === 'unlocking' && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${unlockProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(unlockProgress)}% complete</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {unlockStatus === 'unlocking' && (
                  <button
                    onClick={() => {
                      setUnlockStatus('idle');
                      setUnlockProgress(0);
                    }}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <StopIcon className="h-4 w-4 mr-2" />
                    Stop Process
                  </button>
                )}
                
                {(unlockStatus === 'success' || unlockStatus === 'failed') && (
                  <>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Start New Unlock
                    </button>
                    {unlockStatus === 'failed' && (
                      <button
                        onClick={() => setCurrentStep(2)}
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

export default ScreenUnlock;