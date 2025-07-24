import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { ApiResponse, ApiError, RequestConfig } from './types';

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

class ApiClient {
  private axios: AxiosInstance;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(config: ApiClientConfig) {
    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors(config);
    this.loadTokensFromStorage();
  }

  private setupInterceptors(config: ApiClientConfig) {
    // Request interceptor
    this.axios.interceptors.request.use(
      (requestConfig) => {
        // Add auth token if available and not skipped
        if (this.authToken && !requestConfig.headers?.skipAuth) {
          requestConfig.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Log request in development
        if (config.enableLogging && import.meta.env.DEV) {
          console.log(`🚀 API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
            headers: requestConfig.headers,
            data: requestConfig.data,
          });
        }

        return requestConfig;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (config.enableLogging && import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request while refresh is in progress
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.axios(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAuthToken();
            this.processQueue(null, newToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.axios(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthenticationFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        return this.handleError(error, originalRequest);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private async handleError(error: AxiosError, originalRequest?: AxiosRequestConfig & { _retry?: boolean; _retryCount?: number }) {
    const apiError = this.createApiError(error);

    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: apiError.message,
        details: apiError.details,
      });
    }

    // Retry logic for network errors and 5xx errors
    if (originalRequest && this.shouldRetry(error, originalRequest)) {
      return this.retryRequest(originalRequest);
    }

    // Show user-friendly error messages (unless skipped)
    if (!originalRequest?.headers?.skipErrorHandling) {
      this.showUserFriendlyError(apiError);
    }

    return Promise.reject(apiError);
  }

  private shouldRetry(error: AxiosError, request: AxiosRequestConfig & { _retryCount?: number }): boolean {
    const retryCount = request._retryCount || 0;
    const maxRetries = 3;

    // Don't retry if we've exceeded max attempts
    if (retryCount >= maxRetries) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx server errors (except 501, 505)
    const status = error.response.status;
    return status >= 500 && status !== 501 && status !== 505;
  }

  private async retryRequest(request: AxiosRequestConfig & { _retryCount?: number }): Promise<any> {
    const retryCount = (request._retryCount || 0) + 1;
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Exponential backoff, max 10s

    console.log(`🔄 Retrying request (attempt ${retryCount}) after ${delay}ms delay`);

    await new Promise(resolve => setTimeout(resolve, delay));

    request._retryCount = retryCount;
    return this.axios(request);
  }

  private createApiError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;
      return {
        code: responseData?.code || 'API_ERROR',
        message: responseData?.message || 'An error occurred',
        details: responseData?.details || responseData,
        statusCode: error.response.status,
        timestamp: new Date().toISOString(),
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your internet connection.',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private showUserFriendlyError(error: ApiError): void {
    const userMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Please check your internet connection and try again.',
      'AUTH_FAILED': 'Please log in again to continue.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'SERVER_ERROR': 'Something went wrong on our end. Please try again later.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
      'INSUFFICIENT_PERMISSIONS': 'You don\'t have permission to perform this action.',
    };

    const message = userMessages[error.code] || error.message;
    
    // Show appropriate toast based on error severity
    if (error.statusCode >= 500) {
      toast.error(message, { duration: 5000 });
    } else if (error.statusCode === 429) {
      toast.error(message, { duration: 3000 });
    } else if (error.statusCode >= 400) {
      toast.error(message);
    } else {
      toast.error(message);
    }
  }

  private async refreshAuthToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.axios.post('/auth/refresh', {
        refreshToken: this.refreshToken,
      }, {
        headers: { skipAuth: true },
      });

      const { accessToken, refreshToken } = response.data.data;
      this.setAuthTokens(accessToken, refreshToken);
      
      return accessToken;
    } catch (error) {
      this.clearAuthTokens();
      throw error;
    }
  }

  private handleAuthenticationFailure(): void {
    this.clearAuthTokens();
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      toast.error('Your session has expired. Please log in again.');
      window.location.href = '/login';
    }
  }

  private loadTokensFromStorage(): void {
    this.authToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // Public methods
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.authToken = accessToken;
    this.refreshToken = refreshToken;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearAuthTokens(): void {
    this.authToken = null;
    this.refreshToken = null;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getAccessToken(): string | null {
    return this.authToken;
  }

  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // HTTP methods with enhanced error handling and retry logic
  async get<T>(url: string, config?: AxiosRequestConfig & RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig & RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig & RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig & RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig & RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.delete(url, config);
    return response.data;
  }

  // File upload with progress tracking
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig & RequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.axios.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Download file with blob response
  async downloadFile(url: string, filename?: string, config?: AxiosRequestConfig & RequestConfig): Promise<void> {
    const response = await this.axios.get(url, {
      ...config,
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Create and export singleton instance
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: import.meta.env.DEV,
});

export default apiClient;