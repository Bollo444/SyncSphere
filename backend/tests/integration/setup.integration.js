// Integration test setup - uses real database connections
const { connectDB, query } = require('../../src/config/database');
const { connectRedis } = require('../../src/config/redis');

// Set environment variables for integration testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'integration-test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'integration-test-jwt-refresh-secret-key';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.BCRYPT_ROUNDS = '10';
process.env.RATE_LIMIT_WINDOW = '15';
process.env.RATE_LIMIT_MAX = '1000'; // Higher limit for tests
process.env.ENABLE_EMAIL_VERIFICATION = 'false';
process.env.ENABLE_REGISTRATION = 'true';
process.env.ENABLE_PASSWORD_RESET = 'true';

// Use test database
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'syncsphere_test';
process.env.DB_USER = 'syncsphere_user';
process.env.DB_PASSWORD = 'syncsphere_password';

// Redis configuration for testing
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_DB = '2'; // Use different DB for integration tests
process.env.REDIS_ENABLED = 'false'; // Disable Redis for integration tests

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected for integration tests');
    
    // Create test database schema if it doesn't exist
    await setupTestDatabase();
    console.log('✅ Test database schema ready');
    
    // Connect to Redis if enabled
    if (process.env.REDIS_ENABLED === 'true') {
      await connectRedis();
      console.log('✅ Redis connected for integration tests');
    }
    
  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    throw error;
  }
}, 60000); // 60 second timeout for setup

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('⚠️ Cleanup warning:', error.message);
  }
}, 30000); // 30 second timeout for cleanup

// Setup test database schema
async function setupTestDatabase() {
  try {
    // Check if tables exist, if not create them
    const tablesExist = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'devices', 'backup_schedules')
    `);
    
    if (parseInt(tablesExist.rows[0].count) < 3) {
      console.log('📋 Creating test database schema...');
      
      // Read and execute the main schema file
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../../sql/init/01_schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schemaSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        for (const statement of statements) {
          try {
            await query(statement);
          } catch (error) {
            // Ignore errors for statements that might already exist
            if (!error.message.includes('already exists')) {
              console.warn('Schema statement warning:', error.message);
            }
          }
        }
        
        console.log('✅ Test database schema created');
      } else {
        console.warn('⚠️ Schema file not found, using existing database structure');
      }
    } else {
      console.log('✅ Test database schema already exists');
    }
    
  } catch (error) {
    console.error('❌ Failed to setup test database schema:', error);
    throw error;
  }
}

// Clean up test data after tests
async function cleanupTestData() {
  try {
    // Delete test data in correct order (respecting foreign key constraints)
    const cleanupQueries = [
      "DELETE FROM backup_operations WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM restore_operations WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM backup_schedules WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM transfers WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM files WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM sync_sessions WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM recovery_operations WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM devices WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM subscriptions WHERE created_at < NOW() - INTERVAL '1 hour'",
      "DELETE FROM users WHERE created_at < NOW() - INTERVAL '1 hour'"
    ];
    
    for (const cleanupQuery of cleanupQueries) {
      try {
        await query(cleanupQuery);
      } catch (error) {
        // Log but don't fail on cleanup errors
        console.warn('Cleanup warning:', error.message);
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Some cleanup operations failed:', error.message);
  }
}

// Helper functions for integration tests
global.integrationHelpers = {
  // Wait for a condition to be true
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Create a unique test identifier
  createTestId: () => {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Clean up specific test data
  cleanupTestUser: async (email) => {
    try {
      await query('DELETE FROM users WHERE email = $1', [email]);
    } catch (error) {
      console.warn('Failed to cleanup test user:', error.message);
    }
  },
  
  cleanupTestDevice: async (serialNumber) => {
    try {
      await query('DELETE FROM devices WHERE serial_number = $1', [serialNumber]);
    } catch (error) {
      console.warn('Failed to cleanup test device:', error.message);
    }
  }
};

console.log('✅ Integration test setup loaded');