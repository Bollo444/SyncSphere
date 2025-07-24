#!/usr/bin/env node

/**
 * SyncSphere Database Connection Test Script
 * Tests database connectivity and schema integrity
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = {
  info: msg => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  progress: msg => console.log(`${colors.yellow}🔧 ${msg}${colors.reset}`)
};

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'syncsphere',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT) || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000
};

// Required tables for schema validation
const requiredTables = [
  'users',
  'devices',
  'data_transfers',
  'subscriptions',
  'user_activity_logs',
  'device_activity_logs',
  'data_recovery_sessions',
  'api_keys',
  'system_settings',
  'file_uploads'
];

// Required views
const requiredViews = ['active_user_devices', 'user_statistics'];

// Required indexes (sample)
const requiredIndexes = ['idx_users_email', 'idx_devices_user_id', 'idx_data_transfers_status'];

/**
 * Test basic database connection
 */
async function testConnection() {
  log.progress('Testing database connection...');

  let pool;
  try {
    pool = new Pool(dbConfig);
    const client = await pool.connect();

    // Test basic query
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    const row = result.rows[0];

    client.release();

    log.success('Database connection successful');
    log.info(`Database: ${row.current_database}`);
    log.info(`User: ${row.current_user}`);
    log.info(`Server Time: ${row.now}`);
    log.info(`PostgreSQL Version: ${row.version.split(' ')[0]} ${row.version.split(' ')[1]}`);

    return { success: true, pool };
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);

    // Provide specific troubleshooting based on error
    if (error.code === 'ECONNREFUSED') {
      log.warning('PostgreSQL server is not running or not accepting connections');
      log.info('Try: npm run db:setup or start PostgreSQL service');
    } else if (error.code === 'ENOTFOUND') {
      log.warning('Cannot resolve database host');
      log.info('Check DB_HOST in .env file');
    } else if (error.message.includes('password authentication failed')) {
      log.warning('Authentication failed');
      log.info('Check DB_USER and DB_PASSWORD in .env file');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      log.warning('Database does not exist');
      log.info('Run: npm run db:setup to create database');
    }

    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Test database schema integrity
 */
async function testSchema() {
  log.progress('Testing database schema...');

  let pool;
  try {
    pool = new Pool(dbConfig);
    const client = await pool.connect();

    let allTablesExist = true;
    let allViewsExist = true;
    let allIndexesExist = true;

    // Check required tables
    log.info('Checking required tables...');
    for (const table of requiredTables) {
      const result = await client.query('SELECT to_regclass($1) as exists', [table]);

      if (result.rows[0].exists) {
        console.log(`  ${colors.green}✓${colors.reset} ${table}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${table} (missing)`);
        allTablesExist = false;
      }
    }

    // Check required views
    log.info('Checking required views...');
    for (const view of requiredViews) {
      const result = await client.query('SELECT to_regclass($1) as exists', [view]);

      if (result.rows[0].exists) {
        console.log(`  ${colors.green}✓${colors.reset} ${view}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${view} (missing)`);
        allViewsExist = false;
      }
    }

    // Check some critical indexes
    log.info('Checking critical indexes...');
    for (const index of requiredIndexes) {
      const result = await client.query('SELECT to_regclass($1) as exists', [index]);

      if (result.rows[0].exists) {
        console.log(`  ${colors.green}✓${colors.reset} ${index}`);
      } else {
        console.log(
          `  ${colors.yellow}!${colors.reset} ${index} (missing, may affect performance)`
        );
        allIndexesExist = false;
      }
    }

    client.release();

    if (allTablesExist && allViewsExist) {
      log.success('Schema validation passed');
      if (!allIndexesExist) {
        log.warning('Some indexes are missing but schema is functional');
      }
      return { success: true };
    } else {
      log.error('Schema validation failed - missing required tables or views');
      return { success: false };
    }
  } catch (error) {
    log.error(`Schema test failed: ${error.message}`);
    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Test database performance
 */
async function testPerformance() {
  log.progress('Testing database performance...');

  let pool;
  try {
    pool = new Pool(dbConfig);
    const client = await pool.connect();

    // Test simple query performance
    const start = Date.now();
    await client.query('SELECT 1');
    const simpleQueryTime = Date.now() - start;

    // Test more complex query if users table exists
    let complexQueryTime = null;
    try {
      const complexStart = Date.now();
      await client.query('SELECT COUNT(*) FROM users WHERE is_active = true');
      complexQueryTime = Date.now() - complexStart;
    } catch (error) {
      // Table might not exist, skip complex query test
    }

    client.release();

    log.success('Performance test completed');
    log.info(`Simple query: ${simpleQueryTime}ms`);
    if (complexQueryTime !== null) {
      log.info(`Complex query: ${complexQueryTime}ms`);
    }

    // Warn if performance is poor
    if (simpleQueryTime > 100) {
      log.warning('Simple query took longer than expected (>100ms)');
    }
    if (complexQueryTime && complexQueryTime > 500) {
      log.warning('Complex query took longer than expected (>500ms)');
    }

    return { success: true, simpleQueryTime, complexQueryTime };
  } catch (error) {
    log.error(`Performance test failed: ${error.message}`);
    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Test connection pool behavior
 */
async function testConnectionPool() {
  log.progress('Testing connection pool...');

  let pool;
  try {
    pool = new Pool({
      ...dbConfig,
      max: 5,
      min: 1,
      idleTimeoutMillis: 1000
    });

    // Test multiple concurrent connections
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(pool.query('SELECT pg_sleep(0.1), $1 as connection_id', [i]));
    }

    const results = await Promise.all(promises);

    log.success('Connection pool test passed');
    log.info(`Concurrent connections handled: ${results.length}`);

    return { success: true };
  } catch (error) {
    log.error(`Connection pool test failed: ${error.message}`);
    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Show database statistics
 */
async function showDatabaseStats() {
  log.progress('Gathering database statistics...');

  let pool;
  try {
    pool = new Pool(dbConfig);
    const client = await pool.connect();

    // Get database size
    const sizeResult = await client.query(
      'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
    );

    // Get table count
    const tableCountResult = await client.query(
      "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    );

    // Get connection count
    const connectionResult = await client.query(
      'SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()'
    );

    client.release();

    log.success('Database statistics');
    log.info(`Database size: ${sizeResult.rows[0].size}`);
    log.info(`Tables: ${tableCountResult.rows[0].count}`);
    log.info(`Active connections: ${connectionResult.rows[0].count}`);

    return { success: true };
  } catch (error) {
    log.error(`Failed to gather statistics: ${error.message}`);
    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(`${colors.cyan}🧪 SyncSphere Database Connection Test${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}\n`);

  // Show configuration
  log.info('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);
  console.log('');

  let allTestsPassed = true;

  // Test 1: Basic connection
  const connectionTest = await testConnection();
  if (!connectionTest.success) {
    allTestsPassed = false;
    console.log('\n❌ Cannot proceed with other tests due to connection failure');
    process.exit(1);
  }

  console.log('');

  // Test 2: Schema validation
  const schemaTest = await testSchema();
  if (!schemaTest.success) {
    allTestsPassed = false;
  }

  console.log('');

  // Test 3: Performance test
  const performanceTest = await testPerformance();
  if (!performanceTest.success) {
    allTestsPassed = false;
  }

  console.log('');

  // Test 4: Connection pool test
  const poolTest = await testConnectionPool();
  if (!poolTest.success) {
    allTestsPassed = false;
  }

  console.log('');

  // Test 5: Database statistics
  await showDatabaseStats();

  console.log('');

  // Summary
  if (allTestsPassed) {
    log.success('All database tests passed! 🎉');
    console.log(`${colors.green}Your database is ready for SyncSphere backend.${colors.reset}`);
  } else {
    log.error('Some database tests failed');
    console.log(
      `${colors.yellow}The database may still be functional, but some issues were detected.${colors.reset}`
    );
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testConnection,
  testSchema,
  testPerformance,
  testConnectionPool,
  showDatabaseStats
};
