const { Pool } = require('pg');
const testConfig = require('../config/testConfig');

/**
 * Database utilities for testing
 */
class DatabaseUtils {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection for testing
   */
  async initialize() {
    if (this.isConnected) {
      return;
    }

    try {
      this.pool = new Pool({
        host: testConfig.database.host,
        port: testConfig.database.port,
        database: testConfig.database.database,
        user: testConfig.database.username,
        password: testConfig.database.password,
        max: testConfig.database.pool.max,
        min: testConfig.database.pool.min,
        acquireTimeoutMillis: testConfig.database.pool.acquire,
        idleTimeoutMillis: testConfig.database.pool.idle
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();

      this.isConnected = true;
      console.log('✅ Test database connected');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool && this.isConnected) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Test database connection closed');
    }
  }

  /**
   * Execute a query
   */
  async query(text, params = []) {
    if (!this.isConnected) {
      await this.initialize();
    }
    return this.pool.query(text, params);
  }

  /**
   * Create test database schema
   */
  async createSchema() {
    const schemaSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Devices table
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_name VARCHAR(255) NOT NULL,
        device_type VARCHAR(50) NOT NULL,
        device_model VARCHAR(255),
        os_type VARCHAR(50),
        os_version VARCHAR(50),
        app_version VARCHAR(50),
        last_sync TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        connection_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Recovery sessions table
      CREATE TABLE IF NOT EXISTS recovery_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        recovery_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total_files INTEGER DEFAULT 0,
        recovered_files INTEGER DEFAULT 0,
        total_size BIGINT DEFAULT 0,
        recovered_size BIGINT DEFAULT 0,
        options JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Transfer sessions table
      CREATE TABLE IF NOT EXISTS transfer_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        target_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        transfer_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total_files INTEGER DEFAULT 0,
        transferred_files INTEGER DEFAULT 0,
        total_size BIGINT DEFAULT 0,
        transferred_size BIGINT DEFAULT 0,
        estimated_time_remaining INTEGER,
        transfer_speed BIGINT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Subscriptions table
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        cancel_at_period_end BOOLEAN DEFAULT false,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_recovery_sessions_user_id ON recovery_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_sessions_user_id ON transfer_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    `;

    await this.query(schemaSQL);
    console.log('✅ Test database schema created');
  }

  /**
   * Drop all test tables
   */
  async dropSchema() {
    const dropSQL = `
      DROP TABLE IF EXISTS subscriptions CASCADE;
      DROP TABLE IF EXISTS transfer_sessions CASCADE;
      DROP TABLE IF EXISTS recovery_sessions CASCADE;
      DROP TABLE IF EXISTS devices CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;

    await this.query(dropSQL);
    console.log('✅ Test database schema dropped');
  }

  /**
   * Clean all test data
   */
  async cleanData() {
    const cleanSQL = `
      TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;
      TRUNCATE TABLE transfer_sessions RESTART IDENTITY CASCADE;
      TRUNCATE TABLE recovery_sessions RESTART IDENTITY CASCADE;
      TRUNCATE TABLE devices RESTART IDENTITY CASCADE;
      TRUNCATE TABLE users RESTART IDENTITY CASCADE;
    `;

    await this.query(cleanSQL);
    console.log('✅ Test database data cleaned');
  }

  /**
   * Seed test data
   */
  async seedData() {
    // Insert test users
    const testUsers = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password_hash: '$2b$10$hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        subscription_tier: 'free',
        is_active: true,
        email_verified: true
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'admin@example.com',
        password_hash: '$2b$10$hashedpassword',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        subscription_tier: 'premium',
        is_active: true,
        email_verified: true
      }
    ];

    for (const user of testUsers) {
      await this.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, subscription_tier, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO NOTHING`,
        [
          user.id,
          user.email,
          user.password_hash,
          user.first_name,
          user.last_name,
          user.role,
          user.subscription_tier,
          user.is_active,
          user.email_verified
        ]
      );
    }

    console.log('✅ Test database seeded with initial data');
  }

  /**
   * Reset database for testing
   */
  async reset() {
    await this.cleanData();
    await this.seedData();
    console.log('✅ Test database reset completed');
  }

  /**
   * Check if database is ready
   */
  async isReady() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for database to be ready
   */
  async waitForReady(maxAttempts = 30, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isReady()) {
        return true;
      }
      console.log(`⏳ Waiting for database... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Database not ready after maximum attempts');
  }
}

// Export singleton instance
const databaseUtils = new DatabaseUtils();
module.exports = databaseUtils;
