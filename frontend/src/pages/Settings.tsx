import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  CommandLineIcon,
  FolderIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  soundEnabled: boolean;
  autoUpdate: boolean;
  analyticsEnabled: boolean;
}

interface TransferSettings {
  defaultLocation: string;
  maxConcurrentTransfers: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  verifyIntegrity: boolean;
  resumeTransfers: boolean;
  deleteAfterTransfer: boolean;
  overwriteExisting: boolean;
}

interface NetworkSettings {
  connectionTimeout: number;
  retryAttempts: number;
  bandwidthLimit: number;
  useProxy: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyAuth: boolean;
  proxyUsername: string;
  proxyPassword: string;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupLocation: string;
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  includeSystemFiles: boolean;
  excludePatterns: string[];
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'transfer' | 'network' | 'backup' | 'advanced'>('general');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newExcludePattern, setNewExcludePattern] = useState('');

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'en',
    autoStart: true,
    minimizeToTray: true,
    showNotifications: true,
    soundEnabled: true,
    autoUpdate: true,
    analyticsEnabled: false
  });

  const [transferSettings, setTransferSettings] = useState<TransferSettings>({
    defaultLocation: 'C:\\Users\\Downloads',
    maxConcurrentTransfers: 3,
    compressionEnabled: true,
    encryptionEnabled: true,
    verifyIntegrity: true,
    resumeTransfers: true,
    deleteAfterTransfer: false,
    overwriteExisting: false
  });

  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    connectionTimeout: 30,
    retryAttempts: 3,
    bandwidthLimit: 0,
    useProxy: false,
    proxyHost: '',
    proxyPort: 8080,
    proxyAuth: false,
    proxyUsername: '',
    proxyPassword: ''
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: true,
    backupFrequency: 'daily',
    backupLocation: 'C:\\Users\\Backups',
    retentionDays: 30,
    compressionEnabled: true,
    encryptionEnabled: true,
    includeSystemFiles: false,
    excludePatterns: ['*.tmp', '*.log', 'node_modules', '.git']
  });

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'transfer', name: 'Transfer', icon: ArrowPathIcon },
    { id: 'network', name: 'Network', icon: WifiIcon },
    { id: 'backup', name: 'Backup', icon: CloudArrowUpIcon },
    { id: 'advanced', name: 'Advanced', icon: CommandLineIcon }
  ];

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      
      // Show success message
      const { toast } = await import('sonner');
      toast.success('Settings saved successfully', {
        description: 'Your preferences have been updated.'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      const { toast } = await import('sonner');
      toast.error('Failed to save settings', {
        description: 'Please try again or check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    setLoading(true);
    try {
      // Reset all settings to defaults
      setAppSettings({
        theme: 'system',
        language: 'en',
        autoStart: true,
        minimizeToTray: true,
        showNotifications: true,
        soundEnabled: true,
        autoUpdate: true,
        analyticsEnabled: false
      });
      setTransferSettings({
        defaultLocation: 'C:\\Users\\Downloads',
        maxConcurrentTransfers: 3,
        compressionEnabled: true,
        encryptionEnabled: true,
        verifyIntegrity: true,
        resumeTransfers: true,
        deleteAfterTransfer: false,
        overwriteExisting: false
      });
      setNetworkSettings({
        connectionTimeout: 30,
        retryAttempts: 3,
        bandwidthLimit: 0,
        useProxy: false,
        proxyHost: '',
        proxyPort: 8080,
        proxyAuth: false,
        proxyUsername: '',
        proxyPassword: ''
      });
      setBackupSettings({
        autoBackup: true,
        backupFrequency: 'daily',
        backupLocation: 'C:\\Users\\Backups',
        retentionDays: 30,
        compressionEnabled: true,
        encryptionEnabled: true,
        includeSystemFiles: false,
        excludePatterns: ['*.tmp', '*.log', 'node_modules', '.git']
      });
      setHasChanges(false);
      setShowResetModal(false);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExcludePattern = () => {
    if (newExcludePattern.trim() && !backupSettings.excludePatterns.includes(newExcludePattern.trim())) {
      setBackupSettings({
        ...backupSettings,
        excludePatterns: [...backupSettings.excludePatterns, newExcludePattern.trim()]
      });
      setNewExcludePattern('');
      setHasChanges(true);
    }
  };

  const removeExcludePattern = (pattern: string) => {
    setBackupSettings({
      ...backupSettings,
      excludePatterns: backupSettings.excludePatterns.filter(p => p !== pattern)
    });
    setHasChanges(true);
  };

  const browseFolder = (currentPath: string) => {
    // Simulate folder browser
    const folders = [
      'C:\\Users\\Documents',
      'C:\\Users\\Downloads',
      'C:\\Users\\Desktop',
      'D:\\Backups',
      'E:\\Storage'
    ];
    return folders[Math.floor(Math.random() * folders.length)];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure SyncSphere to work the way you want</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Reset to Defaults
            </button>
            
            {hasChanges && (
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : <CheckIcon className="h-4 w-4 mr-2" />}
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={appSettings.theme}
                        onChange={(e) => {
                          setAppSettings({ ...appSettings, theme: e.target.value as any });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={appSettings.language}
                        onChange={(e) => {
                          setAppSettings({ ...appSettings, language: e.target.value });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Application Behavior</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Start with Windows</p>
                        <p className="text-sm text-gray-600">Automatically start SyncSphere when Windows starts</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppSettings({ ...appSettings, autoStart: !appSettings.autoStart });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appSettings.autoStart ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            appSettings.autoStart ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Minimize to System Tray</p>
                        <p className="text-sm text-gray-600">Hide the application in the system tray when minimized</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppSettings({ ...appSettings, minimizeToTray: !appSettings.minimizeToTray });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appSettings.minimizeToTray ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            appSettings.minimizeToTray ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Show Notifications</p>
                        <p className="text-sm text-gray-600">Display desktop notifications for important events</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppSettings({ ...appSettings, showNotifications: !appSettings.showNotifications });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appSettings.showNotifications ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            appSettings.showNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Sound Effects</p>
                        <p className="text-sm text-gray-600">Play sounds for notifications and events</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppSettings({ ...appSettings, soundEnabled: !appSettings.soundEnabled });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appSettings.soundEnabled ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            appSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Tab */}
            {activeTab === 'transfer' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Default Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Download Location
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={transferSettings.defaultLocation}
                          onChange={(e) => {
                            setTransferSettings({ ...transferSettings, defaultLocation: e.target.value });
                            setHasChanges(true);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          onClick={() => {
                            const newPath = browseFolder(transferSettings.defaultLocation);
                            setTransferSettings({ ...transferSettings, defaultLocation: newPath });
                            setHasChanges(true);
                          }}
                          className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                          Browse
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Concurrent Transfers
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={transferSettings.maxConcurrentTransfers}
                        onChange={(e) => {
                          setTransferSettings({ ...transferSettings, maxConcurrentTransfers: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Options</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Enable Compression</p>
                        <p className="text-sm text-gray-600">Compress files during transfer to save bandwidth</p>
                      </div>
                      <button
                        onClick={() => {
                          setTransferSettings({ ...transferSettings, compressionEnabled: !transferSettings.compressionEnabled });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          transferSettings.compressionEnabled ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            transferSettings.compressionEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Enable Encryption</p>
                        <p className="text-sm text-gray-600">Encrypt files during transfer for security</p>
                      </div>
                      <button
                        onClick={() => {
                          setTransferSettings({ ...transferSettings, encryptionEnabled: !transferSettings.encryptionEnabled });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          transferSettings.encryptionEnabled ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            transferSettings.encryptionEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Verify File Integrity</p>
                        <p className="text-sm text-gray-600">Check file integrity after transfer completion</p>
                      </div>
                      <button
                        onClick={() => {
                          setTransferSettings({ ...transferSettings, verifyIntegrity: !transferSettings.verifyIntegrity });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          transferSettings.verifyIntegrity ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            transferSettings.verifyIntegrity ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Connection Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={networkSettings.connectionTimeout}
                        onChange={(e) => {
                          setNetworkSettings({ ...networkSettings, connectionTimeout: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={networkSettings.retryAttempts}
                        onChange={(e) => {
                          setNetworkSettings({ ...networkSettings, retryAttempts: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bandwidth Limit (KB/s, 0 = unlimited)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={networkSettings.bandwidthLimit}
                        onChange={(e) => {
                          setNetworkSettings({ ...networkSettings, bandwidthLimit: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Proxy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Use Proxy Server</p>
                        <p className="text-sm text-gray-600">Route connections through a proxy server</p>
                      </div>
                      <button
                        onClick={() => {
                          setNetworkSettings({ ...networkSettings, useProxy: !networkSettings.useProxy });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          networkSettings.useProxy ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            networkSettings.useProxy ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {networkSettings.useProxy && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Proxy Host
                            </label>
                            <input
                              type="text"
                              value={networkSettings.proxyHost}
                              onChange={(e) => {
                                setNetworkSettings({ ...networkSettings, proxyHost: e.target.value });
                                setHasChanges(true);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Proxy Port
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="65535"
                              value={networkSettings.proxyPort}
                              onChange={(e) => {
                                setNetworkSettings({ ...networkSettings, proxyPort: parseInt(e.target.value) });
                                setHasChanges(true);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Enable Auto Backup</p>
                        <p className="text-sm text-gray-600">Automatically backup files according to schedule</p>
                      </div>
                      <button
                        onClick={() => {
                          setBackupSettings({ ...backupSettings, autoBackup: !backupSettings.autoBackup });
                          setHasChanges(true);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          backupSettings.autoBackup ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            backupSettings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Frequency
                      </label>
                      <select
                        value={backupSettings.backupFrequency}
                        onChange={(e) => {
                          setBackupSettings({ ...backupSettings, backupFrequency: e.target.value as any });
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Location
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={backupSettings.backupLocation}
                          onChange={(e) => {
                            setBackupSettings({ ...backupSettings, backupLocation: e.target.value });
                            setHasChanges(true);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          onClick={() => {
                            const newPath = browseFolder(backupSettings.backupLocation);
                            setBackupSettings({ ...backupSettings, backupLocation: newPath });
                            setHasChanges(true);
                          }}
                          className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                          Browse
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Exclude Patterns</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newExcludePattern}
                        onChange={(e) => setNewExcludePattern(e.target.value)}
                        placeholder="e.g., *.tmp, *.log, node_modules"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addExcludePattern();
                          }
                        }}
                      />
                      <button
                        onClick={addExcludePattern}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {backupSettings.excludePatterns.map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm font-mono text-gray-700">{pattern}</span>
                          <button
                            onClick={() => removeExcludePattern(pattern)}
                            className="text-error-600 hover:text-error-700 focus:outline-none"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> These are advanced settings. Changing them may affect application performance or stability.
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Debug & Logging</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Log Level
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                        <option value="trace">Trace</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        <DocumentTextIcon className="h-4 w-4 mr-2 inline" />
                        View Logs
                      </button>
                      
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        <FolderIcon className="h-4 w-4 mr-2 inline" />
                        Open Log Folder
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Memory Usage Limit (MB)
                      </label>
                      <input
                        type="number"
                        min="512"
                        max="8192"
                        defaultValue={2048}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Worker Threads
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="16"
                        defaultValue={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Cache & Storage</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cache Size Limit (MB)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="10240"
                        defaultValue={1024}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        Clear Cache
                      </button>
                      
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        Clear Temporary Files
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Developer Options</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        <InformationCircleIcon className="h-4 w-4 mr-2 inline" />
                        System Information
                      </button>
                      
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        <DocumentTextIcon className="h-4 w-4 mr-2 inline" />
                        Export Settings
                      </button>
                      
                      <button className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
                        <FolderIcon className="h-4 w-4 mr-2 inline" />
                        Import Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset Settings Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-warning-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Reset Settings</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to reset all settings to their default values? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleResetSettings}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Reset Settings'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;