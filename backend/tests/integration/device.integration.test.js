const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');
const User = require('../../src/models/User');
const Device = require('../../src/models/Device');

// Integration tests for device management endpoints
describe('Device Management API Integration Tests', () => {
  let server;
  let testUser;
  let authToken;
  let testDevice;

  beforeAll(async () => {
    // Start the server for integration testing
    server = app.listen(0); // Use random port
    
    // Connect to test database
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM devices WHERE device_name = $1', ['Integration Test Device']);
    await query('DELETE FROM users WHERE email = $1', ['device.test@example.com']);
    
    // Create test user
    const userData = {
      email: 'device.test@example.com',
      password: 'TestPassword123!',
      firstName: 'Device',
      lastName: 'Test',
      acceptTerms: true
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register response status:', registerResponse.status);
    console.log('Register response body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status === 201) {
      testUser = registerResponse.body.data.user;
    } else if (registerResponse.status === 400 && registerResponse.body.error?.message?.includes('already exists')) {
      // User already exists, that's okay
      console.log('User already exists, proceeding with login');
    } else {
      throw new Error(`User registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`);
    }
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }
    
    authToken = loginResponse.body.data.token;
    console.log('Auth token obtained:', authToken ? 'YES' : 'NO');
  });

  afterAll(async () => {
    // Clean up test data
    if (testDevice) {
      await query('DELETE FROM devices WHERE id = $1', [testDevice.id]);
    }
    if (testUser) {
      await query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    
    // Close server
    if (server) {
      server.close();
    }
  });

  describe('POST /api/v1/devices/register', () => {
    it('should register a new device successfully', async () => {
      const deviceData = {
        deviceType: 'ios',
        deviceModel: 'iPhone 13',
        osVersion: '16.0',
        serialNumber: 'TEST123456789',
        deviceName: 'Integration Test Device',
        capabilities: {
          dataRecovery: true,
          phoneTransfer: true,
          backup: true
        }
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Device registered successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('deviceName', deviceData.deviceName);
      expect(response.body.data).toHaveProperty('deviceModel', deviceData.deviceModel);
      expect(response.body.data).toHaveProperty('status', 'connected');
      
      // Store the device for other tests
      testDevice = response.body.data;
    });

    it('should reject device registration without authentication', async () => {
      const deviceData = {
        deviceType: 'ios',
        deviceModel: 'iPhone 13',
        osVersion: '16.0',
        serialNumber: 'TEST987654321',
        deviceName: 'Unauthorized Device'
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .send(deviceData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });

    it('should reject device registration with invalid data', async () => {
      const deviceData = {
        deviceType: 'invalid-type',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });

    it('should reject duplicate device registration', async () => {
      const deviceData = {
        deviceType: 'ios',
        deviceModel: 'iPhone 13',
        osVersion: '16.0',
        serialNumber: 'TEST123456789', // Same serial number as first test
        deviceName: 'Duplicate Device'
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('GET /api/v1/devices', () => {
    it('should get user devices successfully', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('devices');
      expect(Array.isArray(response.body.data.devices)).toBe(true);
      
      // If testDevice exists, check if it's in the list
      if (testDevice && testDevice.id) {
        expect(response.body.data.devices.length).toBeGreaterThan(0);
        const foundDevice = response.body.data.devices.find(
          device => device.id === testDevice.id
        );
        expect(foundDevice).toBeDefined();
        expect(foundDevice.deviceName).toBe('Integration Test Device');
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    it('should get specific device successfully', async () => {
      // Ensure testDevice exists before trying to get it
      if (!testDevice || !testDevice.id) {
        // Create a device if testDevice is not available
        const deviceData = {
          deviceType: 'ios',
          deviceModel: 'iPhone 13',
          osVersion: '16.0',
          serialNumber: 'TEST_GET_123',
          deviceName: 'Integration Test Device'
        };

        const createResponse = await request(app)
          .post('/api/v1/devices/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deviceData)
          .expect(201);
        
        testDevice = createResponse.body.data;
      }

      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('id', testDevice.id);
      expect(response.body.data).toHaveProperty('deviceName', 'Integration Test Device');
    });

    it('should reject request for non-existent device', async () => {
      const fakeDeviceId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .get(`/api/v1/devices/${fakeDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });

    it('should reject request without authentication', async () => {
      // Use a fake device ID for this test since we don't need authentication
      const fakeDeviceId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .get(`/api/v1/devices/${fakeDeviceId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    it('should update device successfully', async () => {
      // Ensure testDevice exists before trying to update it
      if (!testDevice || !testDevice.id) {
        // Create a device if testDevice is not available
        const deviceData = {
          deviceType: 'ios',
          deviceModel: 'iPhone 13',
          osVersion: '16.0',
          serialNumber: 'TEST_UPDATE_123',
          deviceName: 'Integration Test Device'
        };

        const createResponse = await request(app)
          .post('/api/v1/devices/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deviceData)
          .expect(201);
        
        testDevice = createResponse.body.data;
      }

      const updateData = {
        deviceName: 'Updated Integration Test Device',
        status: 'disconnected'
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Device updated successfully');
      expect(response.body.data).toHaveProperty('deviceName', updateData.deviceName);
      expect(response.body.data).toHaveProperty('status', updateData.status);
    });

    it('should reject update with invalid data', async () => {
      // Ensure testDevice exists before trying to update it
      if (!testDevice || !testDevice.id) {
        // Create a device if testDevice is not available
        const deviceData = {
          deviceType: 'ios',
          deviceModel: 'iPhone 13',
          osVersion: '16.0',
          serialNumber: 'TEST_INVALID_UPDATE_123',
          deviceName: 'Integration Test Device'
        };

        const createResponse = await request(app)
          .post('/api/v1/devices/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deviceData)
          .expect(201);
        
        testDevice = createResponse.body.data;
      }

      const updateData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });

    it('should reject update without authentication', async () => {
      // Use a fake device ID for this test since we don't need authentication
      const fakeDeviceId = '123e4567-e89b-12d3-a456-426614174999';
      
      const updateData = {
        deviceName: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/v1/devices/${fakeDeviceId}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('POST /api/v1/devices/:id/scan', () => {
    it('should scan device successfully', async () => {
      // Ensure testDevice exists before trying to scan it
      if (!testDevice || !testDevice.id) {
        // Create a device if testDevice is not available
        const deviceData = {
          deviceType: 'ios',
          deviceModel: 'iPhone 13',
          osVersion: '16.0',
          serialNumber: 'TEST_SCAN_123',
          deviceName: 'Integration Test Device'
        };

        const createResponse = await request(app)
          .post('/api/v1/devices/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deviceData)
          .expect(201);
        
        testDevice = createResponse.body.data;
      }

      const response = await request(app)
        .post(`/api/v1/devices/${testDevice.id}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Device scan completed');
      expect(response.body.data).toHaveProperty('scanResults');
      expect(response.body.data.scanResults).toHaveProperty('status', 'completed');
    });

    it('should reject scan without authentication', async () => {
      // Use a fake device ID for this test since we don't need authentication
      const fakeDeviceId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .post(`/api/v1/devices/${fakeDeviceId}/scan`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    it('should reject delete without authentication', async () => {
      // Create a new device for this test
      const deviceData = {
        deviceType: 'mobile',
        deviceModel: 'iPhone 14',
        osVersion: 'iOS 16.1',
        serialNumber: 'TEST999888777',
        deviceName: 'Delete Test Device'
      };

      const createResponse = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);
      
      const newDevice = createResponse.body.data;
      expect(newDevice).toBeDefined();
      expect(newDevice.id).toBeDefined();

      const response = await request(app)
        .delete(`/api/v1/devices/${newDevice.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
      
      // Clean up the device we created for this test
      await request(app)
        .delete(`/api/v1/devices/${newDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should delete device successfully', async () => {
      // Ensure testDevice exists before trying to delete it
      if (!testDevice || !testDevice.id) {
        // Create a device if testDevice is not available
        const deviceData = {
          deviceType: 'ios',
          deviceModel: 'iPhone 13',
          osVersion: '16.0',
          serialNumber: 'TEST_DELETE_123',
          deviceName: 'Device to Delete'
        };

        const createResponse = await request(app)
          .post('/api/v1/devices/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deviceData)
          .expect(201);
        
        testDevice = createResponse.body.data;
      }

      const response = await request(app)
        .delete(`/api/v1/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Device deleted successfully');
      
      // Clear testDevice reference since it's been deleted
      testDevice = null;
    });
  });
});