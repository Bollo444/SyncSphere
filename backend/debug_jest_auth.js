const request = require('supertest');
const app = require('./src/app');
const { connectDB, query } = require('./src/config/database');

// Simple test to debug Jest authentication issues
async function debugJestAuth() {
  try {
    console.log('🔍 Starting Jest auth debug...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email = $1', ['jest.debug@example.com']);
    console.log('✅ Cleaned up existing data');
    
    // Test user data
    const userData = {
      email: 'jest.debug@example.com',
      password: 'TestPassword123!',
      firstName: 'Jest',
      lastName: 'Debug',
      acceptTerms: true
    };
    
    console.log('\n📝 Step 1: Testing user registration...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    console.log('Register Status:', registerResponse.status);
    console.log('Register Headers:', JSON.stringify(registerResponse.headers, null, 2));
    console.log('Register Body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      console.error('❌ Registration failed unexpectedly');
      return;
    }
    
    console.log('\n🔐 Step 2: Testing user login...');
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Headers:', JSON.stringify(loginResponse.headers, null, 2));
    console.log('Login Body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      console.error('❌ Login failed');
      return;
    }
    
    const authToken = loginResponse.body.data.token;
    console.log('\n🎫 Step 3: Auth Token Analysis');
    console.log('Token exists:', authToken ? 'YES' : 'NO');
    console.log('Token length:', authToken ? authToken.length : 'N/A');
    console.log('Token starts with:', authToken ? authToken.substring(0, 20) + '...' : 'N/A');
    
    if (!authToken) {
      console.error('❌ No auth token received');
      return;
    }
    
    console.log('\n📱 Step 4: Testing device registration with token...');
    const deviceData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 13',
      osVersion: '16.0',
      serialNumber: 'JEST_DEBUG_123',
      deviceName: 'Jest Debug Device'
    };
    
    console.log('Request headers will include:');
    console.log('Authorization: Bearer', authToken.substring(0, 50) + '...');
    
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    console.log('Device Registration Status:', deviceResponse.status);
    console.log('Device Registration Headers:', JSON.stringify(deviceResponse.headers, null, 2));
    console.log('Device Registration Body:', JSON.stringify(deviceResponse.body, null, 2));
    
    if (deviceResponse.status === 201) {
      console.log('✅ Device registration successful!');
    } else {
      console.error('❌ Device registration failed');
      
      // Let's also test a simple protected route to see if the token works
      console.log('\n🔍 Step 5: Testing token with user profile endpoint...');
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('Profile Status:', profileResponse.status);
      console.log('Profile Body:', JSON.stringify(profileResponse.body, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugJestAuth().then(() => {
  console.log('\n🏁 Jest auth debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Jest auth debug failed:', error);
  process.exit(1);
});