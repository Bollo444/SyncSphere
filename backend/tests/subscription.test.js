const request = require('supertest');
const app = require('../src/app');
const Subscription = require('../src/models/Subscription');
const SubscriptionService = require('../src/services/subscriptionService');

describe('Subscription & Billing', () => {
  let testUser;
  let authToken;
  let testSubscription;
  
  beforeEach(async () => {
    // Clean up any existing test data
    await global.testHelpers.cleanupTestData();
    
    // Create test user and get auth token
    testUser = await global.testHelpers.createTestUser();
    authToken = global.testHelpers.generateTestToken(testUser);
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('GET /api/subscription/plans', () => {
    it('should get available subscription plans successfully', async () => {
      const response = await request(app)
        .get('/api/subscription/plans')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toBeDefined();
      expect(Array.isArray(response.body.data.plans)).toBe(true);
      expect(response.body.data.plans.length).toBeGreaterThan(0);
      
      // Check plan structure
      const plan = response.body.data.plans[0];
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.price).toBeDefined();
      expect(plan.features).toBeDefined();
    });
    
    it('should filter plans by type', async () => {
      const response = await request(app)
        .get('/api/subscription/plans?type=premium')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toBeDefined();
    });
  });
  
  describe('POST /api/subscription/subscribe', () => {
    const subscriptionData = {
      planId: 'premium_monthly',
      paymentMethodId: 'pm_test_card',
      billingAddress: {
        line1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US'
      }
    };
    
    it('should create subscription successfully', async () => {
      const response = await request(app)
        .post('/api/subscription/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.planId).toBe(subscriptionData.planId);
      expect(response.body.data.subscription.status).toBe('active');
    });
    
    it('should fail with invalid plan ID', async () => {
      const invalidData = {
        ...subscriptionData,
        planId: 'invalid_plan'
      };
      
      const response = await request(app)
        .post('/api/subscription/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail with invalid payment method', async () => {
      const invalidData = {
        ...subscriptionData,
        paymentMethodId: 'invalid_payment_method'
      };
      
      const response = await request(app)
        .post('/api/subscription/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/subscription/subscribe')
        .send(subscriptionData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail if user already has active subscription', async () => {
      // Create existing subscription
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'basic_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      await testSubscription.save();
      
      const response = await request(app)
        .post('/api/subscription/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active subscription');
    });
  });
  
  describe('GET /api/subscription/current', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: 'sub_test_123',
        stripeCustomerId: 'cus_test_123'
      });
      await testSubscription.save();
    });
    
    it('should get current subscription successfully', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.planId).toBe('premium_monthly');
      expect(response.body.data.subscription.status).toBe('active');
    });
    
    it('should return null for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const response = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeNull();
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/subscription/change-plan', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'basic_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: 'sub_test_123'
      });
      await testSubscription.save();
    });
    
    it('should change subscription plan successfully', async () => {
      const changeData = {
        newPlanId: 'premium_monthly'
      };
      
      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.planId).toBe('premium_monthly');
    });
    
    it('should fail with invalid plan ID', async () => {
      const changeData = {
        newPlanId: 'invalid_plan'
      };
      
      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const changeData = {
        newPlanId: 'premium_monthly'
      };
      
      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const changeData = {
        newPlanId: 'premium_monthly'
      };
      
      const response = await request(app)
        .put('/api/subscription/change-plan')
        .send(changeData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/subscription/cancel', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: 'sub_test_123'
      });
      await testSubscription.save();
    });
    
    it('should cancel subscription successfully', async () => {
      const cancelData = {
        cancelAtPeriodEnd: true,
        reason: 'No longer needed'
      };
      
      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.cancelAtPeriodEnd).toBe(true);
    });
    
    it('should cancel subscription immediately', async () => {
      const cancelData = {
        cancelAtPeriodEnd: false,
        reason: 'Immediate cancellation'
      };
      
      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.status).toBe('cancelled');
    });
    
    it('should fail for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const cancelData = {
        cancelAtPeriodEnd: true
      };
      
      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const cancelData = {
        cancelAtPeriodEnd: true
      };
      
      const response = await request(app)
        .post('/api/subscription/cancel')
        .send(cancelData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/subscription/usage', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: {
          dataRecoveryGB: 5.2,
          transfersCount: 3,
          devicesConnected: 2,
          storageUsedGB: 1.8
        }
      });
      await testSubscription.save();
    });
    
    it('should get subscription usage successfully', async () => {
      const response = await request(app)
        .get('/api/subscription/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.dataRecoveryGB).toBe(5.2);
      expect(response.body.data.usage.transfersCount).toBe(3);
      expect(response.body.data.limits).toBeDefined();
    });
    
    it('should fail for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const response = await request(app)
        .get('/api/subscription/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/usage')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/subscription/billing-history', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeCustomerId: 'cus_test_123'
      });
      await testSubscription.save();
    });
    
    it('should get billing history successfully', async () => {
      const response = await request(app)
        .get('/api/subscription/billing-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoices).toBeDefined();
      expect(Array.isArray(response.body.data.invoices)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/subscription/billing-history?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
    
    it('should fail for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const response = await request(app)
        .get('/api/subscription/billing-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/billing-history')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/subscription/payment-method', () => {
    beforeEach(async () => {
      testSubscription = new Subscription({
        userId: testUser._id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeCustomerId: 'cus_test_123'
      });
      await testSubscription.save();
    });
    
    it('should update payment method successfully', async () => {
      const paymentData = {
        paymentMethodId: 'pm_test_new_card'
      };
      
      const response = await request(app)
        .post('/api/subscription/payment-method')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentMethod).toBeDefined();
    });
    
    it('should fail with invalid payment method', async () => {
      const paymentData = {
        paymentMethodId: 'invalid_payment_method'
      };
      
      const response = await request(app)
        .post('/api/subscription/payment-method')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail for user without subscription', async () => {
      // Delete the subscription
      await Subscription.deleteOne({ _id: testSubscription._id });
      
      const paymentData = {
        paymentMethodId: 'pm_test_new_card'
      };
      
      const response = await request(app)
        .post('/api/subscription/payment-method')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const paymentData = {
        paymentMethodId: 'pm_test_new_card'
      };
      
      const response = await request(app)
        .post('/api/subscription/payment-method')
        .send(paymentData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/subscription/webhook', () => {
    it('should handle Stripe webhook successfully', async () => {
      const webhookData = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_paid: 2999,
            status: 'paid'
          }
        }
      };
      
      const response = await request(app)
        .post('/api/subscription/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookData)
        .expect(200);
      
      expect(response.body.received).toBe(true);
    });
    
    it('should handle subscription cancellation webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled'
          }
        }
      };
      
      const response = await request(app)
        .post('/api/subscription/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookData)
        .expect(200);
      
      expect(response.body.received).toBe(true);
    });
    
    it('should fail with invalid signature', async () => {
      const webhookData = {
        type: 'invoice.payment_succeeded',
        data: {}
      };
      
      const response = await request(app)
        .post('/api/subscription/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(webhookData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
});