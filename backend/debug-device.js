const request = require('supertest');
const app = require('./src/app');
const { query, connectDB } = require('./src/config/database');

async function debugDeviceRegistration() {
  try {
    console.log('Starting device registration debug...');
    
    // Initialize database connection
    console.log('Initializing database connection...');
    await connectDB();
    console.log('Database connected successfully');
    
    // First register a user
    const userData = {
      email: 'debug@test.com',
      password: 'TestPass123!',
      firstName: 'Debug',
      lastName: 'User',
      acceptTerms: true
    };
    
    console.log('Registering user...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register response status:', registerResponse.status);
    console.log('Register response body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      throw new Error(`Registration failed with status ${registerResponse.status}`);
    }
    
    // Login to get token
    console.log('Logging in...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }
    
    const authToken = loginResponse.body.data.token;
    console.log('Auth token obtained:', authToken ? 'YES' : 'NO');
    
    // Try device registration
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'DEBUG123456789',
      deviceName: 'Debug Test Device',
      capabilities: {
        dataRecovery: true,
        phoneTransfer: true,
        backup: true
      }
    };
    
    console.log('Registering device...');
    console.log('Device data:', JSON.stringify(deviceData, null, 2));
    
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    console.log('Device response status:', deviceResponse.status);
    console.log('Device response body:', JSON.stringify(deviceResponse.body, null, 2));
    
    // Clean up
    await query('DELETE FROM devices WHERE serial_number = $1', ['DEBUG123456789']);
    await query('DELETE FROM users WHERE email = $1', [userData.email]);
    
  } catch (error) {
    console.error('Debug error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugDeviceRegistration().then(() => {
  console.log('Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});