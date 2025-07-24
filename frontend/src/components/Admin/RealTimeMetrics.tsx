import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useWebSocketEvent } from '../../hooks/useWebSocket';

interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  serverLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: number;
  activeConnections: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
}

interface RealTimeMetricsProps {
  className?: string;
}

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalUsers: 0,
    serverLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkTraffic: 0,
    activeConnections: 0,
    errorRate: 0,
    responseTime: 0,
    uptime: 0
  });

  const [alerts, setAlerts] = useState<Array<{
    id?: string;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
  }>>([]);

  // Subscribe to real-time metrics updates
  useWebSocketEvent('admin:metrics', (data: SystemMetrics) => {
    setMetrics(data);
  });

  // Subscribe to system alerts
  useWebSocketEvent('admin:alert', (alert: {
    id?: string;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
  }) => {
    setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
  });

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-100';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers}</p>
              <p className="text-xs text-gray-500">of {metrics.totalUsers} total</p>
            </div>
          </div>
        </motion.div>

        {/* Server Load */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CpuChipIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Server Load</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.serverLoad.toFixed(1)}%</p>
              <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(metrics.serverLoad, { warning: 70, critical: 90 })}`}>
                {metrics.serverLoad < 70 ? 'Normal' : metrics.serverLoad < 90 ? 'High' : 'Critical'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Memory Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CircleStackIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.memoryUsage.toFixed(1)}%</p>
              <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(metrics.memoryUsage, { warning: 80, critical: 95 })}`}>
                {metrics.memoryUsage < 80 ? 'Normal' : metrics.memoryUsage < 95 ? 'High' : 'Critical'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Network Traffic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <WifiIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Network Traffic</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(metrics.networkTraffic)}/s</p>
              <p className="text-xs text-gray-500">{metrics.activeConnections} connections</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.responseTime}ms</p>
              <p className="text-sm text-gray-600">Average response time</p>
            </div>
            <div className={`p-3 rounded-full ${getStatusColor(metrics.responseTime, { warning: 500, critical: 1000 })}`}>
              <ClockIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Rate</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.errorRate.toFixed(2)}%</p>
              <p className="text-sm text-gray-600">Error rate (last hour)</p>
            </div>
            <div className={`p-3 rounded-full ${getStatusColor(metrics.errorRate, { warning: 1, critical: 5 })}`}>
              {metrics.errorRate < 1 ? (
                <CheckCircleIcon className="h-6 w-6" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Uptime</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatUptime(metrics.uptime)}</p>
              <p className="text-sm text-gray-600">System uptime</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <ServerIcon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent System Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-400'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMetrics;