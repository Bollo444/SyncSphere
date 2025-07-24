const PhoneTransfer = require('../../models/PhoneTransfer');
const Device = require('../../models/Device');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const redis = require('../../config/redis');
const { EventEmitter } = require('events');

class PhoneTransferService extends EventEmitter {
  constructor() {
    super();
    this.activeTransfers = new Map();
    this.transferQueue = [];
    this.maxConcurrentTransfers = 2;
  }

  // Start a new phone transfer
  async startTransfer(userId, sourceDeviceId, targetDeviceId, transferType, dataTypes, options = {}) {
    try {
      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate devices
      const sourceDevice = await Device.findById(sourceDeviceId);
      const targetDevice = await Device.findById(targetDeviceId);

      if (!sourceDevice || sourceDevice.user_id !== userId) {
        throw new AppError('Source device not found or not owned by user', 404);
      }

      if (!targetDevice || targetDevice.user_id !== userId) {
        throw new AppError('Target device not found or not owned by user', 404);
      }

      // Check if devices are connected
      if (sourceDevice.status !== 'connected') {
        throw new AppError('Source device must be connected', 400);
      }

      if (targetDevice.status !== 'connected') {
        throw new AppError('Target device must be connected', 400);
      }

      // Check device compatibility
      const compatibility = await this.checkDeviceCompatibility(sourceDevice, targetDevice);
      if (!compatibility.compatible) {
        throw new AppError(`Devices are not compatible: ${compatibility.reason}`, 400);
      }

      // Check for existing active transfers
      const activeTransfers = await PhoneTransfer.getActiveTransfers(userId);
      if (activeTransfers.length >= this.maxConcurrentTransfers) {
        throw new AppError('Maximum number of concurrent transfers reached', 429);
      }

      // Validate transfer type
      const validTypes = ['full_transfer', 'selective_transfer', 'backup_restore', 'clone_device'];
      if (!validTypes.includes(transferType)) {
        throw new AppError('Invalid transfer type', 400);
      }

      // Validate data types
      this.validateDataTypes(dataTypes);

      // Create transfer session
      const transfer = await PhoneTransfer.startTransfer(
        userId,
        sourceDeviceId,
        targetDeviceId,
        transferType,
        dataTypes,
        options
      );

      // Cache transfer session
      await redis.setex(`transfer:${transfer.id}`, 3600, JSON.stringify(transfer));

      // Start the transfer process
      this.processTransfer(transfer.id);

      logger.info('Phone transfer started', {
        transferId: transfer.id,
        userId,
        sourceDeviceId,
        targetDeviceId,
        transferType
      });

      return transfer;
    } catch (error) {
      logger.error('Error starting phone transfer', { 
        error: error.message, 
        userId, 
        sourceDeviceId, 
        targetDeviceId 
      });
      throw error;
    }
  }

  // Get transfer session by ID
  async getTransfer(transferId, userId = null) {
    try {
      // Try to get from cache first
      const cached = await redis.get(`transfer:${transferId}`);
      if (cached) {
        const transfer = JSON.parse(cached);
        if (!userId || transfer.user_id === userId) {
          return transfer;
        }
      }

      // Get from database
      const transfer = await PhoneTransfer.findById(transferId);
      if (!transfer) {
        throw new AppError('Transfer not found', 404);
      }

      if (userId && transfer.user_id !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Update cache
      await redis.setex(`transfer:${transferId}`, 3600, JSON.stringify(transfer));

      return transfer;
    } catch (error) {
      logger.error('Error getting transfer', { error: error.message, transferId });
      throw error;
    }
  }

  // Get user's transfers
  async getUserTransfers(userId, options = {}) {
    try {
      const transfers = await PhoneTransfer.findByUserId(userId, options);
      return transfers;
    } catch (error) {
      logger.error('Error getting user transfers', { error: error.message, userId });
      throw error;
    }
  }

  // Cancel transfer
  async cancelTransfer(transferId, userId) {
    try {
      const transfer = await this.getTransfer(transferId, userId);
      
      if (!['pending', 'preparing', 'connecting', 'transferring', 'paused'].includes(transfer.status)) {
        throw new AppError('Cannot cancel transfer in current status', 400);
      }

      const phoneTransfer = new PhoneTransfer(transfer);
      await phoneTransfer.cancel();

      // Remove from active transfers
      this.activeTransfers.delete(transferId);

      // Update cache
      await redis.del(`transfer:${transferId}`);

      logger.info('Transfer cancelled', { transferId, userId });

      return phoneTransfer;
    } catch (error) {
      logger.error('Error cancelling transfer', { error: error.message, transferId });
      throw error;
    }
  }

  // Pause transfer
  async pauseTransfer(transferId, userId) {
    try {
      const transfer = await this.getTransfer(transferId, userId);
      
      if (!['connecting', 'transferring'].includes(transfer.status)) {
        throw new AppError('Cannot pause transfer in current status', 400);
      }

      const phoneTransfer = new PhoneTransfer(transfer);
      await phoneTransfer.pause();

      // Pause the active transfer
      if (this.activeTransfers.has(transferId)) {
        this.activeTransfers.get(transferId).paused = true;
      }

      // Update cache
      await redis.del(`transfer:${transferId}`);

      logger.info('Transfer paused', { transferId, userId });

      return phoneTransfer;
    } catch (error) {
      logger.error('Error pausing transfer', { error: error.message, transferId });
      throw error;
    }
  }

  // Resume transfer
  async resumeTransfer(transferId, userId) {
    try {
      const transfer = await this.getTransfer(transferId, userId);
      
      if (transfer.status !== 'paused') {
        throw new AppError('Can only resume paused transfers', 400);
      }

      const phoneTransfer = new PhoneTransfer(transfer);
      await phoneTransfer.resume();

      // Resume the transfer process
      this.processTransfer(transferId);

      logger.info('Transfer resumed', { transferId, userId });

      return phoneTransfer;
    } catch (error) {
      logger.error('Error resuming transfer', { error: error.message, transferId });
      throw error;
    }
  }

  // Process transfer (simulate the actual transfer process)
  async processTransfer(transferId) {
    try {
      const transfer = await PhoneTransfer.findById(transferId);
      if (!transfer) {
        throw new AppError('Transfer not found', 404);
      }

      const phoneTransfer = new PhoneTransfer(transfer);
      
      // Mark as active
      this.activeTransfers.set(transferId, { 
        startTime: Date.now(), 
        paused: false,
        currentPhase: 'preparing'
      });

      // Phase 1: Preparing
      await phoneTransfer.updateStatus('preparing');
      await this.simulatePreparing(phoneTransfer);

      // Check if paused or cancelled
      if (this.activeTransfers.get(transferId)?.paused) {
        return;
      }

      // Phase 2: Connecting
      await phoneTransfer.updateStatus('connecting');
      await this.simulateConnecting(phoneTransfer);

      // Check if paused or cancelled
      if (this.activeTransfers.get(transferId)?.paused) {
        return;
      }

      // Phase 3: Transferring
      await phoneTransfer.updateStatus('transferring');
      await this.simulateTransferring(phoneTransfer);

      // Check if paused or cancelled
      if (this.activeTransfers.get(transferId)?.paused) {
        return;
      }

      // Phase 4: Verifying
      await phoneTransfer.updateStatus('verifying');
      await this.simulateVerifying(phoneTransfer);

      // Complete
      await phoneTransfer.complete();
      this.activeTransfers.delete(transferId);

      // Emit completion event
      this.emit('transferCompleted', {
        transferId,
        userId: phoneTransfer.user_id,
        successRate: phoneTransfer.getSuccessRate()
      });

      logger.info('Transfer completed', { 
        transferId, 
        successRate: phoneTransfer.getSuccessRate() 
      });

    } catch (error) {
      logger.error('Error processing transfer', { error: error.message, transferId });
      
      try {
        const transfer = await PhoneTransfer.findById(transferId);
        if (transfer) {
          const phoneTransfer = new PhoneTransfer(transfer);
          await phoneTransfer.markAsFailed(error.message);
        }
      } catch (updateError) {
        logger.error('Error updating failed transfer', { error: updateError.message, transferId });
      }
      
      this.activeTransfers.delete(transferId);
    }
  }

  // Simulate preparing phase
  async simulatePreparing(transfer) {
    const totalSteps = 10;
    const stepDelay = 1000;

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeTransfers.get(transfer.id)?.paused) {
        return;
      }

      const progress = Math.floor((step / totalSteps) * 10); // Preparing is 10% of total
      
      // Calculate total items and size based on data types
      const { totalItems, totalSize } = this.calculateTransferMetrics(transfer.data_types);
      
      await transfer.updateProgress(progress, {
        totalItems,
        transferSize: totalSize
      });

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Simulate connecting phase
  async simulateConnecting(transfer) {
    const totalSteps = 5;
    const stepDelay = 2000;

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeTransfers.get(transfer.id)?.paused) {
        return;
      }

      const progress = 10 + Math.floor((step / totalSteps) * 10); // Connecting is 10% of total
      
      await transfer.updateProgress(progress);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Simulate transferring phase
  async simulateTransferring(transfer) {
    const totalSteps = 70;
    const stepDelay = 1000;
    const totalItems = transfer.total_items || 1000;

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeTransfers.get(transfer.id)?.paused) {
        return;
      }

      const progress = 20 + Math.floor((step / totalSteps) * 70); // Transferring is 70% of total
      const transferredItems = Math.floor((step / totalSteps) * totalItems * 0.95); // 95% success rate
      const failedItems = Math.floor((step / totalSteps) * totalItems * 0.05);
      const transferredSize = Math.floor((step / totalSteps) * transfer.transfer_size * 0.95);
      const transferSpeed = this.calculateTransferSpeed(transfer.connection_method);
      
      const estimatedCompletion = new Date(Date.now() + ((totalSteps - step) * stepDelay));
      
      await transfer.updateProgress(progress, {
        transferredItems,
        failedItems,
        transferredSize,
        transferSpeed,
        estimatedCompletion
      });

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Simulate verifying phase
  async simulateVerifying(transfer) {
    const totalSteps = 10;
    const stepDelay = 500;

    for (let step = 1; step <= totalSteps; step++) {
      if (this.activeTransfers.get(transfer.id)?.paused) {
        return;
      }

      const progress = 90 + Math.floor((step / totalSteps) * 10); // Verifying is 10% of total
      
      await transfer.updateProgress(progress);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Calculate transfer metrics based on data types
  calculateTransferMetrics(dataTypes) {
    if (!Array.isArray(dataTypes)) {
      return { totalItems: 0, totalSize: 0 };
    }

    const metrics = {
      contacts: { avgItems: 500, avgSizePerItem: 1024 },
      photos: { avgItems: 2000, avgSizePerItem: 2048000 },
      videos: { avgItems: 100, avgSizePerItem: 50000000 },
      music: { avgItems: 500, avgSizePerItem: 4000000 },
      documents: { avgItems: 200, avgSizePerItem: 500000 },
      apps: { avgItems: 50, avgSizePerItem: 20000000 },
      messages: { avgItems: 1000, avgSizePerItem: 2048 },
      call_logs: { avgItems: 200, avgSizePerItem: 512 },
      calendar: { avgItems: 100, avgSizePerItem: 1024 },
      notes: { avgItems: 50, avgSizePerItem: 5120 }
    };

    let totalItems = 0;
    let totalSize = 0;

    dataTypes.forEach(dataType => {
      if (dataType.enabled !== false && metrics[dataType.type]) {
        const metric = metrics[dataType.type];
        const items = dataType.count || metric.avgItems;
        totalItems += items;
        totalSize += items * metric.avgSizePerItem;
      }
    });

    return { totalItems, totalSize };
  }

  // Calculate transfer speed based on connection method
  calculateTransferSpeed(connectionMethod) {
    const speeds = {
      wifi: Math.random() * 50 + 10, // 10-60 MB/s
      cable: Math.random() * 100 + 50, // 50-150 MB/s
      bluetooth: Math.random() * 2 + 0.5, // 0.5-2.5 MB/s
      cloud: Math.random() * 20 + 5 // 5-25 MB/s
    };

    return speeds[connectionMethod] || speeds.wifi;
  }

  // Check device compatibility
  async checkDeviceCompatibility(sourceDevice, targetDevice) {
    try {
      // Check if both devices are phones
      if (sourceDevice.device_type !== 'phone' || targetDevice.device_type !== 'phone') {
        return {
          compatible: false,
          reason: 'Both devices must be phones'
        };
      }

      // Check OS compatibility
      const sourceOS = this.parseOSVersion(sourceDevice.os_version);
      const targetOS = this.parseOSVersion(targetDevice.os_version);

      if (sourceOS.platform !== targetOS.platform) {
        // Cross-platform transfer (iOS to Android or vice versa)
        return {
          compatible: true,
          reason: 'Cross-platform transfer supported with limitations',
          limitations: [
            'Some app data may not transfer',
            'System settings will not transfer',
            'Some file formats may need conversion'
          ]
        };
      }

      // Same platform transfer
      return {
        compatible: true,
        reason: 'Full compatibility - same platform transfer'
      };
    } catch (error) {
      logger.error('Error checking device compatibility', { error: error.message });
      return {
        compatible: false,
        reason: 'Unable to determine compatibility'
      };
    }
  }

  // Parse OS version string
  parseOSVersion(osVersion) {
    if (!osVersion) {
      return { platform: 'unknown', version: '0.0.0' };
    }

    const osLower = osVersion.toLowerCase();
    
    if (osLower.includes('ios') || osLower.includes('iphone')) {
      return {
        platform: 'ios',
        version: osVersion.match(/\d+\.\d+(\.\d+)?/)?.[0] || '0.0.0'
      };
    } else if (osLower.includes('android')) {
      return {
        platform: 'android',
        version: osVersion.match(/\d+\.\d+(\.\d+)?/)?.[0] || '0.0.0'
      };
    }

    return { platform: 'unknown', version: osVersion };
  }

  // Validate data types
  validateDataTypes(dataTypes) {
    if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
      throw new AppError('At least one data type must be selected', 400);
    }

    const validDataTypes = [
      'contacts', 'photos', 'videos', 'music', 'documents', 
      'apps', 'messages', 'call_logs', 'calendar', 'notes'
    ];

    const invalidTypes = dataTypes.filter(dt => !validDataTypes.includes(dt.type));
    if (invalidTypes.length > 0) {
      throw new AppError(`Invalid data types: ${invalidTypes.map(dt => dt.type).join(', ')}`, 400);
    }

    return true;
  }

  // Get transfer statistics
  async getTransferStats(userId = null, timeRange = '30 days') {
    try {
      const stats = await PhoneTransfer.getTransferStats(userId, timeRange);
      return stats;
    } catch (error) {
      logger.error('Error getting transfer stats', { error: error.message, userId });
      throw error;
    }
  }

  // Get active transfers
  async getActiveTransfers(userId = null) {
    try {
      const transfers = await PhoneTransfer.getActiveTransfers(userId);
      return transfers;
    } catch (error) {
      logger.error('Error getting active transfers', { error: error.message, userId });
      throw error;
    }
  }

  // Clean up old transfers
  async cleanupOldTransfers(daysOld = 90) {
    try {
      const deletedCount = await PhoneTransfer.cleanupOldTransfers(daysOld);
      logger.info(`Cleaned up ${deletedCount} old transfers`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old transfers', { error: error.message });
      throw error;
    }
  }

  // Get transfer progress
  async getTransferProgress(transferId, userId) {
    try {
      const transfer = await this.getTransfer(transferId, userId);
      
      return {
        id: transfer.id,
        status: transfer.status,
        progress: transfer.progress,
        total_items: transfer.total_items,
        transferred_items: transfer.transferred_items,
        failed_items: transfer.failed_items,
        transfer_size: transfer.transfer_size,
        transferred_size: transfer.transferred_size,
        transfer_speed: transfer.transfer_speed,
        success_rate: transfer.getSuccessRate ? transfer.getSuccessRate() : 0,
        estimated_time_remaining: transfer.getEstimatedTimeRemaining ? transfer.getEstimatedTimeRemaining() : null,
        formatted_transfer_speed: transfer.getFormattedTransferSpeed ? transfer.getFormattedTransferSpeed() : '0 MB/s',
        formatted_transfer_size: transfer.getFormattedTransferSize ? transfer.getFormattedTransferSize() : '0 B',
        data_types: transfer.data_types
      };
    } catch (error) {
      logger.error('Error getting transfer progress', { error: error.message, transferId });
      throw error;
    }
  }

  // Get supported data types
  getSupportedDataTypes() {
    return [
      {
        type: 'contacts',
        name: 'Contacts',
        description: 'Phone contacts and address book',
        icon: 'contacts'
      },
      {
        type: 'photos',
        name: 'Photos',
        description: 'Camera roll and photo albums',
        icon: 'photo'
      },
      {
        type: 'videos',
        name: 'Videos',
        description: 'Video files and recordings',
        icon: 'video'
      },
      {
        type: 'music',
        name: 'Music',
        description: 'Music files and playlists',
        icon: 'music'
      },
      {
        type: 'documents',
        name: 'Documents',
        description: 'PDF, Word, Excel and other documents',
        icon: 'document'
      },
      {
        type: 'apps',
        name: 'Apps',
        description: 'Installed applications (data only)',
        icon: 'app'
      },
      {
        type: 'messages',
        name: 'Messages',
        description: 'Text messages and chat history',
        icon: 'message'
      },
      {
        type: 'call_logs',
        name: 'Call Logs',
        description: 'Call history and voicemails',
        icon: 'phone'
      },
      {
        type: 'calendar',
        name: 'Calendar',
        description: 'Calendar events and reminders',
        icon: 'calendar'
      },
      {
        type: 'notes',
        name: 'Notes',
        description: 'Notes and memos',
        icon: 'note'
      }
    ];
  }
}

module.exports = new PhoneTransferService();