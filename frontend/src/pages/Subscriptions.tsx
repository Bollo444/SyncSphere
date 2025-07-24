import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckIcon,
  XMarkIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  BoltIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limitations: {
    devices: number;
    storage: number; // GB
    transfers: number;
    support: string;
  };
  popular?: boolean;
  current?: boolean;
}

interface UserSubscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  downloadUrl: string;
}

const Subscriptions: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  useEffect(() => {
    // Mock subscription plans
    const mockPlans: SubscriptionPlan[] = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        billingCycle: 'monthly',
        features: [
          'Basic data recovery',
          'Phone to phone transfer',
          'Email support',
          'Basic analytics'
        ],
        limitations: {
          devices: 2,
          storage: 5,
          transfers: 10,
          support: 'Email only'
        },
        current: user?.subscription?.plan === 'free'
      },
      {
        id: 'pro-monthly',
        name: 'Pro',
        price: billingCycle === 'monthly' ? 9.99 : 99.99,
        billingCycle,
        features: [
          'Advanced data recovery',
          'Unlimited transfers',
          'Cross-platform sync',
          'Priority support',
          'Advanced analytics',
          'Backup scheduling',
          'Data encryption'
        ],
        limitations: {
          devices: 10,
          storage: 100,
          transfers: -1, // unlimited
          support: 'Priority email & chat'
        },
        popular: true,
        current: user?.subscription?.plan === 'pro'
      },
      {
        id: 'enterprise-monthly',
        name: 'Enterprise',
        price: billingCycle === 'monthly' ? 29.99 : 299.99,
        billingCycle,
        features: [
          'Everything in Pro',
          'Unlimited devices',
          'Team management',
          'API access',
          'Custom integrations',
          'Dedicated support',
          'Advanced security',
          'Compliance reports'
        ],
        limitations: {
          devices: -1, // unlimited
          storage: 1000,
          transfers: -1, // unlimited
          support: '24/7 phone & chat'
        },
        current: user?.subscription?.plan === 'enterprise'
      }
    ];
    setPlans(mockPlans);

    // Mock current subscription
    if (user?.subscription?.plan !== 'free') {
      setCurrentSubscription({
        id: 'sub-123',
        planId: user?.subscription?.plan || 'pro-monthly',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      });
    }

    // Mock invoices
    const mockInvoices: Invoice[] = [
      {
        id: 'inv-001',
        amount: 9.99,
        status: 'paid',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '#'
      },
      {
        id: 'inv-002',
        amount: 9.99,
        status: 'paid',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '#'
      },
      {
        id: 'inv-003',
        amount: 9.99,
        status: 'paid',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '#'
      }
    ];
    setInvoices(mockInvoices);
  }, [billingCycle, user]);

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Subscription upgraded successfully!');
      // Update current subscription
      setCurrentSubscription({
        id: 'sub-123',
        planId,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      });
    } catch (error) {
      toast.error('Failed to upgrade subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Subscription will be canceled at the end of the billing period');
      if (currentSubscription) {
        setCurrentSubscription({
          ...currentSubscription,
          cancelAtPeriodEnd: true
        });
      }
      setShowCancelModal(false);
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Subscription reactivated successfully!');
      if (currentSubscription) {
        setCurrentSubscription({
          ...currentSubscription,
          cancelAtPeriodEnd: false
        });
      }
    } catch (error) {
      toast.error('Failed to reactivate subscription');
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (couponCode.toLowerCase() === 'save20') {
        setAppliedCoupon('SAVE20 - 20% off');
        toast.success('Coupon applied successfully!');
      } else {
        toast.error('Invalid coupon code');
      }
    } catch (error) {
      toast.error('Failed to apply coupon');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'canceled':
        return 'bg-error-100 text-error-800';
      case 'past_due':
        return 'bg-warning-100 text-warning-800';
      case 'trialing':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentPlan = plans.find(plan => plan.current);
  const savings = billingCycle === 'yearly' ? '17% off' : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
            <p className="text-gray-600 mt-1">
              Manage your subscription plan and billing information
            </p>
          </div>
          
          {currentSubscription && (
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                getStatusColor(currentSubscription.status)
              }`}>
                {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
              </div>
              {currentSubscription.cancelAtPeriodEnd && (
                <p className="text-sm text-error-600 mt-1">
                  Cancels on {formatDate(currentSubscription.currentPeriodEnd)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Plan</p>
              <p className="text-lg font-semibold text-gray-900">{currentPlan?.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Next Billing Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(currentSubscription.currentPeriodEnd)}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Amount</p>
              <p className="text-lg font-semibold text-gray-900">
                ${currentPlan?.price}/{currentPlan?.billingCycle === 'monthly' ? 'month' : 'year'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            {currentSubscription.cancelAtPeriodEnd ? (
              <button
                onClick={handleReactivate}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : <ArrowPathIcon className="h-4 w-4 mr-2" />}
                Reactivate
              </button>
            ) : (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center px-4 py-2 text-error-600 border border-error-600 rounded-lg hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel Subscription
              </button>
            )}
            
            <button className="flex items-center px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors">
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Update Payment Method
            </button>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Choose Your Plan</h2>
          
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
              Yearly
            </span>
            {savings && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                {savings}
              </span>
            )}
          </div>
        </div>

        {/* Coupon Code */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={applyCoupon}
              disabled={loading || !couponCode.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Apply
            </button>
          </div>
          {appliedCoupon && (
            <p className="text-sm text-success-600 mt-2 flex items-center">
              <CheckIcon className="h-4 w-4 mr-1" />
              {appliedCoupon}
            </p>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-xl border-2 p-6 ${
                plan.popular
                  ? 'border-primary-500 bg-primary-50'
                  : plan.current
                  ? 'border-success-500 bg-success-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white">
                    <StarIcon className="h-3 w-3 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}
              
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-600 text-white">
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Current Plan
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600">/{plan.billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckIcon className="h-4 w-4 text-success-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
                    Devices
                  </span>
                  <span className="font-medium">
                    {plan.limitations.devices === -1 ? 'Unlimited' : plan.limitations.devices}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <CloudIcon className="h-4 w-4 mr-2" />
                    Storage
                  </span>
                  <span className="font-medium">{plan.limitations.storage} GB</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Transfers
                  </span>
                  <span className="font-medium">
                    {plan.limitations.transfers === -1 ? 'Unlimited' : `${plan.limitations.transfers}/month`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Support
                  </span>
                  <span className="font-medium text-xs">{plan.limitations.support}</span>
                </div>
              </div>
              
              {plan.current ? (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-success-600 text-white rounded-lg font-medium opacity-75 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
                      : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500'
                  }`}
                >
                  {loading ? <LoadingSpinner size="sm" /> : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                </div>
                
                <div>
                  <p className="font-medium text-gray-900">Invoice #{invoice.id}</p>
                  <p className="text-sm text-gray-600">{formatDate(invoice.date)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-medium text-gray-900">${invoice.amount}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-success-100 text-success-800'
                      : invoice.status === 'pending'
                      ? 'bg-warning-100 text-warning-800'
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
                
                <button
                  onClick={() => window.open(invoice.downloadUrl, '_blank')}
                  className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          
          {invoices.length === 0 && (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
              <p className="text-gray-600">
                Your billing history will appear here once you have a paid subscription
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-warning-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Keep Subscription
              </button>
              
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Cancel Subscription'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;