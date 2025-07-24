const { getPool } = require('../config/database');

const getDbPool = () => {
  try {
    return getPool();
  } catch (error) {
    // For testing, return a mock pool
    if (process.env.NODE_ENV === 'test') {
      return {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
    }
    throw error;
  }
};
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

class Subscription {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.plan_id = data.plan_id;
    this.status = data.status;
    this.current_period_start = data.current_period_start;
    this.current_period_end = data.current_period_end;
    this.cancel_at_period_end = data.cancel_at_period_end;
    this.cancelled_at = data.cancelled_at;
    this.trial_start = data.trial_start;
    this.trial_end = data.trial_end;
    this.payment_method_id = data.payment_method_id;
    this.stripe_subscription_id = data.stripe_subscription_id;
    this.stripe_customer_id = data.stripe_customer_id;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create subscriptions table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('free', 'basic', 'premium', 'enterprise')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing', 'incomplete')),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMP,
        trial_start TIMESTAMP,
        trial_end TIMESTAMP,
        payment_method_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

      CREATE TRIGGER update_subscriptions_updated_at
        BEFORE UPDATE ON subscriptions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    await getDbPool().query(query);
  }

  // Create subscription plans table
  static async createPlansTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
        features JSONB DEFAULT '[]'::jsonb,
        limits JSONB DEFAULT '{}'::jsonb,
        stripe_price_id_monthly VARCHAR(255),
        stripe_price_id_yearly VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER update_subscription_plans_updated_at
        BEFORE UPDATE ON subscription_plans
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Insert default plans
      INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
      ('free', 'Free', 'Basic data recovery and transfer features', 0.00, 0.00, 
       '["Basic data recovery", "1 device connection", "Email support"]'::jsonb,
       '{"max_devices": 1, "max_recovery_sessions": 1, "max_transfer_sessions": 1, "storage_limit_gb": 1, "support_level": "email"}'::jsonb, 1),
      ('basic', 'Basic', 'Enhanced features for personal use', 9.99, 99.99,
       '["Advanced data recovery", "Up to 3 devices", "Priority email support", "Cloud backup"]'::jsonb,
       '{"max_devices": 3, "max_recovery_sessions": 3, "max_transfer_sessions": 2, "storage_limit_gb": 10, "support_level": "priority_email"}'::jsonb, 2),
      ('premium', 'Premium', 'Professional features for power users', 19.99, 199.99,
       '["Professional data recovery", "Up to 10 devices", "Phone support", "Advanced analytics", "Priority processing"]'::jsonb,
       '{"max_devices": 10, "max_recovery_sessions": 5, "max_transfer_sessions": 5, "storage_limit_gb": 100, "support_level": "phone"}'::jsonb, 3),
      ('enterprise', 'Enterprise', 'Full-featured solution for businesses', 49.99, 499.99,
       '["Enterprise data recovery", "Unlimited devices", "24/7 phone support", "Custom integrations", "Dedicated account manager"]'::jsonb,
       '{"max_devices": -1, "max_recovery_sessions": -1, "max_transfer_sessions": -1, "storage_limit_gb": 1000, "support_level": "24_7_phone"}'::jsonb, 4)
      ON CONFLICT (id) DO NOTHING;
    `;

    await getDbPool().query(query);
  }

  // Create a new subscription
  static async create(userId, planId, options = {}) {
    const {
      stripeSubscriptionId,
      stripeCustomerId,
      paymentMethodId,
      trialDays = 0,
      metadata = {}
    } = options;

    const id = uuidv4();
    const now = new Date();
    const trialStart = trialDays > 0 ? now : null;
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000)) : null;
    const periodStart = trialEnd || now;
    const periodEnd = new Date(periodStart.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    const query = `
      INSERT INTO subscriptions (
        id, user_id, plan_id, status, current_period_start, current_period_end,
        trial_start, trial_end, payment_method_id, stripe_subscription_id, 
        stripe_customer_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id, userId, planId, trialDays > 0 ? 'trialing' : 'active',
      periodStart, periodEnd, trialStart, trialEnd, paymentMethodId,
      stripeSubscriptionId, stripeCustomerId, JSON.stringify(metadata)
    ];

    const result = await getDbPool().query(query, values);
    return new Subscription(result.rows[0]);
  }

  // Find subscription by ID
  static async findById(id) {
    const query = `
      SELECT s.*, sp.name as plan_name, sp.features, sp.limits, sp.price_monthly, sp.price_yearly
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.id = $1
    `;

    const result = await getDbPool().query(query, [id]);
    return result.rows[0] ? new Subscription(result.rows[0]) : null;
  }

  // Find subscription by user ID
  static async findByUserId(userId) {
    const query = `
      SELECT s.*, sp.name as plan_name, sp.features, sp.limits, sp.price_monthly, sp.price_yearly
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = $1
    `;

    const result = await getDbPool().query(query, [userId]);
    return result.rows[0] ? new Subscription(result.rows[0]) : null;
  }

  // Find subscription by Stripe subscription ID
  static async findByStripeSubscriptionId(stripeSubscriptionId) {
    const query = `
      SELECT s.*, sp.name as plan_name, sp.features, sp.limits, sp.price_monthly, sp.price_yearly
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.stripe_subscription_id = $1
    `;

    const result = await getDbPool().query(query, [stripeSubscriptionId]);
    return result.rows[0] ? new Subscription(result.rows[0]) : null;
  }

  // Get all subscription plans
  static async getPlans() {
    const query = `
      SELECT * FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `;

    const result = await getDbPool().query(query);
    return result.rows;
  }

  // Get plan by ID
  static async getPlanById(planId) {
    const query = `
      SELECT * FROM subscription_plans 
      WHERE id = $1 AND is_active = true
    `;

    const result = await getDbPool().query(query, [planId]);
    return result.rows[0] || null;
  }

  // Update subscription status
  async updateStatus(status, options = {}) {
    const { cancelledAt, currentPeriodEnd } = options;
    
    let query = `UPDATE subscriptions SET status = $1`;
    const values = [status];
    let paramCount = 1;

    if (cancelledAt) {
      paramCount++;
      query += `, cancelled_at = $${paramCount}`;
      values.push(cancelledAt);
    }

    if (currentPeriodEnd) {
      paramCount++;
      query += `, current_period_end = $${paramCount}`;
      values.push(currentPeriodEnd);
    }

    query += ` WHERE id = $${paramCount + 1} RETURNING *`;
    values.push(this.id);

    const result = await getDbPool().query(query, values);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Update subscription plan
  async updatePlan(planId, options = {}) {
    const { currentPeriodStart, currentPeriodEnd } = options;
    
    let query = `UPDATE subscriptions SET plan_id = $1`;
    const values = [planId];
    let paramCount = 1;

    if (currentPeriodStart) {
      paramCount++;
      query += `, current_period_start = $${paramCount}`;
      values.push(currentPeriodStart);
    }

    if (currentPeriodEnd) {
      paramCount++;
      query += `, current_period_end = $${paramCount}`;
      values.push(currentPeriodEnd);
    }

    query += ` WHERE id = $${paramCount + 1} RETURNING *`;
    values.push(this.id);

    const result = await getDbPool().query(query, values);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Cancel subscription
  async cancel(cancelAtPeriodEnd = true) {
    const cancelledAt = cancelAtPeriodEnd ? null : new Date();
    const status = cancelAtPeriodEnd ? this.status : 'cancelled';
    
    const query = `
      UPDATE subscriptions 
      SET cancel_at_period_end = $1, cancelled_at = $2, status = $3
      WHERE id = $4 
      RETURNING *
    `;

    const values = [cancelAtPeriodEnd, cancelledAt, status, this.id];
    const result = await getDbPool().query(query, values);
    
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Reactivate subscription
  async reactivate() {
    const query = `
      UPDATE subscriptions 
      SET cancel_at_period_end = false, cancelled_at = null, status = 'active'
      WHERE id = $1 
      RETURNING *
    `;

    const result = await getDbPool().query(query, [this.id]);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Update payment method
  async updatePaymentMethod(paymentMethodId) {
    const query = `
      UPDATE subscriptions 
      SET payment_method_id = $1
      WHERE id = $2 
      RETURNING *
    `;

    const result = await getDbPool().query(query, [paymentMethodId, this.id]);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Update metadata
  async updateMetadata(metadata) {
    const query = `
      UPDATE subscriptions 
      SET metadata = $1
      WHERE id = $2 
      RETURNING *
    `;

    const result = await getDbPool().query(query, [JSON.stringify(metadata), this.id]);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Check if subscription is active
  isActive() {
    return ['active', 'trialing'].includes(this.status);
  }

  // Check if subscription is in trial
  isTrialing() {
    return this.status === 'trialing' && 
           this.trial_end && 
           new Date() < new Date(this.trial_end);
  }

  // Check if subscription is cancelled
  isCancelled() {
    return this.status === 'cancelled' || this.cancel_at_period_end;
  }

  // Check if subscription is past due
  isPastDue() {
    return this.status === 'past_due';
  }

  // Get days until trial ends
  getDaysUntilTrialEnd() {
    if (!this.trial_end) return 0;
    
    const now = new Date();
    const trialEnd = new Date(this.trial_end);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  // Get days until period ends
  getDaysUntilPeriodEnd() {
    if (!this.current_period_end) return 0;
    
    const now = new Date();
    const periodEnd = new Date(this.current_period_end);
    const diffTime = periodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  // Get subscription statistics
  static async getSubscriptionStats(timeRange = '30 days') {
    const query = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trialing_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
        plan_id,
        COUNT(*) as plan_count
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '${timeRange}'
      GROUP BY plan_id
    `;

    const result = await getDbPool().query(query);
    return result.rows;
  }

  // Get expiring subscriptions
  static async getExpiringSubscriptions(days = 7) {
    const query = `
      SELECT s.*, u.email, u.first_name, u.last_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('active', 'trialing')
      AND s.current_period_end <= NOW() + INTERVAL '${days} days'
      AND s.current_period_end > NOW()
      ORDER BY s.current_period_end ASC
    `;

    const result = await getDbPool().query(query);
    return result.rows.map(row => new Subscription(row));
  }

  // Get overdue subscriptions
  static async getOverdueSubscriptions() {
    const query = `
      SELECT s.*, u.email, u.first_name, u.last_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'past_due'
      OR (s.current_period_end < NOW() AND s.status = 'active')
      ORDER BY s.current_period_end ASC
    `;

    const result = await getDbPool().query(query);
    return result.rows.map(row => new Subscription(row));
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      plan: {
        id: this.plan_id,
        name: this.plan_name,
        features: this.features,
        limits: this.limits,
        price_monthly: this.price_monthly,
        price_yearly: this.price_yearly
      },
      status: this.status,
      current_period_start: this.current_period_start,
      current_period_end: this.current_period_end,
      cancel_at_period_end: this.cancel_at_period_end,
      cancelled_at: this.cancelled_at,
      trial_start: this.trial_start,
      trial_end: this.trial_end,
      is_active: this.isActive(),
      is_trialing: this.isTrialing(),
      is_cancelled: this.isCancelled(),
      is_past_due: this.isPastDue(),
      days_until_trial_end: this.getDaysUntilTrialEnd(),
      days_until_period_end: this.getDaysUntilPeriodEnd(),
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Subscription;