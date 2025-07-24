const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');
const AdvancedSession = require('../../models/AdvancedSession');
const Device = require('../../models/Device');

class ScreenUnlockService {
  constructor() {
    this.activeSessions = new Map();
  }

  async startUnlock(userId, deviceId, unlockMethod, options = {}) {
    try {
      // Validate device
      const device = await Device.findById(deviceId);
      if (!device || device.userId !== userId) {
        throw new AppError('Device not found or not owned by user', 404);
      }

      // Validate unlock method
      const validMethods = ['pin_bruteforce', 'pattern_analysis', 'password_dictionary', 'biometric_bypass'];
      if (!validMethods.includes(unlockMethod)) {
        throw new AppError('Invalid unlock method', 400);
      }

      // Check for existing active sessions
      const existingSession = await AdvancedSession.findOne({
        userId,
        deviceId,
        serviceType: 'screen_unlock',
        status: { $in: ['running', 'paused'] }
      });

      if (existingSession) {
        throw new AppError('Screen unlock session already active for this device', 409);
      }

      // Create new session
      const session = new AdvancedSession({
        userId,
        deviceId,
        serviceType: 'screen_unlock',
        unlockMethod,
        options,
        status: 'running',
        startedAt: new Date(),
        progress: {
          currentAttempt: 0,
          totalAttempts: this.calculateTotalAttempts(unlockMethod, options),
          percentage: 0,
          estimatedTimeRemaining: null
        }
      });

      await session.save();

      // Start the unlock process
      this.processUnlock(session._id);

      logger.info('Screen unlock session started', {
        sessionId: session._id,
        userId,
        deviceId,
        unlockMethod
      });

      return session;
    } catch (error) {
      logger.error('Error starting screen unlock', { error: error.message, userId, deviceId });
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
        unlockMethod: session.unlockMethod,
        startedAt: session.startedAt,
        completedAt: session.completedAt
      };
    } catch (error) {
      logger.error('Error getting unlock progress', { error: error.message, sessionId });
      throw error;
    }
  }

  async pauseUnlock(sessionId, userId) {
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

      logger.info('Screen unlock session paused', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error pausing unlock session', { error: error.message, sessionId });
      throw error;
    }
  }

  async resumeUnlock(sessionId, userId) {
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
      this.processUnlock(sessionId);

      logger.info('Screen unlock session resumed', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error resuming unlock session', { error: error.message, sessionId });
      throw error;
    }
  }

  async cancelUnlock(sessionId, userId) {
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

      logger.info('Screen unlock session cancelled', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error cancelling unlock session', { error: error.message, sessionId });
      throw error;
    }
  }

  // Private methods
  calculateTotalAttempts(unlockMethod, options) {
    switch (unlockMethod) {
      case 'pin_bruteforce':
        const pinLength = options.pinLength || 4;
        return Math.pow(10, pinLength);
      case 'pattern_analysis':
        return options.maxPatterns || 1000;
      case 'password_dictionary':
        return options.dictionarySize || 10000;
      case 'biometric_bypass':
        return 1; // Single attempt
      default:
        return 1000;
    }
  }

  async processUnlock(sessionId) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session) return;

      // Mark as active
      this.activeSessions.set(sessionId, {
        startTime: Date.now(),
        paused: false
      });

      // Simulate unlock process
      await this.simulateUnlockProcess(session);

    } catch (error) {
      logger.error('Error processing unlock', { error: error.message, sessionId });
    }
  }

  async simulateUnlockProcess(session) {
    const totalAttempts = session.progress.totalAttempts;
    const sessionId = session._id;

    for (let attempt = session.progress.currentAttempt; attempt < totalAttempts; attempt++) {
      // Check if paused or cancelled
      const activeSession = this.activeSessions.get(sessionId);
      if (!activeSession || activeSession.paused) {
        break;
      }

      // Update progress
      const percentage = Math.round((attempt / totalAttempts) * 100);
      const estimatedTimeRemaining = this.calculateEstimatedTime(attempt, totalAttempts, activeSession.startTime);

      await AdvancedSession.findByIdAndUpdate(sessionId, {
        'progress.currentAttempt': attempt,
        'progress.percentage': percentage,
        'progress.estimatedTimeRemaining': estimatedTimeRemaining
      });

      // Simulate work delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate success (random chance)
      if (Math.random() < 0.001) { // 0.1% chance per attempt
        await this.completeUnlock(sessionId, true);
        return;
      }
    }

    // If we reach here, unlock failed
    await this.completeUnlock(sessionId, false);
  }

  async completeUnlock(sessionId, success) {
    try {
      const session = await AdvancedSession.findById(sessionId);
      if (!session) return;

      session.status = success ? 'completed' : 'failed';
      session.completedAt = new Date();
      session.result = {
        success,
        unlockCode: success ? this.generateUnlockCode(session.unlockMethod) : null,
        attempts: session.progress.currentAttempt
      };

      await session.save();
      this.activeSessions.delete(sessionId);

      logger.info('Screen unlock completed', {
        sessionId,
        success,
        attempts: session.progress.currentAttempt
      });
    } catch (error) {
      logger.error('Error completing unlock', { error: error.message, sessionId });
    }
  }

  calculateEstimatedTime(currentAttempt, totalAttempts, startTime) {
    if (currentAttempt === 0) return null;
    
    const elapsed = Date.now() - startTime;
    const avgTimePerAttempt = elapsed / currentAttempt;
    const remainingAttempts = totalAttempts - currentAttempt;
    
    return Math.round(remainingAttempts * avgTimePerAttempt);
  }

  generateUnlockCode(unlockMethod) {
    switch (unlockMethod) {
      case 'pin_bruteforce':
        return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      case 'pattern_analysis':
        return 'Pattern: L-shape';
      case 'password_dictionary':
        return 'password123';
      case 'biometric_bypass':
        return 'Biometric bypassed';
      default:
        return 'Unknown';
    }
  }
}

module.exports = new ScreenUnlockService();