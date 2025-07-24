const request = require('supertest');
const app = require('./src/app');
const { connectDB, query } = require('./src/config/database');

async function debugTestAuth() {
  try {
    console.log('🔍 Debugging test authentication...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Clean up any existing test data
    await query('DELETE FROM devices WHERE device_name LIKE $1', ['%Test%']);
    await query('DELETE FROM users WHERE email = $1', ['test.auth@example.com']);
    
    // Test user data
    const userData = {
      email: 'test.auth@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
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
    
    // Test multiple device registrations to see if token becomes invalid
    for (let i = 1; i <= 3; i++) {
      console.log(`\n📱 Testing device registration #${i}...`);
      const deviceData = {
        deviceType: 'ios',
        deviceModel: 'iPhone 13',
        osVersion: '16.0',
        serialNumber: `TEST${i}23456789`,
        deviceName: `Test Device ${i}`
      };
      
      const deviceResponse = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);
      
      console.log(`Device Registration #${i} Status:`, deviceResponse.status);
      
      if (deviceResponse.status === 201) {
        console.log(`✅ Device registration #${i} successful!`);
        console.log('Device ID:', deviceResponse.body.data.id);
      } else {
        console.error(`❌ Device registration #${i} failed`);
        console.log('Response:', JSON.stringify(deviceResponse.body, null, 2));
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugTestAuth().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});