const request = require('supertest');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');

// Disable email verification for testing
process.env.ENABLE_EMAIL_VERIFICATION = 'false';

async function testDeviceRegistration() {
  try {
    console.log('Initializing database...');
    await connectDB();
    
    console.log('Testing device registration...');
    
    // Try to register a user (or use existing one)
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      acceptTerms: true
    };
    
    console.log('Attempting to register user...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register response status:', registerResponse.status);
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      console.error('User registration failed with unexpected error');
      console.log('Register response body:', JSON.stringify(registerResponse.body, null, 2));
      return;
    }
    
    if (registerResponse.status === 400) {
      console.log('User already exists, proceeding to login...');
    } else {
      console.log('User registered successfully');
    }
    
    // Login to get token
    console.log('\nLogging in...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      console.error('Login failed');
      return;
    }
    
    const authToken = loginResponse.body.data.token;
    console.log('Auth token:', authToken ? 'Present' : 'Missing');
    console.log('JWT_SECRET env var:', process.env.JWT_SECRET ? 'Set' : 'Not set');
    
    if (authToken) {
      console.log('Token preview:', authToken.substring(0, 50) + '...');
    }
    
    // Register device
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'TEST123456789',
      deviceName: 'Debug Test Device',
      capabilities: {
        dataRecovery: true,
        phoneTransfer: true,
        backup: true
      }
    };
    
    console.log('\nRegistering device...');
    console.log('Device data:', JSON.stringify(deviceData, null, 2));
    
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    console.log('Device registration status:', deviceResponse.status);
    console.log('Device registration body:', JSON.stringify(deviceResponse.body, null, 2));
    
    if (deviceResponse.status === 201) {
      console.log('\n✅ Device registration successful!');
      console.log('Device ID:', deviceResponse.body.data?.id);
    } else {
      console.log('\n❌ Device registration failed');
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDeviceRegistration().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});