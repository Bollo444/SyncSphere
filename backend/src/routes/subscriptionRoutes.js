const express = require('express');
const subscriptionService = require('../services/subscriptionService');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const AppError = require('../utils/AppError');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.protect);

// Get current user's subscription
router.get('/current', async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
});

// Get all available subscription plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
});

// Get specific plan details
router.get('/plans/:planId', [
  param('planId').isIn(['free', 'basic', 'premium', 'enterprise']).withMessage('Invalid plan ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const plan = await subscriptionService.getPlanDetails(req.params.planId);
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription usage and limits
router.get('/usage', async (req, res, next) => {
  try {
    const usage = await subscriptionService.getSubscriptionUsage(req.user.id);
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
});

// Create new subscription (upgrade from free)
router.post('/create', [
  body('plan_id').isIn(['basic', 'premium', 'enterprise']).withMessage('Invalid plan ID'),
  body('billing_cycle').optional().isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle'),
  body('payment_method_id').optional().isString().withMessage('Payment method ID must be a string'),
  body('trial_days').optional().isInt({ min: 0, max: 30 }).withMessage('Trial days must be between 0 and 30')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { plan_id, billing_cycle = 'monthly', payment_method_id, trial_days = 0 } = req.body;
    
    const subscription = await subscriptionService.createSubscription(req.user.id, plan_id, {
      paymentMethodId: payment_method_id,
      trialDays: trial_days,
      billingCycle: billing_cycle
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Change subscription plan
router.put('/change-plan', [
  body('plan_id').isIn(['free', 'basic', 'premium', 'enterprise']).withMessage('Invalid plan ID'),
  body('billing_cycle').optional().isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { plan_id, billing_cycle = 'monthly' } = req.body;
    
    const subscription = await subscriptionService.changeSubscriptionPlan(
      req.user.id, 
      plan_id, 
      billing_cycle
    );

    res.json({
      success: true,
      message: 'Subscription plan changed successfully',
      data: subscription.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/cancel', [
  body('cancel_at_period_end').optional().isBoolean().withMessage('Cancel at period end must be boolean')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { cancel_at_period_end = true } = req.body;
    
    const subscription = await subscriptionService.cancelSubscription(
      req.user.id, 
      cancel_at_period_end
    );

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate cancelled subscription
router.post('/reactivate', async (req, res, next) => {
  try {
    const subscription = await subscriptionService.reactivateSubscription(req.user.id);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: subscription.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Update payment method
router.put('/payment-method', [
  body('payment_method_id').isString().notEmpty().withMessage('Payment method ID is required')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { payment_method_id } = req.body;
    
    const subscription = await subscriptionService.updatePaymentMethod(
      req.user.id, 
      payment_method_id
    );

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: subscription.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Check subscription limits
router.post('/check-limit', [
  body('action').isIn(['add_device', 'start_recovery', 'start_transfer']).withMessage('Invalid action'),
  body('count').optional().isInt({ min: 1 }).withMessage('Count must be a positive integer')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { action, count = 1 } = req.body;
    
    const canPerform = await subscriptionService.checkSubscriptionLimit(
      req.user.id, 
      action, 
      count
    );

    res.json({
      success: true,
      data: {
        action,
        count,
        can_perform: canPerform
      }
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook endpoint (no authentication required)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      // In production, verify the webhook signature
      // event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      
      // For development, parse the body directly
      event = JSON.parse(req.body.toString());
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await subscriptionService.handleStripeWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Admin routes (require admin role)
router.use(authMiddleware.authorize('admin'));

// Get subscription statistics
router.get('/admin/statistics', [
  query('time_range').optional().isIn(['7 days', '30 days', '90 days', '1 year']).withMessage('Invalid time range')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { time_range = '30 days' } = req.query;
    
    const statistics = await subscriptionService.getSubscriptionStatistics(time_range);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
});

// Get all subscriptions (admin)
router.get('/admin/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'cancelled', 'past_due', 'trialing']).withMessage('Invalid status'),
  query('plan_id').optional().isIn(['free', 'basic', 'premium', 'enterprise']).withMessage('Invalid plan ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      plan_id,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT s.*, u.email, u.first_name, u.last_name, sp.name as plan_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      values.push(status);
    }

    if (plan_id) {
      paramCount++;
      query += ` AND s.plan_id = $${paramCount}`;
      values.push(plan_id);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT s.*, u.email, u.first_name, u.last_name, sp.name as plan_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await require('../config/database').pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await require('../config/database').pool.query(query, values);

    res.json({
      success: true,
      data: {
        subscriptions: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription by ID (admin)
router.get('/admin/:subscriptionId', [
  param('subscriptionId').isUUID().withMessage('Invalid subscription ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    
    const query = `
      SELECT s.*, u.email, u.first_name, u.last_name, sp.name as plan_name, sp.features, sp.limits
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.id = $1
    `;
    
    const result = await require('../config/database').pool.query(query, [subscriptionId]);
    
    if (result.rows.length === 0) {
      throw new AppError('Subscription not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update subscription status (admin)
router.put('/admin/:subscriptionId/status', [
  param('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
  body('status').isIn(['active', 'inactive', 'cancelled', 'past_due', 'trialing']).withMessage('Invalid status')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { status } = req.body;
    
    const query = `
      UPDATE subscriptions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await require('../config/database').pool.query(query, [status, subscriptionId]);
    
    if (result.rows.length === 0) {
      throw new AppError('Subscription not found', 404);
    }

    res.json({
      success: true,
      message: 'Subscription status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get expiring subscriptions (admin)
router.get('/admin/expiring/:days', [
  param('days').isInt({ min: 1, max: 30 }).withMessage('Days must be between 1 and 30')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { days } = req.params;
    
    const query = `
      SELECT s.*, u.email, u.first_name, u.last_name, sp.name as plan_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status IN ('active', 'trialing')
      AND s.current_period_end <= NOW() + INTERVAL '${days} days'
      AND s.current_period_end > NOW()
      ORDER BY s.current_period_end ASC
    `;
    
    const result = await require('../config/database').pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get overdue subscriptions (admin)
router.get('/admin/overdue', async (req, res, next) => {
  try {
    const query = `
      SELECT s.*, u.email, u.first_name, u.last_name, sp.name as plan_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'past_due'
      OR (s.current_period_end < NOW() AND s.status = 'active')
      ORDER BY s.current_period_end ASC
    `;
    
    const result = await require('../config/database').pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create/update subscription plan (admin)
router.post('/admin/plans', [
  body('id').isString().notEmpty().withMessage('Plan ID is required'),
  body('name').isString().notEmpty().withMessage('Plan name is required'),
  body('description').optional().isString(),
  body('price_monthly').isFloat({ min: 0 }).withMessage('Monthly price must be a positive number'),
  body('price_yearly').isFloat({ min: 0 }).withMessage('Yearly price must be a positive number'),
  body('features').isArray().withMessage('Features must be an array'),
  body('limits').isObject().withMessage('Limits must be an object'),
  body('is_active').optional().isBoolean().withMessage('Is active must be boolean'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a positive integer')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      id,
      name,
      description,
      price_monthly,
      price_yearly,
      features,
      limits,
      is_active = true,
      sort_order = 0
    } = req.body;
    
    const query = `
      INSERT INTO subscription_plans (
        id, name, description, price_monthly, price_yearly, 
        features, limits, is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      id, name, description, price_monthly, price_yearly,
      JSON.stringify(features), JSON.stringify(limits), is_active, sort_order
    ];
    
    const result = await require('../config/database').pool.query(query, values);
    
    // Clear plans cache
    await require('../config/redis').del('subscription:plans');
    await require('../config/redis').del(`subscription:plan:${id}`);

    res.json({
      success: true,
      message: 'Subscription plan saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;