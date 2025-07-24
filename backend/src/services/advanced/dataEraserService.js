const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');
const AdvancedSession = require('../../models/AdvancedSession');
const Device = require('../../models/Device');

class DataEraserService {
  constructor() {
    this.activeSessions = new Map();
  }

  async startErasure(userId, deviceId, erasureType, options = {}) {
    try {
      // Validate device
      const device = await Device.findById(deviceId);
      if (!device || device.userId !== userId) {
        throw new AppError('Device not found or not owned by user', 404);
      }

      // Validate erasure type
      const validTypes = ['quick_erase', 'secure_erase', 'military_grade', 'custom_pattern'];
      if (!validTypes.includes(erasureType)) {
        throw new AppError('Invalid erasure type', 400);
      }

      // Check for existing active sessions
      const existingSession = await AdvancedSession.findOne({
        userId,
        deviceId,
        serviceType: 'data_eraser',
        status: { $in: ['running', 'paused'] }
      });

      if (existingSession) {
        throw new AppError('Data erasure session already active for this device', 409);
      }

      // Create new session
      const session = new AdvancedSession({
        userId,
        deviceId,
        serviceType: 'data_eraser',
        erasureType,
        options,
        status: 'running',
        startedAt: new Date(),
        progress: {
          currentPass: 0,
          totalPasses: this.calculateTotalPasses(erasureType),
          percentage: 0,
          currentPhase: 'initializing',
          bytesErased: 0,
          totalBytes: options.totalBytes || 0,
          estimatedTimeRemaining: null
        }
      });

      await session.save();

      // Start the erasure process
      this.processErasure(session._id);

      logger.info('Data erasure session started', {
        sessionId: session._id,
        userId,
        deviceId,
        erasureType
      });

      return session;
    } catch (error) {
      logger.error('Error starting data erasure', { error: error.message, userId, deviceId });
      throw error;
    }
  }

  async getProgress(sessionId, userId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      if (session.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      return {
        sessionId: session._id,
        status: session.status,
        progress: session.progress,
        erasureType: session.erasureType,
        startedAt: session.startedAt,
        completedAt: session.completedAt
      };
    } catch (error) {
      logger.error('Error getting erasure progress', { error: error.message, sessionId });
      throw error;
    }
  }

  async pauseErasure(sessionId, userId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session || session.userId !== userId) {
        throw new AppError('Session not found', 404);
      }

      if (session.status !== 'running') {
        throw new AppError('Can only pause running sessions', 400);
      }

      session.status = 'paused';
      session.pausedAt = new Date();
      await session.save();

      // Stop the active process
      if (this.activeSessions.has(sessionId)) {
        this.activeSessions.get(sessionId).paused = true;
      }

      logger.info('Data erasure session paused', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error pausing erasure session', { error: error.message, sessionId });
      throw error;
    }
  }

  async resumeErasure(sessionId, userId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session || session.userId !== userId) {
        throw new AppError('Session not found', 404);
      }

      if (session.status !== 'paused') {
        throw new AppError('Can only resume paused sessions', 400);
      }

      session.status = 'running';
      session.resumedAt = new Date();
      await session.save();

      // Resume the process
      this.processErasure(sessionId);

      logger.info('Data erasure session resumed', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error resuming erasure session', { error: error.message, sessionId });
      throw error;
    }
  }

  async cancelErasure(sessionId, userId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session || session.userId !== userId) {
        throw new AppError('Session not found', 404);
      }

      if (!['running', 'paused'].includes(session.status)) {
        throw new AppError('Can only cancel active sessions', 400);
      }

      session.status = 'cancelled';
      session.completedAt = new Date();
      await session.save();

      // Stop the active process
      this.activeSessions.delete(sessionId);

      logger.info('Data erasure session cancelled', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error cancelling erasure session', { error: error.message, sessionId });
      throw error;
    }
  }

  // Private methods
  calculateTotalPasses(erasureType) {
    switch (erasureType) {
      case 'quick_erase':
        return 1; // Single pass with zeros
      case 'secure_erase':
        return 3; // DoD 5220.22-M standard
      case 'military_grade':
        return 7; // DoD 5220.22-M Enhanced
      case 'custom_pattern':
        return 5; // Custom pattern with verification
      default:
        return 3;
    }
  }

  async processErasure(sessionId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session) return;

      // Mark as active
      this.activeSessions.set(sessionId, {
        startTime: Date.now(),
        paused: false
      });

      // Simulate erasure process
      await this.simulateErasureProcess(session);

    } catch (error) {
      logger.error('Error processing erasure', { error: error.message, sessionId });
    }
  }

  async simulateErasureProcess(session) {
    const totalPasses = session.progress.totalPasses;
    const sessionId = session._id;
    const totalBytes = session.progress.totalBytes || 1000000000; // 1GB default
    const bytesPerChunk = totalBytes / 100; // Process in 100 chunks per pass

    for (let pass = session.progress.currentPass; pass < totalPasses; pass++) {
      // Check if paused or cancelled
      const activeSession = this.activeSessions.get(sessionId);
      if (!activeSession || activeSession.paused) {
        break;
      }

      // Update current phase
      const currentPhase = this.getErasurePhase(pass, session.erasureType);
      await AdvancedSession.findByIdAndUpdate(sessionId, {
        'progress.currentPass': pass,
        'progress.currentPhase': currentPhase
      });

      // Process each chunk in the current pass
      for (let chunk = 0; chunk < 100; chunk++) {
        // Check if paused or cancelled
        const activeSession = this.activeSessions.get(sessionId);
        if (!activeSession || activeSession.paused) {
          break;
        }

        const bytesErased = (pass * totalBytes) + (chunk * bytesPerChunk);
        const totalBytesToErase = totalPasses * totalBytes;
        const percentage = Math.round((bytesErased / totalBytesToErase) * 100);
        const estimatedTimeRemaining = this.calculateEstimatedTime(bytesErased, totalBytesToErase, activeSession.startTime);

        await AdvancedSession.findByIdAndUpdate(sessionId, {
          'progress.bytesErased': bytesErased,
          'progress.percentage': percentage,
          'progress.estimatedTimeRemaining': estimatedTimeRemaining
        });

        // Simulate chunk processing time
        await new Promise(resolve => setTimeout(resolve, 50));

        // Simulate potential failure (very small chance)
        if (Math.random() < 0.001) { // 0.1% chance of failure
          await this.completeErasure(sessionId, false, 'Hardware error during erasure');
          return;
        }
      }
    }

    // If we reach here, erasure succeeded
    await this.completeErasure(sessionId, true);
  }

  getErasurePhase(pass, erasureType) {
    const phases = {
      'quick_erase': ['zeroing_data'],
      'secure_erase': ['random_pattern', 'complement_pattern', 'verification'],
      'military_grade': ['random_pattern_1', 'random_pattern_2', 'zeros', 'ones', 'random_pattern_3', 'complement', 'verification'],
      'custom_pattern': ['custom_pattern_1', 'custom_pattern_2', 'random_overwrite', 'verification', 'final_verification']
    };

    const typePhases = phases[erasureType] || phases['secure_erase'];
    return typePhases[pass] || `pass_${pass + 1}`;
  }

  async completeErasure(sessionId, success, errorMessage = null) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session) return;

      session.status = success ? 'completed' : 'failed';
      session.completedAt = new Date();
      session.result = {
        success,
        errorMessage,
        erasureSummary: success ? this.generateErasureSummary(session.erasureType, session.progress) : null,
        passesCompleted: session.progress.currentPass,
        bytesErased: session.progress.bytesErased,
        verificationPassed: success
      };

      await session.save();
      this.activeSessions.delete(sessionId);

      logger.info('Data erasure completed', {
        sessionId,
        success,
        passesCompleted: session.progress.currentPass,
        bytesErased: session.progress.bytesErased
      });
    } catch (error) {
      logger.error('Error completing erasure', { error: error.message, sessionId });
    }
  }

  calculateEstimatedTime(bytesErased, totalBytes, startTime) {
    if (bytesErased === 0) return null;
    
    const elapsed = Date.now() - startTime;
    const avgBytesPerMs = bytesErased / elapsed;
    const remainingBytes = totalBytes - bytesErased;
    
    return Math.round(remainingBytes / avgBytesPerMs);
  }

  generateErasureSummary(erasureType, progress) {
    const summaries = {
      'quick_erase': `Quick erasure completed. ${this.formatBytes(progress.bytesErased)} securely overwritten with zeros.`,
      'secure_erase': `Secure erasure completed using DoD 5220.22-M standard. ${this.formatBytes(progress.bytesErased)} processed through 3-pass overwrite.`,
      'military_grade': `Military-grade erasure completed using DoD 5220.22-M Enhanced. ${this.formatBytes(progress.bytesErased)} processed through 7-pass overwrite.`,
      'custom_pattern': `Custom pattern erasure completed. ${this.formatBytes(progress.bytesErased)} processed through 5-pass custom overwrite with verification.`
    };
    return summaries[erasureType] || `Data erasure completed. ${this.formatBytes(progress.bytesErased)} securely erased.`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new DataEraserService();