import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { verifyToken, logout } from '../store/slices/authSlice';
import authService from '../services/authService';
import { User } from '../services/types';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isEmailVerified: () => boolean;
  hasPremiumFeatures: () => boolean;
  getSubscriptionTier: () => string;
  getUserFullName: () => string;
  getUserInitials: () => string;
  isTokenExpired: () => boolean;
  getTokenExpiryTime: () => number | null;
}

export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  // Initialize auth service on first use
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authService.initialize();
      } catch (error) {
        console.error('Failed to initialize auth service:', error);
      }
    };

    initializeAuth();
  }, []);

  // Verify token periodically
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const interval = setInterval(async () => {
        try {
          // Check if token is expired
          if (authService.isTokenExpired()) {
            console.log('Token expired, logging out user');
            dispatch(logout());
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          dispatch(logout());
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isLoading, dispatch]);

  const login = async (credentials: { email: string; password: string }) => {
    const { login: loginAction } = await import('../store/slices/authSlice');
    await dispatch(loginAction(credentials)).unwrap();
    authService.onLoginSuccess();
  };

  const handleLogout = () => {
    authService.logout();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout: handleLogout,
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    isEmailVerified: authService.isEmailVerified.bind(authService),
    hasPremiumFeatures: authService.hasPremiumFeatures.bind(authService),
    getSubscriptionTier: authService.getSubscriptionTier.bind(authService),
    getUserFullName: authService.getUserFullName.bind(authService),
    getUserInitials: authService.getUserInitials.bind(authService),
    isTokenExpired: authService.isTokenExpired.bind(authService),
    getTokenExpiryTime: authService.getTokenExpiryTime.bind(authService),
  };
};