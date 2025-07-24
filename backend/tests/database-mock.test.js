// Isolated test to verify database mocking without jest.config.js interference

// Set environment variables first
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock the database module completely
const mockUserData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password_hash: '$2b$10$hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  subscription_tier: 'free',
  is_active: true,
  email_verified: false,
  created_at: new Date(),
  updated_at: new Date()
};

const mockQueryFn = jest.fn().mockImplementation(async (text, params) => {
  console.log('🔍 ISOLATED MOCK QUERY CALLED');
  console.log('Query text:', text.substring(0, 100));
  console.log('Query params:', params);
  
  if (text.includes('INSERT INTO users')) {
    console.log('✅ Returning mock user data for INSERT');
    return { rows: [mockUserData], rowCount: 1 };
  }
  
  if (text.includes('SELECT') && text.includes('users')) {
    console.log('✅ Returning mock user data for SELECT');
    return { rows: [mockUserData], rowCount: 1 };
  }
  
  console.log('⚠️ Returning empty result');
  return { rows: [], rowCount: 0 };
});

jest.mock('../src/config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getPool: jest.fn().mockReturnValue({
    query: mockQueryFn,
    connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
    end: jest.fn().mockResolvedValue(true)
  }),
  query: mockQueryFn,
  getClient: jest.fn().mockResolvedValue({ release: jest.fn() }),
  get pool() {
    return this.getPool();
  }
}));

// Now import the modules
const { query } = require('../src/config/database');
const User = require('../src/models/User');

describe('Isolated Database Mock Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should have mocked query function', async () => {
    console.log('Testing query function:', typeof query);
    console.log('Query function:', query.toString().substring(0, 100));
    
    // Test direct query call
    const result = await query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    console.log('Direct query result:', result);
    
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows)).toBe(true);
  });
  
  test('should mock User.create successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    try {
      const user = await User.create(userData);
      console.log('User.create result:', user);
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    } catch (error) {
      console.error('User.create error:', error);
      throw error;
    }
  });
});