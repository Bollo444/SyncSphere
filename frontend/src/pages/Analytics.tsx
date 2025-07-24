import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalTransfers: number;
  totalDataTransferred: number; // MB
  totalRecoveries: number;
  totalDataRecovered: number; // MB
  averageTransferSpeed: number; // MB/s
  successRate: number; // percentage
  activeDevices: number;
  storageUsed: number; // MB
  storageTotal: number; // MB
}

interface ChartData {
  date: string;
  transfers: number;
  recoveries: number;
  dataTransferred: number;
  dataRecovered: number;
}

interface DeviceUsage {
  deviceId: string;
  deviceName: string;
  deviceType: 'phone' | 'tablet' | 'computer';
  transfers: number;
  dataTransferred: number;
  lastActive: string;
}

interface FileTypeStats {
  type: string;
  count: number;
  size: number;
  percentage: number;
}

interface ActivityLog {
  id: string;
  type: 'transfer' | 'recovery' | 'sync' | 'backup';
  status: 'success' | 'failed' | 'in_progress';
  description: string;
  timestamp: string;
  deviceName: string;
  dataSize?: number;
}

const Analytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [deviceUsage, setDeviceUsage] = useState<DeviceUsage[]>([]);
  const [fileTypeStats, setFileTypeStats] = useState<FileTypeStats[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  const deviceTypeIcons = {
    phone: DevicePhoneMobileIcon,
    tablet: DevicePhoneMobileIcon,
    computer: ComputerDesktopIcon
  };

  const fileTypeIcons = {
    Documents: DocumentIcon,
    Images: PhotoIcon,
    Videos: VideoCameraIcon,
    Audio: MusicalNoteIcon,
    Other: DocumentIcon
  };

  const statusColors = {
    success: 'bg-success-100 text-success-800',
    failed: 'bg-error-100 text-error-800',
    in_progress: 'bg-warning-100 text-warning-800'
  };

  const statusIcons = {
    success: CheckCircleIcon,
    failed: XCircleIcon,
    in_progress: ClockIcon
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock analytics data
      const mockAnalytics: AnalyticsData = {
        totalTransfers: 156,
        totalDataTransferred: 45600, // MB
        totalRecoveries: 23,
        totalDataRecovered: 8900, // MB
        averageTransferSpeed: 12.5, // MB/s
        successRate: 94.2,
        activeDevices: 4,
        storageUsed: 15600,
        storageTotal: 51200
      };
      setAnalyticsData(mockAnalytics);

      // Mock chart data
      const mockChartData: ChartData[] = [];
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockChartData.push({
          date: date.toISOString().split('T')[0],
          transfers: Math.floor(Math.random() * 10) + 1,
          recoveries: Math.floor(Math.random() * 3),
          dataTransferred: Math.floor(Math.random() * 1000) + 100,
          dataRecovered: Math.floor(Math.random() * 500) + 50
        });
      }
      setChartData(mockChartData);

      // Mock device usage
      const mockDeviceUsage: DeviceUsage[] = [
        {
          deviceId: 'device-1',
          deviceName: 'iPhone 14 Pro',
          deviceType: 'phone',
          transfers: 45,
          dataTransferred: 12800,
          lastActive: new Date(Date.now() - 3600000).toISOString()
        },
        {
          deviceId: 'device-2',
          deviceName: 'MacBook Pro',
          deviceType: 'computer',
          transfers: 78,
          dataTransferred: 25600,
          lastActive: new Date(Date.now() - 1800000).toISOString()
        },
        {
          deviceId: 'device-3',
          deviceName: 'iPad Air',
          deviceType: 'tablet',
          transfers: 23,
          dataTransferred: 5600,
          lastActive: new Date(Date.now() - 86400000).toISOString()
        },
        {
          deviceId: 'device-4',
          deviceName: 'Samsung Galaxy',
          deviceType: 'phone',
          transfers: 10,
          dataTransferred: 1600,
          lastActive: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      setDeviceUsage(mockDeviceUsage);

      // Mock file type stats
      const mockFileTypeStats: FileTypeStats[] = [
        { type: 'Images', count: 1250, size: 18500, percentage: 45.2 },
        { type: 'Documents', count: 340, size: 8900, percentage: 21.7 },
        { type: 'Videos', count: 89, size: 12600, percentage: 30.8 },
        { type: 'Audio', count: 156, size: 780, percentage: 1.9 },
        { type: 'Other', count: 67, size: 120, percentage: 0.4 }
      ];
      setFileTypeStats(mockFileTypeStats);

      // Mock activity log
      const mockActivityLog: ActivityLog[] = [
        {
          id: 'activity-1',
          type: 'transfer',
          status: 'success',
          description: 'Photos transferred from iPhone to MacBook',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          deviceName: 'iPhone 14 Pro',
          dataSize: 450
        },
        {
          id: 'activity-2',
          type: 'recovery',
          status: 'success',
          description: 'Recovered deleted contacts',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          deviceName: 'Samsung Galaxy',
          dataSize: 12
        },
        {
          id: 'activity-3',
          type: 'sync',
          status: 'in_progress',
          description: 'Syncing documents across devices',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          deviceName: 'MacBook Pro',
          dataSize: 230
        },
        {
          id: 'activity-4',
          type: 'backup',
          status: 'failed',
          description: 'Backup failed due to insufficient storage',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          deviceName: 'iPad Air'
        },
        {
          id: 'activity-5',
          type: 'transfer',
          status: 'success',
          description: 'Music library transferred',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          deviceName: 'iPhone 14 Pro',
          dataSize: 1200
        }
      ];
      setActivityLog(mockActivityLog);
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) {
      return `${mb} MB`;
    }
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const exportData = async () => {
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const getMaxValue = (data: ChartData[], key: keyof ChartData) => {
    return Math.max(...data.map(item => Number(item[key])));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-600">Start using SyncSphere to see your analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Insights into your data transfers and device usage
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transfers</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalTransfers}</p>
              <div className="flex items-center mt-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-success-500 mr-1" />
                <span className="text-sm text-success-600">+12% from last period</span>
              </div>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <CloudArrowUpIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Transferred</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(analyticsData.totalDataTransferred)}</p>
              <div className="flex items-center mt-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-success-500 mr-1" />
                <span className="text-sm text-success-600">+8% from last period</span>
              </div>
            </div>
            <div className="p-3 bg-success-100 rounded-lg">
              <CloudArrowDownIcon className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.successRate}%</p>
              <div className="flex items-center mt-2">
                <ArrowTrendingDownIcon className="h-4 w-4 text-error-500 mr-1" />
                <span className="text-sm text-error-600">-2% from last period</span>
              </div>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Devices</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.activeDevices}</p>
              <div className="flex items-center mt-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-success-500 mr-1" />
                <span className="text-sm text-success-600">+1 from last period</span>
              </div>
            </div>
            <div className="p-3 bg-error-100 rounded-lg">
              <DevicePhoneMobileIcon className="h-6 w-6 text-error-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Activity Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Transfer Activity</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Transfers</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Recoveries</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 flex items-end space-x-1">
            {chartData.slice(-14).map((data, index) => {
              const maxTransfers = getMaxValue(chartData, 'transfers');
              const maxRecoveries = getMaxValue(chartData, 'recoveries');
              const transferHeight = (data.transfers / maxTransfers) * 100;
              const recoveryHeight = (data.recoveries / maxRecoveries) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                  <div className="flex items-end space-x-1 h-48">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${transferHeight}%` }}
                      transition={{ delay: index * 0.1 }}
                      className="w-4 bg-primary-500 rounded-t"
                      title={`${data.transfers} transfers`}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${recoveryHeight}%` }}
                      transition={{ delay: index * 0.1 + 0.05 }}
                      className="w-4 bg-success-500 rounded-t"
                      title={`${data.recoveries} recoveries`}
                    />
                  </div>
                  <span className="text-xs text-gray-600 transform rotate-45 origin-left">
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Storage Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Storage Usage</h3>
          
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(analyticsData.storageUsed / analyticsData.storageTotal) * 100}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round((analyticsData.storageUsed / analyticsData.storageTotal) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Used</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  {formatFileSize(analyticsData.storageUsed)} of {formatFileSize(analyticsData.storageTotal)} used
                </p>
              </div>
            </div>
            
            {/* File Type Breakdown */}
            <div className="space-y-3">
              {fileTypeStats.map((stat) => {
                const Icon = fileTypeIcons[stat.type as keyof typeof fileTypeIcons];
                return (
                  <div key={stat.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{stat.type}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {formatFileSize(stat.size)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Device Usage */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Device Usage</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {deviceUsage.map((device) => {
            const Icon = deviceTypeIcons[device.deviceType];
            return (
              <div key={device.deviceId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-6 w-6 text-gray-600" />
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{device.deviceName}</h4>
                      <p className="text-sm text-gray-600">Last active: {formatDate(device.lastActive)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{device.transfers} transfers</p>
                    <p className="text-sm text-gray-600">{formatFileSize(device.dataTransferred)} transferred</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
              View All
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {activityLog.map((activity) => {
            const StatusIcon = statusIcons[activity.status];
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${statusColors[activity.status]}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>{activity.deviceName}</span>
                      {activity.dataSize && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(activity.dataSize)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusColors[activity.status]
                  }`}>
                    {activity.status.replace('_', ' ').charAt(0).toUpperCase() + activity.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            );
          })}
          
          {activityLog.length === 0 && (
            <div className="p-12 text-center">
              <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-600">
                Your recent transfers and recoveries will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;