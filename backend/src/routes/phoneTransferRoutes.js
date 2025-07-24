const express = require('express');
const phoneTransferService = require('../services/phoneTransfer/phoneTransferService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const startTransferValidation = [
  body('source_device_id')
    .isUUID()
    .withMessage('Source device ID must be a valid UUID'),
  body('target_device_id')
    .isUUID()
    .withMessage('Target device ID must be a valid UUID'),
  body('transfer_type')
    .isIn(['full_transfer', 'selective_transfer', 'backup_restore', 'clone_device'])
    .withMessage('Invalid transfer type'),
  body('data_types')
    .isArray({ min: 1 })
    .withMessage('At least one data type must be selected'),
  body('data_types.*.type')
    .isIn(['contacts', 'photos', 'videos', 'music', 'documents', 'apps', 'messages', 'call_logs', 'calendar', 'notes'])
    .withMessage('Invalid data type'),
  body('data_types.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.connection_method')
    .optional()
    .isIn(['wifi', 'cable', 'bluetooth', 'cloud'])
    .withMessage('Invalid connection method'),
  body('options.encryption_enabled')
    .optional()
    .isBoolean()
    .withMessage('Encryption enabled must be a boolean'),
  body('options.compression_enabled')
    .optional()
    .isBoolean()
    .withMessage('Compression enabled must be a boolean')
];

const transferIdValidation = [
  param('transferId')
    .isUUID()
    .withMessage('Transfer ID must be a valid UUID')
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
    .isIn(['pending', 'preparing', 'connecting', 'transferring', 'verifying', 'completed', 'failed', 'cancelled', 'paused'])
    .withMessage('Invalid status filter'),
  query('transfer_type')
    .optional()
    .isIn(['full_transfer', 'selective_transfer', 'backup_restore', 'clone_device'])
    .withMessage('Invalid transfer type filter')
];

// Apply authentication to all routes
router.use(protect);

// @desc    Start a new phone transfer
// @route   POST /api/phone-transfer
// @access  Private
router.post('/', startTransferValidation, validateRequest, async (req, res, next) => {
  try {
    const { source_device_id, target_device_id, transfer_type, data_types, options = {} } = req.body;
    const userId = req.user.id;

    const transfer = await phoneTransferService.startTransfer(
      userId,
      source_device_id,
      target_device_id,
      transfer_type,
      data_types,
      options
    );

    logger.info('Phone transfer started', {
      userId,
      transferId: transfer.id,
      sourceDeviceId: source_device_id,
      targetDeviceId: target_device_id,
      transferType: transfer_type
    });

    res.status(201).json({
      success: true,
      message: 'Phone transfer started successfully',
      data: transfer.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's phone transfers
// @route   GET /api/phone-transfer
// @access  Private
router.get('/', paginationValidation, validateRequest, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, status, transfer_type } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) options.status = status;
    if (transfer_type) options.transferType = transfer_type;

    const transfers = await phoneTransferService.getUserTransfers(userId, options);

    res.json({
      success: true,
      data: transfers.map(transfer => transfer.toJSON()),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: transfers.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer by ID
// @route   GET /api/phone-transfer/:transferId
// @access  Private
router.get('/:transferId', transferIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const transfer = await phoneTransferService.getTransfer(transferId, userId);

    res.json({
      success: true,
      data: transfer.toJSON ? transfer.toJSON() : transfer
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer progress
// @route   GET /api/phone-transfer/:transferId/progress
// @access  Private
router.get('/:transferId/progress', transferIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const progress = await phoneTransferService.getTransferProgress(transferId, userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel transfer
// @route   POST /api/phone-transfer/:transferId/cancel
// @access  Private
router.post('/:transferId/cancel', transferIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const transfer = await phoneTransferService.cancelTransfer(transferId, userId);

    logger.info('Phone transfer cancelled', {
      userId,
      transferId
    });

    res.json({
      success: true,
      message: 'Transfer cancelled successfully',
      data: transfer.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Pause transfer
// @route   POST /api/phone-transfer/:transferId/pause
// @access  Private
router.post('/:transferId/pause', transferIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const transfer = await phoneTransferService.pauseTransfer(transferId, userId);

    logger.info('Phone transfer paused', {
      userId,
      transferId
    });

    res.json({
      success: true,
      message: 'Transfer paused successfully',
      data: transfer.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resume transfer
// @route   POST /api/phone-transfer/:transferId/resume
// @access  Private
router.post('/:transferId/resume', transferIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const transfer = await phoneTransferService.resumeTransfer(transferId, userId);

    logger.info('Phone transfer resumed', {
      userId,
      transferId
    });

    res.json({
      success: true,
      message: 'Transfer resumed successfully',
      data: transfer.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get active transfers
// @route   GET /api/phone-transfer/active/sessions
// @access  Private
router.get('/active/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activeTransfers = await phoneTransferService.getActiveTransfers(userId);

    res.json({
      success: true,
      data: activeTransfers.map(transfer => transfer.toJSON ? transfer.toJSON() : transfer)
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer statistics
// @route   GET /api/phone-transfer/stats/overview
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

    const stats = await phoneTransferService.getTransferStats(userId, time_range);

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

// @desc    Get supported data types
// @route   GET /api/phone-transfer/data-types/supported
// @access  Private
router.get('/data-types/supported', async (req, res, next) => {
  try {
    const dataTypes = phoneTransferService.getSupportedDataTypes();

    res.json({
      success: true,
      data: dataTypes
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get supported transfer types
// @route   GET /api/phone-transfer/types/supported
// @access  Private
router.get('/types/supported', async (req, res, next) => {
  try {
    const transferTypes = [
      {
        type: 'full_transfer',
        name: 'Full Transfer',
        description: 'Transfer all data from source to target device',
        recommended_for: 'New device setup',
        estimated_time: '2-6 hours',
        data_types: 'all'
      },
      {
        type: 'selective_transfer',
        name: 'Selective Transfer',
        description: 'Choose specific data types to transfer',
        recommended_for: 'Partial data migration',
        estimated_time: '30 minutes - 2 hours',
        data_types: 'selected'
      },
      {
        type: 'backup_restore',
        name: 'Backup & Restore',
        description: 'Create backup and restore to target device',
        recommended_for: 'Device replacement',
        estimated_time: '1-4 hours',
        data_types: 'all'
      },
      {
        type: 'clone_device',
        name: 'Clone Device',
        description: 'Create exact copy of source device',
        recommended_for: 'Device duplication',
        estimated_time: '3-8 hours',
        data_types: 'all_including_system'
      }
    ];

    res.json({
      success: true,
      data: transferTypes
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get connection methods
// @route   GET /api/phone-transfer/connection-methods
// @access  Private
router.get('/connection-methods', async (req, res, next) => {
  try {
    const connectionMethods = [
      {
        method: 'wifi',
        name: 'Wi-Fi Direct',
        description: 'Direct wireless connection between devices',
        speed: 'Fast (10-60 MB/s)',
        requirements: ['Both devices on same network', 'Wi-Fi enabled'],
        pros: ['Fast transfer', 'No cables needed', 'Reliable'],
        cons: ['Requires Wi-Fi network']
      },
      {
        method: 'cable',
        name: 'USB Cable',
        description: 'Direct cable connection',
        speed: 'Very Fast (50-150 MB/s)',
        requirements: ['Compatible USB cable', 'USB debugging enabled'],
        pros: ['Fastest transfer', 'Most reliable', 'No network needed'],
        cons: ['Requires compatible cable', 'Less convenient']
      },
      {
        method: 'bluetooth',
        name: 'Bluetooth',
        description: 'Wireless Bluetooth connection',
        speed: 'Slow (0.5-2.5 MB/s)',
        requirements: ['Bluetooth enabled on both devices'],
        pros: ['No cables', 'Universal compatibility', 'Low power'],
        cons: ['Very slow', 'Limited range', 'Not suitable for large transfers']
      },
      {
        method: 'cloud',
        name: 'Cloud Transfer',
        description: 'Transfer via cloud storage',
        speed: 'Medium (5-25 MB/s)',
        requirements: ['Internet connection', 'Cloud storage space'],
        pros: ['No direct connection needed', 'Can resume later', 'Backup created'],
        cons: ['Requires internet', 'Uses cloud storage', 'Slower than direct']
      }
    ];

    res.json({
      success: true,
      data: connectionMethods
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Check device compatibility
// @route   POST /api/phone-transfer/compatibility/check
// @access  Private
router.post('/compatibility/check', [
  body('source_device_id').isUUID().withMessage('Source device ID must be a valid UUID'),
  body('target_device_id').isUUID().withMessage('Target device ID must be a valid UUID')
], validateRequest, async (req, res, next) => {
  try {
    const { source_device_id, target_device_id } = req.body;
    const userId = req.user.id;

    // Get devices
    const Device = require('../models/Device');
    const sourceDevice = await Device.findById(source_device_id);
    const targetDevice = await Device.findById(target_device_id);

    if (!sourceDevice || sourceDevice.user_id !== userId) {
      throw new AppError('Source device not found or not owned by user', 404);
    }

    if (!targetDevice || targetDevice.user_id !== userId) {
      throw new AppError('Target device not found or not owned by user', 404);
    }

    const compatibility = await phoneTransferService.checkDeviceCompatibility(sourceDevice, targetDevice);

    res.json({
      success: true,
      data: {
        source_device: {
          id: sourceDevice.id,
          name: sourceDevice.device_name,
          type: sourceDevice.device_type,
          os_version: sourceDevice.os_version
        },
        target_device: {
          id: targetDevice.id,
          name: targetDevice.device_name,
          type: targetDevice.device_type,
          os_version: targetDevice.os_version
        },
        compatibility
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes
// @desc    Get all transfers (Admin only)
// @route   GET /api/phone-transfer/admin/transfers
// @access  Private/Admin
router.get('/admin/transfers', authorize('admin'), paginationValidation, validateRequest, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status, transfer_type } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) options.status = status;
    if (transfer_type) options.transferType = transfer_type;

    // Get all transfers (no user filter)
    const transfers = await phoneTransferService.getUserTransfers(null, options);

    res.json({
      success: true,
      data: transfers.map(transfer => transfer.toJSON()),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: transfers.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get platform transfer statistics (Admin only)
// @route   GET /api/phone-transfer/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authorize('admin'), async (req, res, next) => {
  try {
    const { time_range = '30 days' } = req.query;

    // Validate time range
    const validRanges = ['7 days', '30 days', '90 days', '1 year'];
    if (!validRanges.includes(time_range)) {
      throw new AppError('Invalid time range', 400);
    }

    const stats = await phoneTransferService.getTransferStats(null, time_range);
    const activeTransfers = await phoneTransferService.getActiveTransfers();

    res.json({
      success: true,
      data: {
        time_range,
        statistics: stats,
        active_transfers: activeTransfers.length,
        active_transfers_details: activeTransfers.map(transfer => ({
          id: transfer.id,
          user_id: transfer.user_id,
          transfer_type: transfer.transfer_type,
          status: transfer.status,
          progress: transfer.progress,
          created_at: transfer.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cleanup old transfers (Admin only)
// @route   POST /api/phone-transfer/admin/cleanup
// @access  Private/Admin
router.post('/admin/cleanup', authorize('admin'), async (req, res, next) => {
  try {
    const { days_old = 90 } = req.body;

    if (days_old < 30) {
      throw new AppError('Cannot cleanup transfers newer than 30 days', 400);
    }

    const deletedCount = await phoneTransferService.cleanupOldTransfers(days_old);

    logger.info('Phone transfers cleanup completed', {
      deletedCount,
      daysOld: days_old,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old transfers`,
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