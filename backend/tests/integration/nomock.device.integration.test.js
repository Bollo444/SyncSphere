const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

// This test bypasses Jest mocks to test real authentication
describe('Device Integration Tests (Fixed)', () => {
  let authToken;
  let testUserId;
  let testDeviceId;

  beforeAll(async () => {
    // Connect to database
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email = $1', ['devicetest.fixed@example.com']);
    
    // Register test user
    const userData = {
      email: 'devicetest.fixed@example.com',
      password: 'TestPassword123!',
      firstName: 'Device',
      lastName: 'Test',
      acceptTerms: true
    };
    
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      throw new Error(`Registration failed with status ${registerResponse.status}`);
    }
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }
    
    authToken = loginResponse.body.data.token;
    testUserId = loginResponse.body.data.user.id;
    
    if (!authToken) {
      throw new Error('No auth token received');
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await query('DELETE FROM devices WHERE "userId" = $1', [testUserId]);
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('POST /api/v1/devices/register', () => {
    test('should register a new device successfully', async () => {
      const deviceData = {
        deviceType: 'ios',
        deviceModel: 'iPhone 13',
        osVersion: '16.0',
        serialNumber: 'FIXED_TEST_001',
        deviceName: 'Fixed Test Device'
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceType).toBe('ios');
      expect(response.body.data.deviceModel).toBe('iPhone 13');
      expect(response.body.data.serialNumber).toBe('FIXED_TEST_001');
      
      testDeviceId = response.body.data.id;
    });

    test('should fail without authentication token', async () => {
      const deviceData = {
        deviceType: 'android',
        deviceModel: 'Samsung Galaxy',
        osVersion: '13.0',
        serialNumber: 'FIXED_TEST_002',
        deviceName: 'Unauthorized Device'
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .send(deviceData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid device data', async () => {
      const invalidDeviceData = {
        deviceType: 'invalid_type',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDeviceData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/devices', () => {
    test('should get user devices', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    test('should get specific device', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDeviceId);
    });

    test('should fail for non-existent device', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/devices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    test('should update device', async () => {
      const updateData = {
        deviceName: 'Updated Test Device'
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceName).toBe('Updated Test Device');
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    test('should delete device', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should fail to get deleted device', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});