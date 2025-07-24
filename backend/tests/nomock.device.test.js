// Device test without Jest mocks
const request = require('supertest');
const app = require('../src/app');
const { connectDB, query } = require('../src/config/database');

describe('Device Integration Test (No Mocks)', () => {
  let authToken;
  
  beforeAll(async () => {
    // Connect to database
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email = $1', ['nomock.test@example.com']);
    
    // Test user data
    const userData = {
      email: 'nomock.test@example.com',
      password: 'TestPassword123!',
      firstName: 'NoMock',
      lastName: 'Test',
      acceptTerms: true
    };
    
    console.log('\n🔍 NO-MOCK TEST: Registering user...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('NO-MOCK TEST: Register Status:', registerResponse.status);
    console.log('NO-MOCK TEST: Register Body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      throw new Error(`Registration failed with status ${registerResponse.status}`);
    }
    
    console.log('\n🔍 NO-MOCK TEST: Logging in...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('NO-MOCK TEST: Login Status:', loginResponse.status);
    console.log('NO-MOCK TEST: Login Body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }
    
    authToken = loginResponse.body.data.token;
    console.log('NO-MOCK TEST: Auth token obtained:', authToken ? 'YES' : 'NO');
  });
  
  test('should register a device successfully', async () => {
    console.log('\n🔍 NO-MOCK TEST: Registering device...');
    console.log('NO-MOCK TEST: Using token:', authToken ? authToken.substring(0, 50) + '...' : 'NONE');
    
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'NOMOCK_TEST_123',
      deviceName: 'NoMock Test Device'
    };
    
    const response = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    console.log('NO-MOCK TEST: Device Status:', response.status);
    console.log('NO-MOCK TEST: Device Body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.deviceType).toBe('ios');
  });
  
  test('should get user devices', async () => {
    const response = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${authToken}`);
    
    console.log('NO-MOCK TEST: Get Devices Status:', response.status);
    console.log('NO-MOCK TEST: Get Devices Body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});