// User Management Integration Tests (No Mocks)
// Uses real database connections for end-to-end user management testing
// Run with: npx jest --config jest.config.nomocks.js nomock.users.integration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

describe('User Management Integration Tests (No Mocks)', () => {
  const testUser = {
    email: 'user.integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'User',
    lastName: 'Integration',
    confirmPassword: 'TestPassword123!',
    acceptTerms: true
  };

  const adminUser = {
    email: 'admin.integration.test@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'Integration',
    confirmPassword: 'AdminPassword123!',
    acceptTerms: true
  };

  let userId;
  let adminUserId;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email IN ($1, $2)', [testUser.email, adminUser.email]);

    // Register test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    
    if (userResponse.body.success && userResponse.body.data) {
      userId = userResponse.body.data.user.id;
      userToken = userResponse.body.data.token;
    } else {
      throw new Error(`User registration failed: ${JSON.stringify(userResponse.body)}`);
    }

    // Register admin user
    const adminResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);
    
    if (adminResponse.body.success && adminResponse.body.data) {
      adminUserId = adminResponse.body.data.user.id;
      adminToken = adminResponse.body.data.token;
    } else {
      throw new Error(`Admin registration failed: ${JSON.stringify(adminResponse.body)}`);
    }

    // Update admin user role in database
    await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUserId]);
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
    if (adminUserId) {
      await query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
  });

  describe('GET /api/v1/users/profile', () => {
    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

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
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    test('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.data.user).toHaveProperty('firstName', updateData.firstName);
      expect(response.body.data.user).toHaveProperty('lastName', updateData.lastName);
      expect(response.body.data.user).toHaveProperty('email', testUser.email); // Should remain unchanged

      // Verify update in database
      const dbUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(dbUser.rows[0].first_name).toBe(updateData.firstName);
      expect(dbUser.rows[0].last_name).toBe(updateData.lastName);
    });

    test('should reject profile update without token', async () => {
      const updateData = {
        firstName: 'Unauthorized',
        lastName: 'Update'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject profile update with invalid data', async () => {
      const invalidData = {
        firstName: '', // Empty string should be invalid
        lastName: 'ValidLast'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('PUT /api/v1/users/password', () => {
    test('should update password with valid current password', async () => {
      const passwordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password updated successfully');

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: passwordData.newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);
      
      // Update token for subsequent tests
      userToken = loginResponse.body.data.token;
    });

    test('should reject password update with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongCurrentPassword',
        newPassword: 'AnotherNewPassword123!',
        confirmPassword: 'AnotherNewPassword123!'
      };

      const response = await request(app)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject password update with mismatched new passwords', async () => {
      const passwordData = {
        currentPassword: 'NewPassword123!', // Current password from previous test
        newPassword: 'MismatchedPassword123!',
        confirmPassword: 'DifferentPassword123!'
      };

      const response = await request(app)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject password update with weak new password', async () => {
      const passwordData = {
        currentPassword: 'NewPassword123!',
        newPassword: '123', // Weak password
        confirmPassword: '123'
      };

      const response = await request(app)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('DELETE /api/v1/users/account', () => {
    test('should delete user account with valid password', async () => {
      // Create a temporary user for deletion test
      const tempUser = {
        email: 'temp.delete.test@example.com',
        password: 'TempPassword123!',
        firstName: 'Temp',
        lastName: 'Delete',
        confirmPassword: 'TempPassword123!'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(tempUser);

      const tempUserId = registerResponse.body.data.user.id;
      const tempToken = registerResponse.body.data.token;

      // Delete the account
      const deleteResponse = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ password: tempUser.password })
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('message', 'Account deleted successfully');

      // Verify user is deleted from database
      const dbUser = await query('SELECT * FROM users WHERE id = $1', [tempUserId]);
      expect(dbUser.rows).toHaveLength(0);

      // Verify login no longer works
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: tempUser.email,
          password: tempUser.password
        })
        .expect(401);
    });

    test('should reject account deletion with wrong password', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'WrongPassword123!' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject account deletion without password', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/v1/users (Admin only)', () => {
      test('should get all users as admin', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('users');
        expect(Array.isArray(response.body.data.users)).toBe(true);
        expect(response.body.data.users.length).toBeGreaterThan(0);
        
        // Should include our test users
        const userEmails = response.body.data.users.map(user => user.email);
        expect(userEmails).toContain(testUser.email);
        expect(userEmails).toContain(adminUser.email);
      });

      test('should reject non-admin user access', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
      });
    });

    describe('GET /api/v1/users/:id (Admin only)', () => {
      test('should get specific user as admin', async () => {
        const response = await request(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('id', userId);
        expect(response.body.data.user).toHaveProperty('email', testUser.email);
        expect(response.body.data.user).not.toHaveProperty('password');
        expect(response.body.data.user).not.toHaveProperty('passwordHash');
      });

      test('should reject non-admin user access', async () => {
        const response = await request(app)
          .get(`/api/v1/users/${adminUserId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
        expect(
          response.body.message || response.body.error?.message
        ).toBeDefined();
      });

      test('should return 404 for non-existent user', async () => {
        const fakeUserId = '123e4567-e89b-12d3-a456-426614174999';
        
        const response = await request(app)
          .get(`/api/v1/users/${fakeUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(
          response.body.message || response.body.error?.message
        ).toBeDefined();
      });
    });

    describe('PUT /api/v1/users/:id (Admin only)', () => {
      test('should update user as admin', async () => {
        const updateData = {
          firstName: 'AdminUpdated',
          lastName: 'AdminModified',
          role: 'user'
        };

        const response = await request(app)
          .put(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'User updated successfully');
        expect(response.body.data.user).toHaveProperty('firstName', updateData.firstName);
        expect(response.body.data.user).toHaveProperty('lastName', updateData.lastName);

        // Verify update in database
        const dbUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
        expect(dbUser.rows[0].first_name).toBe(updateData.firstName);
        expect(dbUser.rows[0].last_name).toBe(updateData.lastName);
      });

      test('should reject non-admin user access', async () => {
        const updateData = {
          firstName: 'Unauthorized',
          lastName: 'Update'
        };

        const response = await request(app)
          .put(`/api/v1/users/${adminUserId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
        expect(
          response.body.message || response.body.error?.message
        ).toBeDefined();
      });
    });

    describe('DELETE /api/v1/users/:id (Admin only)', () => {
      test('should delete user as admin', async () => {
        // Create a temporary user for admin deletion test
        const tempUser = {
          email: 'temp.admin.delete@example.com',
          password: 'TempPassword123!',
          firstName: 'TempAdmin',
          lastName: 'Delete',
          confirmPassword: 'TempPassword123!'
        };

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(tempUser);

        const tempUserId = registerResponse.body.data.user.id;

        // Admin deletes the user
        const deleteResponse = await request(app)
          .delete(`/api/v1/users/${tempUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(deleteResponse.body).toHaveProperty('success', true);
        expect(deleteResponse.body).toHaveProperty('message', 'User deleted successfully');

        // Verify user is deleted from database
        const dbUser = await query('SELECT * FROM users WHERE id = $1', [tempUserId]);
        expect(dbUser.rows).toHaveLength(0);
      });

      test('should reject non-admin user access', async () => {
        const response = await request(app)
          .delete(`/api/v1/users/${adminUserId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
        expect(
          response.body.message || response.body.error?.message
        ).toBeDefined();
      });
    });
  });
});