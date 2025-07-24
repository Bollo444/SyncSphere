const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const screenUnlockService = require('../services/advanced/screenUnlockService');
const systemRepairService = require('../services/advanced/systemRepairService');
const dataEraserService = require('../services/advanced/dataEraserService');
const frpBypassService = require('../services/advanced/frpBypassService');
const icloudBypassService = require('../services/advanced/icloudBypassService');
const AdvancedSession = require('../models/AdvancedSession');
const Device = require('../models/Device');
const AppError = require('../utils/AppError');

const router = express.Router();

// Services are already instantiated in their respective modules

// Screen Unlock Routes
router.post('/screen-unlock/start', protect, asyncHandler(async (req, res) => {
  const { deviceId, unlockMethod, options } = req.body;
  
  if (!deviceId || !unlockMethod) {
    throw new AppError('Device ID and unlock method are required', 400);
  }
  
  // Validate unlock method
  const validUnlockMethods = [
    'pin_bruteforce',
    'pattern_analysis',
    'password_dictionary',
    'biometric_bypass',
    'exploit_vulnerability'
  ];
  
  if (!validUnlockMethods.includes(unlockMethod)) {
    throw new AppError('Invalid unlock method', 400);
  }
  
  // Validate device exists
  const device = await Device.findById(deviceId);
  if (!device) {
    throw new AppError('Invalid device ID', 400);
  }
  
  const session = await screenUnlockService.startUnlock(
    req.user.id,
    deviceId,
    unlockMethod,
    options
  );
  
  res.status(201).json({
    success: true,
    data: { session }
  });
}));

router.get('/screen-unlock/sessions/:id/progress', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  res.json({
    success: true,
    data: {
      progress: session.progress,
      status: session.status
    }
  });
}));

// System Repair Routes
router.post('/system-repair/start', protect, asyncHandler(async (req, res) => {
  const { deviceId, repairType, issues, repairMode } = req.body;
  
  if (!deviceId || !repairType) {
    throw new AppError('Device ID and repair type are required', 400);
  }
  
  // Validate repair type
  const validRepairTypes = [
    'ios_system_recovery',
    'android_system_recovery',
    'bootloader_repair',
    'firmware_update',
    'system_restore'
  ];
  
  if (!validRepairTypes.includes(repairType)) {
    throw new AppError('Invalid repair type', 400);
  }
  
  const session = await systemRepairService.startRepair(
    req.user.id,
    deviceId,
    repairType,
    { issues, repairMode }
  );
  
  res.status(201).json({
    success: true,
    data: { session }
  });
}));

router.get('/system-repair/sessions/:id/diagnosis', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  // Check if diagnosis is available and complete
  if (!session.diagnosis || session.status === 'scanning' || session.status === 'running') {
    throw new AppError('Diagnosis not yet available. Session must be completed first.', 400);
  }
  
  res.json({
    success: true,
    data: {
      diagnosis: session.diagnosis,
      status: session.status
    }
  });
}));

// Data Eraser Routes
router.post('/data-eraser/start', protect, asyncHandler(async (req, res) => {
  const { deviceId, eraseMethod, dataCategories, securityLevel } = req.body;
  
  if (!deviceId || !eraseMethod) {
    throw new AppError('Device ID and erase method are required', 400);
  }
  
  if (!dataCategories || !Array.isArray(dataCategories) || dataCategories.length === 0) {
    throw new AppError('Data categories are required and must be a non-empty array', 400);
  }
  
  // Validate erase method
  const validMethods = ['quick_erase', 'secure_erase', 'military_grade', 'custom_pattern', 'dod_5220_22_m', 'gutmann'];
  if (!validMethods.includes(eraseMethod)) {
    throw new AppError('Invalid erase method', 400);
  }
  
  const session = await dataEraserService.startErasure(
    req.user.id,
    deviceId,
    eraseMethod,
    { dataCategories, securityLevel }
  );
  
  res.status(201).json({
    success: true,
    data: { session }
  });
}));

router.get('/data-eraser/sessions/:id/verification', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  // Check if verification is available and complete
  if (!session.verification || session.status === 'erasing' || session.status === 'running') {
    throw new AppError('Verification not yet available. Session must be completed first.', 400);
  }
  
  res.json({
    success: true,
    data: {
      verification: session.verification,
      status: session.status
    }
  });
}));

// FRP Bypass Routes
router.post('/frp-bypass/start', protect, asyncHandler(async (req, res) => {
  const { deviceId, bypassMethod, options } = req.body;
  
  if (!deviceId || !bypassMethod) {
    throw new AppError('Device ID and bypass method are required', 400);
  }
  
  // Validate bypass method
  const validMethods = [
    'samsung_frp_bypass', 'lg_frp_bypass', 'huawei_frp_bypass', 'xiaomi_frp_bypass',
    'oppo_frp_bypass', 'vivo_frp_bypass', 'oneplus_frp_bypass', 'generic_android_frp',
    'adb_frp_bypass', 'fastboot_frp_bypass', 'odin_frp_bypass'
  ];
  
  if (!validMethods.includes(bypassMethod)) {
    throw new AppError('Invalid FRP bypass method', 400);
  }
  
  const session = await frpBypassService.startBypass(
    req.user.id,
    deviceId,
    bypassMethod,
    options
  );
  
  res.status(201).json({
    success: true,
    data: { session }
  });
}));

router.get('/frp-bypass/sessions/:id/progress', protect, asyncHandler(async (req, res) => {
  const progress = await frpBypassService.getProgress(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { progress }
  });
}));

router.post('/frp-bypass/sessions/:id/pause', protect, asyncHandler(async (req, res) => {
  const session = await frpBypassService.pauseBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.post('/frp-bypass/sessions/:id/resume', protect, asyncHandler(async (req, res) => {
  const session = await frpBypassService.resumeBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.post('/frp-bypass/sessions/:id/cancel', protect, asyncHandler(async (req, res) => {
  const session = await frpBypassService.cancelBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

// iCloud Bypass Routes
router.post('/icloud-bypass/start', protect, asyncHandler(async (req, res) => {
  const { deviceId, bypassMethod, options } = req.body;
  
  if (!deviceId || !bypassMethod) {
    throw new AppError('Device ID and bypass method are required', 400);
  }
  
  // Validate bypass method
  const validMethods = [
    'checkra1n_bypass', 'unc0ver_bypass', 'palera1n_bypass', 'icloud_dns_bypass',
    'activation_lock_bypass', 'generic_ios_bypass'
  ];
  
  if (!validMethods.includes(bypassMethod)) {
    throw new AppError('Invalid iCloud bypass method', 400);
  }
  
  const session = await icloudBypassService.startBypass(
    req.user.id,
    deviceId,
    bypassMethod,
    options
  );
  
  res.status(201).json({
    success: true,
    data: { session }
  });
}));

router.get('/icloud-bypass/sessions/:id/progress', protect, asyncHandler(async (req, res) => {
  const progress = await icloudBypassService.getProgress(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { progress }
  });
}));

router.post('/icloud-bypass/sessions/:id/pause', protect, asyncHandler(async (req, res) => {
  const session = await icloudBypassService.pauseBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.post('/icloud-bypass/sessions/:id/resume', protect, asyncHandler(async (req, res) => {
  const session = await icloudBypassService.resumeBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.post('/icloud-bypass/sessions/:id/cancel', protect, asyncHandler(async (req, res) => {
  const session = await icloudBypassService.cancelBypass(req.params.id, req.user.id);
  
  res.json({
    success: true,
    data: { session }
  });
}));

// Common Advanced Session Routes
router.get('/sessions', protect, asyncHandler(async (req, res) => {
  const { status, serviceType, page = 1, limit = 50 } = req.query;
  
  // Build query filter
  const filter = { userId: req.user.id };
  if (status) filter.status = status;
  if (serviceType) filter.serviceType = serviceType;
  
  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  // Get total count for pagination
  const total = await AdvancedSession.countDocuments(filter);
  
  // Get sessions with filtering and pagination
  const sessions = await AdvancedSession.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
  
  res.json({
    success: true,
    data: { 
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

router.get('/sessions/:id', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.post('/sessions/:id/stop', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  if (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') {
    throw new AppError('Cannot stop a session that is already completed, failed, or cancelled', 400);
  }
  
  session.status = 'stopped';
  session.completedAt = new Date();
  await session.save();
  
  res.json({
    success: true,
    data: { session }
  });
}));

router.delete('/sessions/:id', protect, asyncHandler(async (req, res) => {
  const session = await AdvancedSession.findById(req.params.id);
  
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  await AdvancedSession.deleteOne({ _id: req.params.id });
  
  res.json({
    success: true,
    message: 'Session deleted successfully'
  });
}));

module.exports = router;