import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useWebSocketConnection } from '../../hooks/useWebSocket';

interface ConnectionStatusProps {
  showWhenConnected?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showWhenConnected = false,
  position = 'top-right',
  className = ''
}) => {
  const { status, isConnected, connect } = useWebSocketConnection();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircleIcon,
          text: 'Connected',
          bgColor: 'bg-green-500',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          show: showWhenConnected
        };
      case 'connecting':
        return {
          icon: ArrowPathIcon,
          text: 'Connecting...',
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          show: true,
          animate: true
        };
      case 'disconnected':
        return {
          icon: WifiIcon,
          text: 'Disconnected',
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          show: true
        };
      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          text: 'Connection Error',
          bgColor: 'bg-red-500',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          show: true
        };
      default:
        return {
          icon: WifiIcon,
          text: 'Unknown',
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          show: true
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!config.show) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        className={`fixed z-50 ${getPositionClasses()} ${className}`}
      >
        <div
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border
            bg-white ${config.borderColor} ${config.textColor}
          `}
        >
          <div className="relative">
            <Icon 
              className={`h-4 w-4 ${config.animate ? 'animate-spin' : ''}`}
            />
            <div 
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${config.bgColor}`}
            />
          </div>
          <span className="text-sm font-medium">{config.text}</span>
          
          {(status === 'disconnected' || status === 'error') && (
            <button
              onClick={connect}
              className="ml-2 text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;