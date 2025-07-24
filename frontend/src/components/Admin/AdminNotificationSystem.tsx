import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SpeakerWaveIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useWebSocketEvent } from '../../hooks/useWebSocket';

interface AdminAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'security' | 'performance' | 'user' | 'maintenance';
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  details?: unknown;
  autoResolve?: boolean;
  resolveTime?: string;
}

interface AdminNotificationSystemProps {
  className?: string;
}

const AdminNotificationSystem: React.FC<AdminNotificationSystemProps> = ({ className = '' }) => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical' | 'actionRequired'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [, setShowCreateAlert] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Subscribe to admin alerts
  useWebSocketEvent('admin:alert', (alert: AdminAlert) => {
    setAlerts(prev => [alert, ...prev]);
    
    // Play sound for critical alerts
    if (soundEnabled && (alert.type === 'critical' || alert.type === 'error')) {
      playAlertSound();
    }
  });

  // Subscribe to alert updates
  useWebSocketEvent('admin:alert-update', (data: { id: string; updates: Partial<AdminAlert> }) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === data.id ? { ...alert, ...data.updates } : alert
    ));
  });

  // Subscribe to alert resolution
  useWebSocketEvent('admin:alert-resolved', (data: { id: string }) => {
    setAlerts(prev => prev.filter(alert => alert.id !== data.id));
  });

  const playAlertSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const acknowledgeAlert = (alertId: string) => {
    // Send acknowledgment to server
    // websocketService.emit('admin:acknowledge-alert', { alertId });
    
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    // Send resolution to server
    // websocketService.emit('admin:resolve-alert', { alertId });
    
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: string, acknowledged: boolean) => {
    const opacity = acknowledged ? 'bg-opacity-30' : 'bg-opacity-50';
    
    switch (type) {
      case 'critical':
        return `bg-red-100 border-red-300 ${opacity}`;
      case 'error':
        return `bg-red-50 border-red-200 ${opacity}`;
      case 'warning':
        return `bg-yellow-50 border-yellow-200 ${opacity}`;
      case 'success':
        return `bg-green-50 border-green-200 ${opacity}`;
      default:
        return `bg-blue-50 border-blue-200 ${opacity}`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged' && alert.acknowledged) return false;
    if (filter === 'critical' && alert.type !== 'critical') return false;
    if (filter === 'actionRequired' && !alert.actionRequired) return false;
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
    return true;
  });

  const criticalCount = alerts.filter(a => a.type === 'critical' && !a.acknowledged).length;
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BellIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unacknowledged</p>
              <p className="text-2xl font-bold text-gray-900">{unacknowledgedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sound Alerts</p>
              <p className="text-xs text-gray-500">Critical & Error</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <SpeakerWaveIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
          
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unacknowledged' | 'critical' | 'actionRequired')}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Alerts</option>
              <option value="unacknowledged">Unacknowledged</option>
              <option value="critical">Critical Only</option>
              <option value="actionRequired">Action Required</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="user">User</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <button
              onClick={() => setShowCreateAlert(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Alert
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border rounded-lg ${getAlertBgColor(alert.type, alert.acknowledged)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                        {getPriorityBadge(alert.priority)}
                        <span className="text-xs text-gray-500 capitalize">{alert.category}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        <span>Source: {alert.source}</span>
                        {alert.acknowledged && (
                          <span className="text-green-600">✓ Acknowledged</span>
                        )}
                      </div>
                      
                      {alert.actionUrl && (
                        <div className="mt-2">
                          <a
                            href={alert.actionUrl}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {alert.actionText || 'Take Action'} →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Acknowledge"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Resolve"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8">
              <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No alerts match your current filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationSystem;