const jwt = require('jsonwebtoken');
const User = require('./src/models/User');

// Set up environment variables like in tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';

// Create a mock user object
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'user'
};

// Create User instance
const userInstance = new User(mockUser);

console.log('🔍 Mock user:', userInstance);
console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET);

// Generate token
try {
  const token = userInstance.generateToken();
  console.log('✅ Generated token:', token);
  
  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Decoded token:', decoded);
  
  // Test Authorization header format
  const authHeader = `Bearer ${token}`;
  console.log('✅ Auth header:', authHeader);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('❌ Stack:', error.stack);
}