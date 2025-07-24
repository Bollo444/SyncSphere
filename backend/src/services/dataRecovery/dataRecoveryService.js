const DataRecovery = require('../../models/DataRecovery');
const Device = require('../../models/Device');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { getCache, setCache, deleteCache, client } = require('../../config/redis');
const { EventEmitter } = require('events');

class DataRecoveryService extends EventEmitter {
  constructor() {
    super();
    this.activeScans = new Map();
    this.recoveryQueue = [];
    this.maxConcurrentRecoveries = 3;
  }

  // Start a new data recovery session
  async startRecovery(userId, deviceId, recoveryType, options = {}) {
    try {
      // Validate user and device
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const device = await Device.findById(deviceId);
      if (!device || device.userId !== userId) {
        throw new AppError('Device not found or not owned by user', 404);
      }

      // Check if device is connected
      if (device.status !== 'connected') {
        throw new AppError('Device must be connected to start recovery', 400);
      }

      // Check for existing active recovery sessions
      const activeRecoveries = await DataRecovery.getActiveSessions(userId);
      if (activeRecoveries.length >= 2) {
        throw new AppError('Maximum number of concurrent recovery sessions reached', 429);
      }

      // Validate recovery type
      const validTypes = ['deleted_files', 'formatted_drive', 'corrupted_files', 'system_crash', 'virus_attack', 'hardware_failure'];
      if (!validTypes.includes(recoveryType)) {
        throw new AppError('Invalid recovery type', 400);
      }

      // Create recovery session
      const recoverySession = await DataRecovery.startRecovery(userId, deviceId, recoveryType, options);

      // Cache recovery session
      await setCache(`recovery:${recoverySession.id}`, recoverySession, 3600);

      // Start the recovery process
      this.processRecovery(recoverySession.id);

      logger.info(`Data recovery started`, {
        recoveryId: recoverySession.id,
        userId,
        deviceId,
        recoveryType
      });

      return recoverySession.toJSON();
    } catch (error) {
      logger.error('Error starting data recovery', { error: error.message, userId, deviceId });
      throw error;
    }
  }

  // Get recovery session by ID
  async getRecoverySession(recoveryId, userId = null) {
    try {
      // Try to get from cache first
      const cached = await getCache(`recovery:${recoveryId}`);
      if (cached) {
        if (!userId || cached.user_id === userId) {
          return cached;
        }
      }

      // Get from database
      const session = await DataRecovery.findById(recoveryId);
      if (!session) {
        throw new AppError('Recovery session not found', 404);
      }

      if (userId && session.user_id !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Update cache
      await setCache(`recovery:${recoveryId}`, session, 3600);

      return session;
    } catch (error) {
      logger.error('Error getting recovery session', { error: error.message, recoveryId });
      throw error;
    }
  }

  // Get user's recovery sessions
  async getUserRecoverySessions(userId, options = {}) {
    try {
      const sessions = await DataRecovery.findByUserId(userId, options);
      return sessions;
    } catch (error) {
      logger.error('Error getting user recovery sessions', { error: error.message, userId });
      throw error;
    }
  }

  // Cancel recovery session
  async cancelRecovery(recoveryId, userId) {
    try {
      const session = await this.getRecoverySession(recoveryId, userId);
      
      if (!['pending', 'in_progress'].includes(session.status)) {
        throw new AppError('Cannot cancel recovery session in current status', 400);
      }

      const recovery = new DataRecovery(session);
      await recovery.cancel();

      // Remove from active scans
      this.activeScans.delete(recoveryId);

      // Update cache
      await deleteCache(`recovery:${recoveryId}`);

      logger.info(`Recovery session cancelled`, { recoveryId, userId });

      return recovery;
    } catch (error) {
      logger.error('Error cancelling recovery', { error: error.message, recoveryId });
      throw error;
    }
  }

  // Pause recovery session
  async pauseRecovery(recoveryId, userId) {
    try {
      const session = await this.getRecoverySession(recoveryId, userId);
      
      if (!['in_progress'].includes(session.status)) {
        throw new AppError('Cannot pause recovery session in current status', 400);
      }

      const recovery = new DataRecovery(session);
      await recovery.pause();

      // Pause the active scan
      if (this.activeScans.has(recoveryId)) {
        this.activeScans.get(recoveryId).paused = true;
      }

      // Update cache
      await deleteCache(`recovery:${recoveryId}`);

      logger.info(`Recovery session paused`, { recoveryId, userId });

      return recovery;
    } catch (error) {
      logger.error('Error pausing recovery', { error: error.message, recoveryId });
      throw error;
    }
  }

  // Resume recovery session
  async resumeRecovery(recoveryId, userId) {
    try {
      const session = await this.getRecoverySession(recoveryId, userId);
      
      if (session.status !== 'cancelled') {
      throw new AppError('Can only resume cancelled recovery sessions', 400);
      }

      const recovery = new DataRecovery(session);
      await recovery.resume();

      // Resume the recovery process
      this.processRecovery(recoveryId);

      logger.info(`Recovery session resumed`, { recoveryId, userId });

      return recovery;
    } catch (error) {
      logger.error('Error resuming recovery', { error: error.message, recoveryId });
      throw error;
    }
  }

  // Process recovery (simulate the actual recovery process)
  async processRecovery(recoveryId) {
    try {
      const session = await DataRecovery.findById(recoveryId);
      if (!session) {
        throw new AppError('Recovery session not found', 404);
      }

      const recovery = new DataRecovery(session);
      
      // Mark as active
      this.activeScans.set(recoveryId, { 
        startTime: Date.now(), 
        paused: false,
        currentPhase: 'scanning'
      });

      // Phase 1: Scanning
    await recovery.updateStatus('in_progress');
      await this.simulateScanning(recovery);

      // Check if paused or cancelled
      if (this.activeScans.get(recoveryId)?.paused) {
        return;
      }

      // Phase 2: Analyzing (still in progress)
    await recovery.updateStatus('in_progress');
      await this.simulateAnalyzing(recovery);

      // Check if paused or cancelled
      if (this.activeScans.get(recoveryId)?.paused) {
        return;
      }

      // Phase 3: Recovering (still in progress)
    await recovery.updateStatus('in_progress');
      await this.simulateRecovering(recovery);

      // Complete
      await recovery.complete();
      this.activeScans.delete(recoveryId);

      // Emit completion event
      this.emit('recoveryCompleted', {
        recoveryId,
        userId: recovery.user_id,
        successRate: recovery.getSuccessRate()
      });

      logger.info(`Recovery completed`, { 
        recoveryId, 
        successRate: recovery.getSuccessRate() 
      });

    } catch (error) {
      logger.error('Error processing recovery', { error: error.message, recoveryId });
      
      try {
        const recovery = await DataRecovery.findById(recoveryId);
        if (recovery) {
          const recoveryInstance = new DataRecovery(recovery);
          await recoveryInstance.markAsFailed(error.message);
        }
      } catch (updateError) {
        logger.error('Error updating failed recovery', { error: updateError.message, recoveryId });
      }
      
      this.activeScans.delete(recoveryId);
    }
  }

  // Simulate scanning phase
  async simulateScanning(recovery) {
    const totalSteps = 20;
    const stepDelay = 2000; // 2 seconds per step

    for (let step = 1; step <= totalSteps; step++) {
      // Check if paused
      if (this.activeScans.get(recovery.id)?.paused) {
        return;
      }

      const progress = Math.floor((step / totalSteps) * 30); // Scanning is 30% of total
      
      // Simulate finding files
      const totalFiles = Math.floor(Math.random() * 1000) + 100;
      const fileTypes = this.generateFileTypes();
      
      await recovery.updateProgress(progress, {
        totalFiles,
        scanResults: {
          scannedSectors: step * 1000,
          foundFiles: totalFiles,
          corruptedFiles: Math.floor(totalFiles * 0.1)
        }
      });

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Simulate analyzing phase
  async simulateAnalyzing(recovery) {
    const totalSteps = 10;
    const stepDelay = 1500;

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeScans.get(recovery.id)?.paused) {
        return;
      }

      const progress = 30 + Math.floor((step / totalSteps) * 20); // Analyzing is 20% of total
      
      await recovery.updateProgress(progress, {
        scanResults: {
          ...recovery.scan_results,
          analyzedFiles: Math.floor((step / totalSteps) * recovery.total_files),
          recoverableFiles: Math.floor(recovery.total_files * 0.8)
        }
      });

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Simulate recovering phase
  async simulateRecovering(recovery) {
    const totalSteps = 50;
    const stepDelay = 1000;
    const recoverableFiles = Math.floor(recovery.total_files * 0.8);

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeScans.get(recovery.id)?.paused) {
        return;
      }

      const progress = 50 + Math.floor((step / totalSteps) * 50); // Recovering is 50% of total
      const recoveredFiles = Math.floor((step / totalSteps) * recoverableFiles);
      const failedFiles = Math.floor(recovery.total_files * 0.1 * (step / totalSteps));
      
      await recovery.updateProgress(progress, {
        recoveredFiles,
        failedFiles,
        estimatedCompletion: new Date(Date.now() + ((totalSteps - step) * stepDelay))
      });

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Generate sample file types
  generateFileTypes() {
    const types = [
      { extension: 'jpg', count: Math.floor(Math.random() * 200), total_size: Math.floor(Math.random() * 1000000) },
      { extension: 'png', count: Math.floor(Math.random() * 150), total_size: Math.floor(Math.random() * 800000) },
      { extension: 'mp4', count: Math.floor(Math.random() * 50), total_size: Math.floor(Math.random() * 5000000) },
      { extension: 'pdf', count: Math.floor(Math.random() * 100), total_size: Math.floor(Math.random() * 2000000) },
      { extension: 'docx', count: Math.floor(Math.random() * 80), total_size: Math.floor(Math.random() * 500000) },
      { extension: 'xlsx', count: Math.floor(Math.random() * 60), total_size: Math.floor(Math.random() * 300000) }
    ];
    
    return types.filter(type => type.count > 0);
  }

  // Get recovery statistics
  async getRecoveryStats(userId = null, timeRange = '30 days') {
    try {
      const stats = await DataRecovery.getRecoveryStats(userId, timeRange);
      return stats;
    } catch (error) {
      logger.error('Error getting recovery stats', { error: error.message, userId });
      throw error;
    }
  }

  // Get active recovery sessions
  async getActiveRecoveries(userId = null) {
    try {
      const sessions = await DataRecovery.getActiveSessions(userId);
      return sessions;
    } catch (error) {
      logger.error('Error getting active recoveries', { error: error.message, userId });
      throw error;
    }
  }

  // Clean up old recovery sessions
  async cleanupOldSessions(daysOld = 90) {
    try {
      const deletedCount = await DataRecovery.cleanupOldSessions(daysOld);
      logger.info(`Cleaned up ${deletedCount} old recovery sessions`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old sessions', { error: error.message });
      throw error;
    }
  }

  // Get recovery session progress
  async getRecoveryProgress(recoveryId, userId) {
    try {
      const session = await this.getRecoverySession(recoveryId, userId);
      
      return {
        id: session.id,
        status: session.status,
        progress: session.progress,
        total_files: session.total_files,
        recovered_files: session.recovered_files,
        failed_files: session.failed_files,
        success_rate: session.getSuccessRate ? session.getSuccessRate() : 0,
        estimated_time_remaining: session.getEstimatedTimeRemaining ? session.getEstimatedTimeRemaining() : null,
        file_types: session.file_types,
        scan_results: session.scan_results
      };
    } catch (error) {
      logger.error('Error getting recovery progress', { error: error.message, recoveryId });
      throw error;
    }
  }

  // Validate recovery options
  validateRecoveryOptions(recoveryType, options) {
    const validOptions = {
      deleted_files: ['file_types', 'date_range', 'deep_scan'],
      formatted_drive: ['partition_type', 'file_system', 'deep_scan'],
      corrupted_files: ['file_types', 'repair_mode'],
      system_crash: ['boot_sector_recovery', 'registry_recovery'],
      virus_attack: ['quarantine_scan', 'system_restore'],
      hardware_failure: ['sector_analysis', 'bad_block_recovery']
    };

    const allowedOptions = validOptions[recoveryType] || [];
    const providedOptions = Object.keys(options);
    
    const invalidOptions = providedOptions.filter(opt => !allowedOptions.includes(opt));
    
    if (invalidOptions.length > 0) {
      throw new AppError(`Invalid options for recovery type ${recoveryType}: ${invalidOptions.join(', ')}`, 400);
    }

    return true;
  }
}

module.exports = new DataRecoveryService();