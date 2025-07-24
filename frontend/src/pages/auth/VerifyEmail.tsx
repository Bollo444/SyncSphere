import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !emailParam) {
        setStatus('error');
        setErrorMessage('Invalid verification link');
        return;
      }

      setEmail(emailParam);

      try {
        await authAPI.verifyEmail(token, emailParam);
        setStatus('success');
        toast.success('Email verified successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth/login', { 
            state: { message: 'Email verified successfully! You can now log in.' }
          });
        }, 3000);
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || 'Failed to verify email';
        setErrorMessage(errorMsg);
        
        if (errorMsg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        
        toast.error(errorMsg);
      }
    };

    verifyEmail();
  }, [token, emailParam, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }

    setIsResending(true);
    try {
      await authAPI.resendVerification(email);
      toast.success('Verification email sent successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-6"
            >
              <LoadingSpinner size="md" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying your email...
            </h2>
            
            <p className="text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 mb-6"
            >
              <CheckCircleIcon className="h-8 w-8 text-success-600" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verified Successfully!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Your email address has been verified. You will be redirected to the login page shortly.
            </p>
            
            <Link
              to="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Continue to Login
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-warning-100 mb-6"
            >
              <EnvelopeIcon className="h-8 w-8 text-warning-600" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Link Expired
            </h2>
            
            <p className="text-gray-600 mb-6">
              The verification link has expired. We can send you a new verification email.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResending ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Send New Verification Email'
                )}
              </button>
              
              <Link
                to="/auth/login"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error-100 mb-6"
            >
              <XCircleIcon className="h-8 w-8 text-error-600" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h2>
            
            <p className="text-gray-600 mb-6">
              {errorMessage || 'We couldn\'t verify your email address. The link may be invalid or expired.'}
            </p>
            
            <div className="space-y-3">
              {email && (
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              )}
              
              <Link
                to="/auth/register"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Create New Account
              </Link>
              
              <Link
                to="/auth/login"
                className="block text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderContent()}
        </div>
        
        {/* Help text */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Having trouble?{' '}
            <Link
              to="/support"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Contact support
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;