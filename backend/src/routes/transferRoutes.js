const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const phoneTransferService = require('../services/phoneTransfer/phoneTransferService');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');

// Validation schemas
const startTransferValidation = [
  body('sourceDeviceId').notEmpty().withMessage('Source device ID is required'),
  body('targetDeviceId').notEmpty().withMessage('Target device ID is required'),
  body('transferType').isIn(['full', 'selective']).withMessage('Invalid transfer type'),
  body('dataTypes').isArray().withMessage('Data types must be an array'),
  body('dataTypes.*').isIn(['contacts', 'messages', 'photos', 'videos', 'music', 'documents', 'apps', 'settings']).withMessage('Invalid data type')
];

const sessionIdValidation = [
  param('sessionId').isUUID().withMessage('Invalid session ID')
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'preparing', 'transferring', 'completed', 'failed', 'paused']).withMessage('Invalid status'),
  query('type').optional().isIn(['full', 'selective']).withMessage('Invalid type')
];

const compatibilityValidation = [
  body('sourceDeviceId').notEmpty().withMessage('Source device ID is required'),
  body('targetDeviceId').notEmpty().withMessage('Target device ID is required')
];

// @desc    Start phone transfer session
// @route   POST /api/v1/transfer/start
// @access  Private
router.post('/start', protect, startTransferValidation, validateRequest, async (req, res, next) => {
  try {
    const { sourceDeviceId, targetDeviceId, transferType, dataTypes, options = {} } = req.body;
    
    const session = await phoneTransferService.startTransfer({
      userId: req.user.id,
      sourceDeviceId,
      targetDeviceId,
      transferType,
      dataTypes,
      options
    });
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all transfer sessions for user
// @route   GET /api/v1/transfer/sessions
// @access  Private
router.get('/sessions', protect, queryValidation, validateRequest, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    const sessions = await phoneTransferService.getUserSessions(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    });
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer session details
// @route   GET /api/v1/transfer/sessions/:sessionId
// @access  Private
router.get('/sessions/:sessionId', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await phoneTransferService.getSessionDetails(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Pause transfer session
// @route   PUT /api/v1/transfer/sessions/:sessionId/pause
// @access  Private
router.put('/sessions/:sessionId/pause', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await phoneTransferService.pauseTransfer(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resume transfer session
// @route   PUT /api/v1/transfer/sessions/:sessionId/resume
// @access  Private
router.put('/sessions/:sessionId/resume', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await phoneTransferService.resumeTransfer(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel transfer session
// @route   DELETE /api/v1/transfer/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    await phoneTransferService.cancelTransfer(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      message: 'Transfer session cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Check device compatibility
// @route   POST /api/v1/transfer/compatibility
// @access  Private
router.post('/compatibility', protect, compatibilityValidation, validateRequest, async (req, res, next) => {
  try {
    const { sourceDeviceId, targetDeviceId } = req.body;
    
    const compatibility = await phoneTransferService.checkCompatibility(sourceDeviceId, targetDeviceId, req.user.id);
    
    res.json({
      success: true,
      data: compatibility
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer estimate
// @route   POST /api/v1/transfer/estimate
// @access  Private
router.post('/estimate', protect, startTransferValidation, validateRequest, async (req, res, next) => {
  try {
    const { sourceDeviceId, targetDeviceId, transferType, dataTypes } = req.body;
    
    const estimate = await phoneTransferService.getTransferEstimate({
      userId: req.user.id,
      sourceDeviceId,
      targetDeviceId,
      transferType,
      dataTypes
    });
    
    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get transfer statistics
// @route   GET /api/v1/transfer/stats
// @access  Private
router.get('/stats', protect, async (req, res, next) => {
  try {
    const stats = await phoneTransferService.getTransferStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get supported devices
// @route   GET /api/v1/transfer/supported-devices
// @access  Private
router.get('/supported-devices', protect, async (req, res, next) => {
  try {
    const devices = await phoneTransferService.getSupportedDevices();
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;