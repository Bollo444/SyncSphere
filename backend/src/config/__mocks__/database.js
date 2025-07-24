// Mock database for testing
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

const mockPool = {
  query: jest.fn().mockImplementation(async (text, params) => {
    console.log('MockPool query called with:', text.substring(0, 50));
    // Mock user creation
    if (text.includes('INSERT INTO users')) {
      return { rows: [mockUserData], rowCount: 1 };
    }
    // Mock user lookup
    if (text.includes('SELECT') && text.includes('users')) {
      return { rows: [mockUserData], rowCount: 1 };
    }
    // Default response
    return { rows: [], rowCount: 0 };
  }),
  connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
  end: jest.fn().mockResolvedValue(true)
};

const connectDB = jest.fn().mockResolvedValue(true);
const getPool = jest.fn().mockReturnValue(mockPool);
const query = jest.fn().mockImplementation(async (text, params) => {
  console.log('=== MOCK QUERY CALLED ===');
  console.log('Query text:', text.substring(0, 100));
  console.log('Query params:', params);
  
  // Mock user creation
  if (text.includes('INSERT INTO users')) {
    console.log('Returning mock user data for INSERT');
    const result = { rows: [mockUserData], rowCount: 1 };
    console.log('Mock result:', result);
    return result;
  }
  
  // Mock user lookup
  if (text.includes('SELECT') && text.includes('users')) {
    console.log('Returning mock user data for SELECT');
    const result = { rows: [mockUserData], rowCount: 1 };
    console.log('Mock result:', result);
    return result;
  }
  
  // Default response
  console.log('Returning empty result');
  const result = { rows: [], rowCount: 0 };
  console.log('Mock result:', result);
  return result;
});
const getClient = jest.fn().mockResolvedValue({ release: jest.fn() });

console.log('Mock database module loaded');

module.exports = {
  connectDB,
  getPool,
  query,
  getClient,
  get pool() {
    return mockPool;
  }
};