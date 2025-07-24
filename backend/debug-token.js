// Simple test to debug the authorization header issue
const request = require('supertest');
const app = require('./src/app');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRE = '1h';
process.env.ENABLE_EMAIL_VERIFICATION = 'false';

async function testAuthHeader() {
  try {
    console.log('🔍 Testing Authorization header handling...');
    
    // Test 1: No Authorization header
    console.log('\n--- Test 1: No Authorization header ---');
    const response1 = await request(app)
      .get('/api/v1/auth/me');
    
    console.log('Response status:', response1.status);
    console.log('Response body:', response1.body);
    
    // Test 2: Invalid Authorization header
    console.log('\n--- Test 2: Invalid Authorization header ---');
    const response2 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    
    console.log('Response status:', response2.status);
    console.log('Response body:', response2.body);
    
    // Test 3: Valid token format but wrong secret
    console.log('\n--- Test 3: Valid format, wrong secret ---');
    const jwt = require('jsonwebtoken');
    const wrongToken = jwt.sign(
      { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', role: 'user' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    
    const response3 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${wrongToken}`);
    
    console.log('Response status:', response3.status);
    console.log('Response body:', response3.body);
    
    // Test 4: Correct token with correct secret
    console.log('\n--- Test 4: Correct token ---');
    const correctToken = jwt.sign(
      { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', role: 'user' },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
    
    console.log('Generated token:', correctToken.substring(0, 50) + '...');
    
    const response4 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${correctToken}`);
    
    console.log('Response status:', response4.status);
    console.log('Response body:', response4.body);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📍 Stack:', error.stack);
  }
}

testAuthHeader();