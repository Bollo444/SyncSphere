import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ArrowPathRoundedSquareIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  DocumentIcon,
  ChartBarIcon,
  UserIcon,
  CogIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UsersIcon,
  ServerIcon,
  LockOpenIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../hooks/redux';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Data Recovery', href: '/data-recovery', icon: ArrowPathRoundedSquareIcon },
    { name: 'Phone Transfer', href: '/phone-transfer', icon: DevicePhoneMobileIcon },
    { name: 'Devices', href: '/devices', icon: ComputerDesktopIcon },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCardIcon },
    { name: 'Files', href: '/files', icon: DocumentIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  ];

  const advancedNavigation = [
    { name: 'Screen Unlock', href: '/screen-unlock', icon: LockOpenIcon },
    { name: 'System Repair', href: '/system-repair', icon: WrenchScrewdriverIcon },
    { name: 'Data Eraser', href: '/data-eraser', icon: TrashIcon },
    { name: 'FRP Bypass', href: '/frp-bypass', icon: ShieldCheckIcon },
    { name: 'iCloud Bypass', href: '/icloud-bypass', icon: CloudIcon },
  ];

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'System Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Backups', href: '/admin/backups', icon: ServerIcon },
  ];

  const userNavigation = [
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const NavItem: React.FC<{ item: any; onClick?: () => void }> = ({ item, onClick }) => {
    const active = isActive(item.href);
    
    return (
      <NavLink
        to={item.href}
        onClick={onClick}
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
          active
            ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <item.icon
          className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${
            active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
          }`}
          aria-hidden="true"
        />
        {item.name}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">SyncSphere</h1>
              </div>
            </div>
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} onClick={onClose} />
              ))}
            </div>

            {/* Advanced Features Navigation */}
            <div className="pt-6">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Advanced Features
              </h3>
              <div className="mt-2 space-y-1">
                {advancedNavigation.map((item) => (
                  <NavItem key={item.name} item={item} onClick={onClose} />
                ))}
              </div>
            </div>

            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <div className="pt-6">
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </h3>
                <div className="mt-2 space-y-1">
                  {adminNavigation.map((item) => (
                    <NavItem key={item.name} item={item} onClick={onClose} />
                  ))}
                </div>
              </div>
            )}

            {/* User Navigation */}
            <div className="pt-6">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account
              </h3>
              <div className="mt-2 space-y-1">
                {userNavigation.map((item) => (
                  <NavItem key={item.name} item={item} onClick={onClose} />
                ))}
              </div>
            </div>
          </nav>

          {/* User info */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.subscriptionStatus} Plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;