import { store } from '../store';
import { verifyToken, refreshAuthToken, logout } from '../store/slices/authSlice';
import apiClient from './apiClient';
import { User } from './types';

class AuthService {
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the auth service
   * This should be called when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && refreshToken) {
      // Set tokens in API client
      apiClient.setAuthTokens(accessToken, refreshToken);

      try {
        // Verify the current token
        await store.dispatch(verifyToken()).unwrap();
        
        // Start token refresh timer
        this.startTokenRefreshTimer();
        
        console.log('Auth service initialized successfully');
      } catch (error) {
        console.log('Token verification failed, user needs to login again');
        // Clear invalid tokens
        store.dispatch(logout());
      }
    }

    this.isInitialized = true;
  }

  /**
   * Start automatic token refresh timer
   */
  private startTokenRefreshTimer(): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh token every 14 minutes (tokens expire in 15 minutes)
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        await this.refreshTokenIfNeeded();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        // If refresh fails, logout the user
        store.dispatch(logout());
      }
    }, 14 * 60 * 1000); // 14 minutes
  }

  /**
   * Stop the token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Refresh token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    const state = store.getState();
    const { isAuthenticated, tokenExpiresAt } = state.auth;

    if (!isAuthenticated) {
      return;
    }

    // Check if token is close to expiring (within 5 minutes)
    if (tokenExpiresAt && Date.now() > tokenExpiresAt - (5 * 60 * 1000)) {
      console.log('Token is close to expiring, refreshing...');
      await store.dispatch(refreshAuthToken()).unwrap();
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    const state = store.getState();
    return state.auth.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = store.getState();
    return state.auth.isAuthenticated;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    const state = store.getState();
    return state.auth.accessToken;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.stopTokenRefreshTimer();
    store.dispatch(logout());
  }

  /**
   * Handle successful login
   */
  onLoginSuccess(): void {
    this.startTokenRefreshTimer();
  }

  /**
   * Handle authentication failure
   */
  onAuthFailure(): void {
    this.stopTokenRefreshTimer();
    store.dispatch(logout());
  }

  /**
   * Check if user's email is verified
   */
  isEmailVerified(): boolean {
    const user = this.getCurrentUser();
    return user?.emailVerified || false;
  }

  /**
   * Get user's subscription tier
   */
  getSubscriptionTier(): string {
    const user = this.getCurrentUser();
    return user?.subscriptionTier || 'free';
  }

  /**
   * Check if user has premium features
   */
  hasPremiumFeatures(): boolean {
    const tier = this.getSubscriptionTier();
    return tier === 'premium' || tier === 'enterprise';
  }

  /**
   * Get user's full name
   */
  getUserFullName(): string {
    const user = this.getCurrentUser();
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim();
  }

  /**
   * Get user's initials for avatar
   */
  getUserInitials(): string {
    const user = this.getCurrentUser();
    if (!user) return '';
    
    const firstInitial = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || '';
    
    return `${firstInitial}${lastInitial}`;
  }

  /**
   * Check if token is expired or close to expiring
   */
  isTokenExpired(): boolean {
    const state = store.getState();
    const { tokenExpiresAt } = state.auth;
    
    if (!tokenExpiresAt) return false;
    
    // Consider token expired if it expires within 1 minute
    return Date.now() > tokenExpiresAt - (1 * 60 * 1000);
  }

  /**
   * Get time until token expires (in minutes)
   */
  getTokenExpiryTime(): number | null {
    const state = store.getState();
    const { tokenExpiresAt } = state.auth;
    
    if (!tokenExpiresAt) return null;
    
    const timeLeft = tokenExpiresAt - Date.now();
    return Math.max(0, Math.floor(timeLeft / (60 * 1000))); // Convert to minutes
  }
}

// Create and export singleton instance
const authService = new AuthService();

export default authService;