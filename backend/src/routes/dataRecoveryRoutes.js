const express = require('express');
const dataRecoveryService = require('../services/dataRecovery/dataRecoveryService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const startRecoveryValidation = [
  body('device_id')
    .isUUID()
    .withMessage('Device ID must be a valid UUID'),
  body('recovery_type')
    .isIn(['deleted_files', 'formatted_drive', 'corrupted_files', 'system_crash', 'virus_attack', 'hardware_failure'])
    .withMessage('Invalid recovery type'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object')
];

const recoveryIdValidation = [
  param('recoveryId')
    .isUUID()
    .withMessage('Recovery ID must be a valid UUID')
];

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('recovery_type')
    .optional()
    .isIn(['deleted_files', 'formatted_drive', 'corrupted_files', 'system_crash', 'virus_attack', 'hardware_failure'])
    .withMessage('Invalid recovery type filter')
];

// Apply authentication to all routes
router.use(protect);

// @desc    Start a new data recovery session
// @route   POST /api/data-recovery
// @access  Private
router.post('/', startRecoveryValidation, validateRequest, async (req, res, next) => {
  try {
    const { device_id, recovery_type, options = {} } = req.body;
    const userId = req.user.id;

    // Validate recovery options
    dataRecoveryService.validateRecoveryOptions(recovery_type, options);

    const recoverySession = await dataRecoveryService.startRecovery(
      userId,
      device_id,
      recovery_type,
      options
    );

    logger.info('Data recovery session started', {
      userId,
      recoveryId: recoverySession.id,
      deviceId: device_id,
      recoveryType: recovery_type
    });

    res.status(201).json({
      success: true,
      message: 'Data recovery session started successfully',
      data: recoverySession.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's recovery sessions
// @route   GET /api/data-recovery
// @access  Private
router.get('/', paginationValidation, validateRequest, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, status, recovery_type } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) options.status = status;
    if (recovery_type) options.recoveryType = recovery_type;

    const sessions = await dataRecoveryService.getUserRecoverySessions(userId, options);

    res.json({
      success: true,
      data: sessions.map(session => session.toJSON()),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: sessions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get recovery session by ID
// @route   GET /api/data-recovery/:recoveryId
// @access  Private
router.get('/:recoveryId', recoveryIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { recoveryId } = req.params;
    const userId = req.user.id;

    const session = await dataRecoveryService.getRecoverySession(recoveryId, userId);

    res.json({
      success: true,
      data: session.toJSON ? session.toJSON() : session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get recovery session progress
// @route   GET /api/data-recovery/:recoveryId/progress
// @access  Private
router.get('/:recoveryId/progress', recoveryIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { recoveryId } = req.params;
    const userId = req.user.id;

    const progress = await dataRecoveryService.getRecoveryProgress(recoveryId, userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel recovery session
// @route   POST /api/data-recovery/:recoveryId/cancel
// @access  Private
router.post('/:recoveryId/cancel', recoveryIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { recoveryId } = req.params;
    const userId = req.user.id;

    const session = await dataRecoveryService.cancelRecovery(recoveryId, userId);

    logger.info('Recovery session cancelled', {
      userId,
      recoveryId
    });

    res.json({
      success: true,
      message: 'Recovery session cancelled successfully',
      data: session.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Pause recovery session
// @route   POST /api/data-recovery/:recoveryId/pause
// @access  Private
router.post('/:recoveryId/pause', recoveryIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { recoveryId } = req.params;
    const userId = req.user.id;

    const session = await dataRecoveryService.pauseRecovery(recoveryId, userId);

    logger.info('Recovery session paused', {
      userId,
      recoveryId
    });

    res.json({
      success: true,
      message: 'Recovery session paused successfully',
      data: session.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resume recovery session
// @route   POST /api/data-recovery/:recoveryId/resume
// @access  Private
router.post('/:recoveryId/resume', recoveryIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { recoveryId } = req.params;
    const userId = req.user.id;

    const session = await dataRecoveryService.resumeRecovery(recoveryId, userId);

    logger.info('Recovery session resumed', {
      userId,
      recoveryId
    });

    res.json({
      success: true,
      message: 'Recovery session resumed successfully',
      data: session.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get active recovery sessions
// @route   GET /api/data-recovery/active
// @access  Private
router.get('/active/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activeSessions = await dataRecoveryService.getActiveRecoveries(userId);

    res.json({
      success: true,
      data: activeSessions.map(session => session.toJSON ? session.toJSON() : session)
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get recovery statistics
// @route   GET /api/data-recovery/stats
// @access  Private
router.get('/stats/overview', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { time_range = '30 days' } = req.query;

    // Validate time range
    const validRanges = ['7 days', '30 days', '90 days', '1 year'];
    if (!validRanges.includes(time_range)) {
      throw new AppError('Invalid time range', 400);
    }

    const stats = await dataRecoveryService.getRecoveryStats(userId, time_range);

    res.json({
      success: true,
      data: {
        time_range,
        statistics: stats
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get supported recovery types
// @route   GET /api/data-recovery/types
// @access  Private
router.get('/types/supported', async (req, res, next) => {
  try {
    const recoveryTypes = [
      {
        type: 'deleted_files',
        name: 'Deleted Files Recovery',
        description: 'Recover accidentally deleted files and folders',
        options: [
          { name: 'file_types', type: 'array', description: 'Specific file types to recover' },
          { name: 'date_range', type: 'object', description: 'Date range for deleted files' },
          { name: 'deep_scan', type: 'boolean', description: 'Perform deep scan for better results' }
        ]
      },
      {
        type: 'formatted_drive',
        name: 'Formatted Drive Recovery',
        description: 'Recover data from formatted or repartitioned drives',
        options: [
          { name: 'partition_type', type: 'string', description: 'Original partition type' },
          { name: 'file_system', type: 'string', description: 'Original file system' },
          { name: 'deep_scan', type: 'boolean', description: 'Perform deep scan for better results' }
        ]
      },
      {
        type: 'corrupted_files',
        name: 'Corrupted Files Recovery',
        description: 'Repair and recover corrupted files',
        options: [
          { name: 'file_types', type: 'array', description: 'File types to repair' },
          { name: 'repair_mode', type: 'string', description: 'Repair mode (quick/thorough)' }
        ]
      },
      {
        type: 'system_crash',
        name: 'System Crash Recovery',
        description: 'Recover data after system crashes or blue screens',
        options: [
          { name: 'boot_sector_recovery', type: 'boolean', description: 'Recover boot sector' },
          { name: 'registry_recovery', type: 'boolean', description: 'Recover system registry' }
        ]
      },
      {
        type: 'virus_attack',
        name: 'Virus Attack Recovery',
        description: 'Recover data damaged by malware or viruses',
        options: [
          { name: 'quarantine_scan', type: 'boolean', description: 'Scan quarantine folders' },
          { name: 'system_restore', type: 'boolean', description: 'Include system restore points' }
        ]
      },
      {
        type: 'hardware_failure',
        name: 'Hardware Failure Recovery',
        description: 'Recover data from failing or damaged hardware',
        options: [
          { name: 'sector_analysis', type: 'boolean', description: 'Analyze bad sectors' },
          { name: 'bad_block_recovery', type: 'boolean', description: 'Attempt bad block recovery' }
        ]
      }
    ];

    res.json({
      success: true,
      data: recoveryTypes
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes
// @desc    Get all recovery sessions (Admin only)
// @route   GET /api/data-recovery/admin/sessions
// @access  Private/Admin
router.get('/admin/sessions', authorize('admin'), paginationValidation, validateRequest, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status, recovery_type } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) options.status = status;
    if (recovery_type) options.recoveryType = recovery_type;

    // Get all sessions (no user filter)
    const sessions = await dataRecoveryService.getUserRecoverySessions(null, options);

    res.json({
      success: true,
      data: sessions.map(session => session.toJSON()),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: sessions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get platform recovery statistics (Admin only)
// @route   GET /api/data-recovery/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authorize('admin'), async (req, res, next) => {
  try {
    const { time_range = '30 days' } = req.query;

    // Validate time range
    const validRanges = ['7 days', '30 days', '90 days', '1 year'];
    if (!validRanges.includes(time_range)) {
      throw new AppError('Invalid time range', 400);
    }

    const stats = await dataRecoveryService.getRecoveryStats(null, time_range);
    const activeSessions = await dataRecoveryService.getActiveRecoveries();

    res.json({
      success: true,
      data: {
        time_range,
        statistics: stats,
        active_sessions: activeSessions.length,
        active_sessions_details: activeSessions.map(session => ({
          id: session.id,
          user_id: session.user_id,
          recovery_type: session.recovery_type,
          status: session.status,
          progress: session.progress,
          created_at: session.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cleanup old recovery sessions (Admin only)
// @route   POST /api/data-recovery/admin/cleanup
// @access  Private/Admin
router.post('/admin/cleanup', authorize('admin'), async (req, res, next) => {
  try {
    const { days_old = 90 } = req.body;

    if (days_old < 30) {
      throw new AppError('Cannot cleanup sessions newer than 30 days', 400);
    }

    const deletedCount = await dataRecoveryService.cleanupOldSessions(days_old);

    logger.info('Recovery sessions cleanup completed', {
      deletedCount,
      daysOld: days_old,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old recovery sessions`,
      data: {
        deleted_count: deletedCount,
        days_old
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;