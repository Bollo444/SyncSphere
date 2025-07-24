#!/usr/bin/env node

/**
 * SyncSphere Database Schema Validation Tool
 * Validates database schema integrity and completeness
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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Expected schema definition
const expectedSchema = {
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'email', type: 'character varying', nullable: false, unique: true },
        { name: 'password_hash', type: 'character varying', nullable: false },
        { name: 'first_name', type: 'character varying', nullable: false },
        { name: 'last_name', type: 'character varying', nullable: false },
        { name: 'role', type: 'character varying', nullable: true },
        { name: 'subscription_tier', type: 'character varying', nullable: true },
        { name: 'is_active', type: 'boolean', nullable: true },
        { name: 'email_verified', type: 'boolean', nullable: true },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    },
    {
      name: 'devices',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'user_id', type: 'uuid', nullable: false, foreign: 'users.id' },
        { name: 'device_type', type: 'character varying', nullable: false },
        { name: 'device_model', type: 'character varying', nullable: false },
        { name: 'device_name', type: 'character varying', nullable: false },
        { name: 'status', type: 'character varying', nullable: true },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    },
    {
      name: 'data_transfers',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'user_id', type: 'uuid', nullable: false, foreign: 'users.id' },
        { name: 'transfer_type', type: 'character varying', nullable: false },
        { name: 'status', type: 'character varying', nullable: true },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    },
    {
      name: 'subscriptions',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'user_id', type: 'uuid', nullable: false, foreign: 'users.id' },
        { name: 'plan_id', type: 'character varying', nullable: false },
        { name: 'status', type: 'character varying', nullable: true },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    },
    {
      name: 'data_recovery_sessions',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'user_id', type: 'uuid', nullable: false, foreign: 'users.id' },
        { name: 'session_type', type: 'character varying', nullable: false },
        { name: 'status', type: 'character varying', nullable: true },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    },
    {
      name: 'system_settings',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'setting_key', type: 'character varying', nullable: false, unique: true },
        { name: 'setting_value', type: 'jsonb', nullable: false },
        { name: 'created_at', type: 'timestamp without time zone', nullable: true },
        { name: 'updated_at', type: 'timestamp without time zone', nullable: true }
      ]
    }
  ],

  views: ['active_user_devices', 'user_statistics'],

  indexes: [
    { name: 'idx_users_email', table: 'users', columns: ['email'] },
    { name: 'idx_devices_user_id', table: 'devices', columns: ['user_id'] },
    { name: 'idx_data_transfers_status', table: 'data_transfers', columns: ['status'] },
    { name: 'idx_subscriptions_user_id', table: 'subscriptions', columns: ['user_id'] }
  ],

  functions: ['update_updated_at_column'],

  triggers: [
    { name: 'update_users_updated_at', table: 'users' },
    { name: 'update_devices_updated_at', table: 'devices' },
    { name: 'update_data_transfers_updated_at', table: 'data_transfers' },
    { name: 'update_subscriptions_updated_at', table: 'subscriptions' }
  ]
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  fix: args.includes('--fix'),
  help: args.includes('--help') || args.includes('-h')
};

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.cyan}SyncSphere Schema Validation${colors.reset}
${colors.cyan}===========================${colors.reset}

Usage: node validate-schema.js [OPTIONS]

Options:
  --verbose, -v    Show detailed validation results
  --fix            Attempt to fix missing schema elements (NOT IMPLEMENTED)
  --help, -h       Show this help message

Examples:
  node validate-schema.js           # Basic validation
  node validate-schema.js -v        # Verbose validation
`);
}

/**
 * Get all tables in the database
 */
async function getTables(pool) {
  const result = await pool.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  return result.rows;
}

/**
 * Get columns for a specific table
 */
async function getTableColumns(pool, tableName) {
  const result = await pool.query(
    `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [tableName]
  );

  return result.rows;
}

/**
 * Get all views in the database
 */
async function getViews(pool) {
  const result = await pool.query(`
    SELECT table_name as view_name
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  return result.rows.map(row => row.view_name);
}

/**
 * Get all indexes in the database
 */
async function getIndexes(pool) {
  const result = await pool.query(`
    SELECT 
      i.relname as index_name,
      t.relname as table_name,
      array_agg(a.attname ORDER BY c.ordinality) as columns
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN unnest(x.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.attnum
    WHERE n.nspname = 'public'
      AND NOT x.indisprimary
      AND i.relname NOT LIKE '%_pkey'
    GROUP BY i.relname, t.relname
    ORDER BY t.relname, i.relname
  `);

  return result.rows;
}

/**
 * Get all functions in the database
 */
async function getFunctions(pool) {
  const result = await pool.query(`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    ORDER BY routine_name
  `);

  return result.rows.map(row => row.routine_name);
}

/**
 * Get all triggers in the database
 */
async function getTriggers(pool) {
  const result = await pool.query(`
    SELECT 
      trigger_name,
      event_object_table as table_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);

  return result.rows;
}

/**
 * Validate tables
 */
async function validateTables(pool) {
  log.progress('Validating tables...');

  const actualTables = await getTables(pool);
  const actualTableNames = actualTables.map(t => t.table_name);

  const results = {
    missing: [],
    extra: [],
    valid: [],
    columnIssues: []
  };

  // Check for missing tables
  for (const expectedTable of expectedSchema.tables) {
    if (!actualTableNames.includes(expectedTable.name)) {
      results.missing.push(expectedTable.name);
    } else {
      results.valid.push(expectedTable.name);

      // Validate columns for existing tables
      if (options.verbose) {
        const actualColumns = await getTableColumns(pool, expectedTable.name);
        const actualColumnNames = actualColumns.map(c => c.column_name);

        for (const expectedColumn of expectedTable.columns) {
          if (!actualColumnNames.includes(expectedColumn.name)) {
            results.columnIssues.push({
              table: expectedTable.name,
              column: expectedColumn.name,
              issue: 'missing'
            });
          }
        }
      }
    }
  }

  // Check for extra tables (not in expected schema)
  const expectedTableNames = expectedSchema.tables.map(t => t.name);
  for (const actualTable of actualTables) {
    if (
      !expectedTableNames.includes(actualTable.table_name) &&
      actualTable.table_type === 'BASE TABLE'
    ) {
      results.extra.push(actualTable.table_name);
    }
  }

  return results;
}

/**
 * Validate views
 */
async function validateViews(pool) {
  log.progress('Validating views...');

  const actualViews = await getViews(pool);

  const results = {
    missing: [],
    extra: [],
    valid: []
  };

  // Check for missing views
  for (const expectedView of expectedSchema.views) {
    if (!actualViews.includes(expectedView)) {
      results.missing.push(expectedView);
    } else {
      results.valid.push(expectedView);
    }
  }

  // Check for extra views
  for (const actualView of actualViews) {
    if (!expectedSchema.views.includes(actualView)) {
      results.extra.push(actualView);
    }
  }

  return results;
}

/**
 * Validate indexes
 */
async function validateIndexes(pool) {
  log.progress('Validating indexes...');

  const actualIndexes = await getIndexes(pool);
  const actualIndexNames = actualIndexes.map(i => i.index_name);

  const results = {
    missing: [],
    extra: [],
    valid: []
  };

  // Check for missing indexes
  for (const expectedIndex of expectedSchema.indexes) {
    if (!actualIndexNames.includes(expectedIndex.name)) {
      results.missing.push(expectedIndex.name);
    } else {
      results.valid.push(expectedIndex.name);
    }
  }

  return results;
}

/**
 * Validate functions
 */
async function validateFunctions(pool) {
  log.progress('Validating functions...');

  const actualFunctions = await getFunctions(pool);

  const results = {
    missing: [],
    extra: [],
    valid: []
  };

  // Check for missing functions
  for (const expectedFunction of expectedSchema.functions) {
    if (!actualFunctions.includes(expectedFunction)) {
      results.missing.push(expectedFunction);
    } else {
      results.valid.push(expectedFunction);
    }
  }

  return results;
}

/**
 * Validate triggers
 */
async function validateTriggers(pool) {
  log.progress('Validating triggers...');

  const actualTriggers = await getTriggers(pool);
  const actualTriggerNames = actualTriggers.map(t => t.trigger_name);

  const results = {
    missing: [],
    extra: [],
    valid: []
  };

  // Check for missing triggers
  for (const expectedTrigger of expectedSchema.triggers) {
    if (!actualTriggerNames.includes(expectedTrigger.name)) {
      results.missing.push(expectedTrigger.name);
    } else {
      results.valid.push(expectedTrigger.name);
    }
  }

  return results;
}

/**
 * Print validation results
 */
function printResults(category, results) {
  console.log(`\n${colors.cyan}${category}:${colors.reset}`);

  if (results.valid && results.valid.length > 0) {
    console.log(`  ${colors.green}✓ Valid (${results.valid.length}):${colors.reset}`);
    if (options.verbose) {
      results.valid.forEach(item => console.log(`    - ${item}`));
    } else {
      console.log(`    ${results.valid.join(', ')}`);
    }
  }

  if (results.missing && results.missing.length > 0) {
    console.log(`  ${colors.red}✗ Missing (${results.missing.length}):${colors.reset}`);
    results.missing.forEach(item => console.log(`    - ${item}`));
  }

  if (results.extra && results.extra.length > 0) {
    console.log(`  ${colors.yellow}! Extra (${results.extra.length}):${colors.reset}`);
    if (options.verbose) {
      results.extra.forEach(item => console.log(`    - ${item}`));
    } else {
      console.log(`    ${results.extra.join(', ')}`);
    }
  }

  if (results.columnIssues && results.columnIssues.length > 0) {
    console.log(
      `  ${colors.yellow}! Column Issues (${results.columnIssues.length}):${colors.reset}`
    );
    results.columnIssues.forEach(issue => {
      console.log(`    - ${issue.table}.${issue.column}: ${issue.issue}`);
    });
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log(`${colors.cyan}🔍 SyncSphere Schema Validation${colors.reset}`);
  console.log(`${colors.cyan}===============================${colors.reset}\n`);

  if (options.help) {
    showUsage();
    return;
  }

  // Show configuration
  log.info('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);

  let pool;
  try {
    // Connect to database
    pool = new Pool(dbConfig);
    const client = await pool.connect();
    client.release();

    log.success('Connected to database');

    // Run validations
    const tableResults = await validateTables(pool);
    const viewResults = await validateViews(pool);
    const indexResults = await validateIndexes(pool);
    const functionResults = await validateFunctions(pool);
    const triggerResults = await validateTriggers(pool);

    // Print results
    printResults('Tables', tableResults);
    printResults('Views', viewResults);
    printResults('Indexes', indexResults);
    printResults('Functions', functionResults);
    printResults('Triggers', triggerResults);

    // Summary
    const totalIssues =
      (tableResults.missing?.length || 0) +
      (viewResults.missing?.length || 0) +
      (indexResults.missing?.length || 0) +
      (functionResults.missing?.length || 0) +
      (triggerResults.missing?.length || 0) +
      (tableResults.columnIssues?.length || 0);

    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    if (totalIssues === 0) {
      log.success('Schema validation passed! All expected elements are present.');
    } else {
      log.warning(`Schema validation found ${totalIssues} issues.`);
      console.log(
        `${colors.yellow}Consider running the schema initialization script:${colors.reset}`
      );
      console.log(`${colors.cyan}  npm run db:init${colors.reset}`);
    }

    process.exit(totalIssues === 0 ? 0 : 1);
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      log.warning('PostgreSQL server is not running');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      log.warning('Database does not exist');
      log.info('Run: npm run db:setup to create database');
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  validateTables,
  validateViews,
  validateIndexes,
  validateFunctions,
  validateTriggers,
  expectedSchema
};
