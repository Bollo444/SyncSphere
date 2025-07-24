import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { verifyToken } from './store/slices/authSlice';
import authService from './services/authService';
import { WebSocketProvider } from './providers/WebSocketProvider';

// Layout Components
import Layout from './components/Layout/Layout';
import AuthLayout from './components/Layout/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// Main Pages
import Dashboard from './pages/Dashboard';
import DataRecovery from './pages/DataRecovery';
import PhoneTransfer from './pages/PhoneTransfer';
import Devices from './pages/Devices';
import Subscriptions from './pages/Subscriptions';
import Files from './pages/Files';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Advanced Features Pages
import ScreenUnlock from './pages/ScreenUnlock';
import SystemRepair from './pages/SystemRepair';
import DataEraser from './pages/DataEraser';
import FRPBypass from './pages/FRPBypass';
import ICloudBypassPage from './pages/iCloudBypass';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

function AppContent() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, accessToken } = useAppSelector((state) => state.auth);

  // Initialize auth service when app starts
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

  // Verify token if we have one but aren't authenticated
  useEffect(() => {
    if (accessToken && !isAuthenticated && !isLoading) {
      dispatch(verifyToken());
    }
  }, [dispatch, accessToken, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />
          </Route>

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="data-recovery" element={<DataRecovery />} />
            <Route path="phone-transfer" element={<PhoneTransfer />} />
            <Route path="devices" element={<Devices />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="files" element={<Files />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

            {/* Advanced Features Routes */}
            <Route path="screen-unlock" element={<ScreenUnlock />} />
            <Route path="system-repair" element={<SystemRepair />} />
            <Route path="data-eraser" element={<DataEraser />} />
            <Route path="frp-bypass" element={<FRPBypass />} />
            <Route path="icloud-bypass" element={<ICloudBypassPage />} />

            {/* Admin Routes */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirect to login if not authenticated */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/auth/login" replace />
              )
            }
          />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <WebSocketProvider>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </WebSocketProvider>
    </Provider>
  );
}

export default App;
