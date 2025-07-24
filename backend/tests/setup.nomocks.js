// Setup file for no-mocks integration tests
// This file ensures all services (Redis, Database) are properly initialized
// for integration tests that require real backend functionality

const { connectDB } = require('../src/config/database');
const { connectRedis } = require('../src/config/redis');
const logger = require('../src/utils/logger');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false'; // Disable Redis for integration tests (not available in test environment)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-integration-tests';

// Global setup for all integration tests
beforeAll(async () => {
  try {
    console.log('🚀 Setting up integration test environment...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected for integration tests');
    
    // Redis is disabled for integration tests
    console.log('ℹ️ Redis disabled for integration tests');
    
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
});

// Global teardown
afterAll(async () => {
  try {
    console.log('🧹 Cleaning up integration test environment...');
    
    // Close Redis connection if it exists
    const { client } = require('../src/config/redis');
    if (client && client.isOpen) {
      await client.quit();
      console.log('✅ Redis connection closed');
    }
    
    // Note: Database connection is handled by the database module
    console.log('✅ Integration test cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during integration test cleanup:', error);
  }
});

// Suppress verbose logging during tests unless DEBUG is set
if (!process.env.DEBUG) {
  logger.level = 'error';
}