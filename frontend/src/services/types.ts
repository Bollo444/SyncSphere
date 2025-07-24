// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subscriptionTier: string;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Device Types
export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceModel: string;
  osType: string;
  osVersion: string;
  appVersion?: string;
  lastSync?: string;
  status: 'active' | 'inactive' | 'syncing' | 'error';
  connectionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Recovery Types
export interface RecoverySession {
  id: string;
  userId: string;
  deviceId: string;
  recoveryType: 'photos' | 'contacts' | 'messages' | 'documents' | 'full';
  status: 'pending' | 'scanning' | 'recovering' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalFiles: number;
  recoveredFiles: number;
  totalSize: number;
  recoveredSize: number;
  options: RecoveryOptions;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryOptions {
  includeDeleted: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  fileTypes?: string[];
  maxFileSize?: number;
}

// Transfer Types
export interface TransferSession {
  id: string;
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourceDevice?: Device;
  targetDevice?: Device;
  transferType: 'full' | 'selective';
  status: 'pending' | 'preparing' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'in_progress';
  progress: number;
  totalFiles: number;
  transferredFiles: number;
  totalSize: number;
  transferredSize: number;
  estimatedTimeRemaining?: number;
  timeRemaining?: number;
  transferSpeed?: number;
  speed?: number;
  error?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    recoveryOperations: number;
    transferOperations: number;
    storageSize: number;
    deviceCount: number;
  };
  isPopular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

// File Types
export interface FileUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  checksum: string;
  status: 'uploading' | 'completed' | 'failed';
  uploadProgress?: number;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRecoveries: number;
  totalTransfers: number;
  successRate: number;
  averageRecoveryTime: number;
  storageUsed: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'recovery' | 'transfer' | 'login' | 'registration';
  description: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    incoming: number;
    outgoing: number;
  };
  activeConnections: number;
  queueSize: number;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
}

// Request Configuration Types
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}