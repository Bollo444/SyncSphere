const request = require('supertest');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');

async function debugAuthFlow() {
  try {
    console.log('🔍 Debugging authentication flow...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Test user data
    const userData = {
      email: 'debug.auth@example.com',
      password: 'TestPassword123!',
      firstName: 'Debug',
      lastName: 'Auth',
      acceptTerms: true
    };
    
    console.log('\n📝 Attempting user registration...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register Status:', registerResponse.status);
    console.log('Register Response:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      console.error('❌ Registration failed unexpectedly');
      return;
    }
    
    console.log('\n🔐 Attempting user login...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      console.error('❌ Login failed');
      return;
    }
    
    const authToken = loginResponse.body.data.token;
    console.log('\n🎫 Auth Token (first 50 chars):', authToken ? authToken.substring(0, 50) + '...' : 'undefined');
    
    if (!authToken) {
      console.error('❌ No auth token received');
      return;
    }
    
    console.log('\n📱 Testing device registration with auth token...');
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'DEBUG123456789',
      deviceName: 'Debug Test Device'
    };
    
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    console.log('Device Registration Status:', deviceResponse.status);
    console.log('Device Registration Response:', JSON.stringify(deviceResponse.body, null, 2));
    
    if (deviceResponse.status === 201) {
      console.log('✅ Device registration successful!');
    } else {
      console.error('❌ Device registration failed');
      console.log('Authorization header sent:', `Bearer ${authToken.substring(0, 50)}...`);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugAuthFlow().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});