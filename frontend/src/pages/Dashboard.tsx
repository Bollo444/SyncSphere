import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneIcon,
  DocumentArrowDownIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../hooks/redux';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { analyticsAPI } from '../services/api';
import { DashboardStats } from '../services/types';
import toast from 'react-hot-toast';

interface QuickAction {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

interface RecentActivity {
  id: string;
  type: 'recovery' | 'transfer' | 'backup';
  description: string;
  status: 'completed' | 'in_progress' | 'failed';
  timestamp: string;
  device?: string;
}

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Dashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Load dashboard data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats
        const response = await analyticsAPI.getDashboardStats();
        setStats(response.data);
        
        // Transform recent activities from API data
        if (response.data.recentActivities) {
          setRecentActivities(response.data.recentActivities);
        }
        
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        toast.error('Could not load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Set up refresh interval (every 30 seconds)
    const intervalId = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const quickActions: QuickAction[] = [
    {
      name: 'Data Recovery',
      description: 'Recover lost data from your devices',
      href: '/data-recovery',
      icon: DocumentArrowDownIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Phone Transfer',
      description: 'Transfer data between devices',
      href: '/phone-transfer',
      icon: PhoneIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Manage Devices',
      description: 'View and manage connected devices',
      href: '/devices',
      icon: DevicePhoneMobileIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'View Analytics',
      description: 'Track your usage and statistics',
      href: '/analytics',
      icon: ChartBarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'recovery':
        return 'bg-blue-100 text-blue-800';
      case 'transfer':
        return 'bg-green-100 text-green-800';
      case 'backup':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white"
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-primary-100 text-lg">
          Manage your data recovery and device transfers from your dashboard.
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5" />
            <span className="text-sm capitalize">{user?.subscriptionStatus} Plan</span>
          </div>
          <div className="flex items-center space-x-2">
            <CloudArrowUpIcon className="h-5 w-5" />
            <span className="text-sm">{stats ? formatBytes(stats.storageUsed || 0) : '0 B'} used</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-red-50 border-l-4 border-red-400 p-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 font-medium underline text-red-700 hover:text-red-600"
                >
                  Retry
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentArrowDownIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Recoveries</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalRecoveries || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transfers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTransfers || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DevicePhoneMobileIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connected Devices</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.activeUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CloudArrowUpIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Storage Used</p>
                <p className="text-2xl font-semibold text-gray-900">{stats ? formatBytes(stats.storageUsed || 0) : '0 B'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <div className={`flex-shrink-0 p-3 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getActivityColor(activity.type)}`}>
                        {activity.type}
                      </span>
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No recent activity to display.
              </p>
            )}
          </div>
          <div className="mt-6">
            <Link
              to="/analytics"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View all activity →
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Subscription Status */}
      {user?.subscriptionStatus === 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card p-6 border-l-4 border-yellow-400 bg-yellow-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                Upgrade to Premium
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Unlock unlimited data recovery, faster transfers, and priority support.
              </p>
            </div>
            <Link
              to="/subscriptions"
              className="btn-primary"
            >
              Upgrade Now
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;