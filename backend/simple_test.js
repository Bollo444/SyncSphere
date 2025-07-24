const request = require('supertest');
const app = require('./src/app');
const { connectDB, query } = require('./src/config/database');

async function simpleTest() {
  try {
    console.log('🔍 Starting simple test...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email = $1', ['simple.test@example.com']);
    console.log('✅ Cleaned up existing data');
    
    // Test user data
    const userData = {
      email: 'simple.test@example.com',
      password: 'TestPassword123!',
      firstName: 'Simple',
      lastName: 'Test',
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
    console.log('\n🎫 Auth Token received:', authToken ? 'YES' : 'NO');
    
    if (!authToken) {
      console.error('❌ No auth token received');
      return;
    }
    
    console.log('\n📱 Testing device registration...');
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'SIMPLE123456789',
      deviceName: 'Simple Test Device'
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
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
simpleTest().then(() => {
  console.log('\n🏁 Simple test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Simple test failed:', error);
  process.exit(1);
});