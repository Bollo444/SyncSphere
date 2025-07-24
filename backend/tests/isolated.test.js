// Isolated test without setup.js interference

// Set environment variables first
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '10';
process.env.ENABLE_EMAIL_VERIFICATION = 'false';

// Clear any existing mocks
jest.clearAllMocks();
jest.resetModules();

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

// Mock database module
const mockQuery = jest.fn().mockImplementation(async (text, params) => {
  console.log('🔍 ISOLATED Mock Query Called:', text.substring(0, 80));
  
  if (text.includes('INSERT INTO users')) {
    console.log('✅ ISOLATED Returning INSERT result');
    return { rows: [mockUserData], rowCount: 1 };
  }
  
  if (text.includes('SELECT') && text.includes('users')) {
    console.log('✅ ISOLATED Returning SELECT result');
    return { rows: [mockUserData], rowCount: 1 };
  }
  
  return { rows: [], rowCount: 0 };
});

jest.mock('../src/config/database', () => ({
  query: mockQuery,
  connectDB: jest.fn().mockResolvedValue(true),
  getPool: jest.fn().mockReturnValue({ query: mockQuery }),
  getClient: jest.fn().mockResolvedValue({ release: jest.fn() })
}));

// Mock other dependencies
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Isolated User Test', () => {
  it('should work with isolated mocks', async () => {
    console.log('🚀 ISOLATED Starting test');
    
    // Import User after mocks are set up
    const User = require('../src/models/User');
    
    const userData = {
      email: 'isolated@example.com',
      password: 'TestPassword123!',
      firstName: 'Isolated',
      lastName: 'User'
    };
    
    console.log('📤 ISOLATED Calling User.create');
    
    try {
      const user = await User.create(userData);
      console.log('✅ ISOLATED User created:', user);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
    } catch (error) {
      console.error('❌ ISOLATED Error:', error.message);
      console.error('📍 ISOLATED Stack:', error.stack);
      throw error;
    }
  });
});