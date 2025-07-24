import React from 'react';
import { motion } from 'framer-motion';
import FRPBypass from '../components/advanced/FRPBypass';

const FRPBypassPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 p-6"
    >
      <div className="max-w-7xl mx-auto">
        <FRPBypass />
      </div>
    </motion.div>
  );
};

export default FRPBypassPage;