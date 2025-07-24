const express = require('express');
const backupService = require('../services/backupService');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const AppError = require('../utils/AppError');
const { body, param, query } = require('express-validator');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.protect);

// Create user data backup
router.post('/user', [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('include_files').optional().isBoolean().withMessage('Include files must be a boolean')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      name,
      include_files = true
    } = req.body;

    const backup = await backupService.createUserDataBackup(req.user.id, {
      name,
      includeFiles: include_files,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'User data backup created successfully',
      data: backup
    });
  } catch (error) {
    next(error);
  }
});

// Get user's backups
router.get('/user', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('backup_type').optional().isString().withMessage('Backup type must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      backup_type
    } = req.query;

    const result = await backupService.getBackups({
      createdBy: req.user.id,
      backupType: backup_type,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get backup details
router.get('/:backupId', [
  param('backupId').isUUID().withMessage('Invalid backup ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { backupId } = req.params;

    const result = await backupService.getBackups({
      createdBy: req.user.id,
      page: 1,
      limit: 1
    });

    const backup = result.backups.find(b => b.id === backupId);
    if (!backup) {
      throw new AppError('Backup not found', 404);
    }

    res.json({
      success: true,
      data: backup
    });
  } catch (error) {
    next(error);
  }
});

// Download backup
router.get('/:backupId/download', [
  param('backupId').isUUID().withMessage('Invalid backup ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { backupId } = req.params;

    // Get backup information
    const { pool } = require('../config/database');
    const backupQuery = `
      SELECT * FROM backups 
      WHERE id = $1 AND created_by = $2 AND status = 'completed'
    `;
    const backupResult = await pool.query(backupQuery, [backupId, req.user.id]);

    if (backupResult.rows.length === 0) {
      throw new AppError('Backup not found', 404);
    }

    const backup = backupResult.rows[0];

    // Check if file exists
    if (!fs.existsSync(backup.file_path)) {
      throw new AppError('Backup file not available', 404);
    }

    // Set appropriate headers
    const fileName = path.basename(backup.file_path);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', backup.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(backup.file_path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Backup download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading backup' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete user backup
router.delete('/:backupId', [
  param('backupId').isUUID().withMessage('Invalid backup ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { backupId } = req.params;

    const result = await backupService.deleteBackup(backupId, req.user.id);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Restore from backup
router.post('/:backupId/restore', [
  param('backupId').isUUID().withMessage('Invalid backup ID'),
  body('restore_type').optional().isString().withMessage('Restore type must be a string'),
  body('target_location').optional().isString().withMessage('Target location must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { backupId } = req.params;
    const {
      restore_type = 'full',
      target_location
    } = req.body;

    // Verify user owns the backup
    const { pool } = require('../config/database');
    const backupQuery = `
      SELECT * FROM backups 
      WHERE id = $1 AND created_by = $2 AND status = 'completed'
    `;
    const backupResult = await pool.query(backupQuery, [backupId, req.user.id]);

    if (backupResult.rows.length === 0) {
      throw new AppError('Backup not found', 404);
    }

    const result = await backupService.restoreFromBackup(backupId, {
      restoreType: restore_type,
      targetLocation: target_location,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Restore operation started successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get restore operations
router.get('/restore/operations', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    const { pool } = require('../config/database');
    const query = `
      SELECT 
        ro.*,
        b.backup_name,
        b.backup_type
      FROM restore_operations ro
      JOIN backups b ON ro.backup_id = b.id
      WHERE ro.created_by = $1
      ORDER BY ro.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM restore_operations ro
      JOIN backups b ON ro.backup_id = b.id
      WHERE ro.created_by = $1
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [req.user.id, limit, offset]),
      pool.query(countQuery, [req.user.id])
    ]);

    const total = parseInt(countResult.rows[0].total);

    const operations = result.rows.map(op => ({
      id: op.id,
      backup_id: op.backup_id,
      backup_name: op.backup_name,
      backup_type: op.backup_type,
      restore_type: op.restore_type,
      target_location: op.target_location,
      status: op.status,
      progress: op.progress,
      error_message: op.error_message,
      restore_metadata: op.restore_metadata,
      created_at: op.created_at,
      completed_at: op.completed_at
    }));

    res.json({
      success: true,
      data: {
        operations,
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

// Get restore operation status
router.get('/restore/:restoreId', [
  param('restoreId').isUUID().withMessage('Invalid restore ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { restoreId } = req.params;

    const { pool } = require('../config/database');
    const query = `
      SELECT 
        ro.*,
        b.backup_name,
        b.backup_type
      FROM restore_operations ro
      JOIN backups b ON ro.backup_id = b.id
      WHERE ro.id = $1 AND ro.created_by = $2
    `;

    const result = await pool.query(query, [restoreId, req.user.id]);

    if (result.rows.length === 0) {
      throw new AppError('Restore operation not found', 404);
    }

    const operation = result.rows[0];

    res.json({
      success: true,
      data: {
        id: operation.id,
        backup_id: operation.backup_id,
        backup_name: operation.backup_name,
        backup_type: operation.backup_type,
        restore_type: operation.restore_type,
        target_location: operation.target_location,
        status: operation.status,
        progress: operation.progress,
        error_message: operation.error_message,
        restore_metadata: operation.restore_metadata,
        created_at: operation.created_at,
        completed_at: operation.completed_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes (require admin role)
router.use('/admin', authMiddleware.authorize('admin'));

// Create database backup (admin)
router.post('/admin/database', [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('tables').optional().isArray().withMessage('Tables must be an array'),
  body('compression').optional().isBoolean().withMessage('Compression must be a boolean'),
  body('encryption').optional().isBoolean().withMessage('Encryption must be a boolean')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      name,
      tables,
      compression = true,
      encryption = false
    } = req.body;

    const backup = await backupService.createDatabaseBackup({
      name,
      tables,
      compression,
      encryption,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Database backup created successfully',
      data: backup
    });
  } catch (error) {
    next(error);
  }
});

// Create files backup (admin)
router.post('/admin/files', [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('source_paths').optional().isArray().withMessage('Source paths must be an array'),
  body('compression').optional().isBoolean().withMessage('Compression must be a boolean'),
  body('encryption').optional().isBoolean().withMessage('Encryption must be a boolean')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      name,
      source_paths,
      compression = true,
      encryption = false
    } = req.body;

    const backup = await backupService.createFilesBackup({
      name,
      sourcePaths: source_paths,
      compression,
      encryption,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Files backup created successfully',
      data: backup
    });
  } catch (error) {
    next(error);
  }
});

// Create full system backup (admin)
router.post('/admin/full', [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { name } = req.body;

    const backup = await backupService.createFullBackup({
      name,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Full system backup created successfully',
      data: backup
    });
  } catch (error) {
    next(error);
  }
});

// Get all backups (admin)
router.get('/admin/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('backup_type').optional().isString().withMessage('Backup type must be a string'),
  query('created_by').optional().isUUID().withMessage('Invalid user ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      backup_type,
      created_by
    } = req.query;

    const result = await backupService.getBackups({
      backupType: backup_type,
      createdBy: created_by,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get backup statistics (admin)
router.get('/admin/statistics', async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    
    const statsQuery = `
      SELECT 
        backup_type,
        COUNT(*) as count,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_size,
        MAX(file_size) as max_size,
        MIN(file_size) as min_size
      FROM backups
      WHERE status = 'completed'
      GROUP BY backup_type
    `;

    const overallQuery = `
      SELECT 
        COUNT(*) as total_backups,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as backups_last_7_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as backups_last_30_days,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups
      FROM backups
    `;

    const [statsResult, overallResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(overallQuery)
    ]);

    const typeStats = {};
    statsResult.rows.forEach(row => {
      typeStats[row.backup_type] = {
        count: parseInt(row.count),
        total_size: parseInt(row.total_size),
        formatted_total_size: backupService.formatFileSize(row.total_size),
        avg_size: parseInt(row.avg_size),
        formatted_avg_size: backupService.formatFileSize(row.avg_size),
        max_size: parseInt(row.max_size),
        formatted_max_size: backupService.formatFileSize(row.max_size)
      };
    });

    const overall = overallResult.rows[0];

    res.json({
      success: true,
      data: {
        overall: {
          total_backups: parseInt(overall.total_backups),
          total_size: parseInt(overall.total_size),
          formatted_total_size: backupService.formatFileSize(overall.total_size),
          backups_last_7_days: parseInt(overall.backups_last_7_days),
          backups_last_30_days: parseInt(overall.backups_last_30_days),
          failed_backups: parseInt(overall.failed_backups)
        },
        by_type: typeStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete any backup (admin)
router.delete('/admin/:backupId', [
  param('backupId').isUUID().withMessage('Invalid backup ID')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { backupId } = req.params;

    const result = await backupService.deleteBackup(backupId);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Clean up expired backups (admin)
router.post('/admin/cleanup', async (req, res, next) => {
  try {
    const deletedCount = await backupService.cleanupExpiredBackups();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired backups`,
      data: {
        deleted_count: deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all restore operations (admin)
router.get('/admin/restore/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isString().withMessage('Status must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    const { pool } = require('../config/database');
    let query = `
      SELECT 
        ro.*,
        b.backup_name,
        b.backup_type,
        u.email as created_by_email
      FROM restore_operations ro
      JOIN backups b ON ro.backup_id = b.id
      LEFT JOIN users u ON ro.created_by = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND ro.status = $${paramCount}`;
      values.push(status);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT ro.*, b.backup_name, b.backup_type, u.email as created_by_email',
      'SELECT COUNT(*) as total'
    );
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Add pagination
    query += ` ORDER BY ro.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const operations = result.rows.map(op => ({
      id: op.id,
      backup_id: op.backup_id,
      backup_name: op.backup_name,
      backup_type: op.backup_type,
      restore_type: op.restore_type,
      target_location: op.target_location,
      status: op.status,
      progress: op.progress,
      error_message: op.error_message,
      created_by: op.created_by_email,
      created_at: op.created_at,
      completed_at: op.completed_at
    }));

    res.json({
      success: true,
      data: {
        operations,
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

module.exports = router;