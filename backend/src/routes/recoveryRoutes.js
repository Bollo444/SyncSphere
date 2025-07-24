const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const dataRecoveryService = require('../services/dataRecovery/dataRecoveryService');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');

// Validation schemas
const startRecoveryValidation = [
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('recoveryType').isIn(['deleted_files', 'formatted_drive', 'corrupted_files', 'system_crash', 'virus_attack', 'hardware_failure']).withMessage('Invalid recovery type'),
  body('scanDepth').optional().isIn(['quick', 'deep', 'thorough']).withMessage('Invalid scan depth')
];

const sessionIdValidation = [
  param('sessionId').isUUID().withMessage('Invalid session ID')
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
  query('type').optional().isIn(['deleted_files', 'formatted_drive', 'corrupted_files', 'system_crash', 'virus_attack', 'hardware_failure']).withMessage('Invalid type')
];

// @desc    Start data recovery session
// @route   POST /api/v1/recovery/start
// @access  Private
router.post('/start', protect, startRecoveryValidation, validateRequest, async (req, res, next) => {
  try {
    const { deviceId, recoveryType, scanDepth = 'quick', options = {} } = req.body;
    
    // Include scanDepth in options
    const recoveryOptions = { ...options, scanDepth };
    
    const session = await dataRecoveryService.startRecovery(
      req.user.id,
      deviceId,
      recoveryType,
      recoveryOptions
    );
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all recovery sessions for user
// @route   GET /api/v1/recovery/sessions
// @access  Private
router.get('/sessions', protect, queryValidation, validateRequest, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    const sessions = await dataRecoveryService.getUserSessions(req.user.id, {
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

// @desc    Get recovery session details
// @route   GET /api/v1/recovery/sessions/:sessionId
// @access  Private
router.get('/sessions/:sessionId', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await dataRecoveryService.getSessionDetails(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Pause recovery session
// @route   PUT /api/v1/recovery/sessions/:sessionId/pause
// @access  Private
router.put('/sessions/:sessionId/pause', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await dataRecoveryService.pauseRecovery(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resume recovery session
// @route   PUT /api/v1/recovery/sessions/:sessionId/resume
// @access  Private
router.put('/sessions/:sessionId/resume', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const session = await dataRecoveryService.resumeRecovery(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel recovery session
// @route   DELETE /api/v1/recovery/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    await dataRecoveryService.cancelRecovery(req.params.sessionId, req.user.id);
    
    res.json({
      success: true,
      message: 'Recovery session cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Download recovered files
// @route   POST /api/v1/recovery/sessions/:sessionId/download
// @access  Private
router.post('/sessions/:sessionId/download', protect, sessionIdValidation, validateRequest, async (req, res, next) => {
  try {
    const { fileIds } = req.body;
    
    const downloadInfo = await dataRecoveryService.downloadFiles(req.params.sessionId, req.user.id, fileIds);
    
    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get recovery statistics
// @route   GET /api/v1/recovery/stats
// @access  Private
router.get('/stats', protect, async (req, res, next) => {
  try {
    const stats = await dataRecoveryService.getRecoveryStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;