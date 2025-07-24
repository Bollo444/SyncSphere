const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const AuthService = require('../src/services/auth/authService');

describe('Authentication', () => {
  let testUser;
  
  beforeEach(async () => {
    // Clean up any existing test data
    await global.testHelpers.cleanupTestData();
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
      
      // If email verification is disabled, tokens should be returned
      if (process.env.ENABLE_EMAIL_VERIFICATION !== 'true') {
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      }
    });
    
    it('should fail to register with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail to register with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail to register without accepting terms', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: false
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail to register with existing email', async () => {
      // Create a user first
      await global.testHelpers.createTestUser({ email: 'existing@example.com' });
      
      const userData = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
  
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await global.testHelpers.createTestUser({
        email: 'logintest@example.com',
        password: 'TestPassword123!'
      });
    });
    
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'TestPassword123!'
      };
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });
    
    it('should fail to login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
    
    it('should fail to login with invalid password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'WrongPassword123!'
      };
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
    
    it('should support remember me option', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'TestPassword123!',
        rememberMe: true
      };
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      
      // Token should have longer expiry when remember me is true
      const expiresAt = new Date(response.body.data.expiresAt);
      const now = new Date();
      const daysDiff = (expiresAt - now) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(7); // Should be more than 7 days
    });
  });
  
  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;
    
    beforeEach(async () => {
      testUser = await global.testHelpers.createTestUser();
      const loginResult = await AuthService.login({
        email: testUser.email,
        password: 'TestPassword123!'
      });
      refreshToken = loginResult.refreshToken;
    });
    
    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });
    
    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/v1/auth/logout', () => {
    let refreshToken;
    let accessToken;
    
    beforeEach(async () => {
      testUser = await global.testHelpers.createTestUser();
      const loginResult = await AuthService.login({
        email: testUser.email,
        password: 'TestPassword123!'
      });
      refreshToken = loginResult.refreshToken;
      accessToken = loginResult.token;
    });
    
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Try to use the refresh token again - should fail
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      
      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.success).toBe(false);
    });
    
    it('should fail logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/auth/me', () => {
    let token;
    
    beforeEach(async () => {
      testUser = await global.testHelpers.createTestUser();
      token = global.testHelpers.generateTestToken(testUser);
    });
    
    it('should return user profile when authenticated', async () => {
      console.log('🔍 TEST - Token being used:', token.substring(0, 50) + '...');
      console.log('🔍 TEST - Test user email:', testUser.email);
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      console.log('🔍 TEST - Response status:', response.status);
      console.log('🔍 TEST - Response body:', response.body);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });
    
    it('should fail without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
});