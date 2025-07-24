#!/usr/bin/env node

/**
 * SyncSphere Database Creation Script
 * Creates database, user, and sets up permissions
 */

const { Pool } = require('pg');
const fs = require('fs');
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

// Configuration
const config = {
  // Admin connection (to create database)
  adminConfig: {
    user: process.env.DB_ADMIN_USER || process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default postgres database
    password: process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },

  // Target database configuration
  targetDb: {
    name: process.env.DB_NAME || 'syncsphere',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  }
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  skipUser: args.includes('--skip-user'),
  help: args.includes('--help') || args.includes('-h')
};

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.cyan}SyncSphere Database Creation${colors.reset}
${colors.cyan}============================${colors.reset}

Usage: node create-database.js [OPTIONS]

Options:
  --force       Drop and recreate database if it exists
  --skip-user   Skip user creation (use existing user)
  --help, -h    Show this help message

Environment Variables:
  DB_NAME               Target database name (default: syncsphere)
  DB_USER               Database user (default: postgres)
  DB_PASSWORD           Database password (default: postgres)
  DB_HOST               Database host (default: localhost)
  DB_PORT               Database port (default: 5432)
  DB_ADMIN_USER         Admin user for database creation (default: postgres)
  DB_ADMIN_PASSWORD     Admin password (default: same as DB_PASSWORD)

Examples:
  node create-database.js                # Create database with default settings
  node create-database.js --force        # Force recreate database
  node create-database.js --skip-user    # Skip user creation
`);
}

/**
 * Test admin connection
 */
async function testAdminConnection() {
  log.progress('Testing admin connection...');

  let pool;
  try {
    pool = new Pool(config.adminConfig);
    const client = await pool.connect();

    const result = await client.query('SELECT version(), current_user');
    log.success(`Connected as: ${result.rows[0].current_user}`);

    client.release();
    return { success: true, pool };
  } catch (error) {
    log.error(`Admin connection failed: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      log.warning('PostgreSQL server is not running');
      log.info('Start PostgreSQL service and try again');
    } else if (error.message.includes('password authentication failed')) {
      log.warning('Admin authentication failed');
      log.info('Check DB_ADMIN_USER and DB_ADMIN_PASSWORD in .env file');
    }

    return { success: false, error };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Check if database exists
 */
async function checkDatabaseExists(pool) {
  try {
    const result = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      config.targetDb.name
    ]);

    return result.rows.length > 0;
  } catch (error) {
    log.error(`Failed to check database existence: ${error.message}`);
    return false;
  }
}

/**
 * Create database
 */
async function createDatabase(pool) {
  log.progress(`Creating database: ${config.targetDb.name}`);

  try {
    // Check if database already exists
    const exists = await checkDatabaseExists(pool);

    if (exists) {
      if (options.force) {
        log.warning(`Database ${config.targetDb.name} exists. Dropping and recreating...`);

        // Terminate existing connections
        await pool.query(
          `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `,
          [config.targetDb.name]
        );

        // Drop database
        await pool.query(`DROP DATABASE IF EXISTS "${config.targetDb.name}"`);
        log.info('Database dropped');
      } else {
        log.success(`Database ${config.targetDb.name} already exists`);
        return { success: true, created: false };
      }
    }

    // Get template database collation to ensure compatibility
    let collation = null;
    let ctype = null;

    try {
      const templateResult = await pool.query(`
        SELECT datcollate, datctype 
        FROM pg_database 
        WHERE datname = 'template1'
      `);

      if (templateResult.rows.length > 0) {
        collation = templateResult.rows[0].datcollate;
        ctype = templateResult.rows[0].datctype;
        log.info(`Using template collation: ${collation}`);
      }
    } catch (error) {
      log.warning('Could not detect template collation, using default');
    }

    // Create database with compatible collation or without specifying collation
    const createQuery =
      collation && ctype
        ? `CREATE DATABASE "${config.targetDb.name}" WITH ENCODING 'UTF8' LC_COLLATE='${collation}' LC_CTYPE='${ctype}'`
        : `CREATE DATABASE "${config.targetDb.name}" WITH ENCODING 'UTF8'`;

    await pool.query(createQuery);
    log.success(`Database ${config.targetDb.name} created successfully`);

    return { success: true, created: true };
  } catch (error) {
    log.error(`Failed to create database: ${error.message}`);

    if (error.message.includes('already exists')) {
      log.info('Database already exists, use --force to recreate');
    } else if (error.message.includes('permission denied')) {
      log.warning('Permission denied - check admin user privileges');
    }

    return { success: false, error };
  }
}

/**
 * Check if user exists
 */
async function checkUserExists(pool) {
  try {
    const result = await pool.query('SELECT 1 FROM pg_user WHERE usename = $1', [
      config.targetDb.user
    ]);

    return result.rows.length > 0;
  } catch (error) {
    log.error(`Failed to check user existence: ${error.message}`);
    return false;
  }
}

/**
 * Create database user
 */
async function createUser(pool) {
  if (options.skipUser) {
    log.info('Skipping user creation');
    return { success: true, created: false };
  }

  log.progress(`Creating user: ${config.targetDb.user}`);

  try {
    // Check if user already exists
    const exists = await checkUserExists(pool);

    if (exists) {
      log.success(`User ${config.targetDb.user} already exists`);

      // Update password (escape password to prevent SQL injection)
      const escapedPassword = config.targetDb.password.replace(/'/g, "''");
      await pool.query(`ALTER USER "${config.targetDb.user}" WITH PASSWORD '${escapedPassword}'`);
      log.info('User password updated');

      return { success: true, created: false };
    }

    // Create user (escape password to prevent SQL injection)
    const escapedPassword = config.targetDb.password.replace(/'/g, "''");
    await pool.query(`
      CREATE USER "${config.targetDb.user}" 
      WITH PASSWORD '${escapedPassword}' 
      CREATEDB 
      LOGIN
    `);

    log.success(`User ${config.targetDb.user} created successfully`);

    return { success: true, created: true };
  } catch (error) {
    log.error(`Failed to create user: ${error.message}`);

    if (error.message.includes('already exists')) {
      log.info('User already exists');
      return { success: true, created: false };
    }

    return { success: false, error };
  }
}

/**
 * Grant permissions to user
 */
async function grantPermissions(pool) {
  if (options.skipUser) {
    log.info('Skipping permission grants');
    return { success: true };
  }

  log.progress(`Granting permissions to user: ${config.targetDb.user}`);

  try {
    // Grant database privileges
    await pool.query(
      `GRANT ALL PRIVILEGES ON DATABASE "${config.targetDb.name}" TO "${config.targetDb.user}"`
    );

    log.success('Database permissions granted');

    // Connect to the target database to grant schema permissions
    const targetPool = new Pool({
      ...config.adminConfig,
      database: config.targetDb.name
    });

    try {
      // Grant schema privileges
      await targetPool.query(`GRANT ALL ON SCHEMA public TO "${config.targetDb.user}"`);
      await targetPool.query(
        `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${config.targetDb.user}"`
      );
      await targetPool.query(
        `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${config.targetDb.user}"`
      );
      await targetPool.query(
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${config.targetDb.user}"`
      );

      // Grant default privileges for future objects
      await targetPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${config.targetDb.user}"`
      );
      await targetPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${config.targetDb.user}"`
      );
      await targetPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "${config.targetDb.user}"`
      );

      log.success('Schema permissions granted');
    } finally {
      await targetPool.end();
    }

    return { success: true };
  } catch (error) {
    log.error(`Failed to grant permissions: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Initialize database with schema
 */
async function initializeSchema() {
  log.progress('Initializing database schema...');

  const schemaPath = path.join(__dirname, 'init-db.sql');

  if (!fs.existsSync(schemaPath)) {
    log.error(`Schema file not found: ${schemaPath}`);
    return { success: false };
  }

  try {
    // Connect to target database
    const targetPool = new Pool({
      user: config.targetDb.user,
      host: config.adminConfig.host,
      database: config.targetDb.name,
      password: config.targetDb.password,
      port: config.adminConfig.port,
      ssl: config.adminConfig.ssl
    });

    // Read and execute schema
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await targetPool.query(schemaSQL);

    await targetPool.end();

    log.success('Database schema initialized successfully');
    return { success: true };
  } catch (error) {
    log.error(`Failed to initialize schema: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Verify database setup
 */
async function verifySetup() {
  log.progress('Verifying database setup...');

  try {
    // Test connection with target user
    const testPool = new Pool({
      user: config.targetDb.user,
      host: config.adminConfig.host,
      database: config.targetDb.name,
      password: config.targetDb.password,
      port: config.adminConfig.port,
      ssl: config.adminConfig.ssl
    });

    // Test basic operations
    const result = await testPool.query('SELECT version(), current_database(), current_user');
    const row = result.rows[0];

    log.success('Database connection verified');
    log.info(`Database: ${row.current_database}`);
    log.info(`User: ${row.current_user}`);

    // Test table creation (and cleanup)
    await testPool.query(
      'CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)'
    );
    await testPool.query('DROP TABLE IF EXISTS test_table');

    log.success('Database permissions verified');

    await testPool.end();

    return { success: true };
  } catch (error) {
    log.error(`Database verification failed: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.cyan}🗄️ SyncSphere Database Creation${colors.reset}`);
  console.log(`${colors.cyan}===============================${colors.reset}\n`);

  if (options.help) {
    showUsage();
    return;
  }

  // Show configuration
  log.info('Configuration:');
  console.log(`  Database: ${config.targetDb.name}`);
  console.log(`  User: ${config.targetDb.user}`);
  console.log(`  Host: ${config.adminConfig.host}:${config.adminConfig.port}`);
  console.log('');

  try {
    // Test admin connection
    const adminTest = await testAdminConnection();
    if (!adminTest.success) {
      process.exit(1);
    }

    // Create database
    console.log('');
    const adminPool = new Pool(config.adminConfig);

    try {
      const dbResult = await createDatabase(adminPool);
      if (!dbResult.success) {
        process.exit(1);
      }

      // Create user
      console.log('');
      const userResult = await createUser(adminPool);
      if (!userResult.success) {
        process.exit(1);
      }

      // Grant permissions
      console.log('');
      const permResult = await grantPermissions(adminPool);
      if (!permResult.success) {
        process.exit(1);
      }
    } finally {
      await adminPool.end();
    }

    // Initialize schema
    console.log('');
    const schemaResult = await initializeSchema();
    if (!schemaResult.success) {
      process.exit(1);
    }

    // Verify setup
    console.log('');
    const verifyResult = await verifySetup();
    if (!verifyResult.success) {
      process.exit(1);
    }

    // Success message
    console.log('');
    log.success('Database creation completed successfully! 🎉');
    console.log(`${colors.green}=================================${colors.reset}`);
    console.log(`${colors.cyan}Database: ${config.targetDb.name}${colors.reset}`);
    console.log(`${colors.cyan}User: ${config.targetDb.user}${colors.reset}`);
    console.log(
      `${colors.cyan}Host: ${config.adminConfig.host}:${config.adminConfig.port}${colors.reset}`
    );
    console.log('');
    console.log(`${colors.green}You can now start the SyncSphere backend server!${colors.reset}`);
    console.log(`${colors.cyan}Run: npm run dev${colors.reset}`);
  } catch (error) {
    log.error(`Database creation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createDatabase,
  createUser,
  grantPermissions,
  initializeSchema,
  verifySetup,
  config
};
