// Test to verify User model with database mocking

// Set environment first
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '10';
process.env.ENABLE_EMAIL_VERIFICATION = 'false';

const mockUserData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password_hash: '$2b$10$hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  is_active: true,
  email_verified: false,
  created_at: new Date(),
  updated_at: new Date()
};

// Mock database with detailed implementation
jest.mock('../src/config/database', () => {
  const mockQuery = jest.fn().mockImplementation(async (text, params) => {
    console.log('🔍 Mock Query Called:', text.substring(0, 80));
    console.log('📝 Params:', params);
    
    // Handle INSERT queries
    if (text.includes('INSERT INTO users')) {
      console.log('✅ Returning INSERT result');
      return { rows: [mockUserData], rowCount: 1 };
    }
    
    // Handle SELECT queries
    if (text.includes('SELECT') && text.includes('users')) {
      console.log('✅ Returning SELECT result');
      return { rows: [mockUserData], rowCount: 1 };
    }
    
    console.log('⚠️ Returning empty result');
    return { rows: [], rowCount: 0 };
  });
  
  return {
    query: mockQuery,
    connectDB: jest.fn().mockResolvedValue(true),
    getPool: jest.fn().mockReturnValue({ query: mockQuery }),
    getClient: jest.fn().mockResolvedValue({ release: jest.fn() })
  };
});

// Mock Redis
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('User Model Mock Test', () => {
  it('should create user with mocked database', async () => {
    console.log('🚀 Starting User.create test');
    
    const User = require('../src/models/User');
    
    const userData = {
      email: 'newuser@example.com',
      password: 'TestPassword123!',
      firstName: 'New',
      lastName: 'User'
    };
    
    console.log('📤 Calling User.create with:', userData);
    
    try {
      const user = await User.create(userData);
      
      console.log('✅ User.create returned:', user);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com'); // Should return mock data
    } catch (error) {
      console.error('❌ User.create failed:', error.message);
      console.error('📍 Stack:', error.stack);
      throw error;
    }
  });
});