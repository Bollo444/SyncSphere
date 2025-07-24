import apiClient from './apiClient';
import { 
  LoginCredentials, 
  RegisterData, 
  User, 
  Device, 
  RecoverySession, 
  TransferSession, 
  SubscriptionPlan, 
  Subscription, 
  FileUpload, 
  DashboardStats,
  ApiResponse,
  PaginatedResponse
} from './types';

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>> =>
    apiClient.post('/auth/login', credentials),
  
  register: (userData: RegisterData): Promise<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>> =>
    apiClient.post('/auth/register', userData),
  
  verifyToken: (): Promise<ApiResponse<{ user: User }>> =>
    apiClient.get('/auth/verify'),
  
  forgotPassword: (email: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (data: { token: string; password: string }): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/auth/reset-password', data),
  
  verifyEmail: (token: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/auth/verify-email', { token }),
  
  refreshToken: (): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> =>
    apiClient.post('/auth/refresh'),
    
  resendVerificationEmail: (email: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/auth/resend-verification', { email }),
};

// User API
export const userAPI = {
  getProfile: (): Promise<ApiResponse<User>> =>
    apiClient.get('/users/profile'),
  
  updateProfile: (data: Partial<User>): Promise<ApiResponse<User>> =>
    apiClient.put('/users/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> =>
    apiClient.put('/users/change-password', data),
  
  deleteAccount: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete('/users/profile'),
  
  getUsers: (params?: any): Promise<ApiResponse<PaginatedResponse<User>>> =>
    apiClient.get('/users', { params }),
  
  getUserById: (id: string): Promise<ApiResponse<User>> =>
    apiClient.get(`/users/${id}`),
  
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    apiClient.put(`/users/${id}`, data),
  
  deleteUser: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/users/${id}`),
};

// Device API
export const deviceAPI = {
  getDevices: (): Promise<ApiResponse<Device[]>> =>
    apiClient.get('/devices'),
  
  addDevice: (data: Partial<Device>): Promise<ApiResponse<Device>> =>
    apiClient.post('/devices', data),
  
  updateDevice: (id: string, data: Partial<Device>): Promise<ApiResponse<Device>> =>
    apiClient.put(`/devices/${id}`, data),
  
  deleteDevice: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/devices/${id}`),
  
  scanDevice: (id: string): Promise<ApiResponse<{ scanId: string; status: string }>> =>
    apiClient.post(`/devices/${id}/scan`),
  
  getDeviceData: (id: string, params?: any): Promise<ApiResponse<any>> =>
    apiClient.get(`/devices/${id}/data`, { params }),
};

// Data Recovery API
export const recoveryAPI = {
  startRecovery: (data: Partial<RecoverySession>): Promise<ApiResponse<RecoverySession>> =>
    apiClient.post('/data-recovery', data),
  
  getRecoveryStatus: (id: string): Promise<ApiResponse<RecoverySession>> =>
    apiClient.get(`/data-recovery/${id}`),
  
  pauseRecovery: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/data-recovery/${id}/pause`),
  
  resumeRecovery: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/data-recovery/${id}/resume`),
  
  cancelRecovery: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/data-recovery/${id}/cancel`),
  
  getRecoveryHistory: (params?: any): Promise<ApiResponse<PaginatedResponse<RecoverySession>>> =>
    apiClient.get('/data-recovery', { params }),
  
  downloadRecoveredData: (id: string): Promise<void> =>
    apiClient.downloadFile(`/data-recovery/${id}/download`, `recovery-${id}.zip`),
};

// Phone Transfer API
export const transferAPI = {
  startTransfer: (data: Partial<TransferSession>): Promise<ApiResponse<TransferSession>> =>
    apiClient.post('/phone-transfer', data),
  
  getTransferStatus: (id: string): Promise<ApiResponse<TransferSession>> =>
    apiClient.get(`/phone-transfer/${id}`),
  
  pauseTransfer: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/phone-transfer/${id}/pause`),
  
  resumeTransfer: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/phone-transfer/${id}/resume`),
  
  cancelTransfer: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/phone-transfer/${id}/cancel`),
  
  getTransferHistory: (params?: any): Promise<ApiResponse<PaginatedResponse<TransferSession>>> =>
    apiClient.get('/phone-transfer', { params }),
  
  validateDevices: (data: { sourceDeviceId: string; targetDeviceId: string }): Promise<ApiResponse<{ valid: boolean; message: string }>> =>
    apiClient.post('/phone-transfer/validate', data),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: (): Promise<ApiResponse<SubscriptionPlan[]>> =>
    apiClient.get('/subscriptions/plans'),
  
  getCurrentSubscription: (): Promise<ApiResponse<Subscription>> =>
    apiClient.get('/subscriptions/current'),
  
  subscribe: (planId: string): Promise<ApiResponse<Subscription>> =>
    apiClient.post('/subscriptions/subscribe', { planId }),
  
  cancelSubscription: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/subscriptions/cancel'),
  
  updatePaymentMethod: (data: any): Promise<ApiResponse<{ message: string }>> =>
    apiClient.put('/subscriptions/payment-method', data),
  
  getBillingHistory: (params?: any): Promise<ApiResponse<PaginatedResponse<any>>> =>
    apiClient.get('/subscriptions/billing-history', { params }),
  
  getUsage: (): Promise<ApiResponse<{ usage: any; limits: any }>> =>
    apiClient.get('/subscriptions/usage'),
  
  createPortalSession: (): Promise<ApiResponse<{ url: string }>> =>
    apiClient.post('/subscriptions/portal-session'),
};

// File API
export const fileAPI = {
  uploadFile: (file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<FileUpload>> =>
    apiClient.uploadFile('/files/upload', file, onProgress),
  
  getFiles: (params?: any): Promise<ApiResponse<PaginatedResponse<FileUpload>>> =>
    apiClient.get('/files', { params }),
  
  downloadFile: (id: string, filename?: string): Promise<void> =>
    apiClient.downloadFile(`/files/${id}/download`, filename),
  
  deleteFile: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/files/${id}`),
  
  getFileInfo: (id: string): Promise<ApiResponse<FileUpload>> =>
    apiClient.get(`/files/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: (): Promise<ApiResponse<DashboardStats>> =>
    apiClient.get('/analytics/dashboard'),
  
  getUserActivity: (params?: any): Promise<ApiResponse<PaginatedResponse<any>>> =>
    apiClient.get('/analytics/user-activity', { params }),
  
  getSystemMetrics: (params?: any): Promise<ApiResponse<any>> =>
    apiClient.get('/analytics/system-metrics', { params }),
  
  getUsageStats: (params?: any): Promise<ApiResponse<any>> =>
    apiClient.get('/analytics/usage', { params }),
  
  trackEvent: (data: any): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/analytics/track', data),
};

// Backup API
export const backupAPI = {
  createBackup: (data: any): Promise<ApiResponse<{ backupId: string; status: string }>> =>
    apiClient.post('/backups/create', data),
  
  getBackups: (params?: any): Promise<ApiResponse<PaginatedResponse<any>>> =>
    apiClient.get('/backups', { params }),
  
  downloadBackup: (id: string, filename?: string): Promise<void> =>
    apiClient.downloadFile(`/backups/${id}/download`, filename || `backup-${id}.zip`),
  
  deleteBackup: (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/backups/${id}`),
  
  restoreBackup: (id: string): Promise<ApiResponse<{ restoreId: string; status: string }>> =>
    apiClient.post(`/backups/${id}/restore`),
  
  getRestoreStatus: (id: string): Promise<ApiResponse<{ status: string; progress: number }>> =>
    apiClient.get(`/backups/restore/${id}/status`),
};

export default apiClient;