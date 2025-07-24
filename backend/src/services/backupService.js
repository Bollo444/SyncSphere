const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const redis = require('../config/redis');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const archiver = require('archiver');
const unzipper = require('unzipper');
const cron = require('node-cron');

class BackupService {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'storage', 'backups');
    this.tempDir = path.join(process.cwd(), 'storage', 'temp', 'backups');
    this.initializeDirectories();
    // Disable automatic backups in development mode
    if (process.env.NODE_ENV === 'production') {
      this.scheduleAutomaticBackups();
    }
  }

  // Initialize backup directories
  async initializeDirectories() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      
      // Create subdirectories for different backup types
      const subdirs = ['database', 'files', 'full', 'user_data'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(this.backupDir, subdir), { recursive: true });
      }
    } catch (error) {
      console.error('Error initializing backup directories:', error);
    }
  }

  // Initialize backup tables
  async initializeTables() {
    const database = require('../config/database');
    const isPostgreSQL = database.isPostgreSQL;
    
    if (isPostgreSQL) {
      // PostgreSQL version - tables are already created by main schema
      // Just ensure backup_operations table exists (not in main schema)
      const statements = [
        `CREATE TABLE IF NOT EXISTS backup_operations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
          schedule_id UUID REFERENCES backup_schedules(id) ON DELETE SET NULL,
          backup_type VARCHAR(50) NOT NULL,
          backup_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          compression_type VARCHAR(20) DEFAULT 'zip',
          encryption_enabled BOOLEAN DEFAULT false,
          backup_metadata JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'completed',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_backup_operations_type ON backup_operations(backup_type)`,
        `CREATE INDEX IF NOT EXISTS idx_backup_operations_status ON backup_operations(status)`,
        `CREATE INDEX IF NOT EXISTS idx_backup_operations_created_at ON backup_operations(created_at)`
      ];
      
      for (const statement of statements) {
        await query(statement);
      }
    } else {
      // SQLite version - execute statements separately
      const statements = [
        `CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          backup_type TEXT NOT NULL,
          backup_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          checksum TEXT NOT NULL,
          compression_type TEXT DEFAULT 'zip',
          encryption_enabled INTEGER DEFAULT 0,
          backup_metadata TEXT DEFAULT '{}',
          created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          status TEXT DEFAULT 'completed',
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME
        )`,
        `CREATE TABLE IF NOT EXISTS backup_schedules (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          schedule_name TEXT NOT NULL,
          backup_type TEXT NOT NULL,
          cron_expression TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          retention_days INTEGER DEFAULT 30,
          backup_options TEXT DEFAULT '{}',
          last_run DATETIME,
          next_run DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS restore_operations (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          backup_id TEXT REFERENCES backups(id) ON DELETE CASCADE,
          restore_type TEXT NOT NULL,
          target_location TEXT,
          status TEXT DEFAULT 'in_progress',
          progress INTEGER DEFAULT 0,
          error_message TEXT,
          restore_metadata TEXT DEFAULT '{}',
          created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )`,
        `CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(backup_type)`,
        `CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status)`,
        `CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled)`,
        `CREATE INDEX IF NOT EXISTS idx_restore_operations_status ON restore_operations(status)`,
        `CREATE TRIGGER IF NOT EXISTS trigger_backup_schedules_updated_at
          AFTER UPDATE ON backup_schedules
          FOR EACH ROW
          BEGIN
            UPDATE backup_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`
      ];
      
      for (const statement of statements) {
        await query(statement);
      }
    }
  }

  // Create database backup
  async createDatabaseBackup(options = {}) {
    try {
      const {
        name = `database_backup_${Date.now()}`,
        tables = null, // null means all tables
        compression = true,
        encryption = false,
        createdBy = null
      } = options;

      const backupId = crypto.randomUUID();
      const fileName = `${name}.sql${compression ? '.zip' : ''}`;
      const filePath = path.join(this.backupDir, 'database', fileName);

      // Update backup status to in_progress
      const insertQuery = `
        INSERT INTO backup_operations (
          id, backup_type, backup_name, file_path, file_size, 
          checksum, compression_type, encryption_enabled, 
          backup_metadata, user_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      await query(insertQuery, [
        backupId, 'database', name, filePath, 0, '', 
        compression ? 'zip' : 'none', encryption, 
        JSON.stringify({ tables }), createdBy, 'in_progress'
      ]);

      // Generate SQL dump
      const sqlDump = await this.generateSQLDump(tables);
      
      let finalFilePath = filePath;
      let fileSize = 0;
      
      if (compression) {
        // Create compressed backup
        finalFilePath = await this.compressData(sqlDump, filePath);
        const stats = await fs.stat(finalFilePath);
        fileSize = stats.size;
      } else {
        // Write uncompressed SQL file
        await fs.writeFile(filePath, sqlDump, 'utf8');
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalFilePath);

      // Update backup record
      const updateQuery = `
        UPDATE backup_operations 
        SET file_size = $1, checksum = $2, status = 'completed'
        WHERE id = $3
      `;
      await query(updateQuery, [fileSize, checksum, backupId]);

      return {
        id: backupId,
        name,
        file_path: finalFilePath,
        file_size: fileSize,
        checksum
      };
    } catch (error) {
      console.error('Error creating database backup:', error);
      throw new AppError('Failed to create database backup', 500);
    }
  }

  // Create files backup
  async createFilesBackup(options = {}) {
    try {
      const {
        name = `files_backup_${Date.now()}`,
        sourcePaths = [path.join(process.cwd(), 'storage', 'uploads')],
        compression = true,
        encryption = false,
        createdBy = null
      } = options;

      const backupId = crypto.randomUUID();
      const fileName = `${name}.zip`;
      const filePath = path.join(this.backupDir, 'files', fileName);

      // Insert backup record
      const insertQuery = `
        INSERT INTO backup_operations (
          id, backup_type, backup_name, file_path, file_size, 
          checksum, compression_type, encryption_enabled, 
          backup_metadata, user_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      await query(insertQuery, [
        backupId, 'files', name, filePath, 0, '', 
        'zip', encryption, 
        JSON.stringify({ source_paths: sourcePaths }), createdBy, 'in_progress'
      ]);

      // Create archive
      await this.createArchive(sourcePaths, filePath);
      
      const stats = await fs.stat(filePath);
      const checksum = await this.calculateChecksum(filePath);

      // Update backup record
      const updateQuery = `
        UPDATE backup_operations 
        SET file_size = $1, checksum = $2, status = 'completed'
        WHERE id = $3
      `;
      await query(updateQuery, [stats.size, checksum, backupId]);

      return {
        id: backupId,
        name,
        file_path: filePath,
        file_size: stats.size,
        checksum
      };
    } catch (error) {
      console.error('Error creating files backup:', error);
      throw new AppError('Failed to create files backup', 500);
    }
  }

  // Create full system backup
  async createFullBackup(options = {}) {
    try {
      const {
        name = `full_backup_${Date.now()}`,
        createdBy = null
      } = options;

      const backupId = crypto.randomUUID();
      const fileName = `${name}.zip`;
      const filePath = path.join(this.backupDir, 'full', fileName);

      // Insert backup record
      const insertQuery = `
        INSERT INTO backups (
          id, backup_type, backup_name, file_path, file_size, 
          checksum, compression_type, encryption_enabled, 
          backup_metadata, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      await query(insertQuery, [
        backupId, 'full', name, filePath, 0, '', 
        'zip', false, 
        JSON.stringify({ includes: ['database', 'files', 'config'] }), createdBy, 'in_progress'
      ]);

      // Create temporary directory for full backup
      const tempBackupDir = path.join(this.tempDir, backupId);
      await fs.mkdir(tempBackupDir, { recursive: true });

      try {
        // Create database backup
        const dbBackup = await this.createDatabaseBackup({
          name: 'database_dump',
          compression: false
        });
        
        // Copy database backup to temp directory
        const tempDbPath = path.join(tempBackupDir, 'database.sql');
        await fs.copyFile(dbBackup.file_path, tempDbPath);

        // Copy files
        const filesDir = path.join(tempBackupDir, 'files');
        await fs.mkdir(filesDir, { recursive: true });
        
        const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
        if (await this.pathExists(uploadDir)) {
          await this.copyDirectory(uploadDir, path.join(filesDir, 'uploads'));
        }

        // Create archive from temp directory
        await this.createArchive([tempBackupDir], filePath);
        
        const stats = await fs.stat(filePath);
        const checksum = await this.calculateChecksum(filePath);

        // Update backup record
        const updateQuery = `
          UPDATE backups 
          SET file_size = $1, checksum = $2, status = 'completed'
          WHERE id = $3
        `;
        await query(updateQuery, [stats.size, checksum, backupId]);

        return {
          id: backupId,
          name,
          file_path: filePath,
          file_size: stats.size,
          checksum
        };
      } finally {
        // Clean up temp directory
        await this.removeDirectory(tempBackupDir);
      }
    } catch (error) {
      console.error('Error creating full backup:', error);
      throw new AppError('Failed to create full backup', 500);
    }
  }

  // Create user data backup
  async createUserDataBackup(userId, options = {}) {
    try {
      const {
        name = `user_${userId}_backup_${Date.now()}`,
        includeFiles = true,
        createdBy = userId
      } = options;

      const backupId = crypto.randomUUID();
      const fileName = `${name}.zip`;
      const filePath = path.join(this.backupDir, 'user_data', fileName);

      // Insert backup record
      const insertQuery = `
        INSERT INTO backups (
          id, backup_type, backup_name, file_path, file_size, 
          checksum, compression_type, encryption_enabled, 
          backup_metadata, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      await query(insertQuery, [
        backupId, 'user_data', name, filePath, 0, '', 
        'zip', false, 
        JSON.stringify({ user_id: userId, include_files: includeFiles }), createdBy, 'in_progress'
      ]);

      // Create temporary directory for user backup
      const tempBackupDir = path.join(this.tempDir, backupId);
      await fs.mkdir(tempBackupDir, { recursive: true });

      try {
        // Export user data
        const userData = await this.exportUserData(userId);
        const userDataPath = path.join(tempBackupDir, 'user_data.json');
        await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2), 'utf8');

        // Include user files if requested
        if (includeFiles) {
          const userFilesQuery = `
            SELECT file_path, original_name 
            FROM file_uploads 
            WHERE user_id = $1 AND upload_status = 'completed'
          `;
          const filesResult = await query(userFilesQuery, [userId]);
          
          if (filesResult.rows.length > 0) {
            const filesDir = path.join(tempBackupDir, 'files');
            await fs.mkdir(filesDir, { recursive: true });
            
            for (const file of filesResult.rows) {
              if (await this.pathExists(file.file_path)) {
                const destPath = path.join(filesDir, file.original_name);
                await fs.copyFile(file.file_path, destPath);
              }
            }
          }
        }

        // Create archive
        await this.createArchive([tempBackupDir], filePath);
        
        const stats = await fs.stat(filePath);
        const checksum = await this.calculateChecksum(filePath);

        // Update backup record
        const updateQuery = `
          UPDATE backups 
          SET file_size = $1, checksum = $2, status = 'completed'
          WHERE id = $3
        `;
        await query(updateQuery, [stats.size, checksum, backupId]);

        return {
          id: backupId,
          name,
          file_path: filePath,
          file_size: stats.size,
          checksum
        };
      } finally {
        // Clean up temp directory
        await this.removeDirectory(tempBackupDir);
      }
    } catch (error) {
      console.error('Error creating user data backup:', error);
      throw new AppError('Failed to create user data backup', 500);
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId, options = {}) {
    try {
      const {
        restoreType = 'full',
        targetLocation = null,
        createdBy = null
      } = options;

      // Get backup information
      const backupQuery = `
        SELECT * FROM backups WHERE id = $1 AND status = 'completed'
      `;
      const backupResult = await query(backupQuery, [backupId]);
      
      if (backupResult.rows.length === 0) {
        throw new AppError('Backup not found or not completed', 404);
      }

      const backup = backupResult.rows[0];
      
      // Verify backup file exists
      if (!(await this.pathExists(backup.file_path))) {
        throw new AppError('Backup file not found', 404);
      }

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(backup.file_path);
      if (currentChecksum !== backup.checksum) {
        throw new AppError('Backup file integrity check failed', 400);
      }

      // Create restore operation record
      const restoreId = crypto.randomUUID();
      const insertRestoreQuery = `
        INSERT INTO restore_operations (
          id, backup_id, restore_type, target_location, 
          status, restore_metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      await query(insertRestoreQuery, [
        restoreId, backupId, restoreType, targetLocation,
        'in_progress', JSON.stringify({}), createdBy
      ]);

      try {
        let result;
        
        switch (backup.backup_type) {
          case 'database':
            result = await this.restoreDatabase(backup, options);
            break;
          case 'files':
            result = await this.restoreFiles(backup, options);
            break;
          case 'full':
            result = await this.restoreFullBackup(backup, options);
            break;
          case 'user_data':
            result = await this.restoreUserData(backup, options);
            break;
          default:
            throw new AppError('Unsupported backup type', 400);
        }

        // Update restore operation
        const updateRestoreQuery = `
          UPDATE restore_operations 
          SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP,
              restore_metadata = $1
          WHERE id = $2
        `;
        await query(updateRestoreQuery, [JSON.stringify(result), restoreId]);

        return {
          restore_id: restoreId,
          backup_id: backupId,
          status: 'completed',
          result
        };
      } catch (error) {
        // Update restore operation with error
        const updateRestoreQuery = `
          UPDATE restore_operations 
          SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        await query(updateRestoreQuery, [error.message, restoreId]);
        throw error;
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  // Get backup list
  async getBackups(options = {}) {
    try {
      const {
        backupType = null,
        createdBy = null,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT b.*, u.email as created_by_email
        FROM backups b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 0;

      if (backupType) {
        paramCount++;
        query += ` AND b.backup_type = $${paramCount}`;
        values.push(backupType);
      }

      if (createdBy) {
        paramCount++;
        query += ` AND b.created_by = $${paramCount}`;
        values.push(createdBy);
      }

      // Get total count
      const countQuery = query.replace(
        'SELECT b.*, u.email as created_by_email',
        'SELECT COUNT(*) as total'
      );
      const countResult = await query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Add sorting and pagination
      query += ` ORDER BY b.${sortBy} ${sortOrder}`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, (page - 1) * limit);

      const result = await query(query, values);

      return {
        backups: result.rows.map(backup => ({
          id: backup.id,
          backup_type: backup.backup_type,
          backup_name: backup.backup_name,
          file_size: parseInt(backup.file_size),
          formatted_size: this.formatFileSize(backup.file_size),
          checksum: backup.checksum,
          compression_type: backup.compression_type,
          encryption_enabled: backup.encryption_enabled,
          backup_metadata: backup.backup_metadata,
          created_by: backup.created_by_email,
          status: backup.status,
          created_at: backup.created_at,
          expires_at: backup.expires_at
        })),
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error getting backups:', error);
      throw error;
    }
  }

  // Delete backup
  async deleteBackup(backupId, userId = null) {
    try {
      // Get backup information
      let query = 'SELECT * FROM backups WHERE id = $1';
      const values = [backupId];
      
      if (userId) {
        query += ' AND created_by = $2';
        values.push(userId);
      }

      const result = await query(query, values);
      
      if (result.rows.length === 0) {
        throw new AppError('Backup not found', 404);
      }

      const backup = result.rows[0];

      // Delete physical file
      if (await this.pathExists(backup.file_path)) {
        await fs.unlink(backup.file_path);
      }

      // Delete database record
      await query('DELETE FROM backups WHERE id = $1', [backupId]);

      return {
        id: backupId,
        name: backup.backup_name,
        deleted: true
      };
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Helper methods
  async generateSQLDump(tables = null) {
    try {
      const { isPostgreSQL } = require('../config/database');
      let dump = '-- SyncSphere Database Backup\n';
      dump += `-- Generated on: ${new Date().toISOString()}\n\n`;

      // Get all tables if none specified
      if (!tables) {
        let tablesQuery;
        if (isPostgreSQL) {
          tablesQuery = `
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
          `;
        } else {
          // SQLite query
          tablesQuery = `
            SELECT name as tablename
            FROM sqlite_master 
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
          `;
        }
        const tablesResult = await query(tablesQuery);
        tables = tablesResult.rows.map(row => row.tablename);
      }

      for (const table of tables) {
        try {
          // Get table data directly (skip structure for now)
          const dataQuery = `SELECT * FROM ${table}`;
          const dataResult = await query(dataQuery);
          
          if (dataResult.rows.length > 0) {
            dump += `-- Table: ${table}\n`;
            
            // Get column names from first row
            const columns = Object.keys(dataResult.rows[0]);
            dump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`;
            
            const values = dataResult.rows.map(row => {
              const rowValues = columns.map(col => {
                const value = row[col];
                if (value === null) return 'NULL';
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                if (value instanceof Date) return `'${value.toISOString()}'`;
                return value;
              });
              return `(${rowValues.join(', ')})`;
            });
            
            dump += values.join(',\n') + ';\n\n';
          }
        } catch (tableError) {
          console.warn(`Skipping table ${table}:`, tableError.message);
          dump += `-- Skipped table ${table} due to error: ${tableError.message}\n\n`;
        }
      }

      return dump;
    } catch (error) {
      console.error('Error generating SQL dump:', error);
      throw error;
    }
  }

  async compressData(data, outputPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.append(data, { name: 'dump.sql' });
      archive.finalize();
    });
  }

  async createArchive(sourcePaths, outputPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      
      for (const sourcePath of sourcePaths) {
        if (require('fs').statSync(sourcePath).isDirectory()) {
          archive.directory(sourcePath, path.basename(sourcePath));
        } else {
          archive.file(sourcePath, { name: path.basename(sourcePath) });
        }
      }
      
      archive.finalize();
    });
  }

  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async removeDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Error removing directory:', error);
    }
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async exportUserData(userId) {
    // Export user data for backup
    const userData = {};
    
    // User profile
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await query(userQuery, [userId]);
    userData.profile = userResult.rows[0];
    
    // User devices
    const devicesQuery = 'SELECT * FROM devices WHERE user_id = $1';
    const devicesResult = await query(devicesQuery, [userId]);
    userData.devices = devicesResult.rows;
    
    // User subscriptions
    const subscriptionsQuery = 'SELECT * FROM subscriptions WHERE user_id = $1';
    const subscriptionsResult = await query(subscriptionsQuery, [userId]);
    userData.subscriptions = subscriptionsResult.rows;
    
    return userData;
  }

  async restoreDatabase(backup, options) {
    // Implement database restore logic
    throw new AppError('Database restore not implemented', 501);
  }

  async restoreFiles(backup, options) {
    // Implement files restore logic
    throw new AppError('Files restore not implemented', 501);
  }

  async restoreFullBackup(backup, options) {
    // Implement full backup restore logic
    throw new AppError('Full backup restore not implemented', 501);
  }

  async restoreUserData(backup, options) {
    // Implement user data restore logic
    throw new AppError('User data restore not implemented', 501);
  }

  // Schedule automatic backups
  scheduleAutomaticBackups() {
    // Daily database backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Starting scheduled database backup...');
        await this.createDatabaseBackup({
          name: `auto_db_backup_${new Date().toISOString().split('T')[0]}`
        });
        console.log('Scheduled database backup completed');
      } catch (error) {
        console.error('Scheduled database backup failed:', error);
      }
    });

    // Weekly full backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('Starting scheduled full backup...');
        await this.createFullBackup({
          name: `auto_full_backup_${new Date().toISOString().split('T')[0]}`
        });
        console.log('Scheduled full backup completed');
      } catch (error) {
        console.error('Scheduled full backup failed:', error);
      }
    });

    // Clean up old backups daily at 4 AM
    cron.schedule('0 4 * * *', async () => {
      try {
        console.log('Starting backup cleanup...');
        await this.cleanupExpiredBackups();
        console.log('Backup cleanup completed');
      } catch (error) {
        console.error('Backup cleanup failed:', error);
      }
    });
  }

  // Clean up expired backups
  async cleanupExpiredBackups() {
    try {
      const expiredQuery = `
        SELECT id, file_path, backup_name
        FROM backups
        WHERE expires_at < CURRENT_TIMESTAMP
           OR (expires_at IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
      `;
      
      const result = await query(expiredQuery);
      
      for (const backup of result.rows) {
        try {
          if (await this.pathExists(backup.file_path)) {
            await fs.unlink(backup.file_path);
          }
          
          await query('DELETE FROM backups WHERE id = $1', [backup.id]);
          console.log(`Cleaned up expired backup: ${backup.backup_name}`);
        } catch (error) {
          console.error(`Error cleaning up backup ${backup.id}:`, error);
        }
      }
      
      return result.rows.length;
    } catch (error) {
      console.error('Error cleaning up expired backups:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();