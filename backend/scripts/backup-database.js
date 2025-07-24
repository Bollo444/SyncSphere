#!/usr/bin/env node

/**
 * SyncSphere Database Backup and Recovery
 * Automated backup and recovery system for PostgreSQL database
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Database backup and recovery manager
 */
class DatabaseBackup {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'syncsphere',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      backupDir: path.join(__dirname, '../backups'),
      maxBackups: 10,
      compressionLevel: 6
    };

    // Ensure backup directory exists
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  /**
   * Generate backup filename with timestamp
   * @returns {string} Backup filename
   */
  generateBackupFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `syncsphere_backup_${timestamp}.sql`;
  }

  /**
   * Create database backup
   * @param {Object} options - Backup options
   * @returns {Promise<string>} Path to backup file
   */
  async createBackup(options = {}) {
    const opts = {
      compress: true,
      includeData: true,
      includeSchema: true,
      verbose: false,
      ...options
    };

    const filename = this.generateBackupFilename();
    const backupPath = path.join(this.config.backupDir, filename);

    console.log(`${colors.blue}Creating database backup...${colors.reset}`);
    console.log(`${colors.cyan}Backup file: ${backupPath}${colors.reset}`);

    try {
      // Build pg_dump command
      const pgDumpArgs = [
        '--host',
        this.config.host,
        '--port',
        this.config.port.toString(),
        '--username',
        this.config.user,
        '--dbname',
        this.config.database,
        '--no-password',
        '--format',
        'custom',
        '--compress',
        this.config.compressionLevel.toString(),
        '--file',
        backupPath
      ];

      if (opts.verbose) {
        pgDumpArgs.push('--verbose');
      }

      if (!opts.includeData) {
        pgDumpArgs.push('--schema-only');
      }

      if (!opts.includeSchema) {
        pgDumpArgs.push('--data-only');
      }

      // Set environment variables for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.config.password
      };

      // Execute pg_dump
      execSync(`pg_dump ${pgDumpArgs.join(' ')}`, {
        env,
        stdio: opts.verbose ? 'inherit' : 'pipe'
      });

      // Verify backup file was created
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file was not created');
      }

      const stats = fs.statSync(backupPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`${colors.green}✓ Backup created successfully${colors.reset}`);
      console.log(`${colors.green}  Size: ${sizeInMB} MB${colors.reset}`);

      // Generate checksum for integrity verification
      const checksum = await this.generateChecksum(backupPath);
      const checksumPath = backupPath + '.sha256';
      fs.writeFileSync(checksumPath, `${checksum}  ${filename}\n`);

      console.log(`${colors.green}  Checksum: ${checksum}${colors.reset}`);

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      console.error(`${colors.red}✗ Backup failed: ${error.message}${colors.reset}`);

      // Clean up partial backup file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupPath - Path to backup file
   * @param {Object} options - Restore options
   */
  async restoreBackup(backupPath, options = {}) {
    const opts = {
      dropExisting: false,
      verbose: false,
      ...options
    };

    console.log(`${colors.blue}Restoring database from backup...${colors.reset}`);
    console.log(`${colors.cyan}Backup file: ${backupPath}${colors.reset}`);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Verify backup integrity if checksum exists
    const checksumPath = backupPath + '.sha256';
    if (fs.existsSync(checksumPath)) {
      console.log(`${colors.blue}Verifying backup integrity...${colors.reset}`);
      const isValid = await this.verifyChecksum(backupPath);
      if (!isValid) {
        throw new Error('Backup file integrity check failed');
      }
      console.log(`${colors.green}✓ Backup integrity verified${colors.reset}`);
    }

    try {
      // Drop existing database if requested
      if (opts.dropExisting) {
        console.log(`${colors.yellow}Dropping existing database...${colors.reset}`);
        await this.dropDatabase();
        await this.createDatabase();
      }

      // Build pg_restore command
      const pgRestoreArgs = [
        '--host',
        this.config.host,
        '--port',
        this.config.port.toString(),
        '--username',
        this.config.user,
        '--dbname',
        this.config.database,
        '--no-password',
        '--clean',
        '--if-exists',
        backupPath
      ];

      if (opts.verbose) {
        pgRestoreArgs.push('--verbose');
      }

      // Set environment variables for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.config.password
      };

      // Execute pg_restore
      execSync(`pg_restore ${pgRestoreArgs.join(' ')}`, {
        env,
        stdio: opts.verbose ? 'inherit' : 'pipe'
      });

      console.log(`${colors.green}✓ Database restored successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Restore failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Array} List of backup files with metadata
   */
  listBackups() {
    const backups = [];

    if (!fs.existsSync(this.config.backupDir)) {
      return backups;
    }

    const files = fs
      .readdirSync(this.config.backupDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse();

    for (const file of files) {
      const filePath = path.join(this.config.backupDir, file);
      const stats = fs.statSync(filePath);
      const checksumPath = filePath + '.sha256';

      backups.push({
        filename: file,
        path: filePath,
        size: stats.size,
        sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
        created: stats.birthtime,
        hasChecksum: fs.existsSync(checksumPath)
      });
    }

    return backups;
  }

  /**
   * Generate SHA-256 checksum for file
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} Checksum
   */
  async generateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verify file checksum
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>} True if checksum is valid
   */
  async verifyChecksum(filePath) {
    const checksumPath = filePath + '.sha256';

    if (!fs.existsSync(checksumPath)) {
      return false;
    }

    const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').split(' ')[0];
    const actualChecksum = await this.generateChecksum(filePath);

    return expectedChecksum === actualChecksum;
  }

  /**
   * Clean up old backup files
   */
  async cleanupOldBackups() {
    const backups = this.listBackups();

    if (backups.length <= this.config.maxBackups) {
      return;
    }

    const toDelete = backups.slice(this.config.maxBackups);

    console.log(`${colors.yellow}Cleaning up ${toDelete.length} old backup(s)...${colors.reset}`);

    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path);

        // Remove checksum file if it exists
        const checksumPath = backup.path + '.sha256';
        if (fs.existsSync(checksumPath)) {
          fs.unlinkSync(checksumPath);
        }

        console.log(`${colors.green}✓ Deleted: ${backup.filename}${colors.reset}`);
      } catch (error) {
        console.error(
          `${colors.red}✗ Failed to delete ${backup.filename}: ${error.message}${colors.reset}`
        );
      }
    }
  }

  /**
   * Drop database
   */
  async dropDatabase() {
    const env = {
      ...process.env,
      PGPASSWORD: this.config.password
    };

    execSync(
      `dropdb --host=${this.config.host} --port=${this.config.port} --username=${this.config.user} ${this.config.database}`,
      {
        env,
        stdio: 'pipe'
      }
    );
  }

  /**
   * Create database
   */
  async createDatabase() {
    const env = {
      ...process.env,
      PGPASSWORD: this.config.password
    };

    execSync(
      `createdb --host=${this.config.host} --port=${this.config.port} --username=${this.config.user} ${this.config.database}`,
      {
        env,
        stdio: 'pipe'
      }
    );
  }

  /**
   * Schedule automatic backups
   * @param {string} schedule - Cron schedule (e.g., '0 2 * * *' for daily at 2 AM)
   */
  scheduleBackups(schedule) {
    console.log(`${colors.blue}Scheduling automatic backups: ${schedule}${colors.reset}`);

    // This would typically integrate with a job scheduler like node-cron
    // For now, we'll just log the schedule
    console.log(
      `${colors.yellow}Note: Implement cron job scheduling for production use${colors.reset}`
    );
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const backup = new DatabaseBackup();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.cyan}SyncSphere Database Backup and Recovery${colors.reset}

Usage:
  node backup-database.js <command> [options]

Commands:
  backup              Create a new backup
  restore <file>      Restore from backup file
  list                List available backups
  cleanup             Clean up old backups
  verify <file>       Verify backup integrity

Options:
  --verbose           Verbose output
  --no-compress       Disable compression
  --schema-only       Backup schema only
  --data-only         Backup data only
  --drop-existing     Drop existing database before restore
  --help, -h          Show this help message

Examples:
  node backup-database.js backup
  node backup-database.js backup --verbose --schema-only
  node backup-database.js restore backup_file.sql --drop-existing
  node backup-database.js list
    `);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'backup':
        const backupOptions = {
          verbose: args.includes('--verbose'),
          compress: !args.includes('--no-compress'),
          includeData: !args.includes('--schema-only'),
          includeSchema: !args.includes('--data-only')
        };
        await backup.createBackup(backupOptions);
        break;

      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          console.error(`${colors.red}Error: Backup file path required${colors.reset}`);
          process.exit(1);
        }

        const restoreOptions = {
          verbose: args.includes('--verbose'),
          dropExisting: args.includes('--drop-existing')
        };
        await backup.restoreBackup(backupFile, restoreOptions);
        break;

      case 'list':
        const backups = backup.listBackups();
        if (backups.length === 0) {
          console.log(`${colors.yellow}No backups found${colors.reset}`);
        } else {
          console.log(`${colors.cyan}Available Backups:${colors.reset}\n`);
          backups.forEach((b, index) => {
            const status = b.hasChecksum ? '✓' : '⚠';
            console.log(`${index + 1}. ${b.filename}`);
            console.log(`   Size: ${b.sizeFormatted}`);
            console.log(`   Created: ${b.created.toLocaleString()}`);
            console.log(`   Integrity: ${status} ${b.hasChecksum ? 'Verified' : 'No checksum'}`);
            console.log('');
          });
        }
        break;

      case 'cleanup':
        await backup.cleanupOldBackups();
        break;

      case 'verify':
        const verifyFile = args[1];
        if (!verifyFile) {
          console.error(`${colors.red}Error: Backup file path required${colors.reset}`);
          process.exit(1);
        }

        const isValid = await backup.verifyChecksum(verifyFile);
        if (isValid) {
          console.log(`${colors.green}✓ Backup integrity verified${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Backup integrity check failed${colors.reset}`);
          process.exit(1);
        }
        break;

      default:
        console.error(`${colors.red}Error: Unknown command '${command}'${colors.reset}`);
        console.log(`${colors.yellow}Use --help for usage information${colors.reset}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseBackup;
