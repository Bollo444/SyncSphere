const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

// Integration tests for device management endpoints (using real database)
describe('Device Management API Integration Tests (Real DB)', () => {
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
    await query('DELETE FROM devices WHERE device_name LIKE $1', ['%Real Test%']);
    await query('DELETE FROM users WHERE email = $1', ['device.real.test@example.com']);
    
    // Create test user
    const userData = {
      email: 'device.real.test@example.com',
      password: 'TestPassword123!',
      firstName: 'Device',
      lastName: 'RealTest',
      acceptTerms: true
    };

    console.log('📝 Registering user...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register Status:', registerResponse.status);
    console.log('Register Body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status === 201) {
      testUser = registerResponse.body.data.user;
    } else if (registerResponse.status === 400 && registerResponse.body.error?.message?.includes('already exists')) {
      console.log('User already exists, proceeding with login');
    } else {
      throw new Error(`User registration failed with status ${registerResponse.status}: ${JSON.stringify(registerResponse.body)}`);
    }
    
    // Login to get auth token
    console.log('🔐 Logging in...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Body:', JSON.stringify(loginResponse.body, null, 2));
    
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
    await query('DELETE FROM devices WHERE device_name LIKE $1', ['%Real Test%']);
    await query('DELETE FROM users WHERE email = $1', ['device.real.test@example.com']);
    
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
        serialNumber: 'REAL_TEST_123456789',
        deviceName: 'Real Test Device',
        capabilities: {
          dataRecovery: true,
          phoneTransfer: true,
          backup: true
        }
      };

      console.log('📱 Registering device...');
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);

      console.log('Device Register Status:', response.status);
      console.log('Device Register Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
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
        serialNumber: 'REAL_TEST_987654321',
        deviceName: 'Unauthorized Real Device'
      };

      const response = await request(app)
        .post('/api/v1/devices/register')
        .send(deviceData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });

  describe('GET /api/v1/devices', () => {
    it('should get user devices successfully', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
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
        expect(foundDevice.deviceName).toBe('Real Test Device');
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.message');
    });
  });
});