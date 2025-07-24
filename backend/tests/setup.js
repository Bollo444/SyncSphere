// Jest setup file for test helpers and mocks
// This runs before modules are imported
//
// ⚠️  IMPORTANT: This setup file mocks ALL database operations!
//
// 📖 For comprehensive testing guidelines, see: docs/TESTING_GUIDE.md
//
// 🔧 When to use this setup (jest.config.js):
//    ✅ Unit tests for business logic
//    ✅ Service layer testing
//    ✅ Middleware testing
//    ✅ Fast, isolated tests
//
// 🔧 When NOT to use this setup (use jest.config.nomocks.js instead):
//    ❌ Integration tests requiring real database
//    ❌ Authentication flow testing
//    ❌ End-to-end API testing
//    ❌ Database schema validation
//
// 💡 Key insight from debugging:
//    Authentication tests fail with 401 errors when using this setup
//    because mocked database queries prevent real user creation/login.
//    Use jest.config.nomocks.js for tests requiring actual authentication.
//
// 📁 Test file naming conventions:
//    - Unit tests (this setup): tests/unit/*.test.js
//    - Integration tests (no mocks): tests/integration/nomock.*.test.js

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRE = '7d';
process.env.JWT_REFRESH_EXPIRE = '30d';
process.env.BCRYPT_ROUNDS = '10';
process.env.RATE_LIMIT_WINDOW = '15';
process.env.RATE_LIMIT_MAX = '100';
process.env.ENABLE_EMAIL_VERIFICATION = 'false';
process.env.ENABLE_REGISTRATION = 'true';
process.env.ENABLE_PASSWORD_RESET = 'true';

// Database configuration for testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'syncsphere';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Redis configuration for testing
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_DB = '1';

// Mock user data for tests
const mockUserData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password_hash: '$2b$10$hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  subscription_tier: 'free',
  is_active: true,
  email_verified: true,
  created_at: new Date(),
  updated_at: new Date()
};

// Clear module cache and set up mocks
jest.resetModules();

// Mock database module before any imports
jest.doMock('../src/config/database', () => {
  const mockQueryFn = jest.fn().mockImplementation(async (text, params) => {
    console.log('🔍 SETUP MOCK QUERY CALLED');
    console.log('Query text:', text);
    console.log('Query params:', params);
    
    if (text.includes('INSERT INTO users')) {
      console.log('✅ Returning mock user data for INSERT');
      return { rows: [mockUserData], rowCount: 1 };
    }
    
    if (text.includes('SELECT') && text.includes('users') && text.includes('WHERE id = $1')) {
      console.log('✅ Returning mock user data for SELECT by ID (auth middleware)');
      // Return user data with email_verified = true for auth middleware
      const userData = {
        ...mockUserData,
        email_verified: true,
        is_active: true
      };
      console.log('✅ Mock user data being returned:', userData);
      return { rows: [userData], rowCount: 1 };
    }
    
    if (text.includes('SELECT') && text.includes('users') && text.includes('WHERE email = $1')) {
      // Check if this is a registration check by looking at the call stack
      const stack = new Error().stack;
      const isRegistrationCheck = stack.includes('register') || stack.includes('findByEmail') && stack.includes('create');
      
      // For email uniqueness checks during registration, return empty result
      if (isRegistrationCheck && params && params[0] && (params[0].includes('test@example.com') || params[0].includes('integration.test@example.com') || params[0].includes('device.test@example.com'))) {
        console.log('⚠️ Returning empty result for email uniqueness check during registration');
        return { rows: [], rowCount: 0 };
      }
      
      console.log('✅ Returning mock user data for SELECT by email (login/auth)');
      const userData = {
        ...mockUserData,
        email: params[0], // Use the actual email from the query
        email_verified: true,
        is_active: true
      };
      return { rows: [userData], rowCount: 1 };
    }
    
    if (text.includes('SELECT') && text.includes('users')) {
      console.log('✅ Returning mock user data for general SELECT');
      // Return user data with email_verified = true for auth middleware
      const userData = {
        ...mockUserData,
        email_verified: true,
        is_active: true
      };
      return { rows: [userData], rowCount: 1 };
    }
    
    if (text.includes('UPDATE')) {
      console.log('✅ Returning success for UPDATE');
      return { rows: [mockUserData], rowCount: 1 };
    }
    
    // Handle device-related queries
    if (text.includes('INSERT INTO devices')) {
      console.log('✅ Returning success for device INSERT');
      const mockDeviceData = {
        id: '456e7890-e89b-12d3-a456-426614174001',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        device_type: 'ios',
        device_model: 'iPhone 13',
        os_version: '16.0',
        serial_number: 'TEST123456789',
        device_name: 'Integration Test Device',
        connection_id: 'mock-connection-id',
        status: 'connected',
        last_connected: new Date(),
        capabilities: { dataRecovery: true, phoneTransfer: true, backup: true },
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };
      return { rows: [mockDeviceData], rowCount: 1 };
    }
    
    if (text.includes('SELECT') && text.includes('devices')) {
      console.log('✅ Returning mock device data for SELECT');
      const mockDeviceData = {
        id: '456e7890-e89b-12d3-a456-426614174001',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        device_type: 'ios',
        device_model: 'iPhone 13',
        os_version: '16.0',
        serial_number: 'TEST123456789',
        device_name: 'Integration Test Device',
        connection_id: 'mock-connection-id',
        status: 'connected',
        last_connected: new Date(),
        capabilities: { dataRecovery: true, phoneTransfer: true, backup: true },
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };
      return { rows: [mockDeviceData], rowCount: 1 };
    }
    
    console.log('⚠️ Returning empty result for query:', text);
    return { rows: [], rowCount: 0 };
  });
  
  return {
    connectDB: jest.fn().mockResolvedValue(true),
    getPool: jest.fn().mockReturnValue({
      query: mockQueryFn,
      connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
      end: jest.fn().mockResolvedValue(true)
    }),
    query: mockQueryFn, // This is what gets destructured in User.js
    getClient: jest.fn().mockResolvedValue({ release: jest.fn() }),
    get pool() {
      return this.getPool();
    }
  };
});

// Mock Redis with in-memory storage
const mockCache = new Map();

jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(true),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    flushDb: jest.fn().mockResolvedValue('OK')
  }),
  setCache: jest.fn().mockImplementation(async (key, value, ttl) => {
    mockCache.set(key, value);
    return true;
  }),
  getCache: jest.fn().mockImplementation(async (key) => {
    // Check if value exists in mock cache first
    if (mockCache.has(key)) {
      return mockCache.get(key);
    }
    
    // Return user data for user cache keys
    if (key && key.startsWith('user:')) {
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        emailVerified: true,
        created_at: new Date()
      };
    }
    return null;
  }),
  deleteCache: jest.fn().mockImplementation(async (key) => {
    mockCache.delete(key);
    return true;
  }),
  flushCache: jest.fn().mockImplementation(async () => {
    mockCache.clear();
    return true;
  })
}));

// Mock bcryptjs (the library actually used in the project)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken verification for authentication
// Note: Using real JWT verification for validateToken tests
jest.mock('jsonwebtoken', () => {
  const originalJwt = jest.requireActual('jsonwebtoken');
  return {
    ...originalJwt,
    // Use real verify function to allow proper error handling in tests
    verify: originalJwt.verify
  };
});

// Mock Mongoose for unit tests
jest.mock('mongoose', () => {
  const mockUserData = {
    _id: '123e4567-e89b-12d3-a456-426614174000',
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'user',
    isActive: true,
    emailVerified: true,
    toJSON: jest.fn().mockReturnValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true
    })
  };

  const mockModel = {
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    }),
    findById: jest.fn().mockResolvedValue(mockUserData),
    findOne: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null)
    }),
    create: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: jest.fn().mockResolvedValue(0)
  };

  function MockSchema() {
    const schema = {
      pre: jest.fn(),
      post: jest.fn(),
      methods: {},
      statics: {},
      index: jest.fn(),
      virtual: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis()
      })
    };
    return schema;
  }
  
  MockSchema.Types = {
    ObjectId: jest.fn().mockImplementation((id) => id || `mock-objectid-${Date.now()}`),
    Mixed: 'Mixed',
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    Array: Array
  };

  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn()
    },
    Schema: MockSchema,
    model: jest.fn().mockImplementation((name, schema) => {
      const MockModel = function(data = {}) {
        Object.assign(this, data);
        this._id = data._id || `mock-${name.toLowerCase()}-id-${Date.now()}`;
        this.save = jest.fn().mockResolvedValue(this);
        this.remove = jest.fn().mockResolvedValue(this);
        this.populate = jest.fn().mockReturnValue(this);
        
        // Register AdvancedSession instances in global registry
        if (name === 'AdvancedSession' && global.sessionRegistry) {
          global.sessionRegistry.set(this._id, this);
        }
        
        return this;
      };
      
      Object.assign(MockModel, mockModel);
      
      // Special handling for User model
      if (name === 'User') {
        MockModel.findById = jest.fn().mockResolvedValue(mockUserData);
      }
      
      // Special handling for Device model
      if (name === 'Device') {
        MockModel.connect = jest.fn().mockImplementation((deviceData) => {
          const mockDevice = {
            _id: `mock-device-id-${Date.now()}`,
            id: `mock-device-id-${Date.now()}`,
            userId: '123e4567-e89b-12d3-a456-426614174000',
            deviceName: deviceData.deviceName || 'Test Device',
            deviceType: deviceData.deviceType || 'ios',
            model: deviceData.deviceModel || 'iPhone 12',
            osVersion: deviceData.osVersion || '15.0',
            serialNumber: deviceData.serialNumber || 'TEST123456789',
            isConnected: true,
            lastSeen: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...deviceData
          };
           
           mockDevice.save = jest.fn().mockResolvedValue(mockDevice);
           return Promise.resolve(mockDevice);
         });
         
         MockModel.findById = jest.fn().mockImplementation((id) => {
           // Return null for invalid device IDs
           if (id === 'invalid-device-id' || id.includes('invalid')) {
             return Promise.resolve(null);
           }
           
           const mockDevice = {
             _id: id,
             id: id,
             userId: '123e4567-e89b-12d3-a456-426614174000',
             deviceName: 'Test Device',
             deviceType: 'iOS',
             model: 'iPhone 12',
             osVersion: '15.0',
             serialNumber: 'TEST123456789',
             isConnected: true,
             lastSeen: new Date(),
             createdAt: new Date(),
             updatedAt: new Date()
           };
           
           mockDevice.save = jest.fn().mockResolvedValue(mockDevice);
           return Promise.resolve(mockDevice);
         });
      }
      
      // Special handling for AdvancedSession model
      if (name === 'AdvancedSession') {
        // Create a global registry to track session instances
        if (!global.sessionRegistry) {
          global.sessionRegistry = new Map();
        }
        
        MockModel.findById = jest.fn().mockImplementation((id) => {
          // Check if we have a registered session with this ID
          if (global.sessionRegistry.has(id)) {
            return Promise.resolve(global.sessionRegistry.get(id));
          }
          
          // Return null for non-existent sessions (like fake IDs)
          if (id === '507f1f77bcf86cd799439011' || id.includes('fake')) {
            return Promise.resolve(null);
          }
          
          // Return a default session that belongs to the test user
          return Promise.resolve({
            _id: id,
            userId: '123e4567-e89b-12d3-a456-426614174000', // Same as test user ID
            deviceId: 'mock-device-id',
            serviceType: 'screen_unlock',
            status: 'running',
            startedAt: new Date(),
            progress: {
              percentage: 50,
              currentPhase: 'processing'
            },
            save: jest.fn().mockResolvedValue({})
          });
        });
      }
      

      
      // Continue with AdvancedSession-specific mocks
      if (name === 'AdvancedSession') {
        
        // Mock the find method with chainable sort, limit, and skip
        MockModel.find = jest.fn().mockImplementation((filter) => {
          // All available mock sessions
          const allSessions = [
            {
              _id: 'session-1',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              deviceId: 'mock-device-id',
              serviceType: 'screen_unlock',
              status: 'completed',
              startedAt: new Date(Date.now() - 86400000),
              createdAt: new Date(Date.now() - 86400000)
            },
            {
              _id: 'session-2',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              deviceId: 'mock-device-id-2',
              serviceType: 'system_repair',
              status: 'running',
              startedAt: new Date(),
              createdAt: new Date()
            },
            {
              _id: 'session-3',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              deviceId: 'mock-device-id-3',
              serviceType: 'data_eraser',
              status: 'failed',
              startedAt: new Date(Date.now() - 172800000),
              createdAt: new Date(Date.now() - 172800000)
            }
          ];
          
          // Filter sessions based on query
          let filteredSessions = allSessions.filter(session => {
            if (filter.userId && session.userId !== filter.userId) return false;
            if (filter.status && session.status !== filter.status) return false;
            if (filter.serviceType && session.serviceType !== filter.serviceType) return false;
            return true;
          });
          
          let skipCount = 0;
          let limitCount = filteredSessions.length;
          
          const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockImplementation((count) => {
              skipCount = count;
              return mockQuery;
            }),
            limit: jest.fn().mockImplementation((count) => {
              limitCount = count;
              return mockQuery;
            }),
            then: jest.fn().mockImplementation((callback) => {
              const result = filteredSessions.slice(skipCount, skipCount + limitCount);
              return callback(result);
            })
          };
          return mockQuery;
        });
        
        // Mock countDocuments method
        MockModel.countDocuments = jest.fn().mockImplementation((filter) => {
          const allSessions = [
            {
              userId: '123e4567-e89b-12d3-a456-426614174000',
              serviceType: 'screen_unlock',
              status: 'completed'
            },
            {
              userId: '123e4567-e89b-12d3-a456-426614174000',
              serviceType: 'system_repair',
              status: 'running'
            },
            {
              userId: '123e4567-e89b-12d3-a456-426614174000',
              serviceType: 'data_eraser',
              status: 'failed'
            }
          ];
          
          const count = allSessions.filter(session => {
            if (filter.userId && session.userId !== filter.userId) return false;
            if (filter.status && session.status !== filter.status) return false;
            if (filter.serviceType && session.serviceType !== filter.serviceType) return false;
            return true;
          }).length;
          
          return Promise.resolve(count);
        });
        
        // Mock deleteOne method
        MockModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      }
      
      MockModel.schema = schema;
      return MockModel;
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || `mock-objectid-${Date.now()}`),
      Mixed: 'Mixed'
    }
  };
});

console.log('✅ Test helpers and mocks loaded');

// Helper functions for tests
global.testHelpers = {
  // Create a test user
  createTestUser: async (userData = {}) => {
    // Return mock user data directly since database is mocked
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: userData.email || 'test@example.com',
      password_hash: '$2b$10$hashedpassword',
      first_name: userData.firstName || 'Test',
      last_name: userData.lastName || 'User',
      role: 'user',
      subscription_tier: 'free',
      is_active: true,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      emailVerificationToken: 'mock-verification-token'
    };
    
    // Create a User instance-like object
    const User = require('../src/models/User');
    const userInstance = new User(mockUser);
    userInstance.emailVerificationToken = 'mock-verification-token';
    userInstance._id = mockUser.id; // Add _id for Mongoose compatibility
    
    // Add generateToken method for testing
    userInstance.generateToken = jest.fn().mockImplementation(() => {
      const jwt = require('jsonwebtoken');
      return jwt.sign(
        { id: userInstance.id, email: userInstance.email, role: userInstance.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
    });
    
    // Add toJSON method for auth middleware
    userInstance.toJSON = jest.fn().mockReturnValue({
      id: userInstance.id,
      email: userInstance.email,
      firstName: userInstance.first_name,
      lastName: userInstance.last_name,
      role: userInstance.role,
      isActive: userInstance.is_active || true,
      emailVerified: userInstance.email_verified || true
    });
    
    return userInstance;
  },
  
  // Create a test device
  createTestDevice: async (deviceData = {}) => {
    const Device = require('../src/models/Device');
    const defaultData = {
      deviceType: 'ios',
      deviceModel: 'iPhone 12',
      osVersion: '15.0',
      serialNumber: `TEST${Date.now()}`,
      deviceName: 'Test Device',
      capabilities: {
        storage: 128000000000,
        wifi: true,
        bluetooth: true
      }
    };
    
    const deviceInstance = await Device.connect({
      ...defaultData,
      ...deviceData
    });
    
    // Add _id for Mongoose compatibility if not already present
    if (!deviceInstance._id && deviceInstance.id) {
      deviceInstance._id = deviceInstance.id;
    }
    
    // Ensure save method exists
    if (!deviceInstance.save) {
      deviceInstance.save = jest.fn().mockResolvedValue(deviceInstance);
    }
    
    return deviceInstance;
  },
  
  // Generate JWT token for testing
  generateTestToken: (user) => {
    // Use the actual User model method
    return user.generateToken();
  },
  
  // Clean up test data
  cleanupTestData: async () => {
    // Mock cleanup - no actual database operations needed
    return true;
  }
};

// Mock external services for testing
jest.mock('../src/services/email/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/services/storage/storageService', () => ({
  uploadFile: jest.fn().mockResolvedValue({ url: 'https://example.com/file.jpg' }),
  deleteFile: jest.fn().mockResolvedValue(true),
  getFileUrl: jest.fn().mockReturnValue('https://example.com/file.jpg')
}));

// Mock Advanced Services
jest.mock('../src/services/advanced/dataEraserService', () => {
  return jest.fn().mockImplementation(() => ({
    startErasure: jest.fn().mockImplementation((userId, deviceId, erasureType, options) => {
      return Promise.resolve({
        _id: 'mock-session-id',
        userId,
        deviceId,
        serviceType: 'data_eraser',
        erasureType,
        eraseMethod: erasureType, // Add this for test compatibility
        status: 'preparing',
        startedAt: new Date(),
        progress: {
          percentage: 0,
          currentPhase: 'initializing'
        },
        save: jest.fn().mockResolvedValue(this)
      });
    }),
    getProgress: jest.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      status: 'running',
      progress: { percentage: 50 }
    }),
    pauseErasure: jest.fn().mockResolvedValue({ status: 'paused' }),
    resumeErasure: jest.fn().mockResolvedValue({ status: 'running' }),
    cancelErasure: jest.fn().mockResolvedValue({ status: 'cancelled' })
  }));
});

jest.mock('../src/services/advanced/screenUnlockService', () => {
  return jest.fn().mockImplementation(() => ({
    startUnlock: jest.fn().mockImplementation((userId, deviceId, unlockMethod, options) => {
      return Promise.resolve({
        _id: 'mock-session-id',
        userId,
        deviceId,
        serviceType: 'screen_unlock',
        unlockMethod,
        status: 'running',
        startedAt: new Date(),
        progress: {
          percentage: 0,
          currentPhase: 'initializing'
        },
        save: jest.fn().mockResolvedValue(this)
      });
    }),
    getProgress: jest.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      status: 'running',
      progress: { percentage: 50 }
    })
  }));
});

jest.mock('../src/services/advanced/systemRepairService', () => {
  return jest.fn().mockImplementation(() => ({
    startRepair: jest.fn().mockImplementation((userId, deviceId, repairType, options) => {
      return Promise.resolve({
        _id: 'mock-session-id',
        userId,
        deviceId,
        serviceType: 'system_repair',
        repairType,
        repairMode: options?.repairMode || 'advanced',
        status: 'scanning',
        startedAt: new Date(),
        progress: {
          percentage: 0,
          currentPhase: 'initializing'
        },
        save: jest.fn().mockResolvedValue(this)
      });
    }),
    getProgress: jest.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      status: 'running',
      progress: { percentage: 50 }
    })
  }));
});