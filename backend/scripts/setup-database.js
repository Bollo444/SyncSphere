#!/usr/bin/env node

/**
 * SyncSphere Database Setup Script
 * Cross-platform PostgreSQL setup automation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  dbName: process.env.DB_NAME || 'syncsphere',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || '5432'
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
  method: args.includes('--docker') ? 'docker' : 'native',
  skipInstall: args.includes('--skip-install'),
  force: args.includes('--force'),
  help: args.includes('--help') || args.includes('-h')
};

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.cyan}SyncSphere Database Setup${colors.reset}
${colors.cyan}=========================${colors.reset}

Usage: node setup-database.js [OPTIONS]

Options:
  --docker        Use Docker for PostgreSQL setup
  --skip-install  Skip PostgreSQL installation
  --force         Force recreate database if exists
  --help, -h      Show this help message

Environment Variables:
  DB_NAME         Database name (default: syncsphere)
  DB_USER         Database user (default: postgres)
  DB_PASSWORD     Database password (default: postgres)
  DB_HOST         Database host (default: localhost)
  DB_PORT         Database port (default: 5432)

Examples:
  node setup-database.js                 # Native installation
  node setup-database.js --docker        # Docker setup
  node setup-database.js --skip-install  # Skip installation, setup only
`);
}

/**
 * Detect operating system
 */
function detectOS() {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

/**
 * Check if a command exists
 */
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute shell command with proper error handling
 */
function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
}

/**
 * Run platform-specific setup script
 */
async function runNativeSetup() {
  const osType = detectOS();
  const scriptsDir = __dirname;

  log.info(`Detected OS: ${osType}`);

  let scriptPath;
  let command;

  switch (osType) {
    case 'windows':
      scriptPath = path.join(scriptsDir, 'setup-postgres-windows.ps1');
      command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
      if (options.skipInstall) command += ' -SkipInstall';
      if (options.force) command += ' -Force';
      break;

    case 'macos':
    case 'linux':
      scriptPath = path.join(scriptsDir, 'setup-postgres-unix.sh');
      command = `bash "${scriptPath}"`;
      if (options.skipInstall) command += ' --skip-install';
      if (options.force) command += ' --force';
      break;

    default:
      throw new Error(`Unsupported operating system: ${osType}`);
  }

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Setup script not found: ${scriptPath}`);
  }

  log.progress(`Running ${osType} setup script...`);
  const result = executeCommand(command);

  if (!result.success) {
    throw new Error(`Setup script failed: ${result.error}`);
  }

  return result;
}

/**
 * Run Docker setup
 */
async function runDockerSetup() {
  const scriptsDir = __dirname;
  const scriptPath = path.join(scriptsDir, 'setup-postgres-docker.sh');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Docker setup script not found: ${scriptPath}`);
  }

  // Check if Docker is available
  if (!commandExists('docker')) {
    throw new Error('Docker is not installed. Please install Docker first.');
  }

  let command = `bash "${scriptPath}"`;
  if (options.force) command += ' --force-recreate';

  log.progress('Running Docker setup script...');
  const result = executeCommand(command);

  if (!result.success) {
    throw new Error(`Docker setup failed: ${result.error}`);
  }

  return result;
}

/**
 * Test database connection
 */
async function testConnection() {
  log.progress('Testing database connection...');

  // Set environment variable for password
  const env = { ...process.env, PGPASSWORD: config.dbPassword };

  const testCommand = `psql -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} -d ${config.dbName} -c "SELECT version();"`;

  const result = executeCommand(testCommand, {
    silent: true,
    env
  });

  if (result.success) {
    log.success('Database connection successful');
    return true;
  } else {
    log.error('Database connection failed');
    log.error(result.error);
    return false;
  }
}

/**
 * Verify database schema
 */
async function verifySchema() {
  log.progress('Verifying database schema...');

  const env = { ...process.env, PGPASSWORD: config.dbPassword };

  // Check if required tables exist
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

  for (const table of requiredTables) {
    const checkCommand = `psql -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} -d ${config.dbName} -tAc "SELECT to_regclass('${table}');"`;

    const result = executeCommand(checkCommand, {
      silent: true,
      env
    });

    if (!result.success || !result.output.trim()) {
      log.error(`Required table '${table}' not found`);
      return false;
    }
  }

  log.success('Database schema verification passed');
  return true;
}

/**
 * Show connection information
 */
function showConnectionInfo() {
  console.log(`
${colors.green}🎉 Database setup completed successfully!${colors.reset}
${colors.green}=========================================${colors.reset}

${colors.cyan}Connection Details:${colors.reset}
  Host: ${config.dbHost}
  Port: ${config.dbPort}
  Database: ${config.dbName}
  User: ${config.dbUser}

${colors.cyan}Next Steps:${colors.reset}
  1. Start the backend server: ${colors.yellow}npm run dev${colors.reset}
  2. Test the API: ${colors.yellow}curl http://localhost:5000/health${colors.reset}

${colors.cyan}Useful Commands:${colors.reset}
  Test connection: ${colors.yellow}npm run db:test${colors.reset}
  Reset database: ${colors.yellow}npm run db:reset${colors.reset}
  Docker logs: ${colors.yellow}npm run docker:logs${colors.reset}
`);
}

/**
 * Main setup function
 */
async function main() {
  try {
    console.log(`${colors.cyan}🚀 SyncSphere Database Setup${colors.reset}`);
    console.log(`${colors.cyan}=============================${colors.reset}\n`);

    if (options.help) {
      showUsage();
      return;
    }

    log.info(`Setup method: ${options.method}`);
    log.info(`Configuration: ${config.dbName}@${config.dbHost}:${config.dbPort}`);

    // Run appropriate setup method
    if (options.method === 'docker') {
      await runDockerSetup();
    } else {
      await runNativeSetup();
    }

    // Wait a moment for services to start
    log.progress('Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test connection
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      throw new Error('Database connection test failed');
    }

    // Verify schema
    const schemaValid = await verifySchema();
    if (!schemaValid) {
      log.warning('Schema verification failed, but setup may still be functional');
    }

    // Show success information
    showConnectionInfo();
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);

    console.log(`\n${colors.yellow}🔧 Troubleshooting Tips:${colors.reset}`);
    console.log(`1. Check if PostgreSQL is running`);
    console.log(`2. Verify database credentials in .env file`);
    console.log(`3. Try running with --docker flag for containerized setup`);
    console.log(`4. Check firewall and network settings`);
    console.log(`5. Run with --skip-install if PostgreSQL is already installed`);

    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = {
  main,
  testConnection,
  verifySchema,
  config
};
