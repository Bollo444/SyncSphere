import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SyncSphere</h1>
              <p className="text-sm text-gray-600">Data Recovery & Transfer Platform</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Auth form container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          <Outlet />
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 text-center"
      >
        <p className="text-sm text-gray-600">
          © 2024 SyncSphere. All rights reserved.
        </p>
        <div className="mt-2 space-x-4">
          <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
            Terms of Service
          </a>
          <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
            Support
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;