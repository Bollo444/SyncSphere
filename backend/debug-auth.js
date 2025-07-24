const jwt = require('jsonwebtoken');
const User = require('./src/models/User');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENABLE_EMAIL_VERIFICATION = 'false';

// Mock the database query function
const originalQuery = require('./src/config/database').query;
const { query } = require('./src/config/database');

console.log('🔍 Testing auth middleware components...');

// Test JWT token generation
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'user'
};

const userInstance = new User(mockUser);
const token = userInstance.generateToken();
console.log('✅ Token generated:', token.substring(0, 50) + '...');

// Test token verification
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token verified:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

// Test database query that auth middleware would make
async function testDatabaseQuery() {
  try {
    console.log('🔍 Testing database query...');
    const result = await query(
      'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at FROM users WHERE id = $1',
      ['123e4567-e89b-12d3-a456-426614174000']
    );
    console.log('📊 Database query result:', result);
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  }
}

testDatabaseQuery();