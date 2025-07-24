const express = require('express');
const fileUploadService = require('../services/fileUploadService');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const AppError = require('../utils/AppError');
const { body, param, query } = require('express-validator');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Apply authentication to all routes except download
router.use((req, res, next) => {
  if (req.path.startsWith('/download/')) {
    return next();
  }
  authMiddleware.protect(req, res, next);
});

// Upload single file
router.post('/upload', (req, res, next) => {
  const upload = fileUploadService.getMulterConfig({
    destination: 'temp'
  }).single('file');
  
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large', 413));
      }
      return next(new AppError(err.message, 400));
    }
    
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }
    
    try {
      const { category = 'general', metadata = '{}' } = req.body;
      let parsedMetadata = {};
      
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        // Invalid JSON, use empty object
      }
      
      const fileRecord = await fileUploadService.uploadFile(
        req.file,
        req.user.id,
        category,
        parsedMetadata
      );
      
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          filename: fileRecord.filename,
          size: fileRecord.file_size,
          mime_type: fileRecord.mime_type,
          category: fileRecord.category,
          created_at: fileRecord.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Upload multiple files
router.post('/upload/multiple', (req, res, next) => {
  const upload = fileUploadService.getMulterConfig({
    destination: 'temp'
  }).array('files', 10); // Max 10 files
  
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('One or more files are too large', 413));
      }
      return next(new AppError(err.message, 400));
    }
    
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }
    
    try {
      const { category = 'general', metadata = '{}' } = req.body;
      let parsedMetadata = {};
      
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        // Invalid JSON, use empty object
      }
      
      const result = await fileUploadService.uploadMultipleFiles(
        req.files,
        req.user.id,
        category,
        parsedMetadata
      );
      
      res.status(201).json({
        success: true,
        message: `${result.successful.length} files uploaded successfully`,
        data: {
          successful: result.successful.map(file => ({
            id: file.id,
            original_name: file.original_name,
            filename: file.filename,
            size: file.file_size,
            mime_type: file.mime_type,
            category: file.category,
            created_at: file.created_at
          })),
          failed: result.failed
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Get user files
router.get('/', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort_by').optional().isIn(['created_at', 'original_name', 'file_size']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      category,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const result = await fileUploadService.getUserFiles(req.user.id, {
      category,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sort_by,
      sortOrder: sort_order
    });
    
    // Format file data for response
    const formattedFiles = result.files.map(file => ({
      id: file.id,
      original_name: file.original_name,
      filename: file.filename,
      size: file.file_size,
      formatted_size: fileUploadService.formatFileSize(file.file_size),
      mime_type: file.mime_type,
      category: file.category,
      metadata: file.metadata,
      download_count: file.download_count,
      created_at: file.created_at,
      updated_at: file.updated_at
    }));
    
    res.json({
      success: true,
      data: {
        files: formattedFiles,
        pagination: {
          current_page: result.page,
          total_pages: result.total_pages,
          total_items: result.total,
          items_per_page: result.limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get file by ID
router.get('/:fileId', [
  param('fileId').isUUID().withMessage('Invalid file ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    
    const file = await fileUploadService.getFileById(fileId, req.user.id);
    if (!file) {
      throw new AppError('File not found', 404);
    }
    
    res.json({
      success: true,
      data: {
        id: file.id,
        original_name: file.original_name,
        filename: file.filename,
        size: file.file_size,
        formatted_size: fileUploadService.formatFileSize(file.file_size),
        mime_type: file.mime_type,
        category: file.category,
        metadata: file.metadata,
        download_count: file.download_count,
        created_at: file.created_at,
        updated_at: file.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate download URL
router.post('/:fileId/download-url', [
  param('fileId').isUUID().withMessage('Invalid file ID'),
  body('expires_in').optional().isInt({ min: 60, max: 86400 }).withMessage('Expires in must be between 60 and 86400 seconds')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { expires_in = 3600 } = req.body;
    
    const downloadInfo = await fileUploadService.getFileDownloadUrl(
      fileId,
      req.user.id,
      expires_in
    );
    
    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    next(error);
  }
});

// Download file (no authentication required, uses token)
router.get('/download/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const file = await fileUploadService.validateDownloadToken(token);
    
    // Check if file exists
    if (!fs.existsSync(file.file_path)) {
      throw new AppError('File not available', 404);
    }
    
    // Update download count
    const updateQuery = `
      UPDATE file_uploads 
      SET download_count = download_count + 1 
      WHERE id = $1
    `;
    await require('../config/database').pool.query(updateQuery, [file.id]);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    
    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:fileId', [
  param('fileId').isUUID().withMessage('Invalid file ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    
    await fileUploadService.deleteFile(fileId, req.user.id);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get file statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await fileUploadService.getFileStatistics(req.user.id);
    
    // Format the response
    const formattedStats = {
      total_files: stats.total_files,
      total_size: stats.total_size,
      formatted_total_size: fileUploadService.formatFileSize(stats.total_size),
      categories: {}
    };
    
    Object.keys(stats.categories).forEach(category => {
      formattedStats.categories[category] = {
        count: stats.categories[category].count,
        size: stats.categories[category].size,
        formatted_size: fileUploadService.formatFileSize(stats.categories[category].size)
      };
    });
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    next(error);
  }
});

// Upload file for data recovery
router.post('/recovery/upload', (req, res, next) => {
  const upload = fileUploadService.getMulterConfig({
    destination: 'recovery',
    fileFilter: (req, file, cb) => {
      // Allow more file types for recovery
      const allowedTypes = [
        'application/octet-stream',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/avi',
        'audio/mp3',
        'audio/wav',
        'application/pdf',
        'text/plain'
      ];
      
      if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new AppError(`File type ${file.mimetype} is not supported for recovery`, 400), false);
      }
    },
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB for recovery files
  }).single('recovery_file');
  
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Recovery file too large (max 500MB)', 413));
      }
      return next(new AppError(err.message, 400));
    }
    
    if (!req.file) {
      return next(new AppError('No recovery file uploaded', 400));
    }
    
    try {
      const { device_id, recovery_session_id } = req.body;
      
      const metadata = {
        device_id,
        recovery_session_id,
        upload_type: 'recovery'
      };
      
      const fileRecord = await fileUploadService.uploadFile(
        req.file,
        req.user.id,
        'recovery',
        metadata
      );
      
      res.status(201).json({
        success: true,
        message: 'Recovery file uploaded successfully',
        data: {
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          size: fileRecord.file_size,
          formatted_size: fileUploadService.formatFileSize(fileRecord.file_size),
          created_at: fileRecord.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Upload backup file
router.post('/backup/upload', (req, res, next) => {
  const upload = fileUploadService.getMulterConfig({
    destination: 'backups',
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB for backup files
  }).single('backup_file');
  
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Backup file too large (max 1GB)', 413));
      }
      return next(new AppError(err.message, 400));
    }
    
    if (!req.file) {
      return next(new AppError('No backup file uploaded', 400));
    }
    
    try {
      const { device_id, backup_type = 'manual' } = req.body;
      
      const metadata = {
        device_id,
        backup_type,
        upload_type: 'backup'
      };
      
      const fileRecord = await fileUploadService.uploadFile(
        req.file,
        req.user.id,
        'backups',
        metadata
      );
      
      res.status(201).json({
        success: true,
        message: 'Backup file uploaded successfully',
        data: {
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          size: fileRecord.file_size,
          formatted_size: fileUploadService.formatFileSize(fileRecord.file_size),
          backup_type,
          created_at: fileRecord.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  });
});

// Admin routes (require admin role)
router.use('/admin', authMiddleware.authorize('admin'));

// Get all files (admin)
router.get('/admin/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('user_id').optional().isUUID().withMessage('Invalid user ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      user_id,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT f.*, u.email, u.first_name, u.last_name
      FROM file_uploads f
      JOIN users u ON f.user_id = u.id
      WHERE f.upload_status = 'completed'
    `;
    
    const values = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND f.category = $${paramCount}`;
      values.push(category);
    }

    if (user_id) {
      paramCount++;
      query += ` AND f.user_id = $${paramCount}`;
      values.push(user_id);
    }

    if (search) {
      paramCount++;
      query += ` AND (f.original_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT f.*, u.email, u.first_name, u.last_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await require('../config/database').pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    query += ` ORDER BY f.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await require('../config/database').pool.query(query, values);

    const formattedFiles = result.rows.map(file => ({
      id: file.id,
      user: {
        id: file.user_id,
        email: file.email,
        name: `${file.first_name} ${file.last_name}`
      },
      original_name: file.original_name,
      filename: file.filename,
      size: file.file_size,
      formatted_size: fileUploadService.formatFileSize(file.file_size),
      mime_type: file.mime_type,
      category: file.category,
      download_count: file.download_count,
      created_at: file.created_at
    }));

    res.json({
      success: true,
      data: {
        files: formattedFiles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get platform file statistics (admin)
router.get('/admin/statistics', async (req, res, next) => {
  try {
    const stats = await fileUploadService.getFileStatistics();
    
    // Get additional admin stats
    const additionalStatsQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as total_users_with_files,
        AVG(file_size) as average_file_size,
        MAX(file_size) as largest_file_size,
        MIN(file_size) as smallest_file_size
      FROM file_uploads 
      WHERE upload_status = 'completed'
    `;
    
    const additionalResult = await require('../config/database').pool.query(additionalStatsQuery);
    const additionalStats = additionalResult.rows[0];
    
    const formattedStats = {
      total_files: stats.total_files,
      total_size: stats.total_size,
      formatted_total_size: fileUploadService.formatFileSize(stats.total_size),
      total_users_with_files: parseInt(additionalStats.total_users_with_files),
      average_file_size: parseInt(additionalStats.average_file_size || 0),
      formatted_average_file_size: fileUploadService.formatFileSize(parseInt(additionalStats.average_file_size || 0)),
      largest_file_size: parseInt(additionalStats.largest_file_size || 0),
      formatted_largest_file_size: fileUploadService.formatFileSize(parseInt(additionalStats.largest_file_size || 0)),
      categories: {}
    };
    
    Object.keys(stats.categories).forEach(category => {
      formattedStats.categories[category] = {
        count: stats.categories[category].count,
        size: stats.categories[category].size,
        formatted_size: fileUploadService.formatFileSize(stats.categories[category].size)
      };
    });
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    next(error);
  }
});

// Clean up temporary files (admin)
router.post('/admin/cleanup/temp', async (req, res, next) => {
  try {
    const { older_than_hours = 24 } = req.body;
    
    const deletedCount = await fileUploadService.cleanupTempFiles(older_than_hours);
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} temporary files`,
      data: {
        deleted_count: deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// Clean up orphaned files (admin)
router.post('/admin/cleanup/orphaned', async (req, res, next) => {
  try {
    const deletedCount = await fileUploadService.cleanupOrphanedFiles();
    
    res.json({
      success: true,
      message: 'Orphaned file cleanup completed',
      data: {
        deleted_count: deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;