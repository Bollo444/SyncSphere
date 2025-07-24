const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class FileUploadService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream'
    ];
    
    this.initializeUploadDirectory();
  }

  // Initialize upload directory
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'recovery'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'transfers'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'backups'), { recursive: true });
      logger.info('Upload directories initialized');
    } catch (error) {
      logger.error('Error initializing upload directories:', error);
    }
  }

  // Configure multer for file uploads
  getMulterConfig(options = {}) {
    const {
      destination = 'temp',
      fileFilter = this.defaultFileFilter.bind(this),
      limits = { fileSize: this.maxFileSize }
    } = options;

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, destination);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        cb(null, filename);
      }
    });

    return multer({
      storage,
      fileFilter,
      limits
    });
  }

  // Default file filter
  defaultFileFilter(req, file, cb) {
    if (this.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
    }
  }

  // Upload single file
  async uploadFile(file, userId, category = 'general', metadata = {}) {
    try {
      // Generate file hash
      const fileBuffer = await fs.readFile(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check for duplicate files
      const existingFile = await this.findFileByHash(fileHash, userId);
      if (existingFile) {
        // Remove uploaded file since it's a duplicate
        await fs.unlink(file.path);
        return existingFile;
      }

      // Move file to permanent location
      const permanentPath = await this.moveToPermamentLocation(file, category);
      
      // Save file record to database
      const fileRecord = await this.saveFileRecord({
        userId,
        originalName: file.originalname,
        filename: path.basename(permanentPath),
        path: permanentPath,
        size: file.size,
        mimeType: file.mimetype,
        hash: fileHash,
        category,
        metadata
      });

      logger.info(`File uploaded successfully: ${file.originalname} for user ${userId}`);
      return fileRecord;
    } catch (error) {
      // Clean up file on error
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error('Error cleaning up file:', unlinkError);
        }
      }
      logger.error('Error uploading file:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, userId, category = 'general', metadata = {}) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file, userId, category, metadata)
      );
      
      const results = await Promise.allSettled(uploadPromises);
      
      const successful = [];
      const failed = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            file: files[index].originalname,
            error: result.reason.message
          });
        }
      });
      
      return { successful, failed };
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      throw error;
    }
  }

  // Move file to permanent location
  async moveToPermamentLocation(file, category) {
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const permanentDir = path.join(this.uploadDir, category, year.toString(), month, day);
      await fs.mkdir(permanentDir, { recursive: true });
      
      const permanentPath = path.join(permanentDir, path.basename(file.path));
      await fs.rename(file.path, permanentPath);
      
      return permanentPath;
    } catch (error) {
      logger.error('Error moving file to permanent location:', error);
      throw error;
    }
  }

  // Save file record to database
  async saveFileRecord(fileData) {
    try {
      const {
        userId,
        originalName,
        filename,
        path: filePath,
        size,
        mimeType,
        hash,
        category,
        metadata
      } = fileData;

      const queryText = `
        INSERT INTO file_uploads (
          user_id, original_name, filename, file_path, file_size, 
          mime_type, file_hash, category, metadata, upload_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
        RETURNING *
      `;

      const values = [
        userId, originalName, filename, filePath, size,
        mimeType, hash, category, JSON.stringify(metadata)
      ];

      const result = await query(queryText, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving file record:', error);
      throw error;
    }
  }

  // Find file by hash
  async findFileByHash(hash, userId) {
    try {
      const queryText = `
        SELECT * FROM file_uploads 
        WHERE file_hash = $1 AND user_id = $2 AND upload_status = 'completed'
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await query(queryText, [hash, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding file by hash:', error);
      return null;
    }
  }

  // Get file by ID
  async getFileById(fileId, userId = null) {
    try {
      let queryText = `SELECT * FROM file_uploads WHERE id = $1`;
      const values = [fileId];

      if (userId) {
        queryText += ` AND user_id = $2`;
        values.push(userId);
      }

      const result = await query(queryText, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting file by ID:', error);
      throw error;
    }
  }

  // Get user files
  async getUserFiles(userId, options = {}) {
    try {
      const {
        category,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      
      let queryText = `
        SELECT * FROM file_uploads 
        WHERE user_id = $1 AND upload_status = 'completed'
      `;
      const values = [userId];
      let paramCount = 1;

      if (category) {
        paramCount++;
        queryText += ` AND category = $${paramCount}`;
        values.push(category);
      }

      queryText += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total FROM file_uploads 
        WHERE user_id = $1 AND upload_status = 'completed'
      `;
      const countValues = [userId];

      if (category) {
        countQuery += ` AND category = $2`;
        countValues.push(category);
      }

      const [result, countResult] = await Promise.all([
        query(queryText, values),
        query(countQuery, countValues)
      ]);

      return {
        files: result.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      };
    } catch (error) {
      logger.error('Error getting user files:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId, userId) {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Delete physical file
      try {
        await fs.unlink(file.file_path);
      } catch (error) {
        logger.warn(`Physical file not found: ${file.file_path}`);
      }

      // Delete database record
      const queryText = `DELETE FROM file_uploads WHERE id = $1 AND user_id = $2`;
      await query(queryText, [fileId, userId]);

      logger.info(`File deleted: ${file.original_name} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file download URL
  async getFileDownloadUrl(fileId, userId, expiresIn = 3600) {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Generate temporary download token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Store token in Redis
      const tokenKey = `download_token:${token}`;
      await redis.setex(tokenKey, expiresIn, JSON.stringify({
        fileId,
        userId,
        expiresAt: expiresAt.toISOString()
      }));

      const downloadUrl = `${process.env.API_URL}/api/files/download/${token}`;
      
      return {
        download_url: downloadUrl,
        expires_at: expiresAt.toISOString(),
        expires_in: expiresIn
      };
    } catch (error) {
      logger.error('Error generating download URL:', error);
      throw error;
    }
  }

  // Validate download token and get file
  async validateDownloadToken(token) {
    try {
      const tokenKey = `download_token:${token}`;
      const tokenData = await redis.get(tokenKey);
      
      if (!tokenData) {
        throw new AppError('Invalid or expired download token', 401);
      }

      const { fileId, userId } = JSON.parse(tokenData);
      const file = await this.getFileById(fileId, userId);
      
      if (!file) {
        throw new AppError('File not found', 404);
      }

      // Check if file exists on disk
      try {
        await fs.access(file.file_path);
      } catch (error) {
        throw new AppError('File not available', 404);
      }

      return file;
    } catch (error) {
      logger.error('Error validating download token:', error);
      throw error;
    }
  }

  // Get file statistics
  async getFileStatistics(userId = null) {
    try {
      let queryText = `
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          category,
          COUNT(*) as category_count
        FROM file_uploads 
        WHERE upload_status = 'completed'
      `;
      const values = [];

      if (userId) {
        queryText += ` AND user_id = $1`;
        values.push(userId);
      }

      queryText += ` GROUP BY category`;

      const result = await query(queryText, values);
      
      const stats = {
        total_files: 0,
        total_size: 0,
        categories: {}
      };

      result.rows.forEach(row => {
        stats.total_files += parseInt(row.category_count);
        stats.total_size += parseInt(row.total_size || 0);
        stats.categories[row.category] = {
          count: parseInt(row.category_count),
          size: parseInt(row.total_size || 0)
        };
      });

      return stats;
    } catch (error) {
      logger.error('Error getting file statistics:', error);
      throw error;
    }
  }

  // Clean up old temporary files
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const tempDir = path.join(this.uploadDir, 'temp');
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      const files = await fs.readdir(tempDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      logger.info(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up temporary files:', error);
      return 0;
    }
  }

  // Clean up orphaned files (files without database records)
  async cleanupOrphanedFiles() {
    try {
      const categories = ['recovery', 'transfers', 'backups', 'general'];
      let deletedCount = 0;
      
      for (const category of categories) {
        const categoryDir = path.join(this.uploadDir, category);
        
        try {
          await this.cleanupDirectoryRecursive(categoryDir);
        } catch (error) {
          logger.warn(`Error cleaning up category ${category}:`, error);
        }
      }
      
      logger.info(`Orphaned file cleanup completed`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up orphaned files:', error);
      return 0;
    }
  }

  // Recursively clean up directory
  async cleanupDirectoryRecursive(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await this.cleanupDirectoryRecursive(itemPath);
        } else {
          // Check if file exists in database
          const queryText = `SELECT id FROM file_uploads WHERE file_path = $1`;
          const result = await query(queryText, [itemPath]);
          
          if (result.rows.length === 0) {
            // File not in database, delete it
            await fs.unlink(itemPath);
            logger.info(`Deleted orphaned file: ${itemPath}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up directory ${dirPath}:`, error);
    }
  }

  // Get file mime type from extension
  getMimeTypeFromExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create file uploads table
  static async createFileUploadsTable() {
    const queryText = `
      CREATE TABLE IF NOT EXISTS file_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        metadata JSONB DEFAULT '{}'::jsonb,
        upload_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_category ON file_uploads(category);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_hash ON file_uploads(file_hash);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(upload_status);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);

      CREATE TRIGGER update_file_uploads_updated_at
        BEFORE UPDATE ON file_uploads
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const { query } = require('../config/database');
    await query(queryText);
  }
}

module.exports = new FileUploadService();