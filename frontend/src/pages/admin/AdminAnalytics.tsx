import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  UsersIcon,
  DevicePhoneMobileIcon,
  CloudArrowDownIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  userGrowth: Array<{
    date: string;
    users: number;
    activeUsers: number;
    newUsers: number;
  }>;
  deviceUsage: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  transferStats: Array<{
    date: string;
    transfers: number;
    dataTransferred: number; // in GB
    successRate: number;
  }>;
  revenueData: Array<{
    date: string;
    revenue: number;
    subscriptions: number;
    churn: number;
  }>;
  topFeatures: Array<{
    feature: string;
    usage: number;
    growth: number;
  }>;
  errorRates: Array<{
    date: string;
    errors: number;
    warnings: number;
  }>;
  geographicData: Array<{
    country: string;
    users: number;
    revenue: number;
  }>;
}

const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('users');
  const [exportLoading, setExportLoading] = useState(false);

  // Mock data - replace with actual API calls
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userGrowth: [
      { date: '2024-01-01', users: 1200, activeUsers: 800, newUsers: 50 },
      { date: '2024-01-02', users: 1250, activeUsers: 820, newUsers: 55 },
      { date: '2024-01-03', users: 1300, activeUsers: 850, newUsers: 60 },
      { date: '2024-01-04', users: 1380, activeUsers: 900, newUsers: 80 },
      { date: '2024-01-05', users: 1450, activeUsers: 950, newUsers: 70 },
      { date: '2024-01-06', users: 1520, activeUsers: 980, newUsers: 75 },
      { date: '2024-01-07', users: 1600, activeUsers: 1020, newUsers: 85 },
    ],
    deviceUsage: [
      { name: 'iPhone', value: 45, color: '#3B82F6' },
      { name: 'Android', value: 35, color: '#10B981' },
      { name: 'Windows', value: 15, color: '#F59E0B' },
      { name: 'Mac', value: 5, color: '#EF4444' },
    ],
    transferStats: [
      { date: '2024-01-01', transfers: 120, dataTransferred: 2.5, successRate: 95 },
      { date: '2024-01-02', transfers: 135, dataTransferred: 3.2, successRate: 97 },
      { date: '2024-01-03', transfers: 150, dataTransferred: 4.1, successRate: 94 },
      { date: '2024-01-04', transfers: 180, dataTransferred: 5.8, successRate: 96 },
      { date: '2024-01-05', transfers: 165, dataTransferred: 4.9, successRate: 98 },
      { date: '2024-01-06', transfers: 190, dataTransferred: 6.2, successRate: 95 },
      { date: '2024-01-07', transfers: 210, dataTransferred: 7.1, successRate: 97 },
    ],
    revenueData: [
      { date: '2024-01-01', revenue: 2500, subscriptions: 45, churn: 2 },
      { date: '2024-01-02', revenue: 2800, subscriptions: 52, churn: 1 },
      { date: '2024-01-03', revenue: 3200, subscriptions: 58, churn: 3 },
      { date: '2024-01-04', revenue: 3800, subscriptions: 65, churn: 2 },
      { date: '2024-01-05', revenue: 3500, subscriptions: 60, churn: 4 },
      { date: '2024-01-06', revenue: 4200, subscriptions: 72, churn: 1 },
      { date: '2024-01-07', revenue: 4800, subscriptions: 80, churn: 2 },
    ],
    topFeatures: [
      { feature: 'Data Recovery', usage: 85, growth: 12 },
      { feature: 'Phone Transfer', usage: 72, growth: 8 },
      { feature: 'WhatsApp Transfer', usage: 45, growth: 25 },
      { feature: 'Screen Unlock', usage: 38, growth: -5 },
      { feature: 'System Repair', usage: 22, growth: 15 },
    ],
    errorRates: [
      { date: '2024-01-01', errors: 12, warnings: 25 },
      { date: '2024-01-02', errors: 8, warnings: 18 },
      { date: '2024-01-03', errors: 15, warnings: 32 },
      { date: '2024-01-04', errors: 6, warnings: 14 },
      { date: '2024-01-05', errors: 10, warnings: 22 },
      { date: '2024-01-06', errors: 4, warnings: 16 },
      { date: '2024-01-07', errors: 7, warnings: 19 },
    ],
    geographicData: [
      { country: 'United States', users: 450, revenue: 12500 },
      { country: 'United Kingdom', users: 280, revenue: 7800 },
      { country: 'Germany', users: 220, revenue: 6200 },
      { country: 'Canada', users: 180, revenue: 4900 },
      { country: 'Australia', users: 150, revenue: 4100 },
      { country: 'France', users: 120, revenue: 3200 },
      { country: 'Japan', users: 100, revenue: 2800 },
      { country: 'Others', users: 200, revenue: 5500 },
    ],
  });

  const [summaryStats, setSummaryStats] = useState({
    totalUsers: 1600,
    activeUsers: 1020,
    totalRevenue: 28800,
    totalTransfers: 1150,
    avgSuccessRate: 96.2,
    totalDataTransferred: 33.8, // GB
    userGrowthRate: 12.5, // %
    revenueGrowthRate: 18.3, // %
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleExportData = async () => {
    setExportLoading(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    setExportLoading(false);
    // Trigger download
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={handleExportData}
                disabled={exportLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {exportLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                )}
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryStats.totalUsers)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(summaryStats.userGrowthRate)}
                  <span className={`text-sm font-medium ml-1 ${getGrowthColor(summaryStats.userGrowthRate)}`}>
                    {summaryStats.userGrowthRate}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryStats.totalRevenue)}</p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(summaryStats.revenueGrowthRate)}
                  <span className={`text-sm font-medium ml-1 ${getGrowthColor(summaryStats.revenueGrowthRate)}`}>
                    {summaryStats.revenueGrowthRate}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryStats.totalTransfers)}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm font-medium text-gray-600">
                    {summaryStats.avgSuccessRate}% success rate
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <DevicePhoneMobileIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Transferred</p>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalDataTransferred} GB</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm font-medium text-gray-600">
                    {summaryStats.activeUsers} active users
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <CloudArrowDownIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="users">Total Users</option>
                <option value="activeUsers">Active Users</option>
                <option value="newUsers">New Users</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Device Usage Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Device Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.deviceUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.deviceUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Transfer Stats and Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transfer Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Transfer Statistics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.transferStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Legend />
                <Bar yAxisId="left" dataKey="transfers" fill="#3B82F6" name="Transfers" />
                <Bar yAxisId="right" dataKey="dataTransferred" fill="#10B981" name="Data (GB)" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue & Subscriptions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => {
                    if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="subscriptions" stroke="#3B82F6" strokeWidth={2} name="Subscriptions" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Feature Usage and Geographic Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Feature Usage</h3>
            <div className="space-y-4">
              {analyticsData.topFeatures.map((feature, index) => (
                <div key={feature.feature} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                      <div className="flex items-center">
                        {getGrowthIcon(feature.growth)}
                        <span className={`text-sm font-medium ml-1 ${getGrowthColor(feature.growth)}`}>
                          {Math.abs(feature.growth)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${feature.usage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{feature.usage}% usage</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Geographic Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Geographic Distribution</h3>
            <div className="space-y-3">
              {analyticsData.geographicData.map((country, index) => (
                <div key={country.country} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{country.country}</p>
                    <p className="text-sm text-gray-600">{formatNumber(country.users)} users</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(country.revenue)}</p>
                    <p className="text-sm text-gray-600">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Error Rates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">System Health</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.errorRates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
              <YAxis />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
              <Legend />
              <Area
                type="monotone"
                dataKey="errors"
                stackId="1"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.6}
                name="Errors"
              />
              <Area
                type="monotone"
                dataKey="warnings"
                stackId="1"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.6}
                name="Warnings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;