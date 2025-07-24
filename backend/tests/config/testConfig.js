/**
 * Test Environment Configuration
 */

const testConfig = {
  // Database configuration for testing
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5433,
    database: process.env.TEST_DB_NAME || 'syncsphere_test',
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    dialect: 'postgres',
    logging: false, // Disable SQL logging in tests
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // Redis configuration for testing
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: process.env.TEST_REDIS_PORT || 6380,
    password: process.env.TEST_REDIS_PASSWORD || 'test_password',
    db: process.env.TEST_REDIS_DB || 1,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },

  // JWT configuration for testing
  jwt: {
    secret: process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    refreshSecret:
      process.env.TEST_JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-testing-only',
    expiresIn: '1h',
    refreshExpiresIn: '7d'
  },

  // API configuration for testing
  api: {
    port: process.env.TEST_PORT || 3001,
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // Much higher limit for testing
    }
  },

  // File upload configuration for testing
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB for testing
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'],
    destination: './tests/uploads'
  },

  // Email configuration for testing (mocked)
  email: {
    service: 'test',
    host: 'localhost',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test-password'
    }
  },

  // External services configuration for testing (mocked)
  services: {
    stripe: {
      secretKey: 'sk_test_mock_key',
      webhookSecret: 'whsec_test_mock_secret'
    },
    aws: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-1',
      s3Bucket: 'test-bucket'
    }
  },

  // Test timeouts
  timeouts: {
    unit: 5000, // 5 seconds for unit tests
    integration: 30000, // 30 seconds for integration tests
    e2e: 60000 // 60 seconds for end-to-end tests
  },

  // Test data configuration
  testData: {
    cleanupAfterEach: true,
    seedData: true,
    preserveData: false
  },

  // Logging configuration for tests
  logging: {
    level: process.env.TEST_LOG_LEVEL || 'error',
    silent: process.env.NODE_ENV === 'test',
    format: 'simple'
  },

  // Security configuration for testing
  security: {
    bcryptRounds: 4, // Lower rounds for faster tests
    enableCors: true,
    enableHelmet: false, // Disable for easier testing
    enableRateLimit: false // Disable for testing
  }
};

module.exports = testConfig;
