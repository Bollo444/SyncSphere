// Authentication Integration Tests (No Mocks)
// Uses real database connections for end-to-end authentication testing
// Run with: npx jest --config jest.config.nomocks.js nomock.auth.integration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');
const bcrypt = require('bcryptjs');

describe('Authentication Integration Tests (No Mocks)', () => {
  const testUser = {
    email: 'auth.integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'Auth',
    lastName: 'Integration',
    acceptTerms: true
  };

  let userId;
  let authToken;

  beforeAll(async () => {
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      // Log the response for debugging
      if (response.status !== 201) {
        console.log('Registration failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Registration successful. You can now log in.');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.data.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Store user ID and token for subsequent tests
      userId = response.body.data.user.id;
      authToken = response.body.data.token;

      // Verify user was actually created in database
      const dbUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].email).toBe(testUser.email);
      expect(dbUser.rows[0].first_name).toBe(testUser.firstName);
      expect(dbUser.rows[0].last_name).toBe(testUser.lastName);
      
      // Verify password was hashed
      const isPasswordHashed = await bcrypt.compare(testUser.password, dbUser.rows[0].password_hash);
      expect(isPasswordHashed).toBe(true);
    });

    test('should reject registration with duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
        // Check for either top-level message or nested error.message
        const errorMessage = response.body.message || response.body.error?.message;
        expect(errorMessage).toBeDefined();
        expect(errorMessage).toContain('email');
    });

    test('should reject registration with invalid email format', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        ...testUser,
        email: 'weak.password@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject registration without accepting terms', async () => {
      const noTermsUser = {
        ...testUser,
        email: 'no.terms@example.com',
        acceptTerms: false
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(noTermsUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Update auth token for subsequent tests
      authToken = response.body.data.token;
    });

    test('should reject login with invalid email', async () => {
      const invalidLogin = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject login with invalid password', async () => {
      const invalidLogin = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    test('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Debug logging
      if (response.status !== 200) {
        console.log('Auth /me failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id', userId);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.data.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Logout should succeed even if there's no refresh token
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    test('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      // Check for either top-level message or nested error.message
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('Authentication Flow Integration', () => {
    test('should complete full registration -> login -> access protected route -> logout flow', async () => {
      const newUser = {
        email: 'flow.test@example.com',
        password: 'FlowTest123!',
        firstName: 'Flow',
        lastName: 'Test',
        acceptTerms: true
      };

      let flowUserId;
      let flowToken;

      try {
        // Step 1: Register
        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(newUser)
          .expect(201);

        flowUserId = registerResponse.body.data.user.id;
        flowToken = registerResponse.body.data.token;

        // Step 2: Access protected route
        const meResponse = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${flowToken}`)
          .expect(200);

        expect(meResponse.body.data.user.email).toBe(newUser.email);

        // Step 3: Logout (may not have refresh token in test environment)
        const logoutResponse = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${flowToken}`);
        
        // Log the response for debugging
        if (logoutResponse.status !== 200) {
          console.log('Logout failed:', logoutResponse.status, logoutResponse.body);
        }
        
        // Logout should succeed even without refresh token
        expect(logoutResponse.status).toBe(200);

        // Step 4: Login again
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: newUser.email,
            password: newUser.password
          })
          .expect(200);

        expect(loginResponse.body.data.user.email).toBe(newUser.email);
        flowToken = loginResponse.body.data.token;

        // Step 5: Access protected route again
        await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${flowToken}`)
          .expect(200);

      } finally {
        // Clean up
        if (flowUserId) {
          await query('DELETE FROM users WHERE id = $1', [flowUserId]);
        }
      }
    });
  });
});