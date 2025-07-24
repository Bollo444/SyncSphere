import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  MapPinIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useWebSocketEvent } from '../../hooks/useWebSocket';

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  status: 'success' | 'failed' | 'warning';
  duration?: number;
  details?: unknown;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  lastActivity: string;
  currentPage: string;
  ipAddress: string;
  location?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  sessionDuration: number;
  actionsCount: number;
}

interface UserActivityMonitorProps {
  className?: string;
  maxActivities?: number;
  maxActiveUsers?: number;
}

const UserActivityMonitor: React.FC<UserActivityMonitorProps> = ({
  className = '',
  maxActivities = 50,
  maxActiveUsers = 20
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Subscribe to real-time user activities
  useWebSocketEvent('admin:user-activity', (activity: UserActivity) => {
    setActivities(prev => [activity, ...prev].slice(0, maxActivities));
  });

  // Subscribe to active users updates
  useWebSocketEvent('admin:active-users', (users: ActiveUser[]) => {
    setActiveUsers(users.slice(0, maxActiveUsers));
  });

  // Subscribe to user session updates
  useWebSocketEvent('admin:user-session', (data: { type: 'join' | 'leave'; user: ActiveUser }) => {
    if (data.type === 'join') {
      setActiveUsers(prev => [data.user, ...prev.filter(u => u.id !== data.user.id)].slice(0, maxActiveUsers));
    } else {
      setActiveUsers(prev => prev.filter(u => u.id !== data.user.id));
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'failed':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="h-4 w-4" />;
      case 'tablet':
        return <DevicePhoneMobileIcon className="h-4 w-4" />;
      default:
        return <GlobeAltIcon className="h-4 w-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.status === filter;
  });

  const userActivities = selectedUser 
    ? activities.filter(a => a.userId === selectedUser)
    : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Active Users */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Users ({activeUsers.length})
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedUser === user.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getDeviceIcon(user.deviceType)}
                    <span className="text-xs text-gray-500">{user.currentPage}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{formatDuration(user.sessionDuration)}</span>
                <span>{user.actionsCount} actions</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity ({filteredActivities.length})
          </h3>
          
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'failed' | 'warning')}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Activities</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(activity.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.userName}
                    </p>
                    <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <span className="text-sm text-gray-500">on {activity.resource}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {getDeviceIcon(activity.deviceType)}
                      <span>{activity.deviceType}</span>
                    </div>
                    
                    {activity.location && (
                      <div className="flex items-center space-x-1">
                        <MapPinIcon className="h-3 w-3" />
                        <span>{activity.location}</span>
                      </div>
                    )}
                    
                    <span>{activity.ipAddress}</span>
                  </div>
                </div>
                
                {activity.status === 'failed' && (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            User Activity Details
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {userActivities.map((activity) => (
              <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{activity.action}</span>
                  <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.resource}</p>
                {activity.details && (
                  <pre className="text-xs text-gray-500 mt-2 bg-white p-2 rounded">
                    {JSON.stringify(activity.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivityMonitor;