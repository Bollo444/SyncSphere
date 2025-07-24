const Subscription = require('../models/Subscription');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const redis = require('../config/redis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  // Get user's current subscription
  static async getUserSubscription(userId) {
    try {
      // Check cache first
      const cacheKey = `subscription:user:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const subscription = await Subscription.findByUserId(userId);
      if (!subscription) {
        // Create free subscription if none exists
        const freeSubscription = await this.createSubscription(userId, 'free');
        await redis.setex(cacheKey, 300, JSON.stringify(freeSubscription.toJSON())); // Cache for 5 minutes
        return freeSubscription.toJSON();
      }

      const result = subscription.toJSON();
      await redis.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw new AppError('Failed to get subscription', 500);
    }
  }

  // Get all subscription plans
  static async getSubscriptionPlans() {
    try {
      const cacheKey = 'subscription:plans';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const plans = await Subscription.getPlans();
      await redis.setex(cacheKey, 3600, JSON.stringify(plans)); // Cache for 1 hour
      return plans;
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw new AppError('Failed to get subscription plans', 500);
    }
  }

  // Get specific plan details
  static async getPlanDetails(planId) {
    try {
      const cacheKey = `subscription:plan:${planId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const plan = await Subscription.getPlanById(planId);
      if (!plan) {
        throw new AppError('Subscription plan not found', 404);
      }

      await redis.setex(cacheKey, 3600, JSON.stringify(plan));
      return plan;
    } catch (error) {
      logger.error('Error getting plan details:', error);
      throw error;
    }
  }

  // Create a new subscription
  static async createSubscription(userId, planId, options = {}) {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate plan exists
      const plan = await Subscription.getPlanById(planId);
      if (!plan) {
        throw new AppError('Invalid subscription plan', 400);
      }

      // Check if user already has a subscription
      const existingSubscription = await Subscription.findByUserId(userId);
      if (existingSubscription) {
        throw new AppError('User already has a subscription', 400);
      }

      // Create subscription
      const subscription = await Subscription.create(userId, planId, options);

      // Clear cache
      await redis.del(`subscription:user:${userId}`);

      logger.info(`Subscription created for user ${userId} with plan ${planId}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Upgrade/downgrade subscription
  static async changeSubscriptionPlan(userId, newPlanId, billingCycle = 'monthly') {
    try {
      const subscription = await Subscription.findByUserId(userId);
      if (!subscription) {
        throw new AppError('No active subscription found', 404);
      }

      const newPlan = await Subscription.getPlanById(newPlanId);
      if (!newPlan) {
        throw new AppError('Invalid subscription plan', 400);
      }

      // If changing to/from free plan, handle differently
      if (subscription.plan_id === 'free' && newPlanId !== 'free') {
        // Upgrading from free - need payment setup
        return await this.upgradeFromFree(subscription, newPlanId, billingCycle);
      } else if (newPlanId === 'free') {
        // Downgrading to free - cancel paid subscription
        return await this.downgradeToFree(subscription);
      } else {
        // Changing between paid plans
        return await this.changePaidPlan(subscription, newPlanId, billingCycle);
      }
    } catch (error) {
      logger.error('Error changing subscription plan:', error);
      throw error;
    }
  }

  // Upgrade from free plan
  static async upgradeFromFree(subscription, newPlanId, billingCycle) {
    try {
      const plan = await Subscription.getPlanById(newPlanId);
      const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      // For now, simulate Stripe integration
      // In production, you would create Stripe customer and subscription here
      const stripeCustomerId = `cus_${Date.now()}`; // Mock Stripe customer ID
      const stripeSubscriptionId = `sub_${Date.now()}`; // Mock Stripe subscription ID

      // Update subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

      await subscription.updatePlan(newPlanId, {
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      });

      // Update Stripe IDs
      const query = `
        UPDATE subscriptions 
        SET stripe_customer_id = $1, stripe_subscription_id = $2
        WHERE id = $3
      `;
      await require('../config/database').query(query, [
        stripeCustomerId,
        stripeSubscriptionId,
        subscription.id
      ]);

      // Clear cache
      await redis.del(`subscription:user:${subscription.user_id}`);

      logger.info(`User ${subscription.user_id} upgraded from free to ${newPlanId}`);
      return await Subscription.findById(subscription.id);
    } catch (error) {
      logger.error('Error upgrading from free:', error);
      throw error;
    }
  }

  // Downgrade to free plan
  static async downgradeToFree(subscription) {
    try {
      // Cancel Stripe subscription if exists
      if (subscription.stripe_subscription_id) {
        // In production, cancel Stripe subscription here
        logger.info(`Would cancel Stripe subscription: ${subscription.stripe_subscription_id}`);
      }

      // Update to free plan
      await subscription.updatePlan('free');
      await subscription.updateStatus('active');

      // Clear Stripe IDs
      const query = `
        UPDATE subscriptions 
        SET stripe_customer_id = NULL, stripe_subscription_id = NULL, payment_method_id = NULL
        WHERE id = $1
      `;
      await require('../config/database').query(query, [subscription.id]);

      // Clear cache
      await redis.del(`subscription:user:${subscription.user_id}`);

      logger.info(`User ${subscription.user_id} downgraded to free plan`);
      return await Subscription.findById(subscription.id);
    } catch (error) {
      logger.error('Error downgrading to free:', error);
      throw error;
    }
  }

  // Change between paid plans
  static async changePaidPlan(subscription, newPlanId, billingCycle) {
    try {
      const newPlan = await Subscription.getPlanById(newPlanId);
      
      // In production, update Stripe subscription here
      if (subscription.stripe_subscription_id) {
        logger.info(`Would update Stripe subscription: ${subscription.stripe_subscription_id} to plan ${newPlanId}`);
      }

      // Update subscription plan
      await subscription.updatePlan(newPlanId);

      // Clear cache
      await redis.del(`subscription:user:${subscription.user_id}`);

      logger.info(`User ${subscription.user_id} changed plan to ${newPlanId}`);
      return await Subscription.findById(subscription.id);
    } catch (error) {
      logger.error('Error changing paid plan:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await Subscription.findByUserId(userId);
      if (!subscription) {
        throw new AppError('No active subscription found', 404);
      }

      if (subscription.plan_id === 'free') {
        throw new AppError('Cannot cancel free subscription', 400);
      }

      // Cancel Stripe subscription if exists
      if (subscription.stripe_subscription_id) {
        // In production, cancel Stripe subscription here
        logger.info(`Would cancel Stripe subscription: ${subscription.stripe_subscription_id}`);
      }

      // Update subscription
      await subscription.cancel(cancelAtPeriodEnd);

      // Clear cache
      await redis.del(`subscription:user:${userId}`);

      logger.info(`Subscription cancelled for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Reactivate cancelled subscription
  static async reactivateSubscription(userId) {
    try {
      const subscription = await Subscription.findByUserId(userId);
      if (!subscription) {
        throw new AppError('No subscription found', 404);
      }

      if (!subscription.isCancelled()) {
        throw new AppError('Subscription is not cancelled', 400);
      }

      // Reactivate Stripe subscription if exists
      if (subscription.stripe_subscription_id) {
        // In production, reactivate Stripe subscription here
        logger.info(`Would reactivate Stripe subscription: ${subscription.stripe_subscription_id}`);
      }

      // Update subscription
      await subscription.reactivate();

      // Clear cache
      await redis.del(`subscription:user:${userId}`);

      logger.info(`Subscription reactivated for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // Update payment method
  static async updatePaymentMethod(userId, paymentMethodId) {
    try {
      const subscription = await Subscription.findByUserId(userId);
      if (!subscription) {
        throw new AppError('No subscription found', 404);
      }

      if (subscription.plan_id === 'free') {
        throw new AppError('Free plan does not require payment method', 400);
      }

      // Update Stripe payment method if exists
      if (subscription.stripe_subscription_id) {
        // In production, update Stripe payment method here
        logger.info(`Would update payment method for Stripe subscription: ${subscription.stripe_subscription_id}`);
      }

      // Update subscription
      await subscription.updatePaymentMethod(paymentMethodId);

      // Clear cache
      await redis.del(`subscription:user:${userId}`);

      logger.info(`Payment method updated for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Error updating payment method:', error);
      throw error;
    }
  }

  // Get subscription usage and limits
  static async getSubscriptionUsage(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const plan = subscription.plan;

      // Get current usage from various services
      const [deviceCount, activeRecoverySessions, activeTransferSessions] = await Promise.all([
        this.getUserDeviceCount(userId),
        this.getActiveRecoverySessions(userId),
        this.getActiveTransferSessions(userId)
      ]);

      return {
        plan: plan,
        usage: {
          devices: {
            current: deviceCount,
            limit: plan.limits.max_devices === -1 ? 'unlimited' : plan.limits.max_devices,
            percentage: plan.limits.max_devices === -1 ? 0 : Math.round((deviceCount / plan.limits.max_devices) * 100)
          },
          recovery_sessions: {
            current: activeRecoverySessions,
            limit: plan.limits.max_recovery_sessions === -1 ? 'unlimited' : plan.limits.max_recovery_sessions,
            percentage: plan.limits.max_recovery_sessions === -1 ? 0 : Math.round((activeRecoverySessions / plan.limits.max_recovery_sessions) * 100)
          },
          transfer_sessions: {
            current: activeTransferSessions,
            limit: plan.limits.max_transfer_sessions === -1 ? 'unlimited' : plan.limits.max_transfer_sessions,
            percentage: plan.limits.max_transfer_sessions === -1 ? 0 : Math.round((activeTransferSessions / plan.limits.max_transfer_sessions) * 100)
          },
          storage: {
            current: 0, // TODO: Implement storage tracking
            limit: plan.limits.storage_limit_gb,
            percentage: 0
          }
        },
        subscription_status: {
          is_active: subscription.is_active,
          is_trialing: subscription.is_trialing,
          is_cancelled: subscription.is_cancelled,
          days_until_renewal: subscription.days_until_period_end
        }
      };
    } catch (error) {
      logger.error('Error getting subscription usage:', error);
      throw error;
    }
  }

  // Check if user can perform action based on subscription limits
  static async checkSubscriptionLimit(userId, action, count = 1) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const limits = subscription.plan.limits;

      switch (action) {
        case 'add_device':
          if (limits.max_devices === -1) return true;
          const deviceCount = await this.getUserDeviceCount(userId);
          return deviceCount + count <= limits.max_devices;

        case 'start_recovery':
          if (limits.max_recovery_sessions === -1) return true;
          const recoverySessions = await this.getActiveRecoverySessions(userId);
          return recoverySessions + count <= limits.max_recovery_sessions;

        case 'start_transfer':
          if (limits.max_transfer_sessions === -1) return true;
          const transferSessions = await this.getActiveTransferSessions(userId);
          return transferSessions + count <= limits.max_transfer_sessions;

        default:
          return true;
      }
    } catch (error) {
      logger.error('Error checking subscription limit:', error);
      return false;
    }
  }

  // Helper method to get user device count
  static async getUserDeviceCount(userId) {
    try {
      const query = `SELECT COUNT(*) as count FROM devices WHERE user_id = $1 AND status = 'connected'`;
      const result = await require('../config/database').query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting user device count:', error);
      return 0;
    }
  }

  // Helper method to get active recovery sessions
  static async getActiveRecoverySessions(userId) {
    try {
      const query = `SELECT COUNT(*) as count FROM data_recovery_sessions WHERE user_id = $1 AND status IN ('in_progress')`;
      const result = await require('../config/database').query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting active recovery sessions:', error);
      return 0;
    }
  }

  // Helper method to get active transfer sessions
  static async getActiveTransferSessions(userId) {
    try {
      const query = `SELECT COUNT(*) as count FROM phone_transfers WHERE user_id = $1 AND status IN ('preparing', 'connecting', 'transferring')`;
      const result = await require('../config/database').query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting active transfer sessions:', error);
      return 0;
    }
  }

  // Get subscription statistics (admin)
  static async getSubscriptionStatistics(timeRange = '30 days') {
    try {
      const cacheKey = `subscription:stats:${timeRange}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await Subscription.getSubscriptionStats(timeRange);
      
      // Calculate additional metrics
      const totalSubscriptions = stats.reduce((sum, stat) => sum + parseInt(stat.plan_count), 0);
      const activeSubscriptions = stats.reduce((sum, stat) => sum + parseInt(stat.active_subscriptions), 0);
      const revenue = stats.reduce((sum, stat) => {
        const plan = stat.plan_id;
        // Simplified revenue calculation - in production, use actual billing data
        const monthlyPrice = plan === 'basic' ? 9.99 : plan === 'premium' ? 19.99 : plan === 'enterprise' ? 49.99 : 0;
        return sum + (parseInt(stat.active_subscriptions) * monthlyPrice);
      }, 0);

      const result = {
        total_subscriptions: totalSubscriptions,
        active_subscriptions: activeSubscriptions,
        estimated_monthly_revenue: revenue,
        conversion_rate: totalSubscriptions > 0 ? Math.round((activeSubscriptions / totalSubscriptions) * 100) : 0,
        plan_distribution: stats,
        generated_at: new Date().toISOString()
      };

      await redis.setex(cacheKey, 1800, JSON.stringify(result)); // Cache for 30 minutes
      return result;
    } catch (error) {
      logger.error('Error getting subscription statistics:', error);
      throw new AppError('Failed to get subscription statistics', 500);
    }
  }

  // Handle Stripe webhook events
  static async handleStripeWebhook(event) {
    try {
      logger.info(`Processing Stripe webhook: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          logger.info(`Unhandled Stripe webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  // Handle subscription created webhook
  static async handleSubscriptionCreated(stripeSubscription) {
    try {
      const subscription = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
      if (subscription) {
        await subscription.updateStatus('active');
        await redis.del(`subscription:user:${subscription.user_id}`);
        logger.info(`Subscription activated: ${stripeSubscription.id}`);
      }
    } catch (error) {
      logger.error('Error handling subscription created:', error);
    }
  }

  // Handle subscription updated webhook
  static async handleSubscriptionUpdated(stripeSubscription) {
    try {
      const subscription = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
      if (subscription) {
        await subscription.updateStatus(stripeSubscription.status, {
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
        });
        await redis.del(`subscription:user:${subscription.user_id}`);
        logger.info(`Subscription updated: ${stripeSubscription.id}`);
      }
    } catch (error) {
      logger.error('Error handling subscription updated:', error);
    }
  }

  // Handle subscription deleted webhook
  static async handleSubscriptionDeleted(stripeSubscription) {
    try {
      const subscription = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
      if (subscription) {
        await subscription.updateStatus('cancelled', {
          cancelledAt: new Date()
        });
        await redis.del(`subscription:user:${subscription.user_id}`);
        logger.info(`Subscription cancelled: ${stripeSubscription.id}`);
      }
    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
    }
  }

  // Handle payment succeeded webhook
  static async handlePaymentSucceeded(invoice) {
    try {
      if (invoice.subscription) {
        const subscription = await Subscription.findByStripeSubscriptionId(invoice.subscription);
        if (subscription && subscription.status === 'past_due') {
          await subscription.updateStatus('active');
          await redis.del(`subscription:user:${subscription.user_id}`);
          logger.info(`Payment succeeded for subscription: ${invoice.subscription}`);
        }
      }
    } catch (error) {
      logger.error('Error handling payment succeeded:', error);
    }
  }

  // Handle payment failed webhook
  static async handlePaymentFailed(invoice) {
    try {
      if (invoice.subscription) {
        const subscription = await Subscription.findByStripeSubscriptionId(invoice.subscription);
        if (subscription) {
          await subscription.updateStatus('past_due');
          await redis.del(`subscription:user:${subscription.user_id}`);
          logger.info(`Payment failed for subscription: ${invoice.subscription}`);
        }
      }
    } catch (error) {
      logger.error('Error handling payment failed:', error);
    }
  }
}

module.exports = SubscriptionService;